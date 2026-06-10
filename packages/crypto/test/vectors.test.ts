import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  agentIdFromPublicKey,
  canonicalize,
  keyPairFromSeed,
  publicKeyToString,
  signPayload,
  verifyPayload,
} from "../src/index.js";

interface Vector {
  seed_hex: string;
  public_key: string;
  agent_id: string;
  payload: unknown;
  canonical: string;
  ts: string;
  nonce: string;
  sig: string;
}

// Frozen cross-SDK test vectors: sdk-py must reproduce these byte-for-byte.
const vectors: Vector[] = JSON.parse(
  readFileSync(fileURLToPath(new URL("./vectors.json", import.meta.url)), "utf8"),
);

describe("cross-SDK test vectors", () => {
  it("has at least one vector", () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  it.each(vectors.map((v, i) => [i, v] as const))("vector %i reproduces", (_i, v) => {
    const seed = Uint8Array.from(Buffer.from(v.seed_hex, "hex"));
    const { secretKey, publicKey } = keyPairFromSeed(seed);

    expect(publicKeyToString(publicKey)).toBe(v.public_key);
    expect(agentIdFromPublicKey(publicKey)).toBe(v.agent_id);
    expect(canonicalize(v.payload)).toBe(v.canonical);
    expect(signPayload(v.payload, v.ts, v.nonce, secretKey)).toBe(v.sig);
    expect(verifyPayload(v.payload, v.ts, v.nonce, v.sig, publicKey)).toBe(true);
  });
});
