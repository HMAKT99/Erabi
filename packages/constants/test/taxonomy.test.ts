import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  CATEGORY_PATTERN,
  isValidCategory,
  SPEC_TAG,
  SPEC_VERSION,
  TAXONOMY,
} from "../src/index.js";

describe("taxonomy", () => {
  it("every category matches the structural pattern and its group prefix", () => {
    for (const [group, categories] of Object.entries(TAXONOMY)) {
      for (const category of categories) {
        expect(category).toMatch(CATEGORY_PATTERN);
        expect(category.startsWith(`${group}.`)).toBe(true);
      }
    }
  });

  it("has no duplicate categories", () => {
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
  });

  it("isValidCategory accepts known and rejects unknown categories", () => {
    expect(isValidCategory("agent.research")).toBe(true);
    expect(isValidCategory("agent.unknown")).toBe(false);
    expect(isValidCategory("crypto.tokens")).toBe(false);
  });
});

describe("branding", () => {
  it("spec tag is derived from spec version", () => {
    expect(SPEC_TAG).toBe(`erabi/${SPEC_VERSION}`);
  });
});
