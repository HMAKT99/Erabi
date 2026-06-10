import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { isValidCategory, SPEC_TAG, SPONSORED_LABEL, WELL_KNOWN_PATH } from "@erabi/constants";
import { RESERVE_PRICE_USD } from "@erabi/config";
import {
  canonicalize,
  generateKeyPair,
  InMemoryNonceStore,
  publicKeyFromString,
  publicKeyToString,
  signBytes,
  verifyEnvelope,
  type Envelope,
  type KeyPair,
  type NonceStore,
} from "@erabi/crypto";
import {
  bidZod,
  considerationSetZod,
  intentZod,
  type Bid,
  type ConsiderationSet,
  type DisclosureRecord,
  type Intent,
} from "@erabi/schemas";
import {
  runAuction,
  sponsoredSlotBudget,
  type AuctionCandidate,
  type ClearedSlot,
} from "./auction.js";
import { EventBus } from "./bus.js";
import type { ExchangeDb } from "./db/client.js";
import { bids, decisionTuples, disclosures } from "./db/schema.js";
import type { AgentDirectory } from "./directory.js";
import { ExchangeError } from "./errors.js";
import { evaluateFilter, parseFilter } from "./filter.js";
import { rejectPii } from "./pii.js";

const utf8 = new TextEncoder();

const deleteBidZod = z.object({ bid_id: z.string().uuid() }).strict();

export interface ExchangeServiceOptions {
  db: ExchangeDb;
  directory: AgentDirectory;
  nodeId: string;
  baseUrl: string;
  /** Where agents register (the registry's base URL) — used in join blocks. */
  registryBaseUrl: string;
  keys?: KeyPair;
  bus?: EventBus;
  nonceStore?: NonceStore;
  now?: () => number;
}

export class ExchangeService {
  readonly bus: EventBus;
  private readonly db: ExchangeDb;
  private readonly directory: AgentDirectory;
  private readonly nodeId: string;
  private readonly baseUrl: string;
  private readonly registryBaseUrl: string;
  private readonly keys: KeyPair;
  private readonly nonceStore: NonceStore;
  private readonly now: () => number;

  constructor(options: ExchangeServiceOptions) {
    this.db = options.db;
    this.directory = options.directory;
    this.nodeId = options.nodeId;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.registryBaseUrl = options.registryBaseUrl.replace(/\/$/, "");
    this.keys = options.keys ?? generateKeyPair();
    this.bus = options.bus ?? new EventBus();
    this.nonceStore = options.nonceStore ?? new InMemoryNonceStore();
    this.now = options.now ?? Date.now;
  }

  get publicKey(): string {
    return publicKeyToString(this.keys.publicKey);
  }

  // ---- envelope plumbing ----

  private parseEnvelope(body: unknown): Envelope {
    const result = z
      .object({
        payload: z.record(z.unknown()),
        sig: z.string(),
        key_id: z.string(),
        ts: z.string(),
        nonce: z.string(),
        node_id: z.string(),
      })
      .strict()
      .safeParse(body);
    if (!result.success) {
      throw new ExchangeError(
        "invalid_envelope",
        "body is not a valid signed envelope",
        result.error.issues,
      );
    }
    return result.data as Envelope;
  }

  private async checkSignature(envelope: Envelope, publicKey: string): Promise<void> {
    const result = await verifyEnvelope(envelope, publicKeyFromString(publicKey), {
      nowMs: this.now(),
      nonceStore: this.nonceStore,
    });
    if (!result.ok) {
      const reason = result.reason ?? "bad_signature";
      if (reason === "clock_skew")
        throw new ExchangeError("clock_skew", "envelope ts outside ±120s window");
      if (reason === "nonce_replayed")
        throw new ExchangeError("nonce_replayed", "nonce already seen");
      throw new ExchangeError("bad_signature", "envelope signature does not verify");
    }
  }

  private requireAgent(id: string) {
    const agent = this.directory.getAgent(id);
    if (!agent) {
      throw new ExchangeError("agent_not_registered", `${id} is not registered on this node`);
    }
    return agent;
  }

