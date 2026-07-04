import { canonicalize, signBytes, verifyBytes, publicKeyToString, publicKeyFromString, type KeyPair } from "@erabi/crypto";
import { SPEC_VERSION } from "@erabi/constants";
import type { DetailedX402Probe } from "@erabi/bridge-x402";

const utf8 = new TextEncoder();

/**
 * Signed probe attestation (ADR 0026): the reusable unit of verification.
 * An agent (or human) fetches this instead of re-probing the service itself.
 * Detached ed25519 over RFC 8785 canonical JSON — the exact convention the
 * exchange uses for DisclosureRecords (ADR 0012). The frozen protocol
 * signing vectors are untouched: this is a new payload type over the same
 * primitives, not a new envelope format.
 */
export interface ProbeAttestationPayload {
  type: "erabi.x402.probe/0.1";
  spec_version: string;
  node_id: string;
  slug: string;
  service_id: string | null;
  url: string;
  ts: string;
  alive: boolean;
  http_status: number | null;
  latency_ms: number | null;
  price_usd: number | null;
  x402_version: string | null;
  window_24h: {
    probes: number;
    uptime_pct: number | null;
    latency_ms_p50: number | null;
  };
}

export interface SignedProbeAttestation {
  payload: ProbeAttestationPayload;
  sig: string;
  key: string;
  verify: string;
}

/** Canonicalize rejects NaN/undefined — every numeric field must be finite or null. */
function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildProbeAttestation(input: {
  nodeId: string;
  slug: string;
  serviceId: string | null;
  url: string;
  ts: string;
  probe: DetailedX402Probe;
  window24h: { probes: number; uptime_pct: number | null; latency_ms_p50: number | null };
}): ProbeAttestationPayload {
  return {
    type: "erabi.x402.probe/0.1",
    spec_version: SPEC_VERSION,
    node_id: input.nodeId,
    slug: input.slug,
    service_id: input.serviceId,
    url: input.url,
    ts: input.ts,
    alive: input.probe.alive,
    http_status: finiteOrNull(input.probe.http_status),
    latency_ms: finiteOrNull(input.probe.latency_ms),
    price_usd: finiteOrNull(input.probe.price_usd),
    x402_version: input.probe.x402_version,
    window_24h: {
      probes: input.window24h.probes,
      uptime_pct: finiteOrNull(input.window24h.uptime_pct),
      latency_ms_p50: finiteOrNull(input.window24h.latency_ms_p50),
    },
  };
}

export function signProbeAttestation(
  payload: ProbeAttestationPayload,
  keys: KeyPair,
): SignedProbeAttestation {
  const sig = signBytes(utf8.encode(canonicalize(payload)), keys.secretKey);
  return {
    payload,
    sig,
    key: publicKeyToString(keys.publicKey),
    verify:
      "ed25519 verifyBytes over canonicalize(payload); the key is this node's " +
      "signing key, also published in /registry/.well-known/erabi.json",
  };
}

export function verifyProbeAttestation(attestation: {
  payload: unknown;
  sig: string;
  key: string;
}): boolean {
  try {
    return verifyBytes(
      utf8.encode(canonicalize(attestation.payload)),
      attestation.sig,
      publicKeyFromString(attestation.key),
    );
  } catch {
    return false;
  }
}
