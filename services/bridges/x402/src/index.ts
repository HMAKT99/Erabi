import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { SPEC_VERSION, isValidCategory } from "@erabi/constants";
import {
  agentIdFromPublicKey,
  createEnvelope,
  generateKeyPair,
  publicKeyToString,
  type KeyPair,
} from "@erabi/crypto";
import type { AgentManifest, Bid } from "@erabi/schemas";
import type { RegistryService } from "@erabi/registry";
import type { ExchangeService } from "@erabi/exchange";
import type { AttributionService } from "@erabi/attribution";

/**
 * x402 bridge (primary cold-start demand): every x402-paywalled endpoint on
 * the internet becomes a bridge-tier provider with a standing bid, priced
 * at its own paywall price. Settlement receipts map into outcome events.
 */

export interface X402Probe {
  price_usd: number;
  description?: string;
}

/** Probes an endpoint for an HTTP 402 payment-required response. */
export interface X402Prober {
  probe(url: string): Promise<X402Probe | null>;
}

/** Dev/test prober: a static map of known paywalled endpoints. */
export class MockX402Prober implements X402Prober {
  private readonly endpoints = new Map<string, X402Probe>();

  setEndpoint(url: string, probe: X402Probe): void {
    this.endpoints.set(url, probe);
  }

  async probe(url: string): Promise<X402Probe | null> {
    return this.endpoints.get(url) ?? null;
  }
}

const submissionZod = z
  .object({
    url: z.string().url(),
    category: z.string().min(1),
    title: z.string().max(80).optional(),
    claim: z.string().max(200).optional(),
    daily_budget_usd: z.number().positive().max(10_000).default(100),
  })
  .strict();

const postbackZod = z
  .object({
    event_id: z.string().uuid(),
    provider_id: z.string(),
    x402_tx: z.string().min(1),
  })
  .strict();

export interface X402BridgeOptions {
  registry: RegistryService;
  exchange: ExchangeService;
  attribution: AttributionService;
  prober: X402Prober;
  /** Shared secret for HMAC-signed postbacks from the facilitator. */
  hmacSecret: string;
  nodeId?: string;
}

export interface BridgedEndpoint {
  provider_id: string;
  bid_id: string;
  url: string;
  category: string;
  price_usd: number;
}

export class X402Bridge {
  private readonly keysByProvider = new Map<string, KeyPair>();
  private readonly endpoints: BridgedEndpoint[] = [];
  private readonly nodeId: string;

  constructor(private readonly options: X402BridgeOptions) {
    this.nodeId = options.nodeId ?? "erabi-bridge-x402";
  }

  list(): BridgedEndpoint[] {
    return [...this.endpoints];
  }

  /** Register a paywalled endpoint as a provider + standing bid. */
  async submitEndpoint(input: unknown): Promise<BridgedEndpoint> {
    const parsed = submissionZod.safeParse(input);
    if (!parsed.success) {
      throw new Error(`invalid endpoint submission: ${parsed.error.message}`);
    }
    const { url, category, title, claim, daily_budget_usd } = parsed.data;
    if (!isValidCategory(category)) {
      throw new Error(`category ${category} is not in the taxonomy`);
    }

    const probe = await this.options.prober.probe(url);
    if (!probe) {
      throw new Error(`endpoint ${url} did not answer with an x402 paywall`);
    }

    const keys = generateKeyPair();
    const id = agentIdFromPublicKey(keys.publicKey);
    const host = new URL(url).host;
    const manifest = {
      spec_version: SPEC_VERSION,
      id,
      name: `x402:${host}`.slice(0, 120),
      public_key: publicKeyToString(keys.publicKey),
      owner: { type: "org", verification: [`dns:${host}`], payout_binding: null },
      capabilities: [category],
      endpoint: url,
      roles: ["provider"],
      policy: { accepts_sponsored: false, max_sponsored_ratio: 0, human_in_loop: false },
      referrer: null,
      created_at: new Date().toISOString(),
    } as AgentManifest;

    await this.options.registry.registerAgent(
      createEnvelope({
        payload: manifest,
        secretKey: keys.secretKey,
        keyId: id,
        nodeId: this.nodeId,
      }),
      { tier: "bridge" },
    );
    this.keysByProvider.set(id, keys);

    const bid: Bid = {
      bid_id: randomUUID(),
      provider_id: id,
      targeting: { categories: [category] },
      // The paywall price IS the standing CPA bid.
      offer: { type: "cpa", amount_usd: probe.price_usd },
      creative: {
        title: title ?? `x402 API: ${host}`.slice(0, 80),
        claim: (claim ?? probe.description ?? `Pay-per-call API at ${host} via x402.`).slice(
          0,
          200,
        ),
        endpoint: url,
      },
      budget: { daily_usd: daily_budget_usd },
      settlement_rail: "x402",
      stake_tier: "bridge",
    } as Bid;
    await this.options.exchange.placeBid(
      createEnvelope({ payload: bid, secretKey: keys.secretKey, keyId: id, nodeId: this.nodeId }),
    );

    const bridged: BridgedEndpoint = {
      provider_id: id,
      bid_id: bid.bid_id,
      url,
      category,
      price_usd: probe.price_usd,
    };
    this.endpoints.push(bridged);
    return bridged;
  }

  verifyHmac(rawBody: string, signature: string | undefined): boolean {
    if (!signature) return false;
    const expected = createHmac("sha256", this.options.hmacSecret).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * Facilitator postback: an x402 payment settled for a consumer-reported
   * event. The bridge counter-signs on behalf of its provider, completing
   * the dual signature with the payment receipt as ground truth.
   */
  async handlePostback(rawBody: string, signature: string | undefined) {
    if (!this.verifyHmac(rawBody, signature)) {
      throw new Error("postback rejected: bad HMAC signature");
    }
    const parsed = postbackZod.safeParse(JSON.parse(rawBody));
    if (!parsed.success) {
      throw new Error(`invalid postback: ${parsed.error.message}`);
    }
    const { event_id, provider_id, x402_tx } = parsed.data;
    const keys = this.keysByProvider.get(provider_id);
    if (!keys) {
      throw new Error(`postback rejected: ${provider_id} is not a bridged provider`);
    }
    const event = this.options.attribution.getEvent(event_id);
    return this.options.attribution.confirmEvent(
      event_id,
      createEnvelope({
        payload: { event_id, hash: event.hash },
        secretKey: keys.secretKey,
        keyId: provider_id,
        nodeId: `${this.nodeId}:${x402_tx}`.slice(0, 128),
      }),
    );
  }
}
