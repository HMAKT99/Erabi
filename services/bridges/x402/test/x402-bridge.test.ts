import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startReferenceNode, type ReferenceNode } from "@erabi/node";
import { Erabi } from "@erabi/sdk";
import { MockX402Prober, X402Bridge } from "../src/index.js";

const SECRET = "test-hmac-secret";
const API_URL = "https://api.fxdata.example/quotes";

let node: ReferenceNode;
let bridge: X402Bridge;
let prober: MockX402Prober;

function hmac(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("hex");
}

beforeAll(async () => {
  node = await startReferenceNode({ holdbackHours: { default: 0 } });
  prober = new MockX402Prober();
  prober.setEndpoint(API_URL, { price_usd: 0.05, description: "FX quotes, pay per call." });
  bridge = new X402Bridge({
    registry: node.registry,
    exchange: node.exchange,
    attribution: node.attribution,
    prober,
    hmacSecret: SECRET,
  });
});

afterAll(async () => {
  await node.stop();
});

describe("x402 bridge", () => {
  it("auto-registers a paywalled endpoint as a bridge-tier provider with a standing bid", async () => {
    const bridged = await bridge.submitEndpoint({ url: API_URL, category: "data.financial" });
    expect(bridged.price_usd).toBe(0.05);

    const agent = node.registry.getAgent(bridged.provider_id);
    expect(agent.tier).toBe("bridge");
    expect(agent.manifest.capabilities).toEqual(["data.financial"]);

    const bids = node.exchange.listBids(bridged.provider_id);
    expect(bids).toHaveLength(1);
    expect(bids[0]!.offer.amount_usd).toBe(0.05);
    expect(bids[0]!.settlement_rail).toBe("x402");
  });

  it("rejects endpoints without an x402 paywall and off-taxonomy categories", async () => {
    await expect(
      bridge.submitEndpoint({ url: "https://no-paywall.example/api", category: "data.financial" }),
    ).rejects.toThrow(/did not answer with an x402 paywall/);
    prober.setEndpoint("https://exotic.example/api", { price_usd: 1 });
    await expect(
      bridge.submitEndpoint({ url: "https://exotic.example/api", category: "data.timetravel" }),
    ).rejects.toThrow(/not in the taxonomy/);
  });

  it("serves the bridged endpoint as a labeled sponsored result and settles via postback", async () => {
    const bridged = bridge.list()[0]!;

    // Organic supply so the consumer's sponsored-slot ratio allows 1 slot.
    for (let i = 0; i < 3; i++) {
      await Erabi.register({
        name: `FxOrganic${i}`,
        capabilities: ["data.financial"],
        endpoints: node.urls,
        keyDir: null,
      });
    }
    const consumer = await Erabi.register({
      name: "FxConsumer",
      capabilities: ["agent.analysis"],
      endpoints: node.urls,
      acceptsSponsored: true,
      keyDir: null,
    });

    const choices = await consumer.intent({ category: "data.financial" });
    const sponsored = choices.sponsored.find((s) => s.provider_id === bridged.provider_id);
    expect(sponsored).toBeTruthy();
    expect(sponsored!.disclosure.label).toContain("Sponsored");
    expect(choices.renderSponsored()[0]).toContain("[Sponsored]");

    // The consumer used the API and paid via x402; it reports the outcome.
    const event = await choices.report(bridged.provider_id, "task_success", {
      valueUsd: 0.05,
      railReceipt: { rail: "x402", ref: "tx:sol:abc123" },
    });
    expect(event.status).toBe("pending");

    // The facilitator's signed postback counter-signs through the bridge.
    const body = JSON.stringify({
      event_id: event.event_id,
      provider_id: bridged.provider_id,
      x402_tx: "tx:sol:abc123",
    });
    const confirmed = await bridge.handlePostback(body, hmac(body));
    expect(confirmed.status).toBe("countersigned");

    node.attribution.processHoldbacks();
    expect(node.attribution.getEvent(event.event_id).status).toBe("confirmed");

    // The consumer-side developer earned 70% of the clearing price.
    const earnings = node.attribution.getEarnings(consumer.id);
    expect(earnings.accrued_usd).toBeGreaterThan(0);
  });

  it("rejects postbacks with a bad or missing HMAC", async () => {
    const body = JSON.stringify({
      event_id: "00000000-0000-4000-8000-000000000000",
      provider_id: bridge.list()[0]!.provider_id,
      x402_tx: "tx:forged",
    });
    await expect(bridge.handlePostback(body, "deadbeef")).rejects.toThrow(/bad HMAC/);
    await expect(bridge.handlePostback(body, undefined)).rejects.toThrow(/bad HMAC/);
  });
});

describe("deterministic bridge identities (seedSecret)", () => {
  it("the same url + seed resumes the same provider across bridge restarts", async () => {
    const node = await startReferenceNode();
    try {
      const prober = new MockX402Prober();
      prober.setEndpoint("https://paid.example/v1/data", { price_usd: 0.25 });
      const make = () =>
        new X402Bridge({
          registry: node.registry,
          exchange: node.exchange,
          attribution: node.attribution,
          prober,
          hmacSecret: "h",
          seedSecret: "stable-seed",
        });
      const first = await make().submitEndpoint({
        url: "https://paid.example/v1/data",
        category: "data.market",
      });
      // "restart": a fresh bridge instance with the same seed re-submits
      const second = await make().submitEndpoint({
        url: "https://paid.example/v1/data",
        category: "data.market",
      });
      expect(second.provider_id).toBe(first.provider_id);
      expect(second.bid_id).toBe(first.bid_id);
      // no duplicate agent in the registry
      const agents = node.registry.listAgents();
      expect(agents.filter((a) => a.manifest.id === first.provider_id)).toHaveLength(1);
    } finally {
      await node.stop();
    }
  });
});
