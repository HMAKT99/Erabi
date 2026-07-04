import { randomBytes } from "node:crypto";
import path from "node:path";
import { HttpX402Prober, X402Bridge } from "@erabi/bridge-x402";
import { createMcpHttpHandler } from "@erabi/mcp-core";
import { realVerifiers } from "@erabi/registry";
import { buildAgentCard } from "./agent-card.js";
import { parseHoldbackHours } from "./env.js";
import { startGateway } from "./gateway.js";
import { startReferenceNode } from "./index.js";
import {
  buildReliabilityServer,
  ReliabilityStore,
  startReliabilityLoop,
} from "./reliability/index.js";
import { parseX402Endpoints } from "./x402-endpoints.js";

/**
 * Production entrypoint. Env:
 *   ERABI_DATA_DIR         persist DBs, node key, nonces (required in prod)
 *   ERABI_NODE_SEED        32-byte hex signing seed (overrides the key file)
 *   ERABI_REAL_VERIFIERS   "1" → real DNS TXT + GitHub gist verification
 *   ERABI_GITHUB_TOKEN     optional, raises GitHub API rate limits
 *   ERABI_HOST / *_PORT    bind address and per-service ports
 *   PORT                   single-port mode (Railway/Render): a built-in
 *                          gateway listens here and routes to the four
 *                          services by subdomain or /service path prefix
 *   ERABI_PUBLIC_BASE_URL  public URL of the single port (prefix routing)
 *   ERABI_DOMAIN           public subdomains, Caddyfile/host routing
 *   ERABI_HOLDBACK_HOURS   settlement holdback override: a number ("0.0833"
 *                          = 5 min, ledger-only era) or a JSON record per
 *                          category group. Unset → config defaults (24-72h).
 *                          See ADR 0024; applies to NEW events only.
 */
const production = process.env.NODE_ENV === "production";
const useRealVerifiers = production || process.env.ERABI_REAL_VERIFIERS === "1";
// Railway/Render set PORT; that turns on the single-port gateway.
const gatewayPort = process.env.PORT ? Number(process.env.PORT) : undefined;

if (production && !process.env.ERABI_DATA_DIR) {
  console.error("refusing to start: production requires ERABI_DATA_DIR (key, nonces, DBs)");
  process.exit(1);
}

// Advertised public URLs, by precedence: explicit per-service env →
// ERABI_DOMAIN subdomains (Caddy/host routing) → ERABI_PUBLIC_BASE_URL
// with /service prefixes (single-port gateway routing).
const domain = process.env.ERABI_DOMAIN;
const base = process.env.ERABI_PUBLIC_BASE_URL?.replace(/\/$/, "");
const publicUrls = {
  registry:
    process.env.ERABI_PUBLIC_REGISTRY_URL ??
    (domain && `https://registry.${domain}`) ??
    (base && `${base}/registry`),
  exchange:
    process.env.ERABI_PUBLIC_EXCHANGE_URL ??
    (domain && `https://exchange.${domain}`) ??
    (base && `${base}/exchange`),
  attribution:
    process.env.ERABI_PUBLIC_ATTRIBUTION_URL ??
    (domain && `https://attribution.${domain}`) ??
    (base && `${base}/attribution`),
  reputation:
    process.env.ERABI_PUBLIC_REPUTATION_URL ??
    (domain && `https://reputation.${domain}`) ??
    (base && `${base}/reputation`),
};

const holdbackHours = parseHoldbackHours(process.env.ERABI_HOLDBACK_HOURS);

const servicePorts: [number, number, number, number] = [
  Number(process.env.REGISTRY_PORT ?? 4001),
  Number(process.env.EXCHANGE_PORT ?? 4002),
  Number(process.env.ATTRIBUTION_PORT ?? 4003),
  Number(process.env.REPUTATION_PORT ?? 4004),
];
const indexPort = Number(process.env.INDEX_PORT ?? 4005);

