import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { isValidCategory } from "@erabi/constants";
import * as generated from "../src/generated/index.js";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function camel(stem: string): string {
  return stem.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
}

const stems = readdirSync(path.join(pkgRoot, "json"))
  .filter((f) => f.endsWith(".schema.json"))
  .map((f) => f.replace(/\.schema\.json$/, ""))
  .sort();

const schemas = Object.fromEntries(
  stems.map((stem) => [
    stem,
    JSON.parse(readFileSync(path.join(pkgRoot, "json", `${stem}.schema.json`), "utf8")),
  ]),
);

const examples = Object.fromEntries(
  stems.map((stem) => [
    stem,
    JSON.parse(readFileSync(path.join(pkgRoot, "examples", `${stem}.example.json`), "utf8")),
  ]),
);

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
for (const stem of stems) ajv.addSchema(schemas[stem]);

function ajvValidate(stem: string, data: unknown): boolean {
  const validate = ajv.getSchema(schemas[stem].$id);
  if (!validate) throw new Error(`no compiled schema for ${stem}`);
  return validate(data) as boolean;
}

function zodSchema(stem: string) {
  const zod = (generated as Record<string, unknown>)[`${camel(stem)}Zod`];
  if (!zod) throw new Error(`no generated zod schema for ${stem}`);
  return zod as { safeParse(data: unknown): { success: boolean } };
}

describe.each(stems)("%s", (stem) => {
  it("example validates against the JSON Schema (Ajv)", () => {
    const ok = ajvValidate(stem, examples[stem]);
    if (!ok) console.error(ajv.getSchema(schemas[stem].$id)?.errors);
    expect(ok).toBe(true);
  });

  it("example validates against the generated Zod schema", () => {
    const result = zodSchema(stem).safeParse(examples[stem]);
    if (!result.success) console.error(result);
    expect(result.success).toBe(true);
  });

  it("unknown root fields are rejected by both validators", () => {
    const tampered = { ...examples[stem], evil_extra_field: 1 };
    expect(ajvValidate(stem, tampered)).toBe(false);
    expect(zodSchema(stem).safeParse(tampered).success).toBe(false);
  });

  it("every required field is enforced by both validators", () => {
    for (const field of schemas[stem].required as string[]) {
      const tampered: Record<string, unknown> = { ...examples[stem] };
      delete tampered[field];
      expect(ajvValidate(stem, tampered), `ajv: missing ${field} accepted`).toBe(false);
      expect(zodSchema(stem).safeParse(tampered).success, `zod: missing ${field} accepted`).toBe(
        false,
      );
    }
  });
});

describe("protocol invariants encoded in schemas", () => {
  it("disclosure label must contain 'Sponsored'", () => {
    const bad = { ...examples["disclosure-record"], label: "Paid placement" };
    expect(ajvValidate("disclosure-record", bad)).toBe(false);
    expect(zodSchema("disclosure-record").safeParse(bad).success).toBe(false);
  });

  it("consideration set allows at most 2 sponsored entries", () => {
    const base = examples["consideration-set"] as { sponsored: unknown[] };
    const entry = base.sponsored[0];
    const bad = { ...base, sponsored: [entry, entry, entry] };
    expect(ajvValidate("consideration-set", bad)).toBe(false);
    expect(zodSchema("consideration-set").safeParse(bad).success).toBe(false);
  });

  it("intent schema has no user-identifier fields and rejects additions", () => {
    const props = Object.keys(schemas["intent"].properties as Record<string, unknown>);
    for (const prop of props) {
      expect(prop).not.toMatch(/user|email|phone|session|cookie|ip/i);
    }
    const bad = { ...examples["intent"], user_email: "someone@example.com" };
    expect(ajvValidate("intent", bad)).toBe(false);
    expect(zodSchema("intent").safeParse(bad).success).toBe(false);
  });

  it("negative prices are rejected", () => {
    const intent = examples["intent"] as { constraints: Record<string, unknown> };
    const bad = { ...intent, constraints: { ...intent.constraints, max_price_usd: -1 } };
    expect(ajvValidate("intent", bad)).toBe(false);
    expect(zodSchema("intent").safeParse(bad).success).toBe(false);
  });

  it("example categories come from the launch taxonomy", () => {
    const intent = examples["intent"] as { category: string };
    expect(isValidCategory(intent.category)).toBe(true);
    const manifest = examples["agent-manifest"] as { capabilities: string[] };
    for (const capability of manifest.capabilities) {
      expect(isValidCategory(capability)).toBe(true);
    }
  });
});
