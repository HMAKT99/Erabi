import { beforeEach, describe, expect, it } from "vitest";
import {
  makeAgent,
  makeIntent,
  registerAgents,
  setupFixture,
  signedRequest,
  type Fixture,
} from "./helpers.js";

const DAY = 86_400_000;

let nowMs: number;
let fixture: Fixture;

beforeEach(() => {
  nowMs = Date.now();
  fixture = setupFixture({ now: () => nowMs });
});

async function loggedIntent() {
  const consumer = makeAgent("TupleOwner", ["agent.analysis"]);
  const provider = makeAgent("TupleProvider", ["agent.research"]);
  await registerAgents(fixture.registry, [consumer, provider]);
  const intent = makeIntent(consumer);
  await fixture.exchange.submitIntent(signedRequest(consumer, intent));
  return { consumer, provider, intent };
}

describe("retention (spec §9.7)", () => {
  it("redacts per-candidate detail after the audit window, keeping aggregates", async () => {
    const { intent } = await loggedIntent();

    // Inside the window: untouched.
    expect(fixture.exchange.applyRetention()).toBe(0);

    nowMs += 91 * DAY;
    expect(fixture.exchange.applyRetention()).toBe(1);
    // Idempotent.
    expect(fixture.exchange.applyRetention()).toBe(0);

    const row = fixture.exchange.getDecisionTuple(intent.intent_id);
    const tuple = row.tuple as {
      redacted: boolean;
      intent_features: { category: string };
      candidate_counts: { organic: number };
      candidate_set?: unknown;
    };
    expect(tuple.redacted).toBe(true);
    expect(tuple.intent_features.category).toBe("agent.research");
    expect(tuple.candidate_counts.organic).toBeGreaterThan(0);
    expect(tuple.candidate_set).toBeUndefined();
  });
});

describe("dataset export (spec/DATASET.md)", () => {
  it("emits JSONL with pseudonymous agent ids and coarsened timestamps", async () => {
    const { consumer, provider } = await loggedIntent();

    const jsonl = fixture.exchange.exportTuples({ salt: "release-2026-q2" });
    const lines = jsonl.trim().split("\n");
    const header = JSON.parse(lines[0]!);
    expect(header.dataset).toBe("erabi-tuples");
    expect(header.tuples).toBe(1);

    // No real identities anywhere; pseudonyms are stable within an export.
    expect(jsonl).not.toContain(consumer.id);
    expect(jsonl).not.toContain(provider.id);
    expect(jsonl).toMatch(/agent_[0-9a-f]{12}/);

    const record = JSON.parse(lines[1]!);
    expect(record.created_at).toMatch(/T\d{2}:00:00Z$/);

    // A different salt yields different pseudonyms (unlinkable across releases).
    const other = fixture.exchange.exportTuples({ salt: "release-2026-q3" });
    const pseudonym = jsonl.match(/agent_[0-9a-f]{12}/)![0];
    expect(other).not.toContain(pseudonym);
  });
});
