import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import Database from "better-sqlite3";
import { keyPairFromSeed, type KeyPair, type NonceStore } from "@erabi/crypto";

/**
 * Persistent node identity. Disclosures and consideration sets are signed
 * with this key; if it changed on every boot, old disclosures would stop
 * verifying. Precedence: explicit seed (env) → key file under dataDir →
 * ephemeral (dev only).
 */
export function loadOrCreateNodeKeys(options: { seedHex?: string; dataDir?: string }): {
  keys: KeyPair;
  source: "env" | "file" | "ephemeral";
} {
  if (options.seedHex) {
    const seed = Buffer.from(options.seedHex, "hex");
    if (seed.length !== 32) {
      throw new Error("ERABI_NODE_SEED must be 32 bytes of hex (64 chars)");
    }
    return { keys: keyPairFromSeed(Uint8Array.from(seed)), source: "env" };
  }
  if (options.dataDir) {
    mkdirSync(options.dataDir, { recursive: true });
    const file = path.join(options.dataDir, "node-key.json");
    if (existsSync(file)) {
      const stored = JSON.parse(readFileSync(file, "utf8")) as { seed_hex: string };
      return {
        keys: keyPairFromSeed(Uint8Array.from(Buffer.from(stored.seed_hex, "hex"))),
        source: "file",
      };
    }
    const seed = randomBytes(32);
    writeFileSync(file, JSON.stringify({ seed_hex: seed.toString("hex") }, null, 2));
    chmodSync(file, 0o600);
    return { keys: keyPairFromSeed(Uint8Array.from(seed)), source: "file" };
  }
  return { keys: keyPairFromSeed(Uint8Array.from(randomBytes(32))), source: "ephemeral" };
}

/**
 * Durable replay protection: nonces survive restarts. Entries expire after
 * the envelope skew window (plus margin) since stale envelopes are rejected
 * by timestamp anyway.
 */
export class SqliteNonceStore implements NonceStore {
  private readonly db: Database.Database;
  private readonly ttlMs: number;
  private readonly now: () => number;
  private lastPrune = 0;

  constructor(file: string, options: { ttlMs?: number; now?: () => number } = {}) {
    if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS nonces (nonce TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)",
    );
    // ±120s skew window × 2 margin: anything older is unreplayable anyway.
    this.ttlMs = options.ttlMs ?? 480_000;
    this.now = options.now ?? Date.now;
  }

  addIfAbsent(nonce: string): boolean {
    const nowMs = this.now();
    this.prune(nowMs);
    const result = this.db
      .prepare("INSERT OR IGNORE INTO nonces (nonce, expires_at) VALUES (?, ?)")
      .run(nonce, nowMs + this.ttlMs);
    return result.changes === 1;
  }

  private prune(nowMs: number): void {
    if (nowMs - this.lastPrune < 60_000) return;
    this.lastPrune = nowMs;
    this.db.prepare("DELETE FROM nonces WHERE expires_at < ?").run(nowMs);
  }

  close(): void {
    this.db.close();
  }
}

/** Minimal Redis surface needed for nonces — any client (ioredis, node-redis v4 via adapter) fits. */
export interface RedisLikeClient {
  /** SET key value NX PX ttl → "OK" when set, null when the key existed. */
  set(key: string, value: string, ...args: Array<string | number>): Promise<string | null>;
}

/** Multi-node replay protection on Redis: SET NX PX is atomic. */
export class RedisNonceStore implements NonceStore {
  constructor(
    private readonly client: RedisLikeClient,
    private readonly options: { prefix?: string; ttlMs?: number } = {},
  ) {}

  async addIfAbsent(nonce: string): Promise<boolean> {
    const key = `${this.options.prefix ?? "erabi:nonce:"}${nonce}`;
    const result = await this.client.set(key, "1", "PX", this.options.ttlMs ?? 480_000, "NX");
    return result === "OK";
  }
}
