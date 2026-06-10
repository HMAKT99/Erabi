import { beforeEach, describe, expect, it } from "vitest";
import { createEnvelope } from "@erabi/crypto";
import { makeIntent, setupFixture, standardScene, type Fixture } from "./helpers.js";

let fixture: Fixture;

beforeEach(() => {
  fixture = setupFixture();
});

describe("intent TTL enforcement", () => {
  it("rejects intents whose answer deadline elapsed before processing", async () => {
    const { consumer } = await standardScene(fixture);
    const intent = makeIntent(consumer, { ttl_ms: 3000 });
    // Signed 10 seconds ago — inside the ±120s skew window, past its TTL.
    const stale = createEnvelope({
      payload: intent,
      secretKey: consumer.keys.secretKey,
      keyId: consumer.id,
      nodeId: "test-client",
      ts: new Date(Date.now() - 10_000).toISOString(),
    });
    await expect(fixture.exchange.submitIntent(stale)).rejects.toMatchObject({
      code: "intent_expired",
    });
  });

  it("accepts fresh intents within their TTL", async () => {
    const { consumer } = await standardScene(fixture);
    const set = await fixture.exchange.submitIntent(
      createEnvelope({
        payload: makeIntent(consumer, { ttl_ms: 3000 }),
        secretKey: consumer.keys.secretKey,
        keyId: consumer.id,
        nodeId: "test-client",
      }),
    );
    expect(set.organic.length).toBeGreaterThan(0);
  });
});
