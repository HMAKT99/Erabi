import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
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
import type { AffiliateAdapter, CatalogItem } from "./adapter.js";

export * from "./adapter.js";

export interface AffiliateBridgeOptions {
  registry: RegistryService;
  exchange: ExchangeService;
  attribution: AttributionService;
  adapter: AffiliateAdapter;
  hmacSecret: string;
  /** Cap on catalog items converted into standing bids. */
  maxItems?: number;
  nodeId?: string;
}

export interface SyncResult {
  provider_id: string;
  bids: Array<{ bid_id: string; item_id: string; cpa_usd: number }>;
}

/**
 * Affiliate bridge (secondary cold-start demand): commissions become CPA
 * bids in commerce.* categories. Human-in-loop only — commerce sponsorship
 * never reaches autonomous-spend intents (scope policy, enforced by the
 * exchange).
 */
export class AffiliateBridge {
  private keys: KeyPair | null = null;
  private providerId: string | null = null;
  private itemsById = new Map<string, CatalogItem>();
  private bidsByItem = new Map<string, string>();
  private readonly nodeId: string;

  constructor(private readonly options: AffiliateBridgeOptions) {
    this.nodeId = options.nodeId ?? `erabi-bridge-affiliate-${options.adapter.name}`;
  }

  get provider(): string | null {
    return this.providerId;
  }

  /** Pull the catalog and (re)build the standing bids. */
  async sync(): Promise<SyncResult> {
    const catalog = (await this.options.adapter.fetchCatalog()).slice(
      0,
      this.options.maxItems ?? 20,
    );
    if (catalog.length === 0) throw new Error("affiliate catalog is empty");
    for (const item of catalog) {
      if (!isValidCategory(item.category)) {
        throw new Error(`catalog item ${item.item_id}: category ${item.category} not in taxonomy`);
      }
    }

    if (!this.keys) {
      this.keys = generateKeyPair();
      this.providerId = agentIdFromPublicKey(this.keys.publicKey);
      const categories = [...new Set(catalog.map((item) => item.category))];
      const manifest = {
        spec_version: SPEC_VERSION,
        id: this.providerId,
        name: `affiliate:${this.options.adapter.name}`.slice(0, 120),
        public_key: publicKeyToString(this.keys.publicKey),
        owner: { type: "org", verification: [], payout_binding: null },
        capabilities: categories,
        endpoint: "https://bridge.erabi.invalid/affiliate",
        roles: ["provider"],
        policy: { accepts_sponsored: false, max_sponsored_ratio: 0, human_in_loop: true },
        referrer: null,
        created_at: new Date().toISOString(),
      } as AgentManifest;
      await this.options.registry.registerAgent(
        createEnvelope({
          payload: manifest,
          secretKey: this.keys.secretKey,
          keyId: this.providerId,
          nodeId: this.nodeId,
        }),
        { tier: "bridge" },
      );
    }

    const bids: SyncResult["bids"] = [];
    this.itemsById = new Map(catalog.map((item) => [item.item_id, item]));
    for (const item of catalog) {
      const bidId = this.bidsByItem.get(item.item_id) ?? randomUUID();
      const cpa = Number((item.price_usd * item.commission_pct).toFixed(6));
      const bid: Bid = {
        bid_id: bidId,
        provider_id: this.providerId!,
        targeting: { categories: [item.category] },
        // Commission % × price → the CPA the merchant effectively pays.
        offer: { type: "cpa", amount_usd: cpa },
        creative: {
          title: item.title.slice(0, 80),
          claim: item.claim.slice(0, 200),
          endpoint: this.options.adapter.trackingUrl(item, "pending"),
        },
        budget: { daily_usd: Math.max(cpa * 50, 1) },
        settlement_rail: "affiliate",
        stake_tier: "bridge",
      } as Bid;
      await this.options.exchange.placeBid(
        createEnvelope({
          payload: bid,
          secretKey: this.keys!.secretKey,
          keyId: this.providerId!,
          nodeId: this.nodeId,
        }),
      );
      this.bidsByItem.set(item.item_id, bidId);
      bids.push({ bid_id: bidId, item_id: item.item_id, cpa_usd: cpa });
    }
    return { provider_id: this.providerId!, bids };
  }

  verifyHmac(rawBody: string, signature: string | undefined): boolean {
    if (!signature) return false;
    const expected = createHmac("sha256", this.options.hmacSecret).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * Network postback: a tracked order converted. The bridge reports the
   * conversion (reporter = its provider); the consumer-side agent
   * counter-signs to complete the dual signature.
   */
  async handlePostback(rawBody: string, signature: string | undefined) {
    if (!this.verifyHmac(rawBody, signature)) {
      throw new Error("postback rejected: bad HMAC signature");
    }
    if (!this.keys || !this.providerId) {
      throw new Error("bridge has no registered provider; run sync() first");
    }
    const postback = this.options.adapter.parsePostback(JSON.parse(rawBody));
    if (!this.itemsById.has(postback.item_id)) {
      throw new Error(`postback rejected: unknown item ${postback.item_id}`);
    }
    return this.options.attribution.submitEvent(
      createEnvelope({
        payload: {
          event_id: randomUUID(),
          auction_id: postback.auction_id,
          kind: "conversion",
          provider_id: this.providerId,
          value_usd: postback.commission_usd,
          rail_receipt: { rail: "affiliate", ref: `order:${postback.order_ref}` },
        },
        secretKey: this.keys.secretKey,
        keyId: this.providerId,
        nodeId: this.nodeId,
      }),
    );
  }
}
