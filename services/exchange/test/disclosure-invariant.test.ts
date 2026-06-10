/**
 * THE mandatory adversarial suite (spec §6.5): every path that could break
 * the disclosure invariant is attempted here and must fail.
 *
 * Invariant: no sponsored influence without a signed, persisted
 * DisclosureRecord; organic results are never reordered by payment.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { canonicalize, publicKeyFromString, verifyBytes } from "@erabi/crypto";
import { considerationSetZod, type DisclosureRecord, type Intent } from "@erabi/schemas";
import { SPONSORED_LABEL } from "@erabi/constants";
import type { AuctionCandidate, ClearedSlot } from "../src/auction.js";
import { buildServer } from "../src/server.js";
import { ExchangeService } from "../src/service.js";
import type { ConsiderationSet } from "@erabi/schemas";
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

const utf8 = new TextEncoder();

let fixture: Fixture;

beforeEach(() => {
  fixture = setupFixture();
});

async function sponsoredScene() {
  const { consumer, providers } = await standardScene(fixture);
  const [bidderHigh, bidderLow] = providers;
  await fixture.exchange.placeBid(
    signedRequest(bidderHigh!, makeBid(bidderHigh!, { offer: { type: "cpa", amount_usd: 2 } })),
  );
  await fixture.exchange.placeBid(
    signedRequest(bidderLow!, makeBid(bidderLow!, { offer: { type: "cpa", amount_usd: 1 } })),
  );
  return { consumer, providers, bidderHigh: bidderHigh!, bidderLow: bidderLow! };
}

describe("disclosure invariant", () => {
  it("every sponsored result carries a signed disclosure, fetchable and verifiable", async () => {
    const { consumer, bidderHigh } = await sponsoredScene();
    const set = await fixture.exchange.submitIntent(signedRequest(consumer, makeIntent(consumer)));

    expect(set.sponsored.length).toBeGreaterThan(0);
    for (const entry of set.sponsored) {
      const disclosure = entry.disclosure as DisclosureRecord;
      expect(disclosure.intent_id).toBe(set.intent_id);
      expect(disclosure.auction_id).toBe(set.auction_id);
      expect(disclosure.provider_id).toBe(entry.provider_id);
      expect(disclosure.label).toBe(SPONSORED_LABEL);
      expect(disclosure.clearing_price_usd).toBeGreaterThan(0);

      // Publicly fetchable, byte-identical.
      const app = buildServer(fixture.exchange);
      const response = await app.inject({
        method: "GET",
        url: `/v1/disclosures/${disclosure.disclosure_id}`,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(disclosure);
      await app.close();

      // Independently verifiable against the exchange's published key.
      const { exchange_sig, ...unsigned } = disclosure;
      expect(
        verifyBytes(
          utf8.encode(canonicalize(unsigned)),
          exchange_sig,
          publicKeyFromString(fixture.exchange.publicKey),
        ),
      ).toBe(true);
    }
    expect(set.sponsored[0]!.provider_id).toBe(bidderHigh.id);
  });

  it("the consideration set itself is schema-valid and exchange-signed", async () => {
    const { consumer } = await sponsoredScene();
    const set = await fixture.exchange.submitIntent(signedRequest(consumer, makeIntent(consumer)));
    expect(considerationSetZod.safeParse(set).success).toBe(true);

    const { exchange_sig, ...unsigned } = set;
    expect(
      verifyBytes(
        utf8.encode(canonicalize(unsigned)),
        exchange_sig,
        publicKeyFromString(fixture.exchange.publicKey),
      ),
    ).toBe(true);
  });

  it("no sponsorship when the consumer has not opted in (accepts_sponsored=false)", async () => {
    const optedOut = makeAgent("OptedOut", ["agent.analysis"]); // default: false
    const providers = [
      makeAgent("P1", ["agent.research"]),
      makeAgent("P2", ["agent.research"]),
      makeAgent("P3", ["agent.research"]),
    ];
    await registerAgents(fixture.registry, [optedOut, ...providers]);
    const bidder = providers[0]!;
    await fixture.exchange.placeBid(signedRequest(bidder, makeBid(bidder)));

    const set = await fixture.exchange.submitIntent(signedRequest(optedOut, makeIntent(optedOut)));
    expect(set.sponsored).toEqual([]);
    expect(set.organic.length).toBeGreaterThan(0);
  });

  it("no sponsorship on autonomous-spend intents (human_in_loop=false)", async () => {
    const { consumer } = await sponsoredScene();
    const set = await fixture.exchange.submitIntent(
      signedRequest(consumer, makeIntent(consumer, { human_in_loop: false })),
    );
    expect(set.sponsored).toEqual([]);
  });

  it("organic ranking is never reordered by payment", async () => {
    const { consumer, providers } = await standardScene(fixture);
    fixture.registry.setReputation(providers[0]!.id, 65);
    fixture.registry.setReputation(providers[1]!.id, 50);
    fixture.registry.setReputation(providers[2]!.id, 35);

    const before = await fixture.exchange.submitIntent(
      signedRequest(consumer, makeIntent(consumer)),
    );

    // The lowest-ranked organic provider now pays an enormous CPA.
    const whale = providers[2]!;
    await fixture.exchange.placeBid(
      signedRequest(whale, makeBid(whale, { offer: { type: "cpa", amount_usd: 10_000 } })),
    );
    const after = await fixture.exchange.submitIntent(
      signedRequest(consumer, makeIntent(consumer)),
    );

    const order = (set: ConsiderationSet) => set.organic.map((o) => o.provider_id);
    expect(order(after)).toEqual(order(before));
    expect(order(after).at(-1)).toBe(whale.id); // still last organically
    // Its paid placement is in the separate, labeled array with a disclosure.
    expect(after.sponsored.map((s) => s.provider_id)).toContain(whale.id);
    expect(after.sponsored[0]!.disclosure).toBeTruthy();
  });

  it("caps sponsored slots at min(ratio-derived, 2) regardless of demand", async () => {
    const consumer = makeAgent("BigConsumer", ["agent.analysis"], {
      acceptsSponsored: true,
      maxSponsoredRatio: 0.9,
    });
    const providers = Array.from({ length: 6 }, (_, i) =>
      makeAgent(`Bulk${i}`, ["agent.research"]),
    );
    await registerAgents(fixture.registry, [consumer, ...providers]);
    for (const provider of providers) {
      await fixture.exchange.placeBid(
        signedRequest(provider, makeBid(provider, { offer: { type: "cpa", amount_usd: 5 } })),
      );
    }
    const set = await fixture.exchange.submitIntent(signedRequest(consumer, makeIntent(consumer)));
    expect(set.sponsored.length).toBeLessThanOrEqual(2);
    expect(considerationSetZod.safeParse(set).success).toBe(true);
  });

  it("serves nothing at all if disclosure persistence fails", async () => {
    class BrokenPersistence extends ExchangeService {
      protected override persistClearing(
        intent: Intent,
        auctionId: string,
        organic: ConsiderationSet["organic"],
        candidates: AuctionCandidate[],
        cleared: ClearedSlot[],
        records: DisclosureRecord[],
        nowIso: string,
      ): void {
        if (records.length > 0) throw new Error("simulated disclosure store failure");
        super.persistClearing(intent, auctionId, organic, candidates, cleared, records, nowIso);
      }
    }
    const broken = setupFixture({}, BrokenPersistence);
    const consumer = makeAgent("Consumer", ["agent.analysis"], { acceptsSponsored: true });
    const providers = [
      makeAgent("Q1", ["agent.research"]),
      makeAgent("Q2", ["agent.research"]),
      makeAgent("Q3", ["agent.research"]),
    ];
    await registerAgents(broken.registry, [consumer, ...providers]);
    const bidder = providers[0]!;
    await broken.exchange.placeBid(signedRequest(bidder, makeBid(bidder)));

    const intent = makeIntent(consumer);
    // The whole request fails — a sponsored result without a persisted
    // disclosure must be unrepresentable, not degraded.
    await expect(broken.exchange.submitIntent(signedRequest(consumer, intent))).rejects.toThrow(
      /simulated disclosure store failure/,
    );
    expect(() => broken.exchange.getDecisionTuple(intent.intent_id)).toThrow();

    // Organic-only intents (no records to persist) still flow.
    const organicOnly = await broken.exchange.submitIntent(
      signedRequest(consumer, makeIntent(consumer, { human_in_loop: false })),
    );
    expect(organicOnly.sponsored).toEqual([]);
  });

  it("disclosures cannot be forged: a tampered record fails verification", async () => {
    const { consumer } = await sponsoredScene();
    const set = await fixture.exchange.submitIntent(signedRequest(consumer, makeIntent(consumer)));
    const disclosure = set.sponsored[0]!.disclosure as DisclosureRecord;
    const { exchange_sig, ...unsigned } = disclosure;
    const tampered = { ...unsigned, clearing_price_usd: 0.000001 };
    expect(
      verifyBytes(
        utf8.encode(canonicalize(tampered)),
        exchange_sig,
        publicKeyFromString(fixture.exchange.publicKey),
      ),
    ).toBe(false);
  });
});
