import { beforeEach, describe, expect, it } from "vitest";
import { STAKE_MINIMUM_USD, STAKE_SLASH_FRACTION } from "@erabi/config";
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

describe("staking and slashing", () => {
  it("deposits accrue, duplicate rail receipts are rejected, fraud freezes slash", async () => {
    const consumer = makeAgent("StakeConsumer", ["agent.analysis"], {}, p.clock);
    const provider = makeAgent("StakedProvider", ["agent.research"], {}, p.clock);
    await register(p, consumer, provider);

    await p.attribution.depositStake(
      signedRequest(
        provider,
        {
          agent_id: provider.id,
          amount_usd: 150,
          rail_receipt: { rail: "x402", ref: "tx:stake-1" },
        },
        p.clock,
      ),
    );
    expect(p.attribution.stakeOf(provider.id)).toBe(150);

    await expect(
      p.attribution.depositStake(
        signedRequest(
          provider,
          {
            agent_id: provider.id,
            amount_usd: 10,
            rail_receipt: { rail: "x402", ref: "tx:stake-1" },
          },
          p.clock,
        ),
      ),
    ).rejects.toMatchObject({ code: "invalid_request" });

    // Duplicate-receipt fraud at ingest freezes the event and slashes.
    const set = await fireIntent(p, consumer);
    await reportAndConfirm(p, {
      reporter: consumer,
      counterparty: provider,
      auctionId: set.auction_id,
      providerId: provider.id,
      kind: "task_success",
      valueUsd: 2,
      railRef: "tx:dup",
    });
    const frozen = await reportAndConfirm(p, {
      reporter: consumer,
      counterparty: provider,
      auctionId: set.auction_id,
      providerId: provider.id,
      kind: "task_success",
      valueUsd: 2,
      railRef: "tx:dup",
      confirm: false,
    });
    expect(frozen.status).toBe("under_review");
    expect(p.attribution.stakeOf(provider.id)).toBeCloseTo(150 * (1 - STAKE_SLASH_FRACTION), 6);
    const stake = p.attribution.getStake(provider.id);
    expect(stake.events.some((e) => e.kind === "slash")).toBe(true);
  });

  it("the registry promotes verified agents whose stake clears the minimum", async () => {
    const agent = makeAgent(
      "Staker",
      ["agent.research"],
      { verification: ["dns:staker.example"] },
      p.clock,
    );
    await register(p, agent);

    // Unverified or understaked: no promotion.
    await expect(
      p.registry.promoteToStaked(agent.id, signedRequest(agent, { agent_id: agent.id }, p.clock)),
    ).rejects.toMatchObject({ code: "tier_required" });

    await verifyViaDns(p, agent, "staker.example");
    await expect(
      p.registry.promoteToStaked(agent.id, signedRequest(agent, { agent_id: agent.id }, p.clock)),
    ).rejects.toMatchObject({ code: "verification_failed" });

    await p.attribution.depositStake(
      signedRequest(
        agent,
        {
          agent_id: agent.id,
          amount_usd: STAKE_MINIMUM_USD,
          rail_receipt: { rail: "x402", ref: "tx:stake-min" },
        },
        p.clock,
      ),
    );
    const view = await p.registry.promoteToStaked(
      agent.id,
      signedRequest(agent, { agent_id: agent.id }, p.clock),
    );
    expect(view.tier).toBe("staked");
  });
});

describe("settlement-graph analysis (Sybil sweep)", () => {
  async function settle(consumer: TestAgent, provider: TestAgent, count: number) {
    const set = await fireIntent(p, consumer);
    for (let i = 0; i < count; i++) {
      await reportAndConfirm(p, {
        reporter: consumer,
        counterparty: provider,
        auctionId: set.auction_id,
        providerId: provider.id,
        kind: "task_success",
        valueUsd: 1,
        railRef: `tx:${consumer.manifest.name}-${provider.manifest.name}-${i}`,
      });
      p.clock.advance(60_000);
    }
  }

  it("flags circular settlement clusters but not honest one-way commerce", async () => {
    const ringA = makeAgent("RingA", ["agent.research"], {}, p.clock);
    const ringB = makeAgent("RingB", ["agent.research"], {}, p.clock);
    const honestConsumer = makeAgent("HonestConsumer", ["agent.analysis"], {}, p.clock);
    const honestProvider = makeAgent("HonestProvider", ["agent.research"], {}, p.clock);
    await register(p, ringA, ringB, honestConsumer, honestProvider);

    // The ring pays itself in both directions; the honest pair flows one way.
    await settle(ringA, ringB, 2);
    await settle(ringB, ringA, 2);
    await settle(honestConsumer, honestProvider, 3);
    p.clock.advance(25 * HOUR);
    p.attribution.processHoldbacks();

    const clusters = p.attribution.analyzeSettlementGraph();
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.agents.sort()).toEqual([ringA.id, ringB.id].sort());
    expect(clusters[0]!.internal_confirmed_events).toBe(4);
    const flagged = new Set(clusters.flatMap((c) => c.agents));
    expect(flagged.has(honestConsumer.id)).toBe(false);
    expect(flagged.has(honestProvider.id)).toBe(false);
  });
});

