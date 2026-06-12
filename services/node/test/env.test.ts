import { describe, expect, it } from "vitest";
import { parseHoldbackHours } from "../src/env.js";

describe("parseHoldbackHours (ERABI_HOLDBACK_HOURS)", () => {
  it("parses a plain number as the default for every category", () => {
    expect(parseHoldbackHours("0.0833")).toEqual({ default: 0.0833 });
    expect(parseHoldbackHours("0")).toEqual({ default: 0 });
    expect(parseHoldbackHours(" 24 ")).toEqual({ default: 24 });
  });

  it("parses a JSON record of category-group overrides", () => {
    expect(parseHoldbackHours('{"default":0.0833,"commerce":1}')).toEqual({
      default: 0.0833,
      commerce: 1,
    });
  });

  it("ignores unset, empty, and invalid input", () => {
    expect(parseHoldbackHours(undefined)).toBeUndefined();
    expect(parseHoldbackHours("")).toBeUndefined();
    expect(parseHoldbackHours("five minutes")).toBeUndefined();
    expect(parseHoldbackHours("-1")).toBeUndefined();
    expect(parseHoldbackHours('{"default":"soon"}')).toBeUndefined();
    expect(parseHoldbackHours('["0.5"]')).toBeUndefined();
  });
});

import { parseX402Endpoints, DEFAULT_X402_ENDPOINTS } from "../src/x402-endpoints.js";

describe("parseX402Endpoints (ERABI_X402_ENDPOINTS)", () => {
  it("defaults to the curated list when unset", () => {
    expect(parseX402Endpoints(undefined)).toBe(DEFAULT_X402_ENDPOINTS);
  });

  it('returns "off" to disable bridging', () => {
    expect(parseX402Endpoints("off")).toBe("off");
    expect(parseX402Endpoints(" OFF ")).toBe("off");
  });

  it("parses a valid JSON array", () => {
    expect(parseX402Endpoints('[{"url":"https://api.example/x","category":"api.search"}]')).toEqual(
      [{ url: "https://api.example/x", category: "api.search" }],
    );
  });

  it("falls back to defaults on garbage", () => {
    expect(parseX402Endpoints("not json")).toBe(DEFAULT_X402_ENDPOINTS);
    expect(parseX402Endpoints('[{"category":"missing url"}]')).toBe(DEFAULT_X402_ENDPOINTS);
  });
});
