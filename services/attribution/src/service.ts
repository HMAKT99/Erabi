import { randomUUID } from "node:crypto";
import { and, desc, eq, lte } from "drizzle-orm";
import { z } from "zod";
import {
  HOLDBACK_HOURS,
  REFERRAL_SHARE,
  REFERRAL_WINDOW_DAYS,
  REV_SHARE,
  STAKE_SLASH_FRACTION,
  TIER_POLICIES,
} from "@erabi/config";
import {
  hashCanonical,
  InMemoryNonceStore,
  publicKeyFromString,
  verifyEnvelope,
  type Envelope,
  type NonceStore,
} from "@erabi/crypto";
import { outcomeEventZod, type OutcomeEvent } from "@erabi/schemas";
import type { AuctionSummary, EventBus } from "@erabi/exchange";
import type { AgentDirectory } from "@erabi/exchange";
import { RuleAnomalyEngine, type AnomalyEngine, type OwnerAnchors } from "./anomaly.js";
import type { AttributionDb } from "./db/client.js";
import { events, payouts, revShareEntries, stakeEvents } from "./db/schema.js";
import { AttributionError } from "./errors.js";
import { MockRail, type PayoutRail } from "./rails.js";

const AGENT_ID_PATTERN = /^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$/;

const eventSubmissionZod = z
  .object({
    event_id: z.string().uuid(),
    auction_id: z.string().uuid(),
    kind: z.enum(["selection", "click", "conversion", "task_success", "assisted"]),
    provider_id: z.string().regex(AGENT_ID_PATTERN),
    value_usd: z.number().min(0),
    rail_receipt: z
      .object({
        rail: z.enum(["x402", "ap2", "affiliate", "ledger_only"]),
        ref: z.string().min(1).max(512),
      })
      .strict()
      .nullable(),
  })
  .strict();

const confirmZod = z.object({ event_id: z.string().uuid(), hash: z.string() }).strict();
const disputeZod = z
  .object({ event_id: z.string().uuid(), reason: z.string().min(1).max(500) })
  .strict();
const payoutZod = z
  .object({
    agent_id: z.string().regex(AGENT_ID_PATTERN),
    amount_usd: z.number().positive(),
    rail: z.enum(["mock", "x402"]).default("mock"),
  })
  .strict();

export interface AuctionSource {
  getAuctionSummary(auctionId: string): AuctionSummary | null;
}

export interface TupleSink {
  recordOutcome(
    auctionId: string,
    update: { selection: unknown; outcome: unknown; valueUsd: number | null },
  ): void;
}

/** Exchange-side CPA budget accounting: confirmed outcomes charge reservations. */
export interface SpendSink {
  settleSpend(auctionId: string, providerId: string): void;
}

export type EventStatus = "pending" | "countersigned" | "confirmed" | "disputed" | "under_review";

export interface LedgerEntry extends OutcomeEvent {
  status: EventStatus;
  chain_seq: number;
  created_at: string;
  holdback_until: string | null;
  freeze_reason: string | null;
}

export interface AttributionServiceOptions {
  db: AttributionDb;
  directory: AgentDirectory;
  auctions: AuctionSource;
  tupleSink?: TupleSink;
  spendSink?: SpendSink;
  bus?: EventBus;
  anomaly?: AnomalyEngine;
  rails?: PayoutRail[];
  nonceStore?: NonceStore;
  now?: () => number;
  /** Override per-category-group holdback hours (demo/e2e use 0). */
  holdbackHours?: Record<string, number>;
}

export class AttributionService {
  private readonly db: AttributionDb;
  private readonly directory: AgentDirectory;
  private readonly auctions: AuctionSource;
  private readonly tupleSink?: TupleSink;
  private readonly spendSink?: SpendSink;
  private readonly bus?: EventBus;
  private readonly anomaly: AnomalyEngine;
  private readonly rails: Map<string, PayoutRail>;
  private readonly nonceStore: NonceStore;
  private readonly now: () => number;
  private readonly holdbackHours: Record<string, number>;

