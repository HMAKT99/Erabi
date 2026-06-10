import { describe, expect, it } from "vitest";
import { HOLDBACK_HOURS, REV_SHARE, TIER_POLICIES } from "../src/index.js";

describe("economics knobs", () => {
  it("rev-share splits sum to 1", () => {
    expect(REV_SHARE.developer + REV_SHARE.protocol + REV_SHARE.reserved).toBeCloseTo(1);
  });

  it("tier caps are monotone: more trust, fewer caps", () => {
    expect(TIER_POLICIES.unverified.reputationCeiling).toBeLessThan(
      TIER_POLICIES.verified.reputationCeiling,
    );
    expect(TIER_POLICIES.unverified.payoutShareCap).toBeLessThan(
      TIER_POLICIES.verified.payoutShareCap,
    );
    expect(TIER_POLICIES.unverified.auctionMultiplier).toBeLessThan(
      TIER_POLICIES.verified.auctionMultiplier,
    );
  });

  it("holdback windows include a default", () => {
    expect(HOLDBACK_HOURS.default).toBeGreaterThan(0);
  });
});
