import { beforeEach, describe, expect, it } from "vitest";
import type { NetworkEvent } from "../src/bus.js";
import { runAuction, sponsoredSlotBudget } from "../src/auction.js";
import { evaluateFilter } from "../src/filter.js";
import { buildServer } from "../src/server.js";
import {
  makeAgent,
  makeBid,
  makeIntent,
  registerAgents,
  setupFixture,
  signedRequest,
  standardScene,
  type Fixture,
} from "./helpers.js";

let fixture: Fixture;

beforeEach(() => {
  fixture = setupFixture();
});

describe("GSP auction economics", () => {
  const creative = { title: "t", claim: "c", endpoint: "https://e.example.com" };

  it("winner pays the minimum price that holds rank (second-price)", () => {
    const slots = runAuction(
      [
        {
          bidId: "a",
          providerId: "pa",
          amountUsd: 2,
          paymentModel: "cpa",
          reputation: 50,
          tier: "unverified",
          creative,
        },
        {
          bidId: "b",
          providerId: "pb",
          amountUsd: 1,
          paymentModel: "cpa",
          reputation: 50,
          tier: "unverified",
          creative,
        },
      ],
      { maxSlots: 1, reservePriceUsd: 0.01 },
    );
    expect(slots).toHaveLength(1);
    expect(slots[0]!.candidate.bidId).toBe("a");
    // Equal quality: pays exactly the runner-up's bid, not its own.
    expect(slots[0]!.clearingPriceUsd).toBeCloseTo(1.0, 6);
  });

  it("reputation is quality score: better reputation beats a bigger bid and pays less", () => {
    const slots = runAuction(
      [
        {
          bidId: "rep",
          providerId: "pr",
          amountUsd: 1.0,
          paymentModel: "cpa",
          reputation: 65,
          tier: "unverified",
          creative,
        },
        {
          bidId: "cash",
          providerId: "pc",
          amountUsd: 1.2,
          paymentModel: "cpa",
          reputation: 30,
          tier: "unverified",
          creative,
        },
      ],
      { maxSlots: 1, reservePriceUsd: 0.01 },
    );
    expect(slots[0]!.candidate.bidId).toBe("rep");
    expect(slots[0]!.clearingPriceUsd).toBeLessThan(1.0);
  });

  it("single bidder pays the reserve price", () => {
    const slots = runAuction(
      [
        {
          bidId: "solo",
          providerId: "ps",
          amountUsd: 3,
          paymentModel: "cpa",
          reputation: 50,
          tier: "unverified",
          creative,
        },
      ],
      { maxSlots: 2, reservePriceUsd: 0.05 },
    );
    expect(slots).toHaveLength(1);
    expect(slots[0]!.clearingPriceUsd).toBe(0.05);
  });

  it("sponsored slot budget respects the consumer ratio", () => {
    expect(sponsoredSlotBudget(3, 0.3)).toBe(1);
    expect(sponsoredSlotBudget(2, 0.3)).toBe(0);
    expect(sponsoredSlotBudget(10, 0.3)).toBe(2); // hard cap
    expect(sponsoredSlotBudget(5, 0)).toBe(0);
  });
});

