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
 * x402 settlement rail: asks the configured facilitator to execute the
 * transfer to the bound destination. The facilitator's settle response
 * (transaction reference) becomes the payout receipt — attribution owns
 * the truth, the rail owns the money.
 *
 * Until a facilitator URL is configured the rail fails closed; dev nodes
 * use MockRail.
 */
export class X402Rail implements PayoutRail {
  readonly name = "x402";

  constructor(
    private readonly facilitatorUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly options: { timeoutMs?: number; apiKey?: string } = {},
  ) {}

  async execute(request: PayoutRequest): Promise<PayoutReceipt> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.options.apiKey) headers.authorization = `Bearer ${this.options.apiKey}`;

    const response = await this.fetchImpl(`${this.facilitatorUrl.replace(/\/$/, "")}/settle`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        reference: request.payout_id,
        amount_usd: request.amount_usd,
        // The verified owner's destination commitment; the facilitator
        // resolves it to the actual payout address it has on file.
        destination_binding: request.payout_binding,
      }),
      signal: AbortSignal.timeout(this.options.timeoutMs ?? 30_000),
    });
    if (!response.ok) {
      throw new Error(`x402 facilitator settle failed: HTTP ${response.status}`);
    }
    const settled = (await response.json()) as { success?: boolean; transaction?: string };
    if (!settled.success || !settled.transaction) {
      throw new Error("x402 facilitator settle failed: no transaction in response");
    }
    return {
      rail: this.name,
      ref: `x402:${settled.transaction}`,
      executed_at: new Date().toISOString(),
    };
  }
}
