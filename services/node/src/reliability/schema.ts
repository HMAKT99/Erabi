/**
 * Reliability index storage (ADR 0026). Node-operator machinery, not a
 * protocol surface: raw probe telemetry, hourly rollups, and the signed
 * attestations derived from them. Idempotent DDL per ADR 0008.
 *
 * `services.slug` is the primary key — bridged provider ids can churn across
 * restarts when the node runs without a seed (see ADR 0026), so the index
 * never keys on them; `service_id` is refreshed opportunistically at boot.
 */
export const RELIABILITY_DDL = `
CREATE TABLE IF NOT EXISTS services (
  slug TEXT PRIMARY KEY,
  service_id TEXT,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  category TEXT NOT NULL,
  claim TEXT,
  first_seen_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS probes (
  probe_id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  ts TEXT NOT NULL,
  alive INTEGER NOT NULL,
  http_status INTEGER,
  latency_ms INTEGER,
  price_usd REAL,
  x402_version TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_probes_slug_ts ON probes(slug, ts);

CREATE TABLE IF NOT EXISTS probe_rollups_hourly (
  slug TEXT NOT NULL,
  hour TEXT NOT NULL,
  probes INTEGER NOT NULL,
  ok INTEGER NOT NULL,
  latency_ms_sum INTEGER NOT NULL,
  latency_ms_max INTEGER,
  last_price_usd REAL,
  PRIMARY KEY (slug, hour)
);

CREATE TABLE IF NOT EXISTS attestations (
  slug TEXT NOT NULL,
  ts TEXT NOT NULL,
  payload TEXT NOT NULL,
  sig TEXT NOT NULL,
  key TEXT NOT NULL,
  PRIMARY KEY (slug, ts)
);
`;
