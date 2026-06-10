import { describe, expect, it } from "vitest";
import { envelopeKey, TokenBucketLimiter } from "../src/index.js";

describe("TokenBucketLimiter", () => {
  it("allows bursts up to capacity, then denies with a retry hint", () => {
    let nowMs = 0;
    const limiter = new TokenBucketLimiter({ limit: 10, windowMs: 60_000, now: () => nowMs });
    for (let i = 0; i < 10; i++) {
      expect(limiter.check("a").allowed).toBe(true);
    }
    const denied = limiter.check("a");
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
  });

  it("refills over time at the sustained rate", () => {
    let nowMs = 0;
    const limiter = new TokenBucketLimiter({ limit: 10, windowMs: 60_000, now: () => nowMs });
    for (let i = 0; i < 10; i++) limiter.check("a");
    expect(limiter.check("a").allowed).toBe(false);

    nowMs += 6_000; // one token's worth
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("isolates keys", () => {
    const limiter = new TokenBucketLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
  });

  it("derives keys from the envelope identity, falling back to IP", () => {
    expect(envelopeKey({ key_id: "erabi:agent:abc" }, "1.2.3.4")).toBe("erabi:agent:abc");
    expect(envelopeKey({ payload: {} }, "1.2.3.4")).toBe("ip:1.2.3.4");
    expect(envelopeKey(undefined, "1.2.3.4")).toBe("ip:1.2.3.4");
  });
});
