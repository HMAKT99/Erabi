/**
 * Every economics knob in the reference node lives here, with comments.
 * Values are launch defaults; node operators override via their own build.
 */

export type Tier = "unverified" | "verified" | "staked" | "bridge";

export interface TierPolicy {
  /** Reputation score ceiling while in this tier. */
  reputationCeiling: number;
  /** Maximum share of accrued rev-share that may pay out per period. */
  payoutShareCap: number;
  /** Multiplier applied to rank_score in the auction (stake_multiplier). */
  auctionMultiplier: number;
}

/**
 * Identity tiers: open joining with tiered trust. Instant unverified join,
 * capped until anchored; verification lifts the caps; stake adds skin in
 * the game; bridges are operated by the node itself.
 */
export const TIER_POLICIES: Record<Tier, TierPolicy> = {
  unverified: { reputationCeiling: 70, payoutShareCap: 0.4, auctionMultiplier: 0.5 },
  verified: { reputationCeiling: 100, payoutShareCap: 0.8, auctionMultiplier: 1.0 },
  staked: { reputationCeiling: 100, payoutShareCap: 1.0, auctionMultiplier: 1.2 },
  bridge: { reputationCeiling: 100, payoutShareCap: 1.0, auctionMultiplier: 1.0 },
};

/** Reputation: new agents start here... */
export const REPUTATION_STARTING_SCORE = 50;
/** ...and stay capped here until this many confirmed dual-signed events. */
export const REPUTATION_COLD_CAP = 70;
export const REPUTATION_COLD_CAP_EVENTS = 10;
/** Half-life (days) applied to events older than REPUTATION_DECAY_AFTER_DAYS. */
export const REPUTATION_HALF_LIFE_DAYS = 30;
export const REPUTATION_DECAY_AFTER_DAYS = 90;

/** Discovery ranking freshness: half-life in days on last activity. */
export const DISCOVERY_FRESHNESS_HALF_LIFE_DAYS = 30;

/** Rev-share split of cleared spend: developer / protocol / reserved. */
export const REV_SHARE = { developer: 0.7, protocol: 0.2, reserved: 0.1 } as const;

/**
 * Referral primitive: referrers earn this share of the recruit's confirmed
 * settlements for the recruit's first N days. Accrues ONLY on dual-signed
 * confirmed settlements from tier-anchored recruits (Sybil guard).
 */
export const REFERRAL_SHARE = 0.02;
export const REFERRAL_WINDOW_DAYS = 90;

/**
 * Holdback windows (hours) before a counterparty-signed event confirms,
 * by category group. Long-cycle B2B categories may set days/weeks.
 */
export const HOLDBACK_HOURS: Record<string, number> = {
  default: 72,
  commerce: 72,
  agent: 24,
  api: 24,
  data: 24,
  compute: 24,
};

/** Auction reserve prices (USD) per category group; auctions never clear below. */
export const RESERVE_PRICE_USD: Record<string, number> = {
  default: 0.01,
  commerce: 0.05,
};

/** Per-identity token-bucket rate limits (requests/minute). */
export const RATE_LIMITS = {
  intentsPerMinute: 120,
  registrationsPerMinutePerIp: 30,
  eventsPerMinute: 240,
} as const;

/** Fleet registration: max members per request. */
export const FLEET_MAX_MEMBERS = 100;

/** Staked tier: minimum ledger-held deposit (USD). */
export const STAKE_MINIMUM_USD = 100;
/** Fraction of stake slashed per fraud-frozen event. */
export const STAKE_SLASH_FRACTION = 0.1;

/**
 * CPA/rev-share budget reservations: a sponsored serve holds budget until
 * the outcome confirms (charge) or this window passes (release).
 */
export const CPA_RESERVATION_HOURS = 96;
