import { probeX402Detailed } from "@erabi/bridge-x402";
import type { KeyPair } from "@erabi/crypto";
import type { CuratedX402Endpoint } from "../x402-endpoints.js";
import { slugForEndpoint } from "../x402-endpoints.js";
import { buildProbeAttestation, signProbeAttestation } from "./attestation.js";
import type { ReliabilityStore } from "./store.js";

export interface ReliabilityLoopOptions {
  store: ReliabilityStore;
  endpoints: CuratedX402Endpoint[];
  nodeKeys: KeyPair;
  nodeId: string;
  /** Probe cadence; default 10 minutes (ERABI_PROBE_INTERVAL_MS). */
  intervalMs?: number;
  /** Delay between endpoints within one tick, to avoid a request burst. */
  staggerMs?: number;
  probeTimeoutMs?: number;
  /** Bridged provider ids by url, when boot activation succeeded. */
  serviceIdsByUrl?: Map<string, string>;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  now?: () => Date;
  onTick?: (results: Array<{ slug: string; alive: boolean }>) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Seed the index with EVERY curated service — including ones that failed
 * boot activation. A reliability index that hides dead services is not
 * credible; "listed but down" is exactly the information it exists to carry.
 */
export function seedServices(options: ReliabilityLoopOptions): void {
  const now = (options.now?.() ?? new Date()).toISOString();
  for (const endpoint of options.endpoints) {
    options.store.upsertService({
      slug: slugForEndpoint(endpoint),
      url: endpoint.url,
      category: endpoint.category,
      title: endpoint.title,
      claim: endpoint.claim,
      service_id: options.serviceIdsByUrl?.get(endpoint.url) ?? null,
      now,
    });
  }
}

/** One probing pass over all endpoints: record, roll up, sign, store. */
export async function runProbeTick(
  options: ReliabilityLoopOptions,
): Promise<Array<{ slug: string; alive: boolean }>> {
  const results: Array<{ slug: string; alive: boolean }> = [];
  for (const [index, endpoint] of options.endpoints.entries()) {
    if (index > 0 && (options.staggerMs ?? 2_000) > 0) {
      await sleep(options.staggerMs ?? 2_000);
    }
    const slug = slugForEndpoint(endpoint);
    const now = options.now?.() ?? new Date();
    const ts = now.toISOString();
    try {
      const probe = await probeX402Detailed(endpoint.url, {
        fetchImpl: options.fetchImpl,
        timeoutMs: options.probeTimeoutMs ?? 10_000,
      });
      options.store.recordProbe(slug, ts, probe);
      const summary = options.store.summary(slug, now);
      const payload = buildProbeAttestation({
        nodeId: options.nodeId,
        slug,
        serviceId: summary?.service_id ?? null,
        url: endpoint.url,
        ts,
        probe,
        window24h: {
          probes: summary?.probes_24h ?? 0,
          uptime_pct: summary?.uptime_24h_pct ?? null,
          latency_ms_p50: summary?.latency_ms_p50_24h ?? null,
        },
      });
      const signed = signProbeAttestation(payload, options.nodeKeys);
      options.store.saveAttestation({
        slug,
        ts,
        payload: JSON.stringify(signed.payload),
        sig: signed.sig,
        key: signed.key,
      });
      results.push({ slug, alive: probe.alive });
    } catch (error) {
      // A single endpoint failure must never kill the tick (or the loop).
      console.error(`reliability probe failed for ${slug}:`, error);
    }
  }
  options.onTick?.(results);
  return results;
}

/**
 * Continuous reliability loop (ADR 0026): in-node interval, not an external
 * cron — probe rows and the signing key live on this node's volume, and
 * external schedulers lag too much for honest uptime measurement.
 */
export function startReliabilityLoop(options: ReliabilityLoopOptions): {
  stop(): void;
  tickNow(): Promise<Array<{ slug: string; alive: boolean }>>;
} {
  seedServices(options);
  void runProbeTick(options); // first pass immediately — data from minute one
  const interval = setInterval(() => void runProbeTick(options), options.intervalMs ?? 600_000);
  interval.unref();
  return {
    stop() {
      clearInterval(interval);
    },
    tickNow() {
      return runProbeTick(options);
    },
  };
}
