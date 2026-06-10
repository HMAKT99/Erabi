import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2";
import { base58 } from "@scure/base";
import { AGENT_ID_PREFIX } from "@erabi/constants";

// @noble/ed25519 v2 ships hashless; wire in sha512 once at module load.
ed.etc.sha512Sync = (...messages) => sha512(ed.etc.concatBytes(...messages));

export interface KeyPair {
  /** 32-byte Ed25519 secret seed. */
  secretKey: Uint8Array;
  /** 32-byte Ed25519 public key. */
  publicKey: Uint8Array;
}

const ED25519_PREFIX = "ed25519:";

export function generateKeyPair(): KeyPair {
  const secretKey = ed.utils.randomPrivateKey();
  return { secretKey, publicKey: ed.getPublicKey(secretKey) };
}

export function keyPairFromSeed(seed: Uint8Array): KeyPair {
  if (seed.length !== 32) {
    throw new TypeError(`keyPairFromSeed: expected 32-byte seed, got ${seed.length}`);
  }
  return { secretKey: seed, publicKey: ed.getPublicKey(seed) };
}

/** `ed25519:<base58>` — wire encoding for public keys. */
export function publicKeyToString(publicKey: Uint8Array): string {
  return ED25519_PREFIX + base58.encode(publicKey);
}

export function publicKeyFromString(encoded: string): Uint8Array {
  if (!encoded.startsWith(ED25519_PREFIX)) {
    throw new TypeError(`publicKeyFromString: missing "${ED25519_PREFIX}" prefix`);
  }
  const key = base58.decode(encoded.slice(ED25519_PREFIX.length));
  if (key.length !== 32) {
    throw new TypeError(`publicKeyFromString: expected 32-byte key, got ${key.length}`);
  }
  return key;
}

/** `ed25519:<base58>` — wire encoding for signatures. */
export function signatureToString(signature: Uint8Array): string {
  return ED25519_PREFIX + base58.encode(signature);
}

export function signatureFromString(encoded: string): Uint8Array {
  if (!encoded.startsWith(ED25519_PREFIX)) {
    throw new TypeError(`signatureFromString: missing "${ED25519_PREFIX}" prefix`);
  }
  const sig = base58.decode(encoded.slice(ED25519_PREFIX.length));
  if (sig.length !== 64) {
    throw new TypeError(`signatureFromString: expected 64-byte signature, got ${sig.length}`);
  }
  return sig;
}

/** Identity IS the keypair: `erabi:agent:<base58(pubkey)>`. */
export function agentIdFromPublicKey(publicKey: Uint8Array): string {
  return AGENT_ID_PREFIX + base58.encode(publicKey);
}

export function publicKeyFromAgentId(agentId: string): Uint8Array {
  if (!agentId.startsWith(AGENT_ID_PREFIX)) {
    throw new TypeError(`publicKeyFromAgentId: missing "${AGENT_ID_PREFIX}" prefix`);
  }
  const key = base58.decode(agentId.slice(AGENT_ID_PREFIX.length));
  if (key.length !== 32) {
    throw new TypeError(`publicKeyFromAgentId: expected 32-byte key, got ${key.length}`);
  }
  return key;
}
