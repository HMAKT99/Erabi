import { describe, expect, it } from "vitest";
import { generateKeyPair, canonicalize, verifyBytes, publicKeyFromString } from "@erabi/crypto";
import type { DetailedX402Probe } from "@erabi/bridge-x402";
import {
  ReliabilityStore,
  buildProbeAttestation,
  signProbeAttestation,
  verifyProbeAttestation,
  runProbeTick,
  seedServices,
} from "../src/reliability/index.js";
import { slugForEndpoint, type CuratedX402Endpoint } from "../src/x402-endpoints.js";

const utf8 = new TextEncoder();

function aliveProbe(overrides: Partial<DetailedX402Probe> = {}): DetailedX402Probe {
  return {
    alive: true,
    http_status: 402,
    latency_ms: 240,
    price_usd: 0.002,
    x402_version: "v2-header",
    error: null,
    ...overrides,
  };
}

function deadProbe(overrides: Partial<DetailedX402Probe> = {}): DetailedX402Probe {
  return {
    alive: false,
    http_status: null,
    latency_ms: null,
    price_usd: null,
    x402_version: null,
    error: "network",
    ...overrides,
  };
}

describe("ReliabilityStore", () => {
  it("applies DDL idempotently (open twice on the same handle path)", () => {
    const first = new ReliabilityStore(":memory:");
    first.close();
    const second = new ReliabilityStore(":memory:");
    second.upsertService({ slug: "exa-search", url: "https://api.exa.ai/search", category: "api.search" });
    expect(second.services()).toHaveLength(1);
    second.close();
  });

  it("upserts services without clobbering existing metadata with nulls", () => {
    const store = new ReliabilityStore(":memory:");
    store.upsertService({
      slug: "exa-search",
      url: "https://api.exa.ai/search",
      category: "api.search",
      title: "Exa Search",
      service_id: "erabi:agent:abc",
    });
    // Re-seed without title/service_id (e.g. boot before bridge activation).
    store.upsertService({ slug: "exa-search", url: "https://api.exa.ai/search", category: "api.search" });
    const row = store.service("exa-search");
    expect(row?.title).toBe("Exa Search");
    expect(row?.service_id).toBe("erabi:agent:abc");
    store.close();
  });

  it("folds probes into hourly rollups incrementally, across hour boundaries", () => {
    const store = new ReliabilityStore(":memory:");
    store.upsertService({ slug: "s", url: "https://s.example", category: "api.search" });
    store.recordProbe("s", "2026-07-04T13:05:00.000Z", aliveProbe({ latency_ms: 100 }));
    store.recordProbe("s", "2026-07-04T13:15:00.000Z", deadProbe());
    store.recordProbe("s", "2026-07-04T14:05:00.000Z", aliveProbe({ latency_ms: 300 }));
    const rollups = store.rollupsSince("s", "2026-07-04T00");
    expect(rollups).toHaveLength(2);
    expect(rollups[0]).toMatchObject({ hour: "2026-07-04T13", probes: 2, ok: 1, latency_ms_max: 100 });
    expect(rollups[1]).toMatchObject({ hour: "2026-07-04T14", probes: 1, ok: 1, latency_ms_max: 300 });
    store.close();
  });

  it("computes uptime and p50 latency in the summary", () => {
    const store = new ReliabilityStore(":memory:");
    store.upsertService({ slug: "s", url: "https://s.example", category: "api.search" });
    const now = new Date("2026-07-04T15:00:00.000Z");
    store.recordProbe("s", "2026-07-04T13:00:00.000Z", aliveProbe({ latency_ms: 100 }));
    store.recordProbe("s", "2026-07-04T13:30:00.000Z", aliveProbe({ latency_ms: 200 }));
    store.recordProbe("s", "2026-07-04T14:00:00.000Z", aliveProbe({ latency_ms: 400 }));
    store.recordProbe("s", "2026-07-04T14:30:00.000Z", deadProbe());
    const summary = store.summary("s", now);
    expect(summary?.uptime_24h_pct).toBe(75);
    expect(summary?.latency_ms_p50_24h).toBe(200);
    expect(summary?.probes_24h).toBe(4);
    expect(summary?.alive).toBe(false); // last probe was dead
    expect(summary?.price_usd).toBe(0.002); // falls back to last known price
    store.close();
  });

  it("prunes raw probes and keeps recent attestations", () => {
    const store = new ReliabilityStore(":memory:");
    store.upsertService({ slug: "s", url: "https://s.example", category: "api.search" });
    const now = new Date("2026-07-04T15:00:00.000Z");
    store.recordProbe("s", "2026-05-01T00:00:00.000Z", aliveProbe()); // >30d old
    store.recordProbe("s", "2026-07-04T14:00:00.000Z", aliveProbe());
    store.saveAttestation({ slug: "s", ts: "2026-07-04T14:00:00.000Z", payload: "{}", sig: "x", key: "k" });
    const result = store.prune(now);
    expect(result.probes).toBe(1);
    expect(store.probesSince("s", "2026-01-01T00:00:00.000Z")).toHaveLength(1);
    expect(store.latestAttestation("s")).toBeDefined();
    store.close();
  });
});

