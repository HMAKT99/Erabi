import Fastify, { type FastifyInstance } from "fastify";
import type { ReliabilityStore, ServiceSummary } from "./store.js";

export interface ReliabilityServerOptions {
  store: ReliabilityStore;
  /** Public base of this index API (for absolute attestation/badge URLs). */
  publicBaseUrl?: string;
  /** Explorer base, for human-facing service pages. */
  explorerUrl?: string;
  /** Registry public base, for the DNS claim flow. */
  registryUrl?: string;
  /** The node's public signing key (verifies every attestation served here). */
  nodePublicKey?: string;
  logger?: boolean;
}

const WINDOWS = { "24h": 24, "7d": 7 * 24, "30d": 30 * 24 } as const;
type HistoryWindow = keyof typeof WINDOWS;

function badgeColor(uptime: number | null): string {
  if (uptime === null) return "#8b949e"; // no data yet
  if (uptime >= 99) return "#10b981";
  if (uptime >= 95) return "#d29922";
  return "#f85149";
}

/**
 * Shields-style reliability badge: "ERABI probed · 99.2% up · $0.002/call".
 * Same monospace/width technique as the attribution earnings badge (§9.4).
 * "probed" (not "verified") — the claim is exactly what the node measured.
 */
export function serviceBadgeSvg(summary: ServiceSummary | undefined): string {
  const label = summary
    ? [
        "ERABI probed",
        summary.uptime_24h_pct !== null ? `${summary.uptime_24h_pct}% up` : "no data",
        summary.price_usd !== null ? `$${summary.price_usd}/call` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "not indexed by ERABI";
  const color = badgeColor(summary?.uptime_24h_pct ?? null);
  const width = 8 * label.length + 24;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="24" role="img" aria-label="${label}">`,
    `<rect width="${width}" height="24" rx="4" fill="#0d1117"/>`,
    `<rect x="2" y="2" width="20" height="20" rx="3" fill="${color}"/>`,
    `<text x="12" y="16" font-family="monospace" font-size="12" fill="#0d1117" text-anchor="middle">E</text>`,
    `<text x="${(width + 24) / 2}" y="16" font-family="monospace" font-size="11" fill="#e6edf3" text-anchor="middle">${label}</text>`,
    `</svg>`,
  ].join("");
}

export function buildReliabilityServer(options: ReliabilityServerOptions): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });
  const { store } = options;
  const base = options.publicBaseUrl?.replace(/\/$/, "");
  const explorer = options.explorerUrl?.replace(/\/$/, "");
  const registry = options.registryUrl?.replace(/\/$/, "");

  // §9.4 convention, same as the registry and earnings beacon: any agent that
  // touches any index response mid-task learns, machine-readably, that it can
  // publish its OWN verifiable record — reading the index is the free tier,
  // joining the network is the next step.
  const joinBlock = {
    read_without_joining:
      "this index is free to read — no registration needed to fetch attestations",
    publish_your_own_record: registry ? `${registry}/v1/agents` : "/registry/v1/agents",
    mcp_local: "npx -y erabi-mcp",
    mcp_remote: registry ? `${registry.replace(/\/registry$/, "")}/mcp` : "/mcp",
    docs_for_agents: `${explorer ?? "https://erabi-explorer.vercel.app"}/for-agents.md`,
    why: "registered agents get an Ed25519 identity, a public live page, and reputation from dual-signed outcomes — the same verifiable treatment these services get",
  };

  // The explorer reads these APIs from the browser.
  app.addHook("onSend", (_request, reply, payload, done) => {
    reply.header("access-control-allow-origin", "*");
    done(null, payload);
  });

  app.get("/healthz", async () => ({ ok: true }));

  // The verification anchor: the key every attestation from this node is
  // signed with. Served from the index itself so verification is self-serve.
  app.get("/v1/key", async (_request, reply) => {
    reply.header("cache-control", "public, max-age=300");
    return { node_key: options.nodePublicKey ?? null, algorithm: "ed25519" };
  });

  const publicSummary = (summary: ServiceSummary) => ({
    ...summary,
    attestation_url: base
      ? `${base}/v1/services/${summary.slug}/attestation`
      : `/v1/services/${summary.slug}/attestation`,
    badge_url: base
      ? `${base}/v1/services/${summary.slug}/badge.svg`
      : `/v1/services/${summary.slug}/badge.svg`,
    ...(explorer ? { page: `${explorer}/services/${summary.slug}` } : {}),
    ...(summary.service_id && explorer
      ? { agent_page: `${explorer}/agents/${summary.service_id}` }
      : {}),
  });

  app.get("/v1/services", async (_request, reply) => {
    reply.header("cache-control", "public, max-age=60");
    const services = store
      .services()
      .map((row) => store.summary(row.slug))
      .filter((summary): summary is ServiceSummary => summary !== undefined)
      .map(publicSummary);
    return {
      count: services.length,
      node_key: options.nodePublicKey ?? null,
      join: joinBlock,
      services,
      // §9.4 convention: every public surface tells an agent how to use it.
      usage: {
        attestations:
          "GET /v1/services/{slug}/attestation returns this node's latest signed probe — verify it (ed25519 over canonical JSON against node_key, also at /v1/key) and reuse it instead of re-probing the service yourself.",
        discover:
          "x402 services also appear in registry /v1/discover results with a reliability field.",
      },
    };
  });

  app.get<{ Params: { slug: string } }>("/v1/services/:slug", async (request, reply) => {
    const summary = store.summary(request.params.slug);
    if (!summary) {
      return reply
        .status(404)
        .send({ error: { code: "unknown_service", message: "no such service" } });
    }
    reply.header("cache-control", "public, max-age=60");
    return {
      ...publicSummary(summary),
      claim: summary.service_id
        ? {
            method: "dns",
            txt_record: `erabi-verify=${summary.service_id}`,
            verify_endpoint: `${options.registryUrl ?? ""}/v1/agents/${summary.service_id}/verify`,
            details:
              "Operators: add the TXT record on your service's domain, then POST the verify endpoint — your listing is promoted from bridge to verified tier.",
          }
        : null,
    };
  });

  app.get<{ Params: { slug: string }; Querystring: { window?: string } }>(
    "/v1/services/:slug/history",
    async (request, reply) => {
      const { slug } = request.params;
      if (!store.service(slug)) {
        return reply
          .status(404)
          .send({ error: { code: "unknown_service", message: "no such service" } });
      }
      const window = (request.query.window ?? "24h") as HistoryWindow;
      if (!(window in WINDOWS)) {
        return reply
          .status(400)
          .send({ error: { code: "invalid_window", message: "window must be 24h, 7d, or 30d" } });
      }
      reply.header("cache-control", "public, max-age=300");
      const since = new Date(Date.now() - WINDOWS[window] * 60 * 60_000);
      if (window === "24h") {
        return { slug, window, probes: store.probesSince(slug, since.toISOString()) };
      }
      return { slug, window, hourly: store.rollupsSince(slug, since.toISOString().slice(0, 13)) };
    },
  );

  app.get<{ Params: { slug: string } }>(
    "/v1/services/:slug/attestation",
    async (request, reply) => {
      const attestation = store.latestAttestation(request.params.slug);
      if (!attestation) {
        return reply
          .status(404)
          .send({ error: { code: "no_attestation", message: "no attestation recorded yet" } });
      }
      reply.header("cache-control", "public, max-age=60");
      return {
        payload: JSON.parse(attestation.payload) as unknown,
        sig: attestation.sig,
        key: attestation.key,
        verify:
          "ed25519 verifyBytes over canonicalize(payload); the key is this node's signing key, also served at /v1/key on this index",
        join: joinBlock,
      };
    },
  );

  app.get<{ Params: { slug: string } }>("/v1/services/:slug/badge.svg", async (request, reply) => {
    const summary = store.summary(request.params.slug);
    reply.header("cache-control", "public, max-age=300");
    reply.header("content-type", "image/svg+xml");
    return serviceBadgeSvg(summary);
  });

  return app;
}
