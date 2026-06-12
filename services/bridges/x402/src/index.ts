import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { SPEC_VERSION, isValidCategory } from "@erabi/constants";
import {
  agentIdFromPublicKey,
  createEnvelope,
  generateKeyPair,
  keyPairFromSeed,
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

interface X402Requirement {
  scheme?: string;
  /** v1 field name. */
  maxAmountRequired?: string | number;
  /** v2 field name. */
  amount?: string | number;
  description?: string;
  extra?: { decimals?: number };
}

function requirementToProbe(payload: { accepts?: X402Requirement[] }): X402Probe | null {
  const requirement = payload.accepts?.find((a) => a.scheme === "exact") ?? payload.accepts?.[0];
  const amountRaw = requirement?.maxAmountRequired ?? requirement?.amount;
  if (amountRaw === undefined) return null;
  const atomic = Number(amountRaw);
  // Stablecoin convention: 6 decimals unless the requirement says otherwise.
  const decimals = requirement?.extra?.decimals ?? 6;
  const priceUsd = atomic / 10 ** decimals;
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) return null;
  return { price_usd: priceUsd, description: requirement?.description };
}

/**
 * Real prober: requests the endpoint and parses the HTTP 402 payment
 * requirements per the x402 spec — v2 servers put a base64 JSON challenge in
 * the PAYMENT-REQUIRED response header (often with an empty body); v1 (and
 * some v2) servers put it in the JSON body. The advertised price (in the
 * asset's atomic units) becomes the standing bid.
 */
export class HttpX402Prober implements X402Prober {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly options: { timeoutMs?: number } = {},
  ) {}

  async probe(url: string): Promise<X402Probe | null> {
    try {
      const response = await this.fetchImpl(url, {
        method: "GET",
        headers: { accept: "application/json", "user-agent": "erabi-bridge-x402" },
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 10_000),
      });
      if (response.status !== 402) return null;

      // x402 v2: base64-encoded JSON challenge in the PAYMENT-REQUIRED header.
      const header = response.headers.get("payment-required");
      if (header) {
        try {
          const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as {
            accepts?: X402Requirement[];
          };
          const probe = requirementToProbe(decoded);
          if (probe) return probe;
        } catch {
          // malformed header — fall through to the body
        }
      }

      // v1 (and some v2) servers: challenge in the JSON body.
      const body = (await response.json()) as { accepts?: X402Requirement[] };
      return requirementToProbe(body);
    } catch {
      return null; // unreachable, timeout, non-JSON — not a paywalled endpoint
    }
  }
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

/** Deterministic uuid-shaped id so restarts update the same standing bid. */
function stableUuid(secret: string, label: string): string {
  const h = createHmac("sha256", secret).update(label).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
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
  /**
   * Derive each bridged provider's keypair deterministically from this
   * secret + the endpoint URL, so node restarts resume the same provider
   * identities instead of minting duplicates. Unset → random keys (demo).
   */
  seedSecret?: string;
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

    const keys = this.options.seedSecret
      ? keyPairFromSeed(
          createHmac("sha256", this.options.seedSecret).update(`x402:${url}`).digest(),
        )
      : generateKeyPair();
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

    try {
      await this.options.registry.registerAgent(
        createEnvelope({
          payload: manifest,
          secretKey: keys.secretKey,
          keyId: id,
          nodeId: this.nodeId,
        }),
        { tier: "bridge" },
      );
    } catch (error) {
      // Deterministic identities re-join on restart; anything else is real.
      const code = (error as { code?: string }).code ?? "";
      if (code !== "agent_exists") throw error;
    }
    this.keysByProvider.set(id, keys);

    const bid: Bid = {
      bid_id: this.options.seedSecret
        ? stableUuid(this.options.seedSecret, `bid:${url}:${category}`)
        : randomUUID(),
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
