import * as ed from "@noble/ed25519";
import { canonicalize } from "./canonicalize.js";
import { signatureFromString, signatureToString } from "./keys.js";

const utf8 = new TextEncoder();

/**
 * Signing input per spec §6: `canonical_json(payload) || ts || nonce`,
 * UTF-8 encoded.
 */
export function signingInput(payload: unknown, ts: string, nonce: string): Uint8Array {
  return utf8.encode(canonicalize(payload) + ts + nonce);
}

/** Sign a payload envelope-style; returns `ed25519:<base58>`. */
export function signPayload(
  payload: unknown,
  ts: string,
  nonce: string,
  secretKey: Uint8Array,
): string {
  return signatureToString(ed.sign(signingInput(payload, ts, nonce), secretKey));
}

export function verifyPayload(
  payload: unknown,
  ts: string,
  nonce: string,
  signature: string,
  publicKey: Uint8Array,
): boolean {
  let sig: Uint8Array;
  try {
    sig = signatureFromString(signature);
  } catch {
    return false;
  }
  return ed.verify(sig, signingInput(payload, ts, nonce), publicKey);
}

/** Detached signing of raw bytes (ledger hashes, receipts). */
export function signBytes(message: Uint8Array, secretKey: Uint8Array): string {
  return signatureToString(ed.sign(message, secretKey));
}

export function verifyBytes(
  message: Uint8Array,
  signature: string,
  publicKey: Uint8Array,
): boolean {
  let sig: Uint8Array;
  try {
    sig = signatureFromString(signature);
  } catch {
    return false;
  }
  return ed.verify(sig, message, publicKey);
}
