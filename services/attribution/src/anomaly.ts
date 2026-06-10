/**
 * Anomaly rules engine v0 (conversion fraud is the #1 engineering problem).
 * Flagged events are frozen as `under_review` and never confirm, bear
 * reputation, or accrue rev-share until released.
 *
 * Rule-based now; designed as a seam (AnomalyEngine interface) so a learned
 * detector can replace RuleAnomalyEngine later.
 */

export interface OwnerAnchors {
  payout_binding: string | null;
  verification: string[];
}

export interface IngestCheckInput {
  providerId: string;
  consumerId: string;
  railRef: string | null;
  reportedAtMs: number;
  /** Recent event timestamps (ms) from the same reporter. */
  recentReporterEventTimesMs: number[];
  /** Is this rail receipt ref already present in the ledger? */
  railRefSeen: boolean;
  providerOwner: OwnerAnchors | null;
  consumerOwner: OwnerAnchors | null;
}

export interface ConfirmCheckInput {
  providerId: string;
  kind: string;
  valueUsd: number;
  /** Per-provider {selections, conversions} for the event's category (excluding frozen). */
  categoryConversion: Map<string, { selections: number; conversions: number }>;
  /** Confirmed value_usd samples for the category (excluding this event). */
  categoryValues: number[];
}

export interface AnomalyEngine {
  checkOnIngest(input: IngestCheckInput): string[];
  checkOnConfirm(input: ConfirmCheckInput): string[];
}

export const BURST_WINDOW_MS = 60_000;
export const BURST_MAX_EVENTS = 10;
export const CONVERSION_MIN_SELECTIONS = 5;
export const CONVERSION_MIN_PEERS = 2;
export const CONVERSION_Z_THRESHOLD = 3;
/** Floor on peer std so near-identical peers don't make every deviation infinite. */
export const CONVERSION_STD_FLOOR = 0.1;
export const VALUE_OUTLIER_MIN_SAMPLES = 10;
export const VALUE_OUTLIER_MEDIAN_MULTIPLE = 25;

export class RuleAnomalyEngine implements AnomalyEngine {
  checkOnIngest(input: IngestCheckInput): string[] {
    const reasons: string[] = [];

    if (input.railRef && input.railRefSeen) {
      reasons.push("duplicate_rail_receipt");
    }

    const windowStart = input.reportedAtMs - BURST_WINDOW_MS;
    const inWindow = input.recentReporterEventTimesMs.filter((t) => t >= windowStart).length;
    if (inWindow + 1 > BURST_MAX_EVENTS) {
      reasons.push("burst_detection");
    }

    if (sharesOwner(input.providerOwner, input.consumerOwner)) {
      reasons.push("self_dealing_shared_owner");
    }

    return reasons;
  }

  checkOnConfirm(input: ConfirmCheckInput): string[] {
    const reasons: string[] = [];

    if (input.kind === "conversion" || input.kind === "task_success") {
      const mine = input.categoryConversion.get(input.providerId);
      if (mine && mine.selections >= CONVERSION_MIN_SELECTIONS) {
        const peers = [...input.categoryConversion.entries()]
          .filter(([id, s]) => id !== input.providerId && s.selections >= CONVERSION_MIN_SELECTIONS)
          .map(([, s]) => s.conversions / s.selections);
        if (peers.length >= CONVERSION_MIN_PEERS) {
          const mean = peers.reduce((a, b) => a + b, 0) / peers.length;
          const variance = peers.reduce((a, b) => a + (b - mean) ** 2, 0) / peers.length;
          const std = Math.max(Math.sqrt(variance), CONVERSION_STD_FLOOR);
          const mineRate = mine.conversions / mine.selections;
          const z = (mineRate - mean) / std;
          if (z > CONVERSION_Z_THRESHOLD) {
            reasons.push("conversion_rate_zscore");
          }
        }
      }
    }

    if (input.categoryValues.length >= VALUE_OUTLIER_MIN_SAMPLES && input.valueUsd > 0) {
      const sorted = [...input.categoryValues].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)]!;
      if (median > 0 && input.valueUsd > VALUE_OUTLIER_MEDIAN_MULTIPLE * median) {
        reasons.push("value_outlier");
      }
    }

    return reasons;
  }
}

export function sharesOwner(a: OwnerAnchors | null, b: OwnerAnchors | null): boolean {
  if (!a || !b) return false;
  if (a.payout_binding && a.payout_binding === b.payout_binding) return true;
  const anchors = new Set(a.verification);
  return b.verification.some((v) => anchors.has(v));
}
