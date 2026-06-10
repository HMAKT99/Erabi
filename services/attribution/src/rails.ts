/**
 * Payout adapters. Attribution owns the truth (the ledger); the rail owns
 * the money. ERABI never processes payments itself.
 */

export interface PayoutRequest {
  payout_id: string;
  agent_id: string;
  amount_usd: number;
  /** Hash of the verified payout destination (owner.payout_binding). */
  payout_binding: string;
}

export interface PayoutReceipt {
  rail: string;
  ref: string;
  executed_at: string;
}

export interface PayoutRail {
  readonly name: string;
  execute(request: PayoutRequest): Promise<PayoutReceipt>;
}

/** Dev/test rail: always succeeds, returns a synthetic receipt. */
export class MockRail implements PayoutRail {
  readonly name = "mock";
  readonly executed: PayoutRequest[] = [];

  async execute(request: PayoutRequest): Promise<PayoutReceipt> {
    this.executed.push(request);
    return {
      rail: this.name,
      ref: `mock:${request.payout_id}`,
      executed_at: new Date().toISOString(),
    };
  }
}

/**
 * x402 settlement rail adapter. v0.1 ships the interface and a facilitator
 * stub; production wiring lands with the x402 bridge.
 * TODO(phase-4): call the configured x402 facilitator to execute transfer
 * against the bound destination, mapping its receipt into PayoutReceipt.
 */
export class X402Rail implements PayoutRail {
  readonly name = "x402";

  constructor(private readonly facilitatorUrl: string) {}

  async execute(request: PayoutRequest): Promise<PayoutReceipt> {
    void this.facilitatorUrl;
    return {
      rail: this.name,
      ref: `x402:stub:${request.payout_id}`,
      executed_at: new Date().toISOString(),
    };
  }
}
