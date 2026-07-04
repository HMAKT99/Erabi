import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { DetailedX402Probe } from "@erabi/bridge-x402";
import { RELIABILITY_DDL } from "./schema.js";

export interface ServiceRow {
  slug: string;
  service_id: string | null;
  url: string;
  title: string | null;
  category: string;
  claim: string | null;
  first_seen_at: string;
  active: number;
}

export interface ProbeRow {
  slug: string;
  ts: string;
  alive: number;
  http_status: number | null;
  latency_ms: number | null;
  price_usd: number | null;
  x402_version: string | null;
  error: string | null;
}

export interface HourlyRollupRow {
  slug: string;
  hour: string;
  probes: number;
  ok: number;
  latency_ms_sum: number;
  latency_ms_max: number | null;
  last_price_usd: number | null;
}

export interface ServiceSummary {
  slug: string;
  service_id: string | null;
  url: string;
  title: string | null;
  category: string;
  claim: string | null;
  alive: boolean | null;
  last_probe_ts: string | null;
  latency_ms: number | null;
  price_usd: number | null;
  x402_version: string | null;
  uptime_24h_pct: number | null;
  uptime_7d_pct: number | null;
  uptime_30d_pct: number | null;
  latency_ms_p50_24h: number | null;
  probes_24h: number;
}

export interface StoredAttestation {
  slug: string;
  ts: string;
  payload: string;
  sig: string;
  key: string;
}

const RAW_PROBE_RETENTION_MS = 30 * 24 * 60 * 60_000;
const ROLLUP_RETENTION_MS = 400 * 24 * 60 * 60_000;
const ATTESTATIONS_KEPT_PER_SERVICE = 168;

function hourOf(ts: string): string {
  return ts.slice(0, 13); // "2026-07-04T13"
}

function pct(ok: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((ok / total) * 1000) / 10;
}

/**
 * SQLite-backed store for the reliability index. Same lightweight
 * better-sqlite3 + WAL pattern as SqliteNonceStore — node machinery, no ORM.
 */
export class ReliabilityStore {
  private readonly db: Database.Database;

  constructor(file: string) {
    if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(RELIABILITY_DDL);
  }

