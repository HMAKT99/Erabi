// One-time generator for the frozen cross-SDK test vectors in
// test/vectors.json. Re-running must be a no-op unless the signing spec
// itself changes (which is a breaking protocol change).
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  agentIdFromPublicKey,
  canonicalize,
  keyPairFromSeed,
  publicKeyToString,
  signPayload,
} from "../dist/index.js";

function vector(seedByte, payload, ts, nonce) {
  const seed = new Uint8Array(32).fill(seedByte);
  const { secretKey, publicKey } = keyPairFromSeed(seed);
  return {
    seed_hex: Buffer.from(seed).toString("hex"),
    public_key: publicKeyToString(publicKey),
    agent_id: agentIdFromPublicKey(publicKey),
    payload,
    canonical: canonicalize(payload),
    ts,
    nonce,
    sig: signPayload(payload, ts, nonce, secretKey),
  };
}

const vectors = [
  vector(
    0x01,
    { category: "agent.research", constraints: { max_price_usd: 5 }, human_in_loop: true },
    "2026-01-01T00:00:00.000Z",
    "00000000-0000-4000-8000-000000000001",
  ),
  vector(
    0x02,
    {
      numbers: [333333333.33333329, 1e30, 4.5, 0.002, 1e-27],
      unicode: "€😀דּ",
      nested: { b: 2, a: 1 },
    },
    "2026-01-01T00:00:00.000Z",
    "00000000-0000-4000-8000-000000000002",
  ),
  vector(0x03, {}, "2026-12-31T23:59:59.999Z", "00000000-0000-4000-8000-000000000003"),
];

const out = fileURLToPath(new URL("../test/vectors.json", import.meta.url));
writeFileSync(out, JSON.stringify(vectors, null, 2) + "\n");
console.log(`wrote ${vectors.length} vectors to ${out}`);
