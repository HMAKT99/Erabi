export type AttributionErrorCode =
  | "invalid_envelope"
  | "invalid_event"
  | "invalid_request"
  | "bad_signature"
  | "clock_skew"
  | "nonce_replayed"
  | "id_mismatch"
  | "agent_not_registered"
  | "auction_not_found"
  | "event_not_found"
  | "event_exists"
  | "not_a_party"
  | "wrong_counterparty"
  | "already_confirmed"
  | "event_frozen"
  | "payout_unbound"
  | "payout_unverified"
  | "payout_exceeds_cap"
  | "forbidden"
  | "not_found";

const STATUS: Record<AttributionErrorCode, number> = {
  invalid_envelope: 400,
  invalid_event: 400,
  invalid_request: 400,
  bad_signature: 401,
  clock_skew: 401,
  nonce_replayed: 401,
  id_mismatch: 400,
  agent_not_registered: 403,
  auction_not_found: 404,
  event_not_found: 404,
  event_exists: 409,
  not_a_party: 403,
  wrong_counterparty: 403,
  already_confirmed: 409,
  event_frozen: 409,
  payout_unbound: 403,
  payout_unverified: 403,
  payout_exceeds_cap: 400,
  forbidden: 403,
  not_found: 404,
};

export class AttributionError extends Error {
  readonly code: AttributionErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: AttributionErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AttributionError";
    this.code = code;
    this.statusCode = STATUS[code];
    this.details = details;
  }
}
