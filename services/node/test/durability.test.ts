import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  loadOrCreateNodeKeys,
  RedisNonceStore,
  SqliteNonceStore,
  startReferenceNode,
} from "../src/index.js";

const tmp = mkdtempSync(path.join(tmpdir(), "erabi-durability-"));

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("persistent node identity", () => {
  it("derives a stable key from an explicit seed", () => {
    const seed = "11".repeat(32);
    const a = loadOrCreateNodeKeys({ seedHex: seed });
    const b = loadOrCreateNodeKeys({ seedHex: seed });
    expect(a.source).toBe("env");
    expect(a.keys.publicKey).toEqual(b.keys.publicKey);
    expect(() => loadOrCreateNodeKeys({ seedHex: "abcd" })).toThrow(/32 bytes/);
  });

  it("creates and reuses a key file under dataDir — the exchange key survives restarts", async () => {
    const dataDir = path.join(tmp, "node-a");
    const first = await startReferenceNode({ dataDir });
    const firstKey = first.publicKey;
    expect(first.keySource).toBe("file");

    // Old disclosures must verify after a restart: same key comes back.
    await first.stop();
    const second = await startReferenceNode({ dataDir });
    expect(second.keySource).toBe("file");
    expect(second.publicKey).toBe(firstKey);

    const wellKnown = (await fetch(`${second.urls.exchange}/.well-known/erabi.json`).then((r) =>
      r.json(),
    )) as { exchange_public_key: string };
    expect(wellKnown.exchange_public_key).toBe(firstKey);
    await second.stop();
  });
});

describe("durable replay protection", () => {
  it("rejects a replayed nonce even across a restart", () => {
    const file = path.join(tmp, "nonces.sqlite");
    const first = new SqliteNonceStore(file);
    expect(first.addIfAbsent("nonce-1")).toBe(true);
    expect(first.addIfAbsent("nonce-1")).toBe(false);
    first.close();

    const second = new SqliteNonceStore(file);
    expect(second.addIfAbsent("nonce-1")).toBe(false); // the in-memory store would forget
    expect(second.addIfAbsent("nonce-2")).toBe(true);
    second.close();
  });

  it("expires nonces after the TTL (stale envelopes are timestamp-rejected anyway)", () => {
    let nowMs = 1_000_000;
    const store = new SqliteNonceStore(path.join(tmp, "nonces-ttl.sqlite"), {
      ttlMs: 1000,
      now: () => nowMs,
    });
    expect(store.addIfAbsent("n")).toBe(true);
    expect(store.addIfAbsent("n")).toBe(false);
    nowMs += 120_000; // past TTL and past the prune interval
    expect(store.addIfAbsent("n")).toBe(true);
    store.close();
  });

  it("RedisNonceStore maps to atomic SET NX PX", async () => {
    const seen = new Map<string, string>();
    const fakeRedis = {
      async set(key: string, value: string, ...args: Array<string | number>) {
        expect(args).toEqual(["PX", 480_000, "NX"]);
        if (seen.has(key)) return null;
        seen.set(key, value);
        return "OK";
      },
    };
    const store = new RedisNonceStore(fakeRedis);
    expect(await store.addIfAbsent("n1")).toBe(true);
    expect(await store.addIfAbsent("n1")).toBe(false);
    expect([...seen.keys()]).toEqual(["erabi:nonce:n1"]);
  });
});