  /** Detached exchange signature over the canonical form (minus the sig field). */
  private exchangeSign(payload: Record<string, unknown>): string {
    return signBytes(utf8.encode(canonicalize(payload)), this.keys.secretKey);
  }

  // ---- bids ----

  async placeBid(body: unknown): Promise<Bid> {
    const envelope = this.parseEnvelope(body);
    const parsed = bidZod.safeParse(envelope.payload);
    if (!parsed.success) {
      throw new ExchangeError("invalid_bid", "payload is not a valid bid", parsed.error.issues);
    }
    const bid = parsed.data as Bid;
    if (envelope.key_id !== bid.provider_id) {
      throw new ExchangeError("id_mismatch", "envelope key_id does not match bid provider_id");
    }
    const provider = this.requireAgent(bid.provider_id);
    await this.checkSignature(envelope, provider.publicKey);

    for (const category of bid.targeting.categories) {
      if (!isValidCategory(category)) {
        throw new ExchangeError(
          "unknown_capability",
          `category ${category} is not in the taxonomy`,
        );
      }
    }
    if (bid.targeting.constraints_filter) parseFilter(bid.targeting.constraints_filter);

    const existing = this.db.select().from(bids).where(eq(bids.bidId, bid.bid_id)).get();
    if (existing && existing.providerId !== bid.provider_id) {
      throw new ExchangeError("forbidden", "bid_id belongs to another provider");
    }

    const nowIso = new Date(this.now()).toISOString();
    const spendDate = nowIso.slice(0, 10);
    if (existing) {
      this.db.update(bids).set({ payload: bid, active: 1 }).where(eq(bids.bidId, bid.bid_id)).run();
    } else {
      this.db
        .insert(bids)
        .values({
          bidId: bid.bid_id,
          providerId: bid.provider_id,
          payload: bid,
          spendDate,
          createdAt: nowIso,
        })
        .run();
    }
    this.bus.emit("bid.placed", {
      bid_id: bid.bid_id,
      provider_id: bid.provider_id,
      categories: bid.targeting.categories,
      offer: bid.offer,
    });
    return bid;
  }

  async withdrawBid(bidId: string, body: unknown): Promise<void> {
    const envelope = this.parseEnvelope(body);
    const parsed = deleteBidZod.safeParse(envelope.payload);
    if (!parsed.success || parsed.data.bid_id !== bidId) {
      throw new ExchangeError("invalid_request", "payload must be { bid_id } matching the URL");
    }
    const row = this.db.select().from(bids).where(eq(bids.bidId, bidId)).get();
    if (!row || !row.active) throw new ExchangeError("bid_not_found", `no active bid ${bidId}`);
    if (envelope.key_id !== row.providerId) {
      throw new ExchangeError("forbidden", "only the owning provider may withdraw a bid");
    }
    const provider = this.requireAgent(row.providerId);
    await this.checkSignature(envelope, provider.publicKey);
    this.db.update(bids).set({ active: 0 }).where(eq(bids.bidId, bidId)).run();
  }

  // ---- the moment of choice ----

