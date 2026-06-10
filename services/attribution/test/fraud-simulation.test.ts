/**
 * Phase 3 gate: a 50+ event simulation containing 5 distinct fraud
 * patterns. All 5 must be frozen (`under_review`) by the anomaly engine;
 * every honest event must confirm normally.
 *
 * Patterns: duplicate rail receipt, burst reporting, self-dealing via a
 * shared owner, conversion-rate z-score, value outlier.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { sha256Hex } from "@erabi/crypto";
import {
  fireIntent,
  HOUR,
  MINUTE,
  makeAgent,
  register,
  reportAndConfirm,
  setupPipeline,
  signedRequest,
  type Pipeline,
  type TestAgent,
} from "./helpers.js";

const p: Pipeline = setupPipeline();

const consumer = makeAgent("Consumer", ["agent.analysis"], {}, p.clock);
const honest = [
  makeAgent("HonestA", ["agent.research"], {}, p.clock),
  makeAgent("HonestB", ["agent.research"], {}, p.clock),
  makeAgent("HonestC", ["agent.research"], {}, p.clock),
];
const conversionFraud = makeAgent("ConversionFraud", ["agent.research"], {}, p.clock);
const burstFraud = makeAgent("BurstFraud", ["data.financial"], {}, p.clock);
const selfDealConsumer = makeAgent(
  "SelfDealConsumer",
  ["agent.analysis"],
  { payoutBinding: sha256Hex("shared-wallet") },
  p.clock,
);
const selfDealProvider = makeAgent(
  "SelfDealProvider",
  ["agent.research"],
  { payoutBinding: sha256Hex("shared-wallet") },
  p.clock,
);
const dupFraud = makeAgent("DuplicateFraud", ["agent.research"], {}, p.clock);
const outlierFraud = makeAgent("OutlierFraud", ["agent.research"], {}, p.clock);

let totalEvents = 0;

async function report(
  reporter: TestAgent,
  counterparty: TestAgent,
  auctionId: string,
  providerId: string,
  kind: "selection" | "conversion" | "task_success",
  options: { valueUsd?: number; railRef?: string; confirm?: boolean; advance?: number } = {},
) {
  const entry = await reportAndConfirm(p, {
    reporter,
    counterparty,
    auctionId,
    providerId,
    kind,
    valueUsd: options.valueUsd ?? 0,
    railRef: options.railRef,
    confirm: options.confirm ?? true,
  });
  totalEvents += 1;
  p.clock.advance(options.advance ?? MINUTE);
  return entry;
}

beforeAll(async () => {
  await register(
    p,
    consumer,
    ...honest,
    conversionFraud,
    burstFraud,
    selfDealConsumer,
    selfDealProvider,
    dupFraud,
    outlierFraud,
  );

  const research = await fireIntent(p, consumer, { category: "agent.research" });
  const financial = await fireIntent(p, consumer, {
    category: "data.financial",
    query: "exchange filings firehose",
  });
  const selfDeal = await fireIntent(p, selfDealConsumer, { category: "agent.research" });

  // ---- Phase 1: honest traffic (28 events), spread over time ----
  const honestPlan: Array<[TestAgent, number, number]> = [
    [honest[0]!, 6, 4],
    [honest[1]!, 6, 3],
    [honest[2]!, 6, 3],
  ];
  for (const [provider, selections, conversions] of honestPlan) {
    for (let i = 0; i < selections; i++) {
      await report(consumer, provider, research.auction_id, provider.id, "selection");
    }
    for (let i = 0; i < conversions; i++) {
      await report(consumer, provider, research.auction_id, provider.id, "conversion", {
        valueUsd: 2,
        railRef: `tx:${provider.manifest.name}-${i}`,
      });
    }
  }
  p.clock.advance(25 * HOUR);
  p.attribution.processHoldbacks();

  // ---- Phase 2: the five fraud patterns ----

  // (1) Conversion-rate z-score: 6 selections, 6 conversions — a 100% rate.
  for (let i = 0; i < 6; i++) {
    await report(consumer, conversionFraud, research.auction_id, conversionFraud.id, "selection");
  }
  for (let i = 0; i < 6; i++) {
    await report(consumer, conversionFraud, research.auction_id, conversionFraud.id, "conversion", {
      valueUsd: 2,
      railRef: `tx:cf-${i}`,
    });
  }

  // (2) Burst: the provider machine-guns 12 reports inside one minute.
  for (let i = 0; i < 12; i++) {
    await report(burstFraud, consumer, financial.auction_id, burstFraud.id, "task_success", {
      valueUsd: 1,
      confirm: false,
      advance: 1000,
    });
  }
  p.clock.advance(2 * MINUTE);

  // (3) Self-dealing: consumer and provider share a payout binding.
  await report(
    selfDealConsumer,
    selfDealProvider,
    selfDeal.auction_id,
    selfDealProvider.id,
    "conversion",
    { valueUsd: 2, confirm: false },
  );

  // (4) Duplicate fingerprint: the same rail receipt funds two conversions.
  await report(consumer, dupFraud, research.auction_id, dupFraud.id, "task_success", {
    valueUsd: 2,
    railRef: "tx:duplicated",
  });
  await report(consumer, dupFraud, research.auction_id, dupFraud.id, "task_success", {
    valueUsd: 2,
    railRef: "tx:duplicated",
    confirm: false,
  });

  // (5) Value outlier: a $500 outcome in a $2 category.
  await report(consumer, outlierFraud, research.auction_id, outlierFraud.id, "task_success", {
    valueUsd: 500,
    railRef: "tx:whale",
  });

  p.clock.advance(25 * HOUR);
  p.attribution.processHoldbacks();
}, 120_000);

describe("fraud simulation", () => {
  it("ran a 50+ event simulation", () => {
    expect(totalEvents).toBeGreaterThanOrEqual(50);
  });

  it("freezes pattern 1: conversion-rate z-score outlier", () => {
    const frozen = p.attribution
      .getLedger(conversionFraud.id)
      .filter((e) => e.status === "under_review");
    expect(frozen.length).toBeGreaterThan(0);
    expect(frozen[0]!.freeze_reason).toContain("conversion_rate_zscore");
  });

  it("freezes pattern 2: burst reporting", () => {
    const frozen = p.attribution
      .getLedger(burstFraud.id)
      .filter((e) => e.status === "under_review");
    expect(frozen.length).toBeGreaterThan(0);
    expect(frozen[0]!.freeze_reason).toContain("burst_detection");
  });

  it("freezes pattern 3: self-dealing via shared owner", () => {
    const frozen = p.attribution
      .getLedger(selfDealProvider.id)
      .filter((e) => e.status === "under_review");
    expect(frozen.length).toBeGreaterThan(0);
    expect(frozen[0]!.freeze_reason).toContain("self_dealing_shared_owner");
  });

  it("freezes pattern 4: duplicate rail receipt", () => {
    const frozen = p.attribution.getLedger(dupFraud.id).filter((e) => e.status === "under_review");
    expect(frozen).toHaveLength(1);
    expect(frozen[0]!.freeze_reason).toContain("duplicate_rail_receipt");
  });

  it("freezes pattern 5: value outlier", () => {
    const frozen = p.attribution
      .getLedger(outlierFraud.id)
      .filter((e) => e.status === "under_review");
    expect(frozen).toHaveLength(1);
    expect(frozen[0]!.freeze_reason).toContain("value_outlier");
  });

  it("confirms every honest event — no false positives", () => {
    for (const provider of honest) {
      const ledger = p.attribution.getLedger(provider.id);
      expect(ledger.length).toBeGreaterThan(0);
      for (const event of ledger) {
        expect(event.status).toBe("confirmed");
      }
      expect(p.attribution.verifyChain(provider.id)).toBe(true);
    }
  });

  it("frozen events never bear earnings", () => {
    expect(p.attribution.getEarnings(selfDealConsumer.id).accrued_usd).toBe(0);
  });
});
