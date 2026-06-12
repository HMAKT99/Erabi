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