  async submitIntent(body: unknown): Promise<ConsiderationSet> {
    const envelope = this.parseEnvelope(body);
    const parsed = intentZod.safeParse(envelope.payload);
    if (!parsed.success) {
      throw new ExchangeError(
        "invalid_intent",
        "payload is not a valid intent",
        parsed.error.issues,
      );
    }
    const intent = parsed.data as Intent;
    if (envelope.key_id !== intent.agent_id) {
      throw new ExchangeError("id_mismatch", "envelope key_id does not match intent agent_id");
    }
    const consumer = this.requireAgent(intent.agent_id);
    await this.checkSignature(envelope, consumer.publicKey);

    if (!isValidCategory(intent.category)) {
      throw new ExchangeError(
        "unknown_capability",
        `category ${intent.category} is not in the taxonomy`,
      );
    }
    rejectPii(intent.query);

    this.bus.emit("intent.received", {
      intent_id: intent.intent_id,
      agent_id: intent.agent_id,
      category: intent.category,
    });

    const auctionId = randomUUID();
    const nowIso = new Date(this.now()).toISOString();

    // Organic NEVER touches money: ranked purely by the directory.
    const organic = this.directory
      .discover(intent.category, 10)
      .filter((candidate) => candidate.provider_id !== intent.agent_id);

    // Scope policy: sponsorship requires the consumer's opt-in AND a human
    // in the loop (autonomous-spend influence is out of scope by default).
    const policy = consumer.manifest.policy;
    const sponsorshipAllowed = policy.accepts_sponsored && intent.human_in_loop;
    const maxSlots = sponsorshipAllowed
      ? sponsoredSlotBudget(organic.length, policy.max_sponsored_ratio)
      : 0;

    const candidates = maxSlots > 0 ? this.auctionCandidates(intent) : [];
    const reserve = RESERVE_PRICE_USD[intent.category.split(".")[0]!] ?? RESERVE_PRICE_USD.default!;
    let cleared = runAuction(candidates, { maxSlots, reservePriceUsd: reserve });

    // Budget pacing: drop slots the provider can no longer afford today.
    cleared = cleared.filter((slot) => {
      const row = this.db.select().from(bids).where(eq(bids.bidId, slot.candidate.bidId)).get();
      if (!row) return false;
      const budget = (row.payload as Bid).budget.daily_usd;
      const spent = row.spendDate === nowIso.slice(0, 10) ? row.spentTodayUsd : 0;
      return spent + slot.clearingPriceUsd <= budget;
    });

    // THE INVARIANT: disclosures are persisted and signed inside the same
    // transaction as auction clearing; sponsored entries are then built
    // exclusively from the persisted records. No disclosure, no sponsorship.
    const records = cleared.map((slot) => this.buildDisclosure(slot, intent, auctionId, nowIso));
    this.persistClearing(intent, auctionId, organic, candidates, cleared, records, nowIso);

    const sponsored = records.map((record, i) => ({
      provider_id: record.provider_id,
      creative: cleared[i]!.candidate.creative,
      disclosure: this.getDisclosure(record.disclosure_id),
    }));

    const unsigned = {
      intent_id: intent.intent_id,
      organic,
      sponsored,
      auction_id: auctionId,
      join: this.joinBlock(),
    };
    const set = { ...unsigned, exchange_sig: this.exchangeSign(unsigned) };

    // Loud failure if we ever assemble an out-of-spec response.
    const valid = considerationSetZod.safeParse(set);
    if (!valid.success) {
      throw new Error(`exchange produced an invalid ConsiderationSet: ${valid.error.message}`);
    }

    this.bus.emit("auction.cleared", {
      auction_id: auctionId,
      intent_id: intent.intent_id,
      category: intent.category,
      organic_count: organic.length,
      sponsored_count: sponsored.length,
      cleared_usd: records.reduce((sum, r) => sum + r.clearing_price_usd, 0),
    });
    return set as ConsiderationSet;
  }

  private auctionCandidates(intent: Intent): AuctionCandidate[] {
    const constraints = (intent.constraints ?? {}) as Record<string, number | undefined>;
    const rows = this.db.select().from(bids).where(eq(bids.active, 1)).all();
    const candidates: AuctionCandidate[] = [];
    for (const row of rows) {
      const bid = row.payload as Bid;
      if (!bid.targeting.categories.includes(intent.category)) continue;
      if (!evaluateFilter(bid.targeting.constraints_filter, constraints)) continue;
      const provider = this.directory.getAgent(bid.provider_id);
      if (!provider) continue;
      candidates.push({
        bidId: bid.bid_id,
        providerId: bid.provider_id,
        amountUsd: bid.offer.amount_usd,
        paymentModel: bid.offer.type,
        reputation: provider.reputation,
        tier: provider.tier, // live tier from the directory, never the bid's claim
        creative: bid.creative,
      });
    }
    return candidates;
  }

