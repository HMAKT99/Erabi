import { describe, expect, it } from "vitest";
import {
  agentIdFromPublicKey,
  createEnvelope,
  generateKeyPair,
  InMemoryNonceStore,
  verifyEnvelope,
} from "../src/index.js";

function makeEnvelope(overrides: { ts?: string } = {}) {
  const { secretKey, publicKey } = generateKeyPair();
  const envelope = createEnvelope({
    payload: { category: "data.financial", query: "quarterly filings" },
    secretKey,
    keyId: agentIdFromPublicKey(publicKey),
    nodeId: "erabi-node-dev-1",
    ...overrides,
  });
  return { envelope, publicKey };
}

describe("envelope", () => {
  it("verifies a freshly created envelope", async () => {
    const { envelope, publicKey } = makeEnvelope();
    expect(await verifyEnvelope(envelope, publicKey)).toEqual({ ok: true });
  });

  it("rejects envelopes outside the ±120s window", async () => {
    const { envelope, publicKey } = makeEnvelope({ ts: "2026-06-10T12:00:00.000Z" });
    const fiveMinLater = Date.parse("2026-06-10T12:05:00.000Z");
    expect(await verifyEnvelope(envelope, publicKey, { nowMs: fiveMinLater })).toEqual({
      ok: false,
      reason: "clock_skew",
    });
    // ...and just inside the window passes.
    const ninetySecLater = Date.parse("2026-06-10T12:01:30.000Z");
    expect((await verifyEnvelope(envelope, publicKey, { nowMs: ninetySecLater })).ok).toBe(true);
  });

  it("rejects unparseable timestamps", async () => {
    const { envelope, publicKey } = makeEnvelope();
    expect(await verifyEnvelope({ ...envelope, ts: "not-a-date" }, publicKey)).toEqual({
      ok: false,
      reason: "bad_ts",
    });
  });

  it("rejects tampered payloads", async () => {
    const { envelope, publicKey } = makeEnvelope();
    const tampered = { ...envelope, payload: { category: "data.financial", query: "altered" } };
    expect(await verifyEnvelope(tampered, publicKey)).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects nonce replays via the nonce store", async () => {
    const { envelope, publicKey } = makeEnvelope();
    const nonceStore = new InMemoryNonceStore();
    expect((await verifyEnvelope(envelope, publicKey, { nonceStore })).ok).toBe(true);
    expect(await verifyEnvelope(envelope, publicKey, { nonceStore })).toEqual({
      ok: false,
      reason: "nonce_replayed",
    });
  });
});
