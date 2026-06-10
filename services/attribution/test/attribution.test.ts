import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { sha256Hex } from "@erabi/crypto";
import { outcomeEventZod } from "@erabi/schemas";
import type { NetworkEvent } from "@erabi/exchange";
import {
  fireIntent,
  HOUR,
  makeAgent,
  makeBid,
  register,
  reportAndConfirm,
  setupPipeline,
  signedRequest,
  verifyViaDns,
  type Pipeline,
  type TestAgent,
} from "./helpers.js";

let p: Pipeline;

beforeEach(() => {
  p = setupPipeline();
});

/** Consumer + 3 providers + a sponsored winner, one intent fired. */
async function sponsoredAuction() {
  const consumer = makeAgent(
    "Coordinator",
    ["agent.analysis"],
    { acceptsSponsored: true },
    p.clock,
  );
  const providers = [
    makeAgent("P1", ["agent.research"], {}, p.clock),
    makeAgent("P2", ["agent.research"], {}, p.clock),
    makeAgent("P3", ["agent.research"], {}, p.clock),
  ];
  await register(p, consumer, ...providers);
  const winner = providers[0]!;
  const runnerUp = providers[1]!;
  await p.exchange.placeBid(
    signedRequest(winner, makeBid(winner, { offer: { type: "cpa", amount_usd: 2 } }), p.clock),
  );
  await p.exchange.placeBid(
    signedRequest(runnerUp, makeBid(runnerUp, { offer: { type: "cpa", amount_usd: 1 } }), p.clock),
  );
  const set = await fireIntent(p, consumer);
  expect(set.sponsored.map((s) => s.provider_id)).toContain(winner.id);
  return { consumer, providers, winner, set };
}

describe("ledger flow (golden path)", () => {
  it("selection → dual signature → holdback → confirmed settlement with rev-share", async () => {
    const { consumer, winner, set } = await sponsoredAuction();

    const selection = await reportAndConfirm(p, {
      reporter: consumer,
      counterparty: winner,
      auctionId: set.auction_id,
      providerId: winner.id,
      kind: "selection",
    });
    expect(selection.status).toBe("countersigned");

    const success = await reportAndConfirm(p, {
      reporter: consumer,
      counterparty: winner,
      auctionId: set.auction_id,
      providerId: winner.id,
      kind: "task_success",
      valueUsd: 2,
      railRef: "tx:golden-1",
    });
    expect(success.counterparty_confirmation).not.toBeNull();
    expect(outcomeEventZod.safeParse(stripLocal(success)).success).toBe(true);

    // Nothing confirms inside the holdback window.
    expect(p.attribution.processHoldbacks()).toHaveLength(0);

    p.clock.advance(25 * HOUR); // agent.* holdback is 24h
    const events: NetworkEvent[] = [];
    const unsubscribe = p.bus.subscribe((e) => events.push(e));
    const confirmed = p.attribution.processHoldbacks();
    unsubscribe();
    expect(confirmed.map((e) => e.event_id)).toContain(success.event_id);

    // The hash chain holds.
    expect(p.attribution.verifyChain(winner.id)).toBe(true);

    // Rev-share: 70/20/10 of the 1.0 clearing price to the consumer-side developer.
    const earnings = p.attribution.getEarnings(consumer.id);
    expect(earnings.accrued_usd).toBeCloseTo(0.7, 6);

    // The decision tuple closed the loop (spec §10).
    const tuple = p.exchange.getDecisionTuple(set.intent_id);
    expect(tuple.selection).toEqual({ provider_id: winner.id });
    expect(tuple.valueUsd).toBe(2);

    // settlement.confirmed went out on the wire.
    expect(events.some((e) => e.type === "settlement.confirmed")).toBe(true);

    // Feedback API serves the loop back as reward data.
    const feedback = p.attribution.getFeedback(consumer.id);
    expect(feedback.selections).toHaveLength(1);
    expect(feedback.outcomes.some((o) => o.kind === "task_success")).toBe(true);
  });

  it("single-sided events never confirm", async () => {
    const { consumer, winner, set } = await sponsoredAuction();
    const entry = await reportAndConfirm(p, {
      reporter: consumer,
      counterparty: winner,
      auctionId: set.auction_id,
      providerId: winner.id,
      kind: "task_success",
      valueUsd: 2,
      confirm: false,
    });
    expect(entry.status).toBe("pending");
    p.clock.advance(100 * HOUR);
    expect(p.attribution.processHoldbacks()).toHaveLength(0);
    expect(p.attribution.getEvent(entry.event_id).status).toBe("pending");
    expect(p.attribution.getEarnings(consumer.id).accrued_usd).toBe(0);
  });

  it("only the true counterparty can confirm, and only over the exact hash", async () => {
    const { consumer, providers, winner, set } = await sponsoredAuction();
    const entry = await reportAndConfirm(p, {
      reporter: consumer,
      counterparty: winner,
      auctionId: set.auction_id,
      providerId: winner.id,
      kind: "selection",
      confirm: false,
    });

    // A third party cannot confirm.
    await expect(
      p.attribution.confirmEvent(
        entry.event_id,
        signedRequest(providers[2]!, { event_id: entry.event_id, hash: entry.hash }, p.clock),
      ),
    ).rejects.toMatchObject({ code: "wrong_counterparty" });

    // The reporter cannot self-confirm.
    await expect(
      p.attribution.confirmEvent(
        entry.event_id,
        signedRequest(consumer, { event_id: entry.event_id, hash: entry.hash }, p.clock),
      ),
    ).rejects.toMatchObject({ code: "wrong_counterparty" });

    // The counterparty cannot confirm a different hash.
    await expect(
      p.attribution.confirmEvent(
        entry.event_id,
        signedRequest(winner, { event_id: entry.event_id, hash: sha256Hex("forged") }, p.clock),
      ),
    ).rejects.toMatchObject({ code: "invalid_request" });
  });

  it("rejects events from non-parties and for unknown auctions", async () => {
    const { winner, set } = await sponsoredAuction();
    const outsider = makeAgent("Outsider", ["agent.research"], {}, p.clock);
    await register(p, outsider);

    await expect(
      p.attribution.submitEvent(
        signedRequest(
          outsider,
          {
            event_id: randomUUID(),
            auction_id: set.auction_id,
            kind: "selection",
            provider_id: winner.id,
            value_usd: 0,
            rail_receipt: null,
          },
          p.clock,
        ),
      ),
    ).rejects.toMatchObject({ code: "not_a_party" });

    await expect(
      p.attribution.submitEvent(
        signedRequest(
          winner,
          {
            event_id: randomUUID(),
            auction_id: randomUUID(),
            kind: "selection",
            provider_id: winner.id,
            value_usd: 0,
            rail_receipt: null,
          },
          p.clock,
        ),
      ),
    ).rejects.toMatchObject({ code: "auction_not_found" });
  });
});

