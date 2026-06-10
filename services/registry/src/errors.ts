export type RegistryErrorCode =
  | "invalid_envelope"
  | "invalid_manifest"
  | "bad_signature"
  | "clock_skew"
  | "nonce_replayed"
  | "id_mismatch"
  | "unknown_capability"
  | "agent_exists"
  | "agent_not_found"
  | "verification_failed"
  | "unsupported_verifier"
  | "tier_required"
  | "fleet_too_large"
  | "invalid_request";

const STATUS: Record<RegistryErrorCode, number> = {
  invalid_envelope: 400,
  invalid_manifest: 400,
  bad_signature: 401,
  clock_skew: 401,
  nonce_replayed: 401,
  id_mismatch: 400,
  unknown_capability: 400,
  agent_exists: 409,
  agent_not_found: 404,
  verification_failed: 422,
  unsupported_verifier: 400,
  tier_required: 403,
  fleet_too_large: 400,
  invalid_request: 400,
};

export class RegistryError extends Error {
  readonly code: RegistryErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: RegistryErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "RegistryError";
    this.code = code;
    this.statusCode = STATUS[code];
    this.details = details;
  }
}