describe("probe attestations", () => {
  it("signs and verifies a probe attestation (detached, canonical JSON)", () => {
    const keys = generateKeyPair();
    const payload = buildProbeAttestation({
      nodeId: "erabi-node-test",
      slug: "exa-search",
      serviceId: null,
      url: "https://api.exa.ai/search",
      ts: "2026-07-04T13:05:00.000Z",
      probe: aliveProbe(),
      window24h: { probes: 144, uptime_pct: 99.3, latency_ms_p50: 240 },
    });
    const signed = signProbeAttestation(payload, keys);
    expect(signed.payload.type).toBe("erabi.x402.probe/0.1");
    expect(verifyProbeAttestation(signed)).toBe(true);
    // The signature is a plain detached ed25519 over canonicalize(payload).
    expect(
      verifyBytes(utf8.encode(canonicalize(signed.payload)), signed.sig, publicKeyFromString(signed.key)),
    ).toBe(true);
    // Tampering breaks it.
    const tampered = { ...signed, payload: { ...signed.payload, alive: false } };
    expect(verifyProbeAttestation(tampered)).toBe(false);
  });

  it("never emits NaN/undefined numerics (canonicalize would throw)", () => {
    const payload = buildProbeAttestation({
      nodeId: "n",
      slug: "s",
      serviceId: null,
      url: "https://s.example",
      ts: "2026-07-04T13:05:00.000Z",
      probe: deadProbe({ latency_ms: Number.NaN as unknown as number }),
      window24h: { probes: 0, uptime_pct: Number.NaN, latency_ms_p50: null },
    });
    expect(payload.latency_ms).toBeNull();
    expect(payload.window_24h.uptime_pct).toBeNull();
    expect(() => canonicalize(payload)).not.toThrow();
  });
});

describe("reliability loop", () => {
  const endpoints: CuratedX402Endpoint[] = [
    { slug: "up-service", url: "https://up.example/api", category: "api.search", title: "Up" },
    { slug: "down-service", url: "https://down.example/api", category: "data.market", title: "Down" },
  ];

  const fakeFetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("https://up.example")) {
      return new Response(
        JSON.stringify({ accepts: [{ scheme: "exact", maxAmountRequired: "2000" }] }),
        { status: 402 },
      );
    }
    throw new Error("ECONNREFUSED");
  }) as typeof fetch;

  it("seeds every curated service, including ones that are down", async () => {
    const store = new ReliabilityStore(":memory:");
    const keys = generateKeyPair();
    const options = {
      store,
      endpoints,
      nodeKeys: keys,
      nodeId: "erabi-node-test",
      staggerMs: 0,
      fetchImpl: fakeFetch,
    };
    seedServices(options);
    expect(store.services().map((s) => s.slug)).toEqual(["down-service", "up-service"]);

    const results = await runProbeTick(options);
    expect(results).toEqual([
      { slug: "up-service", alive: true },
      { slug: "down-service", alive: false },
    ]);

    // Both got probes recorded and signed attestations stored.
    for (const slug of ["up-service", "down-service"]) {
      const attestation = store.latestAttestation(slug);
      expect(attestation).toBeDefined();
      expect(
        verifyProbeAttestation({
          payload: JSON.parse(attestation!.payload),
          sig: attestation!.sig,
          key: attestation!.key,
        }),
      ).toBe(true);
    }
    const up = store.summary("up-service");
    expect(up?.uptime_24h_pct).toBe(100);
    expect(up?.price_usd).toBe(0.002);
    const down = store.summary("down-service");
    expect(down?.uptime_24h_pct).toBe(0);
    store.close();
  });

  it("derives a slug from the host when none is given", () => {
    expect(slugForEndpoint({ url: "https://www.example-api.com/v1/x", category: "api.search" })).toBe(
      "example-api-com",
    );
    expect(slugForEndpoint({ slug: "explicit", url: "https://x.example", category: "api.search" })).toBe(
      "explicit",
    );
  });
});

