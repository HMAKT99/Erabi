import {
  REPUTATION_COLD_CAP,
  REPUTATION_COLD_CAP_EVENTS,
  REPUTATION_DECAY_AFTER_DAYS,
  REPUTATION_HALF_LIFE_DAYS,
  REPUTATION_STARTING_SCORE,
  TIER_POLICIES,
  type Tier,
} from "@erabi/config";

/**
 * Trust model seam (spec §10.3): RuleTrustModel now, a learned model
 * trained on decision tuples later — same interface.
 */

export interface EvidenceEvent {
  event_id: string;
  kind: string;
  status: string;
  dual_signed: boolean;
  value_usd: number;
  created_at: string;
}

export interface ReputationComponents {
  success_rate: number;
  log_volume: number;
  latency: number;
  inverse_dispute_rate: number;
  identity_tier: number;
}

export interface ReputationResult {
  score: number;
  components: ReputationComponents;
  confirmed_events: number;
  cold_capped: boolean;
  evidence: string[];
}

export interface TrustModel {
  compute(evidence: EvidenceEvent[], tier: Tier, nowMs: number): ReputationResult;
}

/** Weights from the spec: 40/15/15/20/10. */
const WEIGHTS = {
  success_rate: 0.4,
  log_volume: 0.15,
  latency: 0.15,
  inverse_dispute_rate: 0.2,
  identity_tier: 0.1,
} as const;

const TIER_SCORE: Record<Tier, number> = {
  unverified: 0.25,
  verified: 0.75,
  staked: 1.0,
  bridge: 0.6,
};

/** 30-day half-life applied to events older than 90 days. */
export function decayWeight(eventTsMs: number, nowMs: number): number {
  const ageDays = Math.max(0, (nowMs - eventTsMs) / 86_400_000);
  if (ageDays <= REPUTATION_DECAY_AFTER_DAYS) return 1;
  return Math.pow(0.5, (ageDays - REPUTATION_DECAY_AFTER_DAYS) / REPUTATION_HALF_LIFE_DAYS);
}

export class RuleTrustModel implements TrustModel {
  compute(evidence: EvidenceEvent[], tier: Tier, nowMs: number): ReputationResult {
    let successWeight = 0;
    let disputeWeight = 0;
    let confirmedWeight = 0;
    let confirmedCount = 0;
    let dualSignedConfirmed = 0;

    for (const event of evidence) {
      const weight = decayWeight(Date.parse(event.created_at), nowMs);
      if (event.kind === "dispute") {
        disputeWeight += weight;
        continue;
      }
      // NEVER self-reported: only confirmed (dual-signed, past holdback)
      // events bear reputation.
      if (event.status !== "confirmed") continue;
      confirmedCount += 1;
      confirmedWeight += weight;
      if (event.dual_signed) dualSignedConfirmed += 1;
      if (
        event.kind === "conversion" ||
        event.kind === "task_success" ||
        event.kind === "assisted"
      ) {
        successWeight += weight;
      }
    }

    const outcomesDenominator = successWeight + disputeWeight;
    const components: ReputationComponents = {
      // Neutral 0.5 until there is outcome evidence either way.
      success_rate: outcomesDenominator > 0 ? successWeight / outcomesDenominator : 0.5,
      // 100 weighted confirmed events → 1.0.
      log_volume: Math.min(1, Math.log10(1 + confirmedWeight) / 2),
      // Latency attestations are not in the 0.1 event schema; neutral until
      // they land (DECISIONS 0014).
      latency: 0.5,
      inverse_dispute_rate:
        confirmedWeight + disputeWeight > 0
          ? 1 - Math.min(1, (disputeWeight / (confirmedWeight + disputeWeight)) * 5)
          : 1,
      identity_tier: TIER_SCORE[tier],
    };

    let score =
      100 *
      (WEIGHTS.success_rate * components.success_rate +
        WEIGHTS.log_volume * components.log_volume +
        WEIGHTS.latency * components.latency +
        WEIGHTS.inverse_dispute_rate * components.inverse_dispute_rate +
        WEIGHTS.identity_tier * components.identity_tier);

    if (confirmedCount === 0 && disputeWeight === 0) {
      score = REPUTATION_STARTING_SCORE;
    }

    // Cold cap until 10 confirmed dual-signed events...
    const coldCapped = dualSignedConfirmed < REPUTATION_COLD_CAP_EVENTS;
    if (coldCapped) score = Math.min(score, REPUTATION_COLD_CAP);
    // ...and the tier ceiling always applies.
    score = Math.min(score, TIER_POLICIES[tier].reputationCeiling);
    score = Math.max(0, Math.min(100, score));

    return {
      score: Number(score.toFixed(2)),
      components,
      confirmed_events: confirmedCount,
      cold_capped: coldCapped,
      evidence: evidence.map((event) => event.event_id),
    };
  }
}
