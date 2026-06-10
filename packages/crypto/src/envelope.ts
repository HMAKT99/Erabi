import { signPayload, verifyPayload } from "./sign.js";

/** Spec §6 envelope wrapping every signed protocol object. */
export interface Envelope<P = unknown> {
  payload: P;
  sig: string;
  key_id: string;
  ts: string;
  nonce: string;
  node_id: string;
}

/** Reject envelopes whose |now − ts| exceeds this window (spec §6). */
export const MAX_CLOCK_SKEW_MS = 120_000;

/**
 * Replay protection. The crypto package ships an in-memory store for dev and
 * tests; services back this with Redis.
 */
export interface NonceStore {
  /** Returns true if the nonce was unseen and is now recorded; false on replay. */
  addIfAbsent(nonce: string): boolean | Promise<boolean>;
}

export class InMemoryNonceStore implements NonceStore {
  private readonly seen = new Set<string>();

  addIfAbsent(nonce: string): boolean {
    if (this.seen.has(nonce)) return false;
    this.seen.add(nonce);
    return true;
  }
}

export interface CreateEnvelopeOptions<P> {
  payload: P;
  secretKey: Uint8Array;
  /** Stable key identifier (agent id, or `<agent id>#<n>` after rotation). */
  keyId: string;
  nodeId: string;
  ts?: string;
  nonce?: string;
}

export function createEnvelope<P>(options: CreateEnvelopeOptions<P>): Envelope<P> {
  const ts = options.ts ?? new Date().toISOString();
  // globalThis.crypto keeps this module browser-safe (explorer verifies
  // disclosures client-side).
  const nonce = options.nonce ?? globalThis.crypto.randomUUID();
  return {
    payload: options.payload,
    sig: signPayload(options.payload, ts, nonce, options.secretKey),
    key_id: options.keyId,
    ts,
    nonce,
    node_id: options.nodeId,
  };
}

export type VerifyFailureReason = "bad_signature" | "clock_skew" | "nonce_replayed" | "bad_ts";

export interface VerifyResult {
  ok: boolean;
  reason?: VerifyFailureReason;
}

export interface VerifyEnvelopeOptions {
  /** Override for tests; defaults to wall clock. */
  nowMs?: number;
  maxSkewMs?: number;
  nonceStore?: NonceStore;
}

export async function verifyEnvelope(
  envelope: Envelope,
  publicKey: Uint8Array,
  options: VerifyEnvelopeOptions = {},
): Promise<VerifyResult> {
  const tsMs = Date.parse(envelope.ts);
  if (Number.isNaN(tsMs)) return { ok: false, reason: "bad_ts" };

  const nowMs = options.nowMs ?? Date.now();
  const maxSkewMs = options.maxSkewMs ?? MAX_CLOCK_SKEW_MS;
  if (Math.abs(nowMs - tsMs) > maxSkewMs) return { ok: false, reason: "clock_skew" };

  if (!verifyPayload(envelope.payload, envelope.ts, envelope.nonce, envelope.sig, publicKey)) {
    return { ok: false, reason: "bad_signature" };
  }

  if (options.nonceStore && !(await options.nonceStore.addIfAbsent(envelope.nonce))) {
    return { ok: false, reason: "nonce_replayed" };
  }

  return { ok: true };
}
