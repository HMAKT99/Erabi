import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startReferenceNode, type ReferenceNode } from "@erabi/node";
import { Erabi } from "@erabi/sdk";
import { AffiliateBridge, MockImpactAdapter, parseCatalogCsv } from "../src/index.js";

const SECRET = "affiliate-secret";

let node: ReferenceNode;
let bridge: AffiliateBridge;

function hmac(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("hex");
}

beforeAll(async () => {
  node = await startReferenceNode({ holdbackHours: { default: 0 } });
  bridge = new AffiliateBridge({
    registry: node.registry,
    exchange: node.exchange,
    attribution: node.attribution,
    adapter: new MockImpactAdapter(),
    hmacSecret: SECRET,
  });
});

afterAll(async () => {
  await node.stop();
});

describe("catalog parsing", () => {
  it("parses well-formed CSV and rejects malformed rows", () => {
    const items = parseCatalogCsv(
      [
        "item_id,title,claim,endpoint,category,price_usd,commission_pct",
        "a-1,Thing,Nice thing,https://s.example/a-1,commerce.retail,10,0.1",
      ].join("\n"),
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.commission_pct).toBe(0.1);

    expect(() => parseCatalogCsv("wrong,header\n1,2")).toThrow(/header/);
    expect(() =>
      parseCatalogCsv(
        [
          "item_id,title,claim,endpoint,category,price_usd,commission_pct",
          "a-1,Thing,Nice,https://s.example,commerce.retail,zero,0.1",
        ].join("\n"),
      ),
    ).toThrow(/bad price/);
  });
});

describe("affiliate bridge", () => {
  it("converts commissions into standing CPA bids under one bridge provider", async () => {
    const result = await bridge.sync();
    expect(result.bids).toHaveLength(3);

    const agent = node.registry.getAgent(result.provider_id);
    expect(agent.tier).toBe("bridge");
    expect(agent.manifest.capabilities).toContain("commerce.retail");

    // sku-101: 120 × 0.08 = 9.6 CPA
    const backpack = result.bids.find((b) => b.item_id === "sku-101")!;
    expect(backpack.cpa_usd).toBeCloseTo(9.6, 6);
  });

  it("serves catalog items as labeled sponsored results on human-in-loop commerce intents", async () => {
    for (let i = 0; i < 3; i++) {
      await Erabi.register({
        name: `RetailOrganic${i}`,
        capabilities: ["commerce.retail"],
        endpoints: node.urls,
        keyDir: null,
      });
    }
    const shopper = await Erabi.register({
      name: "ShoppingAgent",
      capabilities: ["agent.analysis"],
      endpoints: node.urls,
      acceptsSponsored: true,
      keyDir: null,
    });

    const choices = await shopper.intent({
      category: "commerce.retail",
      query: "durable hiking backpack",
      humanInLoop: true,
    });
    expect(choices.sponsored.length).toBeGreaterThan(0);
    expect(choices.sponsored[0]!.disclosure.label).toContain("Sponsored");
    expect(choices.sponsored[0]!.creative.endpoint).toContain("track.impact.example");

    // Scope policy: the same intent without a human gets no commerce ads.
    const autonomous = await shopper.intent({ category: "commerce.retail", humanInLoop: false });
    expect(autonomous.sponsored).toEqual([]);

    // The human buys through the tracking link; the network posts back.
    const postback = JSON.stringify({
      item_id: "sku-101",
      order_ref: "ord-778899",
      commission_usd: 9.6,
      auction_id: choices.set.auction_id,
    });
    const event = await bridge.handlePostback(postback, hmac(postback));
    expect(event.status).toBe("pending");

    // The consumer-side agent counter-signs the conversion.
    await shopper.confirmOutcome(event.event_id, event.hash);
    node.attribution.processHoldbacks();
    expect(node.attribution.getEvent(event.event_id).status).toBe("confirmed");
    expect(node.attribution.getEarnings(shopper.id).accrued_usd).toBeGreaterThan(0);
  });

  it("rejects forged postbacks and unknown items", async () => {
    const body = JSON.stringify({
      item_id: "sku-101",
      order_ref: "ord-1",
      commission_usd: 9.6,
      auction_id: "00000000-0000-4000-8000-000000000000",
    });
    await expect(bridge.handlePostback(body, "deadbeef")).rejects.toThrow(/bad HMAC/);

    const unknown = JSON.stringify({
      item_id: "sku-999",
      order_ref: "ord-2",
      commission_usd: 1,
      auction_id: "00000000-0000-4000-8000-000000000000",
    });
    await expect(bridge.handlePostback(unknown, hmac(unknown))).rejects.toThrow(/unknown item/);
  });
});