// Late-bound like the registry's stakeSource: the store is created after the
// node starts (it needs the bridge results), but discover() can already close
// over it. Undefined until then → results simply omit the reliability field.
let reliabilityStore: ReliabilityStore | undefined;
const indexPublicBase = base ? `${base}/index` : "";

const node = await startReferenceNode({
  ports: servicePorts,
  // In gateway mode the services stay on loopback; only the gateway is public.
  host:
    process.env.ERABI_HOST ?? (gatewayPort ? "127.0.0.1" : production ? "0.0.0.0" : "127.0.0.1"),
  dataDir: process.env.ERABI_DATA_DIR,
  nodeId: process.env.ERABI_NODE_ID ?? "erabi-node-dev-1",
  nodeSeedHex: process.env.ERABI_NODE_SEED,
  reliabilitySource: {
    reliabilityOf(agentId) {
      const row = reliabilityStore?.serviceByAgentId(agentId);
      if (!row) return undefined;
      const summary = reliabilityStore?.summary(row.slug);
      if (!summary) return undefined;
      return {
        uptime_24h_pct: summary.uptime_24h_pct,
        latency_ms_p50: summary.latency_ms_p50_24h,
        last_probe_ts: summary.last_probe_ts,
        attestation_url: `${indexPublicBase}/v1/services/${row.slug}/attestation`,
      };
    },
  },
  verifiers: useRealVerifiers
    ? realVerifiers({ githubToken: process.env.ERABI_GITHUB_TOKEN })
    : undefined,
  ...(holdbackHours ? { holdbackHours } : {}),
  logger: production,
  publicUrls: {
    ...(publicUrls.registry ? { registry: publicUrls.registry } : {}),
    ...(publicUrls.exchange ? { exchange: publicUrls.exchange } : {}),
    ...(publicUrls.attribution ? { attribution: publicUrls.attribution } : {}),
    ...(publicUrls.reputation ? { reputation: publicUrls.reputation } : {}),
  },
});

if (gatewayPort) {
  await startGateway({
    port: gatewayPort,
    targets: {
      registry: servicePorts[0],
      exchange: servicePorts[1],
      attribution: servicePorts[2],
      reputation: servicePorts[3],
      index: indexPort,
    },
    // Remote MCP: join the network from a bare URL, no local install.
    // Talks to this node's own services over loopback; identities are
    // session-scoped (never stored at rest — see @erabi/mcp-core).
    mcpHandler: createMcpHttpHandler({
      endpoints: node.urls,
      explorerUrl: process.env.ERABI_EXPLORER_URL ?? undefined,
    }),
    // A2A discovery: registries auto-extract skills from the AgentCard.
    ...(base ? { agentCard: buildAgentCard(base) } : {}),
  });
  console.log(
    `single-port gateway on :${gatewayPort} (subdomain or /service prefix routing; remote MCP at /mcp)`,
  );
}

if (holdbackHours) {
  console.log(`settlement holdback override active: ${JSON.stringify(holdbackHours)} hours`);
}

