import { createMcpHttpHandler } from "@erabi/mcp-core";
import { realVerifiers } from "@erabi/registry";
import { startGateway } from "./gateway.js";
import { startReferenceNode } from "./index.js";

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

const servicePorts: [number, number, number, number] = [
  Number(process.env.REGISTRY_PORT ?? 4001),
  Number(process.env.EXCHANGE_PORT ?? 4002),
  Number(process.env.ATTRIBUTION_PORT ?? 4003),
  Number(process.env.REPUTATION_PORT ?? 4004),
];

const node = await startReferenceNode({
  ports: servicePorts,
  // In gateway mode the services stay on loopback; only the gateway is public.
  host:
    process.env.ERABI_HOST ?? (gatewayPort ? "127.0.0.1" : production ? "0.0.0.0" : "127.0.0.1"),
  dataDir: process.env.ERABI_DATA_DIR,
  nodeId: process.env.ERABI_NODE_ID ?? "erabi-node-dev-1",
  nodeSeedHex: process.env.ERABI_NODE_SEED,
  verifiers: useRealVerifiers
    ? realVerifiers({ githubToken: process.env.ERABI_GITHUB_TOKEN })
    : undefined,
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
    },
    // Remote MCP: join the network from a bare URL, no local install.
    // Talks to this node's own services over loopback; identities are
    // session-scoped (never stored at rest — see @erabi/mcp-core).
    mcpHandler: createMcpHttpHandler({
      endpoints: node.urls,
      explorerUrl: process.env.ERABI_EXPLORER_URL ?? undefined,
    }),
  });
  console.log(
    `single-port gateway on :${gatewayPort} (subdomain or /service prefix routing; remote MCP at /mcp)`,
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
      console.log(
        `maintenance(nightly): ${redacted} tuples redacted, ${clusters.length} suspicious clusters`,
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
    void node.stop().then(() => process.exit(0));
  });
}