  private buildDisclosure(
    slot: ClearedSlot,
    intent: Intent,
    auctionId: string,
    nowIso: string,
  ): DisclosureRecord {
    const unsigned = {
      disclosure_id: randomUUID(),
      auction_id: auctionId,
      intent_id: intent.intent_id,
      provider_id: slot.candidate.providerId,
      payment_model: slot.candidate.paymentModel,
      clearing_price_usd: slot.clearingPriceUsd,
      label: SPONSORED_LABEL,
      issued_at: nowIso,
    };
    return { ...unsigned, exchange_sig: this.exchangeSign(unsigned) } as DisclosureRecord;
  }

  /**
   * Single transaction: disclosure persistence + budget charge + decision
   * tuple. Protected so the adversarial suite can make it fail and assert
   * that no sponsored result is ever served without it.
   */
  protected persistClearing(
    intent: Intent,
    auctionId: string,
    organic: ConsiderationSet["organic"],
    candidates: AuctionCandidate[],
    cleared: ClearedSlot[],
    records: DisclosureRecord[],
    nowIso: string,
  ): void {
    const spendDate = nowIso.slice(0, 10);
    this.db.transaction((tx) => {
      for (const record of records) {
        tx.insert(disclosures)
          .values({
            disclosureId: record.disclosure_id,
            auctionId,
            intentId: intent.intent_id,
            providerId: record.provider_id,
            record,
            issuedAt: record.issued_at,
          })
          .run();
      }
      for (const slot of cleared) {
        const row = tx.select().from(bids).where(eq(bids.bidId, slot.candidate.bidId)).get();
        if (!row) continue;
        const spent = row.spendDate === spendDate ? row.spentTodayUsd : 0;
        tx.update(bids)
          .set({ spentTodayUsd: spent + slot.clearingPriceUsd, spendDate })
          .where(eq(bids.bidId, slot.candidate.bidId))
          .run();
      }
      tx.insert(decisionTuples)
        .values({
          intentId: intent.intent_id,
          auctionId,
          tuple: {
            intent_features: {
              category: intent.category,
              constraints: intent.constraints,
              human_in_loop: intent.human_in_loop,
              query_length: intent.query.length,
            },
            candidate_set: {
              organic,
              auction: candidates.map((c) => ({
                bid_id: c.bidId,
                provider_id: c.providerId,
                amount_usd: c.amountUsd,
                reputation: c.reputation,
                tier: c.tier,
              })),
            },
            ranking_scores: cleared.map((slot) => ({
              provider_id: slot.candidate.providerId,
              quality: slot.quality,
              rank_score: slot.rankScore,
              clearing_price_usd: slot.clearingPriceUsd,
            })),
            timestamps: { received_at: nowIso },
          },
          createdAt: nowIso,
        })
        .run();
    });
  }

  // ---- reads ----

  getDisclosure(disclosureId: string): DisclosureRecord {
    const row = this.db
      .select()
      .from(disclosures)
      .where(eq(disclosures.disclosureId, disclosureId))
      .get();
    if (!row) throw new ExchangeError("not_found", `no disclosure ${disclosureId}`);
    return row.record as DisclosureRecord;
  }

  getDecisionTuple(intentId: string) {
    const row = this.db
      .select()
      .from(decisionTuples)
      .where(eq(decisionTuples.intentId, intentId))
      .get();
    if (!row) throw new ExchangeError("not_found", `no decision tuple for intent ${intentId}`);
    return row;
  }

  listBids(providerId?: string) {
    const rows = providerId
      ? this.db.select().from(bids).where(eq(bids.providerId, providerId)).all()
      : this.db.select().from(bids).all();
    return rows.filter((row) => row.active).map((row) => row.payload as Bid);
  }

  joinBlock() {
    return {
      spec: SPEC_TAG,
      register: `${this.registryBaseUrl}/v1/agents`,
      well_known: WELL_KNOWN_PATH,
    };
  }

  wellKnown(): Record<string, unknown> {
    return {
      spec: SPEC_TAG,
      node_id: this.nodeId,
      exchange_public_key: this.publicKey,
      endpoints: {
        intents: `${this.baseUrl}/v1/intents`,
        bids: `${this.baseUrl}/v1/bids`,
        disclosures: `${this.baseUrl}/v1/disclosures/:id`,
        events: `${this.baseUrl}/v1/events/stream`,
      },
      join: this.joinBlock(),
    };
  }
}