// Real demand: bridge curated x402-paywalled services as bridge-tier
// providers. Every endpoint is live-probed; failures just don't activate.
const x402Endpoints = parseX402Endpoints(process.env.ERABI_X402_ENDPOINTS);
let reliabilityLoop: { stop(): void } | undefined;
if (x402Endpoints !== "off" && x402Endpoints.length > 0) {
  const bridge = new X402Bridge({
    registry: node.registry,
    exchange: node.exchange,
    attribution: node.attribution,
    prober: new HttpX402Prober(),
    hmacSecret: process.env.ERABI_X402_HMAC_SECRET ?? randomBytes(32).toString("hex"),
    // Same seed that keeps the node's identity durable keeps the bridged
    // providers' identities durable across restarts.
    seedSecret: process.env.ERABI_NODE_SEED ?? process.env.ERABI_X402_HMAC_SECRET ?? undefined,
  });
  const results = await Promise.allSettled(
    x402Endpoints.map((endpoint) => bridge.submitEndpoint(endpoint)),
  );
  const serviceIdsByUrl = new Map<string, string>();
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const bridged = result.value;
      serviceIdsByUrl.set(bridged.url, bridged.provider_id);
      console.log(
        `x402 bridge: ${bridged.url} live as ${bridged.provider_id.slice(0, 28)}… ($${bridged.price_usd}/call, ${bridged.category})`,
      );
    } else {
      console.warn(
        `x402 bridge: ${x402Endpoints[index]!.url} not activated — ${String(result.reason)}`,
      );
    }
  });

  // Reliability index (ADR 0026): continuously probe every curated service —
  // including ones that failed activation — and publish signed attestations
  // agents can fetch instead of re-verifying the endpoint themselves.
  reliabilityStore = new ReliabilityStore(
    process.env.ERABI_DATA_DIR
      ? path.join(process.env.ERABI_DATA_DIR, "reliability.sqlite")
      : ":memory:",
  );
  const indexApp = buildReliabilityServer({
    store: reliabilityStore,
    publicBaseUrl: indexPublicBase || undefined,
    explorerUrl: process.env.ERABI_EXPLORER_URL ?? "https://erabi-explorer.vercel.app",
    registryUrl: publicUrls.registry,
    nodePublicKey: node.publicKey,
    logger: production,
  });
  await indexApp.listen({
    port: indexPort,
    host:
      process.env.ERABI_HOST ?? (gatewayPort ? "127.0.0.1" : production ? "0.0.0.0" : "127.0.0.1"),
  });
  node.apps.push(indexApp);
  reliabilityLoop = startReliabilityLoop({
    store: reliabilityStore,
    endpoints: x402Endpoints,
    nodeKeys: node.keys,
    nodeId: node.nodeId,
    serviceIdsByUrl,
    intervalMs: Number(process.env.ERABI_PROBE_INTERVAL_MS ?? 600_000),
  });
  console.log(
    `reliability index on :${indexPort} — probing ${x402Endpoints.length} x402 services every ${Number(process.env.ERABI_PROBE_INTERVAL_MS ?? 600_000) / 60_000} min`,
  );
}

console.log(`Erabi reference node up (key: ${node.keySource}, verifiers: ${
  useRealVerifiers ? "real" : "mock"
}):
  registry     ${node.urls.registry}
  exchange     ${node.urls.exchange}
  attribution  ${node.urls.attribution}
  reputation   ${node.urls.reputation}
  node key     ${node.publicKey}`);

if (node.keySource === "ephemeral") {
  console.warn(
    "warning: ephemeral node key — disclosures will not verify after a restart. " +
      "Set ERABI_DATA_DIR or ERABI_NODE_SEED.",
  );
}

// Maintenance loops: settlement, budget releases, retention, Sybil sweep.
const everyMinute = setInterval(() => {
  try {
    const confirmed = node.attribution.processHoldbacks();
    const released = node.exchange.releaseExpiredReservations();
    if (confirmed.length || released) {
      console.log(`maintenance: ${confirmed.length} settled, ${released} reservations released`);
    }
  } catch (error) {
    console.error("maintenance(minute) failed:", error);
  }
}, 60_000);

const nightly = setInterval(
  () => {
    try {
      const redacted = node.exchange.applyRetention();
      const clusters = node.attribution.analyzeSettlementGraph();
      const pruned = reliabilityStore?.prune();
      console.log(
        `maintenance(nightly): ${redacted} tuples redacted, ${clusters.length} suspicious clusters` +
          (pruned ? `, reliability pruned ${pruned.probes} probes` : ""),
      );
      for (const cluster of clusters) {
        console.warn("settlement-graph cluster flagged:", JSON.stringify(cluster));
      }
    } catch (error) {
      console.error("maintenance(nightly) failed:", error);
    }
  },
  24 * 60 * 60_000,
);
everyMinute.unref();
nightly.unref();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    clearInterval(everyMinute);
    clearInterval(nightly);
    reliabilityLoop?.stop();
    void node.stop().then(() => {
      reliabilityStore?.close();
      process.exit(0);
    });
  });
}