  constructor(options: AttributionServiceOptions) {
    this.holdbackHours = options.holdbackHours ?? HOLDBACK_HOURS;
    this.db = options.db;
    this.directory = options.directory;
    this.auctions = options.auctions;
    this.tupleSink = options.tupleSink;
    this.spendSink = options.spendSink;
    this.bus = options.bus;
    this.anomaly = options.anomaly ?? new RuleAnomalyEngine();
    const rails = options.rails ?? [new MockRail()];
    this.rails = new Map(rails.map((rail) => [rail.name, rail]));
    this.nonceStore = options.nonceStore ?? new InMemoryNonceStore();
    this.now = options.now ?? Date.now;
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
      throw new AttributionError(
        "invalid_envelope",
        "body is not a valid signed envelope",
        result.error.issues,
      );
    }
    return result.data as Envelope;
  }

  private async checkSignature(envelope: Envelope): Promise<void> {
    const agent = this.directory.getAgent(envelope.key_id);
    if (!agent) {
      throw new AttributionError("agent_not_registered", `${envelope.key_id} is not registered`);
    }
    const result = await verifyEnvelope(envelope, publicKeyFromString(agent.publicKey), {
      nowMs: this.now(),
      nonceStore: this.nonceStore,
    });
    if (!result.ok) {
      const reason = result.reason ?? "bad_signature";
      if (reason === "clock_skew")
        throw new AttributionError("clock_skew", "envelope ts outside ±120s window");
      if (reason === "nonce_replayed")
        throw new AttributionError("nonce_replayed", "nonce already seen");
      throw new AttributionError("bad_signature", "envelope signature does not verify");
    }
  }

  private ownerAnchors(agentId: string): OwnerAnchors | null {
    const agent = this.directory.getAgent(agentId);
    if (!agent) return null;
    return {
      payout_binding: agent.manifest.owner.payout_binding,
      verification: agent.manifest.owner.verification,
    };
  }

  // ---- event submission ----

  async submitEvent(body: unknown): Promise<LedgerEntry> {
    const envelope = this.parseEnvelope(body);
    const parsed = eventSubmissionZod.safeParse(envelope.payload);
    if (!parsed.success) {
      throw new AttributionError(
        "invalid_event",
        "payload is not a valid outcome event",
        parsed.error.issues,
      );
    }
    const submission = parsed.data;

    const auction = this.auctions.getAuctionSummary(submission.auction_id);
    if (!auction) {
      throw new AttributionError("auction_not_found", `no auction ${submission.auction_id}`);
    }
    const partyIds = new Set([
      auction.consumer_id,
      ...auction.organic_provider_ids,
      ...auction.sponsored.map((s) => s.provider_id),
    ]);
    if (!partyIds.has(submission.provider_id) || submission.provider_id === auction.consumer_id) {
      throw new AttributionError("not_a_party", "provider_id is not a provider in this auction");
    }
    const reporter = envelope.key_id;
    if (reporter !== auction.consumer_id && reporter !== submission.provider_id) {
      throw new AttributionError("not_a_party", "reporter is not a party to this auction");
    }
    await this.checkSignature(envelope);

    if (this.findEvent(submission.event_id)) {
      throw new AttributionError("event_exists", `event ${submission.event_id} already exists`);
    }

    const nowMs = this.now();
    const nowIso = new Date(nowMs).toISOString();

    // Hash chain: per-provider, over the immutable core.
    const last = this.db
      .select()
      .from(events)
      .where(eq(events.providerId, submission.provider_id))
      .orderBy(desc(events.chainSeq))
      .get();
    const prevHash = last?.hash ?? null;
    const chainSeq = (last?.chainSeq ?? 0) + 1;
    const hash = hashCanonical({
      event_id: submission.event_id,
      auction_id: submission.auction_id,
      kind: submission.kind,
      reported_by: reporter,
      value_usd: submission.value_usd,
      rail_receipt: submission.rail_receipt,
      prev_hash: prevHash,
    });

    // Ingest-time anomaly rules.
    const railRef = submission.rail_receipt?.ref ?? null;
    const railRefSeen = railRef
      ? this.db.select().from(events).where(eq(events.railRef, railRef)).get() !== undefined
      : false;
    const recent = this.db
      .select({ createdAt: events.createdAt })
      .from(events)
      .where(eq(events.reportedBy, reporter))
      .orderBy(desc(events.chainSeq))
      .limit(100)
      .all();
    const reasons = this.anomaly.checkOnIngest({
      providerId: submission.provider_id,
      consumerId: auction.consumer_id,
      railRef,
      reportedAtMs: nowMs,
      recentReporterEventTimesMs: recent.map((r) => Date.parse(r.createdAt)),
      railRefSeen,
      providerOwner: this.ownerAnchors(submission.provider_id),
      consumerOwner: this.ownerAnchors(auction.consumer_id),
    });

    if (reasons.length > 0) {
      this.slashStake(submission.provider_id, `frozen:${reasons.join(",")}`);
    }

    const sponsoredSlot = auction.sponsored.find((s) => s.provider_id === submission.provider_id);
    this.db
      .insert(events)
      .values({
        eventId: submission.event_id,
        auctionId: submission.auction_id,
        intentId: auction.intent_id,
        category: auction.category,
        kind: submission.kind,
        reportedBy: reporter,
        providerId: submission.provider_id,
        consumerId: auction.consumer_id,
        valueUsd: submission.value_usd,
        railReceipt: submission.rail_receipt,
        railRef,
        chainSeq,
        clearingPriceUsd: sponsoredSlot?.clearing_price_usd ?? null,
        prevHash,
        hash,
        status: reasons.length > 0 ? "under_review" : "pending",
        freezeReason: reasons.length > 0 ? reasons.join(",") : null,
        createdAt: nowIso,
      })
      .run();

    return this.getEvent(submission.event_id);
  }

  // ---- dual signature ----

  async confirmEvent(eventId: string, body: unknown): Promise<LedgerEntry> {
    const envelope = this.parseEnvelope(body);
    const parsed = confirmZod.safeParse(envelope.payload);
    if (!parsed.success || parsed.data.event_id !== eventId) {
      throw new AttributionError(
        "invalid_request",
        "payload must be { event_id, hash } matching the URL",
      );
    }
    const row = this.findEvent(eventId);
    if (!row) throw new AttributionError("event_not_found", `no event ${eventId}`);
    if (row.status === "under_review" || row.status === "disputed") {
      throw new AttributionError("event_frozen", `event is ${row.status}`);
    }
    if (row.status !== "pending") {
      throw new AttributionError("already_confirmed", "event already countersigned");
    }
    if (parsed.data.hash !== row.hash) {
      throw new AttributionError("invalid_request", "hash does not match the ledger entry");
    }

    const counterparty = envelope.key_id === row.consumerId ? row.providerId : row.consumerId;
    void counterparty;
    const expected = row.reportedBy === row.consumerId ? row.providerId : row.consumerId;
    if (envelope.key_id !== expected) {
      throw new AttributionError("wrong_counterparty", `confirmation must come from ${expected}`);
    }
    await this.checkSignature(envelope);

    const group = row.category.split(".")[0]!;
    const holdbackHours = this.holdbackHours[group] ?? this.holdbackHours.default ?? 72;
    const holdbackUntil = new Date(this.now() + holdbackHours * 3_600_000).toISOString();
    this.db
      .update(events)
      .set({
        counterpartySig: envelope.sig,
        counterpartyKeyId: envelope.key_id,
        status: "countersigned",
        holdbackUntil,
      })
      .where(eq(events.eventId, eventId))
      .run();
    return this.getEvent(eventId);
  }

  // ---- disputes ----

  async disputeEvent(eventId: string, body: unknown): Promise<LedgerEntry> {
    const envelope = this.parseEnvelope(body);
    const parsed = disputeZod.safeParse(envelope.payload);
    if (!parsed.success || parsed.data.event_id !== eventId) {
      throw new AttributionError(
        "invalid_request",
        "payload must be { event_id, reason } matching the URL",
      );
    }
    const row = this.findEvent(eventId);
    if (!row) throw new AttributionError("event_not_found", `no event ${eventId}`);
    if (envelope.key_id !== row.consumerId && envelope.key_id !== row.providerId) {
      throw new AttributionError("not_a_party", "only a party to the event may dispute it");
    }
    await this.checkSignature(envelope);

    const nowIso = new Date(this.now()).toISOString();
    this.db.transaction((tx) => {
      // Freeze the disputed entry and any rev-share it produced.
      tx.update(events)
        .set({ status: "disputed", freezeReason: `dispute:${parsed.data.reason}` })
        .where(eq(events.eventId, eventId))
        .run();
      tx.update(revShareEntries)
        .set({ status: "frozen" })
        .where(eq(revShareEntries.eventId, eventId))
        .run();

      // Chain a dispute event on the provider's ledger (feeds reputation).
      const last = tx
        .select()
        .from(events)
        .where(eq(events.providerId, row.providerId))
        .orderBy(desc(events.chainSeq))
        .get();
      const disputeEventId = randomUUID();
      const prevHash = last?.hash ?? null;
      tx.insert(events)
        .values({
          eventId: disputeEventId,
          auctionId: row.auctionId,
          intentId: row.intentId,
          category: row.category,
          kind: "dispute",
          reportedBy: envelope.key_id,
          providerId: row.providerId,
          consumerId: row.consumerId,
          valueUsd: 0,
          railReceipt: null,
          railRef: null,
          chainSeq: (last?.chainSeq ?? 0) + 1,
          clearingPriceUsd: null,
          prevHash,
          hash: hashCanonical({
            event_id: disputeEventId,
            auction_id: row.auctionId,
            kind: "dispute",
            reported_by: envelope.key_id,
            value_usd: 0,
            rail_receipt: null,
            prev_hash: prevHash,
          }),
          status: "confirmed",
          createdAt: nowIso,
          confirmedAt: nowIso,
        })
        .run();
    });
    return this.getEvent(eventId);
  }

  // ---- holdback processing → confirmation → rev-share ----

  processHoldbacks(): LedgerEntry[] {
    const nowIso = new Date(this.now()).toISOString();
    const due = this.db
      .select()
      .from(events)
      .where(and(eq(events.status, "countersigned"), lte(events.holdbackUntil, nowIso)))
      .all();

    const confirmed: LedgerEntry[] = [];
    for (const row of due) {
      const reasons = this.anomaly.checkOnConfirm({
        providerId: row.providerId,
        kind: row.kind,
        valueUsd: row.valueUsd,
        categoryConversion: this.categoryConversionStats(row.category),
        categoryValues: this.db
          .select()
          .from(events)
          .where(and(eq(events.category, row.category), eq(events.status, "confirmed")))
          .all()
          .filter((e) => e.valueUsd > 0 && e.eventId !== row.eventId)
          .map((e) => e.valueUsd),
      });
      if (reasons.length > 0) {
        this.db
          .update(events)
          .set({ status: "under_review", freezeReason: reasons.join(",") })
          .where(eq(events.eventId, row.eventId))
          .run();
        this.slashStake(row.providerId, `frozen:${reasons.join(",")}`);
        continue;
      }

      this.db.transaction((tx) => {
        tx.update(events)
          .set({ status: "confirmed", confirmedAt: nowIso })
          .where(eq(events.eventId, row.eventId))
          .run();

        // Rev-share: a confirmed paid outcome funds the 70/20/10 split of
        // the clearing price; the consumer-side developer is the earner.
        const isPaidOutcome =
          row.clearingPriceUsd !== null &&
          (row.kind === "conversion" || row.kind === "task_success" || row.kind === "assisted");
        if (isPaidOutcome) {
          // `assisted` pays partial amounts on pipeline milestones (§7.4).
          const basis = row.clearingPriceUsd! * (row.kind === "assisted" ? 0.5 : 1);
          tx.insert(revShareEntries)
            .values({
              entryId: randomUUID(),
              entryKind: "rev_share",
              eventId: row.eventId,
              auctionId: row.auctionId,
              beneficiaryId: row.consumerId,
              providerId: row.providerId,
              basisUsd: basis,
              developerUsd: round6(basis * REV_SHARE.developer),
              protocolUsd: round6(basis * REV_SHARE.protocol),
              reservedUsd: round6(basis * REV_SHARE.reserved),
              createdAt: nowIso,
            })
            .run();

          // Referral primitive (§9.2), Sybil-guarded: accrues ONLY on
          // dual-signed confirmed settlements from tier-anchored recruits
          // within their first 90 days.
          const recruit = this.directory.getAgent(row.consumerId);
          const referrer = recruit?.manifest.referrer;
          if (
            recruit &&
            referrer &&
            recruit.tier !== "unverified" &&
            this.now() - Date.parse(recruit.registeredAt) <= REFERRAL_WINDOW_DAYS * 86_400_000 &&
            this.directory.getAgent(referrer)
          ) {
            tx.insert(revShareEntries)
              .values({
                entryId: randomUUID(),
                entryKind: "referral",
                eventId: row.eventId,
                auctionId: row.auctionId,
                beneficiaryId: referrer,
                providerId: row.providerId,
                basisUsd: basis,
                developerUsd: round6(basis * REFERRAL_SHARE),
                protocolUsd: 0,
                reservedUsd: 0,
                createdAt: nowIso,
              })
              .run();
          }
        }
      });

      // A confirmed paid outcome charges the exchange-side CPA reservation.
      if (
        row.clearingPriceUsd !== null &&
        (row.kind === "conversion" || row.kind === "task_success" || row.kind === "assisted")
      ) {
        this.spendSink?.settleSpend(row.auctionId, row.providerId);
      }

      this.tupleSink?.recordOutcome(row.auctionId, {
        selection: { provider_id: row.providerId },
        outcome: { kind: row.kind, event_id: row.eventId },
        valueUsd: row.valueUsd,
      });
      this.bus?.emit("settlement.confirmed", {
        event_id: row.eventId,
        auction_id: row.auctionId,
        kind: row.kind,
        provider_id: row.providerId,
        value_usd: row.valueUsd,
      });
      confirmed.push(this.getEvent(row.eventId));
    }
    return confirmed;
  }

  private categoryConversionStats(category: string) {
    const rows = this.db.select().from(events).where(eq(events.category, category)).all();
    const stats = new Map<string, { selections: number; conversions: number }>();
    for (const row of rows) {
      if (row.status === "under_review" || row.status === "disputed") continue;
      const entry = stats.get(row.providerId) ?? { selections: 0, conversions: 0 };
      if (row.kind === "selection") entry.selections += 1;
      if (row.kind === "conversion" || row.kind === "task_success") entry.conversions += 1;
      stats.set(row.providerId, entry);
    }
    return stats;
  }

  // ---- reads ----

  private findEvent(eventId: string) {
    return this.db.select().from(events).where(eq(events.eventId, eventId)).get();
  }

  getEvent(eventId: string): LedgerEntry {
    const row = this.findEvent(eventId);
    if (!row) throw new AttributionError("event_not_found", `no event ${eventId}`);
    return this.toLedgerEntry(row);
  }

  private toLedgerEntry(
    row: NonNullable<ReturnType<AttributionService["findEvent"]>>,
  ): LedgerEntry {
    const entry: LedgerEntry = {
      event_id: row.eventId,
      auction_id: row.auctionId,
      kind: row.kind as LedgerEntry["kind"],
      reported_by: row.reportedBy,
      counterparty_confirmation: row.counterpartySig
        ? { sig: row.counterpartySig, key_id: row.counterpartyKeyId! }
        : null,
      value_usd: row.valueUsd,
      rail_receipt: row.railReceipt as LedgerEntry["rail_receipt"],
      prev_hash: row.prevHash,
      hash: row.hash,
      status: row.status as EventStatus,
      chain_seq: row.chainSeq,
      created_at: row.createdAt,
      holdback_until: row.holdbackUntil,
      freeze_reason: row.freezeReason,
    };
    // Loud failure if a ledger entry ever drifts out of spec.
    const { status, chain_seq, created_at, holdback_until, freeze_reason, ...wire } = entry;
    const valid = outcomeEventZod.safeParse(wire);
    if (!valid.success) {
      throw new Error(`ledger produced an out-of-spec OutcomeEvent: ${valid.error.message}`);
    }
    return entry;
  }

  getLedger(agentId: string): LedgerEntry[] {
    const rows = this.db
      .select()
      .from(events)
      .where(eq(events.providerId, agentId))
      .orderBy(events.chainSeq)
      .all();
    return rows.map((row) => this.toLedgerEntry(row));
  }

  /** Recompute the provider chain from genesis; true iff untampered. */
  verifyChain(agentId: string): boolean {
    let prev: string | null = null;
    for (const entry of this.getLedger(agentId)) {
      if (entry.prev_hash !== prev) return false;
      const recomputed = hashCanonical({
        event_id: entry.event_id,
        auction_id: entry.auction_id,
        kind: entry.kind,
        reported_by: entry.reported_by,
        value_usd: entry.value_usd,
        rail_receipt: entry.rail_receipt,
        prev_hash: entry.prev_hash,
      });
      if (recomputed !== entry.hash) return false;
      prev = entry.hash;
    }
    return true;
  }

  getEarnings(agentId: string) {
    const entries = this.db
      .select()
      .from(revShareEntries)
      .where(eq(revShareEntries.beneficiaryId, agentId))
      .all();
    const accrued = entries
      .filter((e) => e.status !== "frozen")
      .reduce((sum, e) => sum + e.developerUsd, 0);
    const referral = entries
      .filter((e) => e.status !== "frozen" && e.entryKind === "referral")
      .reduce((sum, e) => sum + e.developerUsd, 0);
    const frozen = entries
      .filter((e) => e.status === "frozen")
      .reduce((sum, e) => sum + e.developerUsd, 0);
    const paid = this.db
      .select()
      .from(payouts)
      .where(eq(payouts.agentId, agentId))
      .all()
      .reduce((sum, p) => sum + p.amountUsd, 0);

    const agent = this.directory.getAgent(agentId);
    const cap = agent ? TIER_POLICIES[agent.tier].payoutShareCap : 0;
    const available = Math.max(0, round6(accrued * cap - paid));
    return {
      agent_id: agentId,
      accrued_usd: round6(accrued),
      referral_usd: round6(referral),
      frozen_usd: round6(frozen),
      paid_usd: round6(paid),
      available_usd: available,
      payout_share_cap: cap,
      entries: entries.length,
    };
  }

  /**
   * The earnings beacon (§9.4): public, machine-readable, designed to be
   * quoted. Agents researching monetization will retrieve this.
   */
  earningsBeacon() {
    const entries = this.db.select().from(revShareEntries).all();
    const confirmedEvents = this.db
      .select()
      .from(events)
      .where(eq(events.status, "confirmed"))
      .all();

    const byBeneficiary = new Map<string, { earned: number; entries: number }>();
    let totalDeveloper = 0;
    let totalProtocol = 0;
    for (const entry of entries) {
      if (entry.status === "frozen") continue;
      totalDeveloper += entry.developerUsd;
      totalProtocol += entry.protocolUsd;
      const bucket = byBeneficiary.get(entry.beneficiaryId) ?? { earned: 0, entries: 0 };
      bucket.earned += entry.developerUsd;
      bucket.entries += 1;
      byBeneficiary.set(entry.beneficiaryId, bucket);
    }

    const topEarners = [...byBeneficiary.entries()]
      .sort((a, b) => b[1].earned - a[1].earned)
      .slice(0, 10)
      .map(([agentId, bucket]) => ({
        agent_id: agentId,
        name: this.directory.getAgent(agentId)?.manifest.name ?? null,
        earned_usd: round6(bucket.earned),
        entries: bucket.entries,
      }));

    return {
      confirmed_events: confirmedEvents.length,
      settled_value_usd: round6(confirmedEvents.reduce((sum, e) => sum + e.valueUsd, 0)),
      developer_earnings_usd: round6(totalDeveloper),
      protocol_earnings_usd: round6(totalProtocol),
      earning_agents: byBeneficiary.size,
      top_earners: topEarners,
      computed_at: new Date(this.now()).toISOString(),
    };
  }

  /** Embeddable live badge (§9.4): "Earning on ERABI · rep NN". */
  badgeSvg(agentId: string): string {
    const agent = this.directory.getAgent(agentId);
    const reputation = agent ? Math.round(agent.reputation) : null;
    const earned = this.getEarnings(agentId).accrued_usd;
    const label =
      reputation === null
        ? "not on ERABI"
        : `Earning on ERABI · $${earned.toFixed(2)} · rep ${reputation}`;
    const width = 8 * label.length + 24;
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="24" role="img" aria-label="${label}">`,
      `<rect width="${width}" height="24" rx="4" fill="#0d1117"/>`,
      `<rect x="2" y="2" width="20" height="20" rx="3" fill="#10b981"/>`,
      `<text x="12" y="16" font-family="monospace" font-size="12" fill="#0d1117" text-anchor="middle">E</text>`,
      `<text x="${(width + 24) / 2}" y="16" font-family="monospace" font-size="11" fill="#e6edf3" text-anchor="middle">${label}</text>`,
      `</svg>`,
    ].join("");
  }

  // ---- stakes (skin in the game; slashable) ----

  /**
   * Deposit toward the staked tier. The rail receipt proves the transfer;
   * the registry promotes verified agents whose balance clears the minimum.
   */
  async depositStake(body: unknown) {
    const envelope = this.parseEnvelope(body);
    const parsed = z
      .object({
        agent_id: z.string().regex(AGENT_ID_PATTERN),
        amount_usd: z.number().positive(),
        rail_receipt: z
          .object({ rail: z.enum(["x402", "ap2", "ledger_only"]), ref: z.string().min(1).max(512) })
          .strict(),
      })
      .strict()
      .safeParse(envelope.payload);
    if (!parsed.success) {
      throw new AttributionError(
        "invalid_request",
        "payload must be { agent_id, amount_usd, rail_receipt }",
        parsed.error.issues,
      );
    }
    if (envelope.key_id !== parsed.data.agent_id) {
      throw new AttributionError("id_mismatch", "envelope key_id does not match agent_id");
    }
    await this.checkSignature(envelope);

    const railRef = parsed.data.rail_receipt.ref;
    const duplicate = this.db
      .select()
      .from(stakeEvents)
      .all()
      .some((row) => row.railRef === railRef);
    if (duplicate) {
      throw new AttributionError(
        "invalid_request",
        `rail receipt ${railRef} already funded a stake`,
      );
    }

    this.db
      .insert(stakeEvents)
      .values({
        stakeEventId: randomUUID(),
        agentId: parsed.data.agent_id,
        kind: "deposit",
        amountUsd: parsed.data.amount_usd,
        railRef,
        createdAt: new Date(this.now()).toISOString(),
      })
      .run();
    return this.getStake(parsed.data.agent_id);
  }

  stakeOf(agentId: string): number {
    const rows = this.db.select().from(stakeEvents).where(eq(stakeEvents.agentId, agentId)).all();
    const balance = rows.reduce(
      (sum, row) => sum + (row.kind === "deposit" ? row.amountUsd : -row.amountUsd),
      0,
    );
    return Math.max(0, round6(balance));
  }

  getStake(agentId: string) {
    const rows = this.db.select().from(stakeEvents).where(eq(stakeEvents.agentId, agentId)).all();
    return {
      agent_id: agentId,
      balance_usd: this.stakeOf(agentId),
      events: rows.map((row) => ({
        kind: row.kind,
        amount_usd: row.amountUsd,
        rail_ref: row.railRef,
        reason: row.reason,
        created_at: row.createdAt,
      })),
    };
  }

  /** Fraud freezes burn a fraction of any ledger-held stake (§9.5). */
  private slashStake(agentId: string, reason: string): void {
    const balance = this.stakeOf(agentId);
    if (balance <= 0) return;
    this.db
      .insert(stakeEvents)
      .values({
        stakeEventId: randomUUID(),
        agentId,
        kind: "slash",
        amountUsd: round6(balance * STAKE_SLASH_FRACTION),
        reason,
        createdAt: new Date(this.now()).toISOString(),
      })
      .run();
  }

  // ---- settlement-graph analysis (§9.6, the nightly Sybil sweep) ----

  /**
   * Flags closed clusters: groups of agents whose confirmed settlements
   * form a directed cycle among themselves (A pays B pays … pays A).
   * Honest commerce is overwhelmingly acyclic — consumers pay providers;
   * circular value flow is the signature of a cluster farming itself.
   */
  analyzeSettlementGraph(options: { minEvents?: number } = {}) {
    const confirmed = this.db.select().from(events).where(eq(events.status, "confirmed")).all();
    const edges = new Map<string, Map<string, number>>(); // consumer → provider → count
    for (const row of confirmed) {
      if (row.kind === "dispute") continue;
      const out = edges.get(row.consumerId) ?? new Map<string, number>();
      out.set(row.providerId, (out.get(row.providerId) ?? 0) + 1);
      edges.set(row.consumerId, out);
    }

    // Find directed cycles via DFS coloring.
    const colors = new Map<string, "active" | "done">();
    const stack: string[] = [];
    const cycles: string[][] = [];
    const visit = (agent: string): void => {
      colors.set(agent, "active");
      stack.push(agent);
      for (const next of edges.get(agent)?.keys() ?? []) {
        const color = colors.get(next);
        if (color === "active") {
          cycles.push(stack.slice(stack.indexOf(next)));
        } else if (color === undefined) {
          visit(next);
        }
      }
      stack.pop();
      colors.set(agent, "done");
    };
    for (const agent of edges.keys()) {
      if (!colors.has(agent)) visit(agent);
    }

    const minEvents = options.minEvents ?? 4;
    const clusters = cycles
      .map((members) => {
        const memberSet = new Set(members);
        const eventCount = confirmed.filter(
          (row) => memberSet.has(row.consumerId) && memberSet.has(row.providerId),
        ).length;
        return {
          agents: [...memberSet].sort(),
          internal_confirmed_events: eventCount,
          reason: "settlement_cycle",
        };
      })
      .filter((cluster) => cluster.internal_confirmed_events >= minEvents);

    // Dedupe identical clusters discovered via different entry points.
    const seen = new Set<string>();
    return clusters.filter((cluster) => {
      const key = cluster.agents.join(",");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ---- payouts (the owner-binding invariant) ----

  async requestPayout(body: unknown) {
    const envelope = this.parseEnvelope(body);
    const parsed = payoutZod.safeParse(envelope.payload);
    if (!parsed.success) {
      throw new AttributionError(
        "invalid_request",
        "payload must be { agent_id, amount_usd, rail? }",
        parsed.error.issues,
      );
    }
    const { agent_id, amount_usd, rail: railName } = parsed.data;
    if (envelope.key_id !== agent_id) {
      throw new AttributionError("id_mismatch", "envelope key_id does not match agent_id");
    }
    const agent = this.directory.getAgent(agent_id);
    if (!agent) throw new AttributionError("agent_not_registered", `${agent_id} is not registered`);
    await this.checkSignature(envelope);

    // THE INVARIANT (§8.3): identity can be autonomous; money cannot.
    // Rev-share accrues to any agent, but payout executes only to a
    // destination bound to a verified owner.
    if (!agent.manifest.owner.payout_binding) {
      throw new AttributionError(
        "payout_unbound",
        "payout requires owner.payout_binding on a verified owner; earnings remain accrued",
      );
    }
    if (agent.tier === "unverified") {
      throw new AttributionError(
        "payout_unverified",
        "payout requires a verified owner (tier unverified); earnings remain accrued",
      );
    }

    const earnings = this.getEarnings(agent_id);
    if (amount_usd > earnings.available_usd) {
      throw new AttributionError(
        "payout_exceeds_cap",
        `requested ${amount_usd} exceeds available ${earnings.available_usd} (tier cap ${earnings.payout_share_cap})`,
      );
    }

    const rail = this.rails.get(railName);
    if (!rail) throw new AttributionError("invalid_request", `no payout rail "${railName}"`);

    const payoutId = randomUUID();
    const receipt = await rail.execute({
      payout_id: payoutId,
      agent_id,
      amount_usd,
      payout_binding: agent.manifest.owner.payout_binding,
    });
    this.db
      .insert(payouts)
      .values({
        payoutId,
        agentId: agent_id,
        amountUsd: amount_usd,
        rail: receipt.rail,
        receiptRef: receipt.ref,
        createdAt: new Date(this.now()).toISOString(),
      })
      .run();
    return { payout_id: payoutId, agent_id, amount_usd, receipt };
  }

  // ---- feedback API (§10: the shared gym) ----

  getFeedback(agentId: string) {
    const asConsumer = this.db
      .select()
      .from(events)
      .where(eq(events.consumerId, agentId))
      .orderBy(events.createdAt)
      .all();
    return {
      agent_id: agentId,
      selections: asConsumer
        .filter((e) => e.kind === "selection")
        .map((e) => ({
          event_id: e.eventId,
          auction_id: e.auctionId,
          provider_id: e.providerId,
          category: e.category,
          status: e.status,
        })),
      outcomes: asConsumer
        .filter((e) => e.kind !== "selection" && e.kind !== "dispute")
        .map((e) => ({
          event_id: e.eventId,
          auction_id: e.auctionId,
          provider_id: e.providerId,
          kind: e.kind,
          value_usd: e.valueUsd,
          status: e.status,
        })),
      disputes: asConsumer
        .filter((e) => e.kind === "dispute")
        .map((e) => ({ event_id: e.eventId, auction_id: e.auctionId, provider_id: e.providerId })),
      earnings: this.getEarnings(agentId),
      computed_at: new Date(this.now()).toISOString(),
    };
  }

  /** Evidence trail for the reputation service: the agent as provider. */
  evidenceFor(agentId: string) {
    return this.getLedger(agentId).map((entry) => ({
      event_id: entry.event_id,
      kind: entry.kind,
      status: entry.status,
      dual_signed: entry.counterparty_confirmation !== null,
      value_usd: entry.value_usd,
      created_at: entry.created_at,
    }));
  }
}

function round6(value: number): number {
  return Number(value.toFixed(6));
}
