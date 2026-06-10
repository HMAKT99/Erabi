import { createHmac, randomUUID } from "node:crypto";
import { and, eq, like, lt } from "drizzle-orm";
import { z } from "zod";
import { isValidCategory, SPEC_TAG, SPONSORED_LABEL, WELL_KNOWN_PATH } from "@erabi/constants";
import {
  CONSIDERATION_SET_AUDIT_DAYS,
  CPA_RESERVATION_HOURS,
  RESERVE_PRICE_USD,
} from "@erabi/config";
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
import { bidReservations, bids, decisionTuples, disclosures } from "./db/schema.js";
import type { AgentDirectory } from "./directory.js";
import { ExchangeError } from "./errors.js";
import { evaluateFilter, parseFilter } from "./filter.js";
import { rejectPii } from "./pii.js";

const utf8 = new TextEncoder();

const deleteBidZod = z.object({ bid_id: z.string().uuid() }).strict();

export interface AuctionSummary {
  auction_id: string;
  intent_id: string;
  consumer_id: string;
  category: string;
  organic_provider_ids: string[];
  sponsored: Array<{
    provider_id: string;
    disclosure_id: string;
    clearing_price_usd: number;
    payment_model: "cpa" | "cpc" | "rev_share";
  }>;
}

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
    // TTL: an intent whose answer deadline already passed (queued, retried,
    // or delayed in transit) must not clear an auction.
    if (this.now() - Date.parse(envelope.ts) > intent.ttl_ms) {
      throw new ExchangeError(
        "intent_expired",
        `intent ttl_ms (${intent.ttl_ms}) elapsed before processing`,
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
    // in the loop — unless a VERIFIED owner explicitly consented to
    // autonomous-spend sponsorship (the only permitted override).
    const policy = consumer.manifest.policy;
    const sponsorshipAllowed =
      policy.accepts_sponsored && (intent.human_in_loop || consumer.autonomousConsent);
    const maxSlots = sponsorshipAllowed
      ? sponsoredSlotBudget(organic.length, policy.max_sponsored_ratio)
      : 0;

    const candidates = maxSlots > 0 ? this.auctionCandidates(intent) : [];
    const reserve = RESERVE_PRICE_USD[intent.category.split(".")[0]!] ?? RESERVE_PRICE_USD.default!;
    let cleared = runAuction(candidates, { maxSlots, reservePriceUsd: reserve });

    // Budget pacing: a slot must fit within today's budget counting both
    // charged spend (CPC) and outstanding CPA reservations.
    this.releaseExpiredReservations();
    cleared = cleared.filter((slot) => {
      const row = this.db.select().from(bids).where(eq(bids.bidId, slot.candidate.bidId)).get();
      if (!row) return false;
      const budget = (row.payload as Bid).budget.daily_usd;
      return this.dailyCommittedUsd(row, nowIso.slice(0, 10)) + slot.clearingPriceUsd <= budget;
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
        if (slot.candidate.paymentModel === "cpc") {
          // CPC: the click-adjacent serve is the billable event.
          const spent = row.spendDate === spendDate ? row.spentTodayUsd : 0;
          tx.update(bids)
            .set({ spentTodayUsd: spent + slot.clearingPriceUsd, spendDate })
            .where(eq(bids.bidId, slot.candidate.bidId))
            .run();
        } else {
          // CPA / rev-share: reserve now, charge on confirmed outcome,
          // release if the window passes unconverted.
          tx.insert(bidReservations)
            .values({
              reservationId: randomUUID(),
              bidId: slot.candidate.bidId,
              auctionId,
              providerId: slot.candidate.providerId,
              amountUsd: slot.clearingPriceUsd,
              expiresAt: new Date(
                Date.parse(nowIso) + CPA_RESERVATION_HOURS * 3_600_000,
              ).toISOString(),
              createdAt: nowIso,
            })
            .run();
        }
      }
      tx.insert(decisionTuples)
        .values({
          intentId: intent.intent_id,
          auctionId,
          tuple: {
            intent_features: {
              agent_id: intent.agent_id,
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

  /** Party + clearing context for an auction — what attribution needs. */
  getAuctionSummary(auctionId: string): AuctionSummary | null {
    const row = this.db
      .select()
      .from(decisionTuples)
      .where(eq(decisionTuples.auctionId, auctionId))
      .get();
    if (!row) return null;
    const tuple = row.tuple as {
      intent_features: { agent_id: string; category: string };
      candidate_set: { organic: Array<{ provider_id: string }> };
    };
    const disclosureRows = this.db
      .select()
      .from(disclosures)
      .where(eq(disclosures.auctionId, auctionId))
      .all();
    return {
      auction_id: auctionId,
      intent_id: row.intentId,
      consumer_id: tuple.intent_features.agent_id,
      category: tuple.intent_features.category,
      organic_provider_ids: tuple.candidate_set.organic.map((o) => o.provider_id),
      sponsored: disclosureRows.map((d) => {
        const record = d.record as DisclosureRecord;
        return {
          provider_id: record.provider_id,
          disclosure_id: record.disclosure_id,
          clearing_price_usd: record.clearing_price_usd,
          payment_model: record.payment_model,
        };
      }),
    };
  }

  /** Charged + reserved budget for a bid on the given UTC day. */
  private dailyCommittedUsd(
    row: { bidId: string; spendDate: string; spentTodayUsd: number },
    date: string,
  ): number {
    const charged = row.spendDate === date ? row.spentTodayUsd : 0;
    const reserved = this.db
      .select()
      .from(bidReservations)
      .where(and(eq(bidReservations.bidId, row.bidId), like(bidReservations.createdAt, `${date}%`)))
      .all()
      .filter((r) => r.status !== "released")
      .reduce((sum, r) => sum + r.amountUsd, 0);
    return charged + reserved;
  }

  /** Attribution confirms a paid outcome: the CPA reservation becomes a charge. */
  settleSpend(auctionId: string, providerId: string): void {
    const reservation = this.db
      .select()
      .from(bidReservations)
      .where(
        and(
          eq(bidReservations.auctionId, auctionId),
          eq(bidReservations.providerId, providerId),
          eq(bidReservations.status, "active"),
        ),
      )
      .get();
    if (!reservation) return; // CPC, already settled, or expired
    this.db
      .update(bidReservations)
      .set({ status: "settled" })
      .where(eq(bidReservations.reservationId, reservation.reservationId))
      .run();
  }

  /** Release reservations whose conversion window passed; returns the count. */
  releaseExpiredReservations(): number {
    const nowIso = new Date(this.now()).toISOString();
    const expired = this.db
      .select()
      .from(bidReservations)
      .where(and(eq(bidReservations.status, "active"), lt(bidReservations.expiresAt, nowIso)))
      .all();
    for (const reservation of expired) {
      this.db
        .update(bidReservations)
        .set({ status: "released" })
        .where(eq(bidReservations.reservationId, reservation.reservationId))
        .run();
    }
    return expired.length;
  }

  /** Attribution writes outcomes back into the decision tuple (spec §10). */
  recordOutcome(
    auctionId: string,
    update: { selection: unknown; outcome: unknown; valueUsd: number | null },
  ): void {
    this.db
      .update(decisionTuples)
      .set({ selection: update.selection, outcome: update.outcome, valueUsd: update.valueUsd })
      .where(eq(decisionTuples.auctionId, auctionId))
      .run();
  }

  listBids(providerId?: string) {
    const rows = providerId
      ? this.db.select().from(bids).where(eq(bids.providerId, providerId)).all()
      : this.db.select().from(bids).all();
    return rows.filter((row) => row.active).map((row) => row.payload as Bid);
  }

  /**
   * Retention (spec privacy §9.7): decision tuples older than the audit
   * window keep their outcome aggregates but lose per-candidate detail.
   * (Raw query text is never stored at all — only its length.)
   */
  applyRetention(): number {
    const cutoff = new Date(this.now() - CONSIDERATION_SET_AUDIT_DAYS * 86_400_000).toISOString();
    const rows = this.db.select().from(decisionTuples).all();
    let redacted = 0;
    for (const row of rows) {
      if (row.createdAt >= cutoff) continue;
      const tuple = row.tuple as {
        redacted?: boolean;
        intent_features?: { category?: string; human_in_loop?: boolean };
        candidate_set?: { organic?: unknown[]; auction?: unknown[] };
      };
      if (tuple.redacted) continue;
      this.db
        .update(decisionTuples)
        .set({
          tuple: {
            redacted: true,
            intent_features: {
              category: tuple.intent_features?.category,
              human_in_loop: tuple.intent_features?.human_in_loop,
            },
            candidate_counts: {
              organic: tuple.candidate_set?.organic?.length ?? 0,
              auction: tuple.candidate_set?.auction?.length ?? 0,
            },
          },
        })
        .where(eq(decisionTuples.intentId, row.intentId))
        .run();
      redacted += 1;
    }
    return redacted;
  }

  /**
   * Open dataset export (spec/DATASET.md): JSONL of decision tuples with
   * agent ids replaced by per-export pseudonyms and timestamps coarsened
   * to the hour. PII-free by construction.
   */
  exportTuples(options: { salt: string }): string {
    const pseudonym = (id: string) =>
      `agent_${createHmac("sha256", options.salt).update(id).digest("hex").slice(0, 12)}`;
    const AGENT_ID = /erabi:agent:[1-9A-HJ-NP-Za-km-z]+/g;
    const ISO_INSTANT = /^(\d{4}-\d{2}-\d{2}T\d{2}):\d{2}:\d{2}(?:\.\d+)?Z$/;
    const anonymize = (value: unknown): unknown => {
      if (typeof value === "string") {
        // Agent ids are pseudonymized wherever they appear, including
        // inside URLs; timestamps coarsen to the hour.
        const instant = ISO_INSTANT.exec(value);
        if (instant) return `${instant[1]}:00:00Z`;
        return value.replace(AGENT_ID, (id) => pseudonym(id));
      }
      if (Array.isArray(value)) return value.map(anonymize);
      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value).map(([key, child]) => [key, anonymize(child)]),
        );
      }
      return value;
    };

    const rows = this.db.select().from(decisionTuples).all();
    const lines = [
      JSON.stringify({
        dataset: "erabi-tuples",
        spec: SPEC_TAG,
        tuples: rows.length,
        exported_at: new Date(this.now()).toISOString().slice(0, 13) + ":00:00Z",
      }),
      ...rows.map((row) =>
        JSON.stringify({
          tuple: anonymize(row.tuple),
          selection: anonymize(row.selection),
          outcome: row.outcome,
          value_usd: row.valueUsd,
          created_at: row.createdAt.slice(0, 13) + ":00:00Z",
        }),
      ),
    ];
    return lines.join("\n") + "\n";
  }

  stats() {
    const tuples = this.db.select().from(decisionTuples).all();
    const disclosureRows = this.db.select().from(disclosures).all();
    const activeBids = this.db
      .select()
      .from(bids)
      .all()
      .filter((row) => row.active).length;
    const clearedUsd = disclosureRows.reduce(
      (sum, row) => sum + ((row.record as DisclosureRecord).clearing_price_usd ?? 0),
      0,
    );
    return {
      intents: tuples.length,
      auctions: tuples.length,
      sponsored_served: disclosureRows.length,
      active_bids: activeBids,
      cleared_usd: Number(clearedUsd.toFixed(6)),
    };
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
