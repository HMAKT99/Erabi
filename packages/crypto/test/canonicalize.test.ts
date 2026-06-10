import { describe, expect, it } from "vitest";
import { canonicalize } from "../src/index.js";

describe("RFC 8785 canonicalization", () => {
  it("serializes literals (RFC 8785 §3.2.3)", () => {
    expect(canonicalize({ literals: [null, true, false] })).toBe('{"literals":[null,true,false]}');
  });

  it("serializes numbers in ES shortest form (RFC 8785 §3.2.2.3)", () => {
    expect(canonicalize(333333333.33333329)).toBe("333333333.3333333");
    expect(canonicalize(1e30)).toBe("1e+30");
    expect(canonicalize(4.5)).toBe("4.5");
    expect(canonicalize(2e-3)).toBe("0.002");
    expect(canonicalize(0.000000000000000000000000001)).toBe("1e-27");
    expect(canonicalize(10)).toBe("10");
    expect(canonicalize(-0)).toBe("0");
  });

  it("sorts object keys by UTF-16 code units (RFC 8785 §3.2.3)", () => {
    const input = {
      "€": "Euro Sign",
      "\r": "Carriage Return",
      דּ: "Hebrew Letter Dalet With Dagesh",
      "1": "One",
      "😀": "Emoji: Grinning Face",
      "": "Control",
      ö: "Latin Small Letter O With Diaeresis",
    };
    const canonical = canonicalize(input);
    const keyOrder = [...canonical.matchAll(/"((?:[^"\\]|\\.)*)":/g)].map((m) => m[1]);
    // Surrogate pairs sort by first UTF-16 code unit: the emoji (D83D)
    // precedes the dalet (FB33) even though its code point is higher.
    expect(keyOrder).toEqual(["\\r", "1", "", "ö", "€", "😀", "דּ"]);
  });

  it("produces whitespace-free output with escaped strings", () => {
    expect(canonicalize({ string: '€$\u000F\nA\'B"\\"/' })).toBe(
      '{"string":"€$\\u000f\\nA\'B\\"\\\\\\"/"}',
    );
  });

  it("is order-insensitive for object inputs", () => {
    expect(canonicalize({ b: 2, a: 1 })).toBe(canonicalize({ a: 1, b: 2 }));
  });

  it("throws loudly on values JSON cannot represent", () => {
    expect(() => canonicalize(Number.NaN)).toThrow(TypeError);
    expect(() => canonicalize(Number.POSITIVE_INFINITY)).toThrow(TypeError);
    expect(() => canonicalize({ a: undefined })).toThrow(/undefined/);
    expect(() => canonicalize(10n as unknown)).toThrow(TypeError);
    expect(() => canonicalize((() => 1) as unknown)).toThrow(TypeError);
  });
});