describe("targeting filters", () => {
  it("evaluates the CEL subset against intent constraints", () => {
    expect(evaluateFilter("intent.constraints.max_price_usd >= 2.0", { max_price_usd: 5 })).toBe(
      true,
    );
    expect(evaluateFilter("intent.constraints.max_price_usd >= 10", { max_price_usd: 5 })).toBe(
      false,
    );
    expect(
      evaluateFilter(
        "intent.constraints.max_price_usd >= 2 && intent.constraints.max_latency_ms <= 60000",
        { max_price_usd: 5, max_latency_ms: 30000 },
      ),
    ).toBe(true);
    expect(evaluateFilter("intent.constraints.missing > 1", {})).toBe(false);
  });

  it("rejects unparseable filters loudly at bid submission", async () => {
    const { providers } = await standardScene(fixture);
    const bidder = providers[0]!;
    const bid = makeBid(bidder, {
      targeting: { categories: ["agent.research"], constraints_filter: "system('rm -rf /')" },
    });
    await expect(fixture.exchange.placeBid(signedRequest(bidder, bid))).rejects.toMatchObject({
      code: "invalid_bid",
    });
  });

  it("excludes bids whose filter does not match the intent", async () => {
    const { consumer, providers } = await standardScene(fixture);
    const bidder = providers[0]!;
    await fixture.exchange.placeBid(
      signedRequest(
        bidder,
        makeBid(bidder, {
          targeting: {
            categories: ["agent.research"],
            constraints_filter: "intent.constraints.max_price_usd >= 100",
          },
        }),
      ),
    );
    const set = await fixture.exchange.submitIntent(signedRequest(consumer, makeIntent(consumer)));
    expect(set.sponsored).toEqual([]);
  });
});

describe("intent boundary", () => {
  it("rejects queries containing PII, loudly", async () => {
    const { consumer } = await standardScene(fixture);
    for (const query of [
      "research on john.doe@example.com",
      "call +1 (415) 555-0142 about pricing",
      "ssn 123-45-6789 background check",
      "my name is John and I need a lawyer",
    ]) {
      await expect(
        fixture.exchange.submitIntent(signedRequest(consumer, makeIntent(consumer, { query }))),
      ).rejects.toMatchObject({ code: "pii_rejected" });
    }
  });

  it("rejects unregistered agents and replayed envelopes", async () => {
    const stranger = makeAgent("Stranger", ["agent.analysis"]);
    await expect(
      fixture.exchange.submitIntent(signedRequest(stranger, makeIntent(stranger))),
    ).rejects.toMatchObject({ code: "agent_not_registered" });

    const { consumer } = await standardScene(fixture);
    const envelope = signedRequest(consumer, makeIntent(consumer));
    await fixture.exchange.submitIntent(envelope);
    await expect(fixture.exchange.submitIntent(envelope)).rejects.toMatchObject({
      code: "nonce_replayed",
    });
  });
});

describe("budget pacing", () => {
  it("stops serving a bid once its daily budget is exhausted", async () => {
    const { consumer, providers } = await standardScene(fixture);
    const winner = providers[0]!;
    const runnerUp = providers[1]!;
    await fixture.exchange.placeBid(
      signedRequest(
        winner,
        makeBid(winner, { offer: { type: "cpa", amount_usd: 2 }, budget: { daily_usd: 1.5 } }),
      ),
    );
    await fixture.exchange.placeBid(
      signedRequest(runnerUp, makeBid(runnerUp, { offer: { type: "cpa", amount_usd: 1 } })),
    );

    // First serve: winner clears at the runner-up's price (1.0), spending 1.0 of 1.5.
    const first = await fixture.exchange.submitIntent(
      signedRequest(consumer, makeIntent(consumer)),
    );
    expect(first.sponsored.map((s) => s.provider_id)).toContain(winner.id);

    // Second serve would need another 1.0 — over budget; winner is dropped.
    const second = await fixture.exchange.submitIntent(
      signedRequest(consumer, makeIntent(consumer)),
    );
    expect(second.sponsored.map((s) => s.provider_id)).not.toContain(winner.id);
  });
});

