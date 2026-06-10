import { describe, expect, it } from "vitest";
import { decayWeight, RuleTrustModel, type EvidenceEvent } from "../src/model.js";
import { ReputationService } from "../src/service.js";
import type { AgentDirectory } from "@erabi/exchange";

const NOW = Date.parse("2026-06-10T00:00:00.000Z");
const DAY = 86_400_000;

function event(overrides: Partial<EvidenceEvent>): EvidenceEvent {
  return {
    event_id: `evt-${Math.random().toString(36).slice(2)}`,
    kind: "task_success",
    status: "confirmed",
    dual_signed: true,
    value_usd: 2,
    created_at: new Date(NOW - 5 * DAY).toISOString(),
    ...overrides,
  };
}

function successes(n: number, ageDays = 5): EvidenceEvent[] {
  return Array.from({ length: n }, (_, i) =>
    event({
      event_id: `s-${ageDays}-${i}`,
      created_at: new Date(NOW - ageDays * DAY).toISOString(),
    }),
  );
}

const model = new RuleTrustModel();

describe("RuleTrustModel", () => {
  it("recomputes deterministically from the same evidence", () => {
    const evidence = [
      ...successes(12),
      event({ event_id: "d1", kind: "dispute" }),
      event({ event_id: "p1", status: "pending" }),
    ];
    const a = model.compute(evidence, "verified", NOW);
    const b = model.compute([...evidence], "verified", NOW);
    expect(a).toEqual(b);
    expect(a.evidence).toHaveLength(evidence.length);
  });

  it("new agents start at 50", () => {
    expect(model.compute([], "unverified", NOW).score).toBe(50);
  });

  it("only confirmed events bear reputation", () => {
    const pendingOnly = Array.from({ length: 20 }, (_, i) =>
      event({ event_id: `pending-${i}`, status: "pending" }),
    );
    const result = model.compute(pendingOnly, "verified", NOW);
    expect(result.confirmed_events).toBe(0);
    expect(result.score).toBe(50);
  });

  it("cold-caps at 70 until 10 confirmed dual-signed events", () => {
    const under = model.compute(successes(9), "verified", NOW);
    expect(under.cold_capped).toBe(true);
    expect(under.score).toBeLessThanOrEqual(70);

    const over = model.compute(successes(12), "verified", NOW);
    expect(over.cold_capped).toBe(false);
    expect(over.score).toBeGreaterThan(70);
  });

  it("enforces the unverified tier ceiling even with strong evidence", () => {
    const result = model.compute(successes(50), "unverified", NOW);
    expect(result.score).toBeLessThanOrEqual(70);
  });

  it("disputes drag the score down", () => {
    const clean = model.compute(successes(12), "verified", NOW);
    const disputed = model.compute(
      [...successes(12), event({ kind: "dispute" }), event({ kind: "dispute" })],
      "verified",
      NOW,
    );
    expect(disputed.score).toBeLessThan(clean.score);
  });

  it("decays events older than 90 days with a 30-day half-life", () => {
    expect(decayWeight(NOW - 30 * DAY, NOW)).toBe(1);
    expect(decayWeight(NOW - 90 * DAY, NOW)).toBe(1);
    expect(decayWeight(NOW - 120 * DAY, NOW)).toBeCloseTo(0.5, 6);
    expect(decayWeight(NOW - 150 * DAY, NOW)).toBeCloseTo(0.25, 6);

    const fresh = model.compute(successes(12, 5), "verified", NOW);
    const stale = model.compute(successes(12, 200), "verified", NOW);
    expect(stale.score).toBeLessThan(fresh.score);
  });
});

describe("ReputationService", () => {
  function stubDirectory(tier: "unverified" | "verified"): AgentDirectory {
    return {
      getAgent: (id: string) =>
        ({
          manifest: { id } as never,
          publicKey: "ed25519:stub",
          tier,
          reputation: 50,
        }) as never,
      discover: () => [],
    };
  }

  it("serves score + evidence trail and pushes to the sink", () => {
    const pushed: Array<[string, number]> = [];
    const evidence = successes(12);
    const service = new ReputationService({
      ledger: { evidenceFor: () => evidence },
      directory: stubDirectory("verified"),
      sink: { setReputation: (id, score) => pushed.push([id, score]) },
      now: () => NOW,
    });

    const view = service.getReputation("erabi:agent:stub");
    expect(view.score).toBeGreaterThan(70);
    expect(view.evidence).toEqual(evidence.map((e) => e.event_id));
    expect(pushed).toEqual([["erabi:agent:stub", view.score]]);

    // Deterministic across calls.
    expect(service.getReputation("erabi:agent:stub").score).toBe(view.score);
  });
});
