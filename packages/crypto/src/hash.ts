import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";
import { canonicalize } from "./canonicalize.js";

const utf8 = new TextEncoder();

/** `sha256:<hex>` — wire encoding for hashes (context_hash, ledger chain). */
export function sha256Hex(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? utf8.encode(input) : input;
  return `sha256:${bytesToHex(sha256(bytes))}`;
}

/** Hash of the RFC 8785 canonical form of a JSON value. */
export function hashCanonical(value: unknown): string {
  return sha256Hex(canonicalize(value));
}
