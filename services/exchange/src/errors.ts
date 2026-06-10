export type ExchangeErrorCode =
  | "invalid_envelope"
  | "invalid_intent"
  | "invalid_bid"
  | "invalid_request"
  | "bad_signature"
  | "clock_skew"
  | "nonce_replayed"
  | "id_mismatch"
  | "agent_not_registered"
  | "unknown_capability"
  | "pii_rejected"
  | "intent_expired"
  | "bid_not_found"
  | "forbidden"
  | "not_found";

const STATUS: Record<ExchangeErrorCode, number> = {
  invalid_envelope: 400,
  invalid_intent: 400,
  invalid_bid: 400,
  invalid_request: 400,
  bad_signature: 401,
  clock_skew: 401,
  nonce_replayed: 401,
  id_mismatch: 400,
  agent_not_registered: 403,
  unknown_capability: 400,
  pii_rejected: 400,
  intent_expired: 408,
  bid_not_found: 404,
  forbidden: 403,
  not_found: 404,
};

export class ExchangeError extends Error {
  readonly code: ExchangeErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: ExchangeErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ExchangeError";
    this.code = code;
    this.statusCode = STATUS[code];
    this.details = details;
  }
}
