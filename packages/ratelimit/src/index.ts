/**
 * Token-bucket rate limiting, keyed per identity (agent id or IP).
 *
 * In-memory buckets are correct for a single node; a multi-node deployment
 * swaps the store behind the same interface (e.g. Redis with token-bucket
 * Lua) without touching the services.
 */

export interface RateLimitDecision {
  allowed: boolean;
  /** Tokens remaining after this request (0 when denied). */
  remaining: number;
  /** Milliseconds until a token is available (0 when allowed). */
  retryAfterMs: number;
}

export interface RateLimiter {
  check(key: string): RateLimitDecision;
}

export interface TokenBucketOptions {
  /** Sustained allowance per window (e.g. requests per minute). */
  limit: number;
  /** Window the limit refills over. Default 60s. */
  windowMs?: number;
  /** Burst capacity. Default = limit. */
  burst?: number;
  now?: () => number;
  /** Evict idle buckets after this long. Default 10 windows. */
  idleEvictMs?: number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export class TokenBucketLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly burst: number;
  private readonly now: () => number;
  private readonly idleEvictMs: number;
  private lastSweep = 0;

  constructor(options: TokenBucketOptions) {
    if (options.limit <= 0) throw new TypeError("rate limit must be positive");
    this.limit = options.limit;
    this.windowMs = options.windowMs ?? 60_000;
    this.burst = options.burst ?? options.limit;
    this.now = options.now ?? Date.now;
    this.idleEvictMs = options.idleEvictMs ?? this.windowMs * 10;
  }

  check(key: string): RateLimitDecision {
    const nowMs = this.now();
    this.sweep(nowMs);

    const bucket = this.buckets.get(key) ?? { tokens: this.burst, updatedAt: nowMs };
    const refill = ((nowMs - bucket.updatedAt) / this.windowMs) * this.limit;
    bucket.tokens = Math.min(this.burst, bucket.tokens + refill);
    bucket.updatedAt = nowMs;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.buckets.set(key, bucket);
      return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 };
    }
    this.buckets.set(key, bucket);
    const retryAfterMs = Math.ceil(((1 - bucket.tokens) * this.windowMs) / this.limit);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  private sweep(nowMs: number): void {
    if (nowMs - this.lastSweep < this.idleEvictMs) return;
    this.lastSweep = nowMs;
    for (const [key, bucket] of this.buckets) {
      if (nowMs - bucket.updatedAt > this.idleEvictMs) this.buckets.delete(key);
    }
  }
}

/** Key for write endpoints: the signing identity when present, else the IP. */
export function envelopeKey(body: unknown, ip: string): string {
  if (
    body &&
    typeof body === "object" &&
    typeof (body as { key_id?: unknown }).key_id === "string"
  ) {
    return (body as { key_id: string }).key_id;
  }
  return `ip:${ip}`;
}