describe("disputes", () => {
  it("freeze the entry, freeze its rev-share, and chain a dispute event", async () => {
    const { consumer, winner, set } = await sponsoredAuction();
    const success = await reportAndConfirm(p, {
      reporter: consumer,
      counterparty: winner,
      auctionId: set.auction_id,
      providerId: winner.id,
      kind: "task_success",
      valueUsd: 2,
    });
    p.clock.advance(25 * HOUR);
    p.attribution.processHoldbacks();
    expect(p.attribution.getEarnings(consumer.id).accrued_usd).toBeCloseTo(0.7, 6);

    await p.attribution.disputeEvent(
      success.event_id,
      signedRequest(winner, { event_id: success.event_id, reason: "outcome misreported" }, p.clock),
    );

    expect(p.attribution.getEvent(success.event_id).status).toBe("disputed");
    const earnings = p.attribution.getEarnings(consumer.id);
    expect(earnings.accrued_usd).toBe(0);
    expect(earnings.frozen_usd).toBeCloseTo(0.7, 6);

    const ledger = p.attribution.getLedger(winner.id);
    expect(ledger.some((e) => e.kind === "dispute")).toBe(true);
    expect(p.attribution.verifyChain(winner.id)).toBe(true);
  });
});

describe("the payout-binding invariant (§8.3, adversarial)", () => {
  async function earnedConsumer(options: { payoutBinding?: string | null; verify?: boolean }) {
    const consumer = makeAgent(
      "Earner",
      ["agent.analysis"],
      {
        acceptsSponsored: true,
        payoutBinding: options.payoutBinding,
        verification: ["dns:earner.example"],
      },
      p.clock,
    );
    const providers = [
      makeAgent("E1", ["agent.research"], {}, p.clock),
      makeAgent("E2", ["agent.research"], {}, p.clock),
      makeAgent("E3", ["agent.research"], {}, p.clock),
    ];
    await register(p, consumer, ...providers);
    if (options.verify) await verifyViaDns(p, consumer, "earner.example");
    const winner = providers[0]!;
    await p.exchange.placeBid(
      signedRequest(winner, makeBid(winner, { offer: { type: "cpa", amount_usd: 2 } }), p.clock),
    );
    await p.exchange.placeBid(
      signedRequest(
        providers[1]!,
        makeBid(providers[1]!, { offer: { type: "cpa", amount_usd: 1 } }),
        p.clock,
      ),
    );
    const set = await fireIntent(p, consumer);
    await reportAndConfirm(p, {
      reporter: consumer,
      counterparty: winner,
      auctionId: set.auction_id,
      providerId: winner.id,
      kind: "task_success",
      valueUsd: 2,
    });
    p.clock.advance(25 * HOUR);
    p.attribution.processHoldbacks();
    return consumer;
  }

  it("rejects payout to an agent without a payout binding — earnings stay accrued", async () => {
    const consumer = await earnedConsumer({ payoutBinding: null, verify: true });
    await expect(
      p.attribution.requestPayout(
        signedRequest(consumer, { agent_id: consumer.id, amount_usd: 0.1, rail: "mock" }, p.clock),
      ),
    ).rejects.toMatchObject({ code: "payout_unbound" });
    expect(p.rail.executed).toHaveLength(0);
    expect(p.attribution.getEarnings(consumer.id).accrued_usd).toBeCloseTo(0.7, 6);
  });

  it("rejects payout to an unverified owner even with a binding", async () => {
    const consumer = await earnedConsumer({
      payoutBinding: sha256Hex("bank-account"),
      verify: false,
    });
    await expect(
      p.attribution.requestPayout(
        signedRequest(consumer, { agent_id: consumer.id, amount_usd: 0.1, rail: "mock" }, p.clock),
      ),
    ).rejects.toMatchObject({ code: "payout_unverified" });
    expect(p.rail.executed).toHaveLength(0);
  });

  it("rejects an agent requesting someone else's payout", async () => {
    const consumer = await earnedConsumer({ payoutBinding: sha256Hex("acct"), verify: true });
    const thief = makeAgent("Thief", ["agent.research"], {}, p.clock);
    await register(p, thief);
    await expect(
      p.attribution.requestPayout(
        signedRequest(thief, { agent_id: consumer.id, amount_usd: 0.1, rail: "mock" }, p.clock),
      ),
    ).rejects.toMatchObject({ code: "id_mismatch" });
  });

  it("pays a bound, verified owner within the tier share cap", async () => {
    const consumer = await earnedConsumer({ payoutBinding: sha256Hex("acct"), verify: true });
    const earnings = p.attribution.getEarnings(consumer.id);
    expect(earnings.accrued_usd).toBeCloseTo(0.7, 6);
    expect(earnings.available_usd).toBeCloseTo(0.7 * 0.8, 6); // verified cap 0.8

    await expect(
      p.attribution.requestPayout(
        signedRequest(consumer, { agent_id: consumer.id, amount_usd: 0.7, rail: "mock" }, p.clock),
      ),
    ).rejects.toMatchObject({ code: "payout_exceeds_cap" });

    const result = (await p.attribution.requestPayout(
      signedRequest(consumer, { agent_id: consumer.id, amount_usd: 0.5, rail: "mock" }, p.clock),
    )) as { receipt: { rail: string } };
    expect(result.receipt.rail).toBe("mock");
    expect(p.rail.executed).toHaveLength(1);
    expect(p.attribution.getEarnings(consumer.id).paid_usd).toBeCloseTo(0.5, 6);
  });
});

describe("chain integrity", () => {
  it("detects tampering with a ledger row", async () => {
    const { consumer, winner, set } = await sponsoredAuction();
    const entry = await reportAndConfirm(p, {
      reporter: consumer,
      counterparty: winner,
      auctionId: set.auction_id,
      providerId: winner.id,
      kind: "task_success",
      valueUsd: 2,
    });
    expect(p.attribution.verifyChain(winner.id)).toBe(true);

    // An operator quietly inflates the value...
    const db = (p.attribution as unknown as { db: { run(q: unknown): unknown } }).db;
    const { sql } = await import("drizzle-orm");
    db.run(sql`UPDATE events SET value_usd = 999 WHERE event_id = ${entry.event_id}`);

    // ...and the public chain no longer verifies.
    expect(p.attribution.verifyChain(winner.id)).toBe(false);
  });
});

function stripLocal(entry: Record<string, unknown>) {
  const { status, chain_seq, created_at, holdback_until, freeze_reason, ...wire } = entry;
  return wire;
}
