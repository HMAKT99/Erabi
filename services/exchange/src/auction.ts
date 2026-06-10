import { TIER_POLICIES, type Tier } from "@erabi/config";

/**
 * Quality-weighted generalized second-price (GSP) auction.
 *
 * rank_score = bid × (reputation / 100) × stake_multiplier. The winner of
 * each slot pays the minimum price that would still hold its rank against
 * the next candidate, floored at the category reserve and capped at its
 * own bid. Reputation here IS Quality Score: a high-reputation provider
 * pays less for the same slot.
 */

export interface AuctionCandidate {
  bidId: string;
  providerId: string;
  amountUsd: number;
  paymentModel: "cpa" | "cpc" | "rev_share";
  reputation: number;
  tier: Tier;
  creative: { title: string; claim: string; endpoint: string };
}

export interface ClearedSlot {
  candidate: AuctionCandidate;
  quality: number;
  rankScore: number;
  clearingPriceUsd: number;
}

export function runAuction(
  candidates: AuctionCandidate[],
  options: { maxSlots: number; reservePriceUsd: number },
): ClearedSlot[] {
  if (options.maxSlots <= 0) return [];

  const scored = candidates
    .map((candidate) => {
      const quality =
        (candidate.reputation / 100) * TIER_POLICIES[candidate.tier].auctionMultiplier;
      return { candidate, quality, rankScore: candidate.amountUsd * quality };
    })
    .filter((slot) => slot.rankScore > 0)
    .sort((a, b) => b.rankScore - a.rankScore);

  const slots: ClearedSlot[] = [];
  for (let i = 0; i < Math.min(options.maxSlots, scored.length); i++) {
    const { candidate, quality, rankScore } = scored[i]!;
    const nextScore = scored[i + 1]?.rankScore ?? 0;
    const minToHoldRank = nextScore / quality;
    const clearingPriceUsd = Math.min(
      candidate.amountUsd,
      Math.max(options.reservePriceUsd, minToHoldRank),
    );
    slots.push({
      candidate,
      quality,
      rankScore,
      clearingPriceUsd: Number(clearingPriceUsd.toFixed(6)),
    });
  }
  return slots;
}

/**
 * Sponsored slot budget for a consideration set: the largest s with
 * s / (organic + s) ≤ ratio, hard-capped at 2 (spec §6.4).
 */
export function sponsoredSlotBudget(organicCount: number, maxSponsoredRatio: number): number {
  if (maxSponsoredRatio <= 0 || organicCount <= 0) return 0;
  if (maxSponsoredRatio >= 1) return 2;
  const byRatio = Math.floor((maxSponsoredRatio * organicCount) / (1 - maxSponsoredRatio));
  return Math.max(0, Math.min(2, byRatio));
}