describe("decision tuples (the learning loop)", () => {
  it("logs a full tuple for organic-only intents too", async () => {
    const consumer = makeAgent("TupleConsumer", ["agent.analysis"]); // sponsorship off
    const provider = makeAgent("TupleProvider", ["agent.research"]);
    await registerAgents(fixture.registry, [consumer, provider]);

    const intent = makeIntent(consumer);
    await fixture.exchange.submitIntent(signedRequest(consumer, intent));

    const row = fixture.exchange.getDecisionTuple(intent.intent_id);
    const tuple = row.tuple as {
      intent_features: { category: string; query_length: number };
      candidate_set: { organic: unknown[]; auction: unknown[] };
    };
    expect(row.auctionId).toBeTruthy();
    expect(tuple.intent_features.category).toBe("agent.research");
    expect(tuple.candidate_set.organic.length).toBeGreaterThan(0);
    expect(tuple.candidate_set.auction).toEqual([]);
    // Privacy: the tuple stores query length, never the query text.
    expect(JSON.stringify(tuple)).not.toContain("financial data analysis");
  });

  it("records auction candidates and clearing prices for sponsored intents", async () => {
    const { consumer, providers } = await standardScene(fixture);
    const bidder = providers[0]!;
    await fixture.exchange.placeBid(signedRequest(bidder, makeBid(bidder)));
    const intent = makeIntent(consumer);
    await fixture.exchange.submitIntent(signedRequest(consumer, intent));

    const tuple = fixture.exchange.getDecisionTuple(intent.intent_id).tuple as {
      candidate_set: { auction: Array<{ provider_id: string }> };
      ranking_scores: Array<{ provider_id: string; clearing_price_usd: number }>;
    };
    expect(tuple.candidate_set.auction.map((c) => c.provider_id)).toContain(bidder.id);
    expect(tuple.ranking_scores[0]!.clearing_price_usd).toBeGreaterThan(0);
  });
});

describe("bid lifecycle", () => {
  it("places, lists, and withdraws bids with ownership enforcement", async () => {
    const { consumer, providers } = await standardScene(fixture);
    const owner = providers[0]!;
    const other = providers[1]!;
    const bid = makeBid(owner);
    await fixture.exchange.placeBid(signedRequest(owner, bid));
    expect(fixture.exchange.listBids(owner.id)).toHaveLength(1);

    await expect(
      fixture.exchange.withdrawBid(bid.bid_id, signedRequest(other, { bid_id: bid.bid_id })),
    ).rejects.toMatchObject({ code: "forbidden" });

    await fixture.exchange.withdrawBid(bid.bid_id, signedRequest(owner, { bid_id: bid.bid_id }));
    expect(fixture.exchange.listBids(owner.id)).toHaveLength(0);

    const set = await fixture.exchange.submitIntent(signedRequest(consumer, makeIntent(consumer)));
    expect(set.sponsored).toEqual([]);
  });
});

describe("event stream", () => {
  it("emits intent.received and auction.cleared on the bus", async () => {
    const { consumer, providers } = await standardScene(fixture);
    const bidder = providers[0]!;
    await fixture.exchange.placeBid(signedRequest(bidder, makeBid(bidder)));

    const events: NetworkEvent[] = [];
    const unsubscribe = fixture.exchange.bus.subscribe((event) => events.push(event));
    await fixture.exchange.submitIntent(signedRequest(consumer, makeIntent(consumer)));
    unsubscribe();

    const types = events.map((e) => e.type);
    expect(types).toContain("intent.received");
    expect(types).toContain("auction.cleared");
    const cleared = events.find((e) => e.type === "auction.cleared")!;
    expect(cleared.data.sponsored_count).toBe(1);
  });

  it("streams events over SSE", async () => {
    const { consumer, providers } = await standardScene(fixture);
    const bidder = providers[0]!;
    await fixture.exchange.placeBid(signedRequest(bidder, makeBid(bidder)));

    const app = buildServer(fixture.exchange);
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    try {
      const controller = new AbortController();
      const responsePromise = fetch(`${address}/v1/events/stream`, {
        signal: controller.signal,
      });
      const response = await responsePromise;
      expect(response.headers.get("content-type")).toContain("text/event-stream");
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      await fixture.exchange.submitIntent(signedRequest(consumer, makeIntent(consumer)));

      let buffer = "";
      while (!buffer.includes("auction.cleared")) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
      expect(buffer).toContain("event: intent.received");
      expect(buffer).toContain("event: auction.cleared");
      controller.abort();
    } finally {
      await app.close();
    }
  }, 15_000);
});
