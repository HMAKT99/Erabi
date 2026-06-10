import { describe, expect, it } from "vitest";
import {
  agentIdFromPublicKey,
  generateKeyPair,
  keyPairFromSeed,
  publicKeyFromAgentId,
  publicKeyFromString,
  publicKeyToString,
  signPayload,
  verifyPayload,
} from "../src/index.js";

describe("keys", () => {
  it("round-trips public keys and agent ids through string encodings", () => {
    const { publicKey } = generateKeyPair();
    expect(publicKeyFromString(publicKeyToString(publicKey))).toEqual(publicKey);
    const agentId = agentIdFromPublicKey(publicKey);
    expect(agentId).toMatch(/^erabi:agent:[1-9A-HJ-NP-Za-km-z]+$/);
    expect(publicKeyFromAgentId(agentId)).toEqual(publicKey);
  });

  it("derives identity deterministically from a seed", () => {
    const seed = new Uint8Array(32).fill(7);
    expect(agentIdFromPublicKey(keyPairFromSeed(seed).publicKey)).toBe(
      agentIdFromPublicKey(keyPairFromSeed(seed).publicKey),
    );
  });
});

describe("payload signing", () => {
  const payload = { category: "agent.research", constraints: { max_price_usd: 5 } };
  const ts = "2026-06-10T12:00:00.000Z";
  const nonce = "5f0c9d2e-7a31-4b8c-9d4e-2f6a8b0c1d3e";

  it("round-trips sign → verify", () => {
    const { secretKey, publicKey } = generateKeyPair();
    const sig = signPayload(payload, ts, nonce, secretKey);
    expect(sig).toMatch(/^ed25519:[1-9A-HJ-NP-Za-km-z]+$/);
    expect(verifyPayload(payload, ts, nonce, sig, publicKey)).toBe(true);
  });

  it("signature is independent of payload key order", () => {
    const { secretKey, publicKey } = generateKeyPair();
    const sig = signPayload({ a: 1, b: 2 }, ts, nonce, secretKey);
    expect(verifyPayload({ b: 2, a: 1 }, ts, nonce, sig, publicKey)).toBe(true);
  });

  it("rejects tampered payload, ts, nonce, and foreign keys", () => {
    const { secretKey, publicKey } = generateKeyPair();
    const sig = signPayload(payload, ts, nonce, secretKey);

    expect(verifyPayload({ ...payload, category: "agent.coding" }, ts, nonce, sig, publicKey)).toBe(
      false,
    );
    expect(verifyPayload(payload, "2026-06-10T12:00:01.000Z", nonce, sig, publicKey)).toBe(false);
    expect(verifyPayload(payload, ts, "other-nonce", sig, publicKey)).toBe(false);
    expect(verifyPayload(payload, ts, nonce, sig, generateKeyPair().publicKey)).toBe(false);
    expect(verifyPayload(payload, ts, nonce, "ed25519:zzz", publicKey)).toBe(false);
    expect(verifyPayload(payload, ts, nonce, "not-a-signature", publicKey)).toBe(false);
  });
});