describe("autonomous-sponsorship consent (scope policy §1)", () => {
  it("only a verified owner can grant it, and it gates the exchange", async () => {
    const consumer = makeAgent(
      "AutonomousBuyer",
      ["agent.analysis"],
      { acceptsSponsored: true, verification: ["dns:buyer.example"] },
      p.clock,
    );
    const providers = [
      makeAgent("CP1", ["agent.research"], {}, p.clock),
      makeAgent("CP2", ["agent.research"], {}, p.clock),
      makeAgent("CP3", ["agent.research"], {}, p.clock),
    ];
    await register(p, consumer, ...providers);
    const bidder = providers[0]!;
    await p.exchange.placeBid(signedRequest(bidder, makeBid(bidder), p.clock));

    // Autonomous intent: no ads by default.
    const before = await fireIntent(p, consumer, { human_in_loop: false });
    expect(before.sponsored).toEqual([]);

    // Unverified owners cannot consent themselves into it.
    await expect(
      p.registry.setAutonomousConsent(
        consumer.id,
        signedRequest(consumer, { autonomous_sponsorship: true }, p.clock),
      ),
    ).rejects.toMatchObject({ code: "tier_required" });

    await verifyViaDns(p, consumer, "buyer.example");
    const view = await p.registry.setAutonomousConsent(
      consumer.id,
      signedRequest(consumer, { autonomous_sponsorship: true }, p.clock),
    );
    expect(view.autonomous_sponsorship_consent).toBe(true);

    const after = await fireIntent(p, consumer, { human_in_loop: false });
    expect(after.sponsored.length).toBeGreaterThan(0);
    expect(after.sponsored[0]!.disclosure.label).toContain("Sponsored");
  });
});

describe("CPA budget reservations", () => {
  it("reserves on serve, charges on confirmed outcome, releases on expiry", async () => {
    const consumer = makeAgent(
      "CpaConsumer",
      ["agent.analysis"],
      { acceptsSponsored: true },
      p.clock,
    );
    const providers = [
      makeAgent("R1", ["agent.research"], {}, p.clock),
      makeAgent("R2", ["agent.research"], {}, p.clock),
      makeAgent("R3", ["agent.research"], {}, p.clock),
    ];
    await register(p, consumer, ...providers);
    const winner = providers[0]!;
    const runnerUp = providers[1]!;
    // Budget fits exactly one clearing (price = runner-up's 1.0).
    await p.exchange.placeBid(
      signedRequest(
        winner,
        makeBid(winner, { offer: { type: "cpa", amount_usd: 2 }, budget: { daily_usd: 1.5 } }),
        p.clock,
      ),
    );
    await p.exchange.placeBid(
      signedRequest(
        runnerUp,
        makeBid(runnerUp, { offer: { type: "cpa", amount_usd: 1 } }),
        p.clock,
      ),
    );

    // Serve 1 reserves the budget; serve 2 is blocked by the reservation.
    const first = await fireIntent(p, consumer);
    expect(first.sponsored.map((s) => s.provider_id)).toContain(winner.id);
    const second = await fireIntent(p, consumer);
    expect(second.sponsored.map((s) => s.provider_id)).not.toContain(winner.id);

    // No conversion ever happens: the reservation expires and is released.
    p.clock.advance(97 * HOUR); // CPA_RESERVATION_HOURS = 96
    expect(p.exchange.releaseExpiredReservations()).toBe(1);

    const third = await fireIntent(p, consumer);
    expect(third.sponsored.map((s) => s.provider_id)).toContain(winner.id);

    // This time the outcome confirms: the reservation settles into a charge.
    await reportAndConfirm(p, {
      reporter: consumer,
      counterparty: winner,
      auctionId: third.auction_id,
      providerId: winner.id,
      kind: "task_success",
      valueUsd: 2,
      railRef: "tx:cpa-settle",
    });
    p.clock.advance(25 * HOUR);
    p.attribution.processHoldbacks();
    // Settled reservations are charges, not expirable holds.
    p.clock.advance(97 * HOUR);
    expect(p.exchange.releaseExpiredReservations()).toBe(0);
  });
});