describe("reliability index API", () => {
  async function makeApp() {
    const store = new ReliabilityStore(":memory:");
    store.upsertService({
      slug: "exa-search",
      url: "https://api.exa.ai/search",
      category: "api.search",
      title: "Exa Search",
      service_id: "erabi:agent:abc",
    });
    store.recordProbe("exa-search", new Date().toISOString(), aliveProbe());
    const keys = generateKeyPair();
    const summary = store.summary("exa-search")!;
    const payload = buildProbeAttestation({
      nodeId: "erabi-node-test",
      slug: "exa-search",
      serviceId: summary.service_id,
      url: summary.url,
      ts: new Date().toISOString(),
      probe: aliveProbe(),
      window24h: { probes: 1, uptime_pct: 100, latency_ms_p50: 240 },
    });
    const signed = signProbeAttestation(payload, keys);
    store.saveAttestation({
      slug: "exa-search",
      ts: payload.ts,
      payload: JSON.stringify(signed.payload),
      sig: signed.sig,
      key: signed.key,
    });
    const { buildReliabilityServer } = await import("../src/reliability/server.js");
    const app = buildReliabilityServer({
      store,
      publicBaseUrl: "https://node.example/index",
      explorerUrl: "https://explorer.example",
      registryUrl: "https://node.example/registry",
    });
    return { app, store };
  }

  it("lists services with summaries, CORS, and cache headers", async () => {
    const { app, store } = await makeApp();
    const response = await app.inject({ method: "GET", url: "/v1/services" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.headers["cache-control"]).toContain("max-age=60");
    const body = response.json() as { count: number; services: Array<Record<string, unknown>> };
    expect(body.count).toBe(1);
    expect(body.services[0]).toMatchObject({
      slug: "exa-search",
      uptime_24h_pct: 100,
      attestation_url: "https://node.example/index/v1/services/exa-search/attestation",
      page: "https://explorer.example/services/exa-search",
    });
    await app.close();
    store.close();
  });

  it("serves the detail with a DNS claim block and 404s unknown slugs", async () => {
    const { app, store } = await makeApp();
    const detail = await app.inject({ method: "GET", url: "/v1/services/exa-search" });
    expect(detail.json().claim).toMatchObject({
      method: "dns",
      txt_record: "erabi-verify=erabi:agent:abc",
    });
    const missing = await app.inject({ method: "GET", url: "/v1/services/nope" });
    expect(missing.statusCode).toBe(404);
    await app.close();
    store.close();
  });

  it("serves a verifiable attestation", async () => {
    const { app, store } = await makeApp();
    const response = await app.inject({ method: "GET", url: "/v1/services/exa-search/attestation" });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { payload: unknown; sig: string; key: string };
    expect(verifyProbeAttestation(body)).toBe(true);
    await app.close();
    store.close();
  });

  it("serves history windows and rejects bad ones", async () => {
    const { app, store } = await makeApp();
    const day = await app.inject({ method: "GET", url: "/v1/services/exa-search/history?window=24h" });
    expect(day.json().probes).toHaveLength(1);
    const week = await app.inject({ method: "GET", url: "/v1/services/exa-search/history?window=7d" });
    expect(week.json().hourly).toHaveLength(1);
    const bad = await app.inject({ method: "GET", url: "/v1/services/exa-search/history?window=1y" });
    expect(bad.statusCode).toBe(400);
    await app.close();
    store.close();
  });

  it("renders the badge with uptime and price, and a fallback for unknowns", async () => {
    const { app, store } = await makeApp();
    const badge = await app.inject({ method: "GET", url: "/v1/services/exa-search/badge.svg" });
    expect(badge.headers["content-type"]).toContain("image/svg+xml");
    expect(badge.body).toContain("ERABI probed");
    expect(badge.body).toContain("100% up");
    expect(badge.body).toContain("$0.002/call");
    expect(badge.body).toContain("#10b981"); // green >= 99%
    const unknown = await app.inject({ method: "GET", url: "/v1/services/nope/badge.svg" });
    expect(unknown.body).toContain("not indexed by ERABI");
    await app.close();
    store.close();
  });
});