  upsertService(input: {
    slug: string;
    url: string;
    category: string;
    title?: string;
    claim?: string;
    service_id?: string | null;
    now?: string;
  }): void {
    const now = input.now ?? new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO services (slug, service_id, url, title, category, claim, first_seen_at, active)
         VALUES (@slug, @service_id, @url, @title, @category, @claim, @first_seen_at, 1)
         ON CONFLICT(slug) DO UPDATE SET
           service_id = COALESCE(excluded.service_id, services.service_id),
           url = excluded.url,
           title = COALESCE(excluded.title, services.title),
           category = excluded.category,
           claim = COALESCE(excluded.claim, services.claim),
           active = 1`,
      )
      .run({
        slug: input.slug,
        service_id: input.service_id ?? null,
        url: input.url,
        title: input.title ?? null,
        category: input.category,
        claim: input.claim ?? null,
        first_seen_at: now,
      });
  }

  services(): ServiceRow[] {
    return this.db
      .prepare("SELECT * FROM services WHERE active = 1 ORDER BY slug")
      .all() as ServiceRow[];
  }

  serviceByAgentId(agentId: string): ServiceRow | undefined {
    return this.db.prepare("SELECT * FROM services WHERE service_id = ?").get(agentId) as
      | ServiceRow
      | undefined;
  }

  service(slug: string): ServiceRow | undefined {
    return this.db.prepare("SELECT * FROM services WHERE slug = ?").get(slug) as
      | ServiceRow
      | undefined;
  }

  /** Insert the raw probe row and fold it into its hourly bucket, atomically. */
  recordProbe(slug: string, ts: string, probe: DetailedX402Probe): void {
    const insertProbe = this.db.prepare(
      `INSERT INTO probes (slug, ts, alive, http_status, latency_ms, price_usd, x402_version, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const upsertRollup = this.db.prepare(
      `INSERT INTO probe_rollups_hourly (slug, hour, probes, ok, latency_ms_sum, latency_ms_max, last_price_usd)
       VALUES (@slug, @hour, 1, @ok, @latency, @latency_max, @price)
       ON CONFLICT(slug, hour) DO UPDATE SET
         probes = probes + 1,
         ok = ok + @ok,
         latency_ms_sum = latency_ms_sum + @latency,
         latency_ms_max = MAX(COALESCE(latency_ms_max, 0), COALESCE(@latency_max, 0)),
         last_price_usd = COALESCE(@price, last_price_usd)`,
    );
    const run = this.db.transaction(() => {
      insertProbe.run(
        slug,
        ts,
        probe.alive ? 1 : 0,
        probe.http_status,
        probe.latency_ms,
        probe.price_usd,
        probe.x402_version,
        probe.error,
      );
      upsertRollup.run({
        slug,
        hour: hourOf(ts),
        ok: probe.alive ? 1 : 0,
        latency: probe.latency_ms ?? 0,
        latency_max: probe.latency_ms,
        price: probe.price_usd,
      });
    });
    run();
  }

  lastProbe(slug: string): ProbeRow | undefined {
    return this.db
      .prepare("SELECT * FROM probes WHERE slug = ? ORDER BY ts DESC LIMIT 1")
      .get(slug) as ProbeRow | undefined;
  }

  /** Raw probes within a window (used for 24h history + p50). */
  probesSince(slug: string, sinceTs: string): ProbeRow[] {
    return this.db
      .prepare("SELECT * FROM probes WHERE slug = ? AND ts >= ? ORDER BY ts")
      .all(slug, sinceTs) as ProbeRow[];
  }

  rollupsSince(slug: string, sinceHour: string): HourlyRollupRow[] {
    return this.db
      .prepare("SELECT * FROM probe_rollups_hourly WHERE slug = ? AND hour >= ? ORDER BY hour")
      .all(slug, sinceHour) as HourlyRollupRow[];
  }

  summary(slug: string, now: Date = new Date()): ServiceSummary | undefined {
    const service = this.service(slug);
    if (!service) return undefined;

    const nowMs = now.getTime();
    const since24h = new Date(nowMs - 24 * 60 * 60_000).toISOString();
    const raw24h = this.probesSince(slug, since24h);
    const windowStats = (hours: number) => {
      const sinceHour = hourOf(new Date(nowMs - hours * 60 * 60_000).toISOString());
      const rows = this.rollupsSince(slug, sinceHour);
      const total = rows.reduce((sum, row) => sum + row.probes, 0);
      const ok = rows.reduce((sum, row) => sum + row.ok, 0);
      return pct(ok, total);
    };

    const latencies = raw24h
      .map((row) => row.latency_ms)
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b);
    const p50 = latencies.length ? latencies[Math.floor((latencies.length - 1) / 2)]! : null;

    const last = this.lastProbe(slug);
    return {
      slug: service.slug,
      service_id: service.service_id,
      url: service.url,
      title: service.title,
      category: service.category,
      claim: service.claim,
      alive: last ? last.alive === 1 : null,
      last_probe_ts: last?.ts ?? null,
      latency_ms: last?.latency_ms ?? null,
      price_usd: last?.price_usd ?? this.lastKnownPrice(slug),
      x402_version: last?.x402_version ?? null,
      uptime_24h_pct: pct(raw24h.filter((row) => row.alive === 1).length, raw24h.length),
      uptime_7d_pct: windowStats(7 * 24),
      uptime_30d_pct: windowStats(30 * 24),
      latency_ms_p50_24h: p50,
      probes_24h: raw24h.length,
    };
  }

  private lastKnownPrice(slug: string): number | null {
    const row = this.db
      .prepare(
        "SELECT last_price_usd FROM probe_rollups_hourly WHERE slug = ? AND last_price_usd IS NOT NULL ORDER BY hour DESC LIMIT 1",
      )
      .get(slug) as { last_price_usd: number } | undefined;
    return row?.last_price_usd ?? null;
  }

  saveAttestation(attestation: StoredAttestation): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO attestations (slug, ts, payload, sig, key)
         VALUES (@slug, @ts, @payload, @sig, @key)`,
      )
      .run(attestation);
  }

  latestAttestation(slug: string): StoredAttestation | undefined {
    return this.db
      .prepare("SELECT * FROM attestations WHERE slug = ? ORDER BY ts DESC LIMIT 1")
      .get(slug) as StoredAttestation | undefined;
  }

  /** Retention: raw probes 30d, rollups 400d, attestations last N per service. */
  prune(now: Date = new Date()): { probes: number; rollups: number; attestations: number } {
    const nowMs = now.getTime();
    const probes = this.db
      .prepare("DELETE FROM probes WHERE ts < ?")
      .run(new Date(nowMs - RAW_PROBE_RETENTION_MS).toISOString()).changes;
    const rollups = this.db
      .prepare("DELETE FROM probe_rollups_hourly WHERE hour < ?")
      .run(hourOf(new Date(nowMs - ROLLUP_RETENTION_MS).toISOString())).changes;
    const attestations = this.db
      .prepare(
        `DELETE FROM attestations WHERE (slug, ts) NOT IN (
           SELECT slug, ts FROM attestations a
           WHERE (SELECT COUNT(*) FROM attestations b WHERE b.slug = a.slug AND b.ts >= a.ts) <= ?
         )`,
      )
      .run(ATTESTATIONS_KEPT_PER_SERVICE).changes;
    return { probes, rollups, attestations };
  }

  close(): void {
    this.db.close();
  }
}
