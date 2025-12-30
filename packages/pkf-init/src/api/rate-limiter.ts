/**
 * Rate Limiter for Anthropic API
 * Implements token bucket algorithm for rate limiting
 */

import type { ApiTier } from '../types/index.js';

/**
 * Rate limits by API tier
 */
const TIER_LIMITS: Record<ApiTier, { rpm: number; tpm: number }> = {
  free: { rpm: 5, tpm: 20000 },
  build1: { rpm: 50, tpm: 40000 },
  build2: { rpm: 50, tpm: 80000 },
  build3: { rpm: 50, tpm: 160000 },
  build4: { rpm: 50, tpm: 400000 },
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Token bucket rate limiter for Anthropic API
 */
export class RateLimiter {
  /** Maximum tokens per minute */
  public readonly tokensPerMinute: number;

  /** Maximum requests per minute */
  public readonly requestsPerMinute: number;

  /** Current tokens available in bucket */
  public tokenBucket: number;

  /** Current requests available in bucket */
  public requestBucket: number;

  /** Timestamp of last refill */
  public lastRefill: number;

  /**
   * Create a new rate limiter
   * @param tier - API tier (defaults to 'build1')
   */
  constructor(tier: ApiTier = 'build1') {
    const limits = TIER_LIMITS[tier];
    this.tokensPerMinute = limits.tpm;
    this.requestsPerMinute = limits.rpm;
    this.tokenBucket = this.tokensPerMinute;
    this.requestBucket = this.requestsPerMinute;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire resources for an API call
   * Waits if necessary until capacity is available
   * @param estimatedTokens - Estimated tokens for the request
   */
  async acquire(estimatedTokens: number): Promise<void> {
    // Refill buckets based on elapsed time
    this.refillBuckets();

    // Check if we need to wait
    const waitTime = this.calculateWaitTime(estimatedTokens);

    if (waitTime > 0) {
      await sleep(waitTime);
      // Refill again after waiting
      this.refillBuckets();
    }

    // Consume tokens from both buckets
    this.tokenBucket -= estimatedTokens;
    this.requestBucket -= 1;
  }

  /**
   * Refill buckets based on elapsed time since last refill
   */
  private refillBuckets(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    const elapsedMinutes = elapsedMs / 60000;

    // Refill token bucket proportionally
    this.tokenBucket = Math.min(
      this.tokensPerMinute,
      this.tokenBucket + this.tokensPerMinute * elapsedMinutes
    );

    // Refill request bucket proportionally
    this.requestBucket = Math.min(
      this.requestsPerMinute,
      this.requestBucket + this.requestsPerMinute * elapsedMinutes
    );

    this.lastRefill = now;
  }

  /**
   * Calculate how long to wait for capacity
   * @param estimatedTokens - Estimated tokens needed
   * @returns Wait time in milliseconds
   */
  private calculateWaitTime(estimatedTokens: number): number {
    const tokenShortfall = estimatedTokens - this.tokenBucket;
    const requestShortfall = 1 - this.requestBucket;

    const tokenWaitMinutes = Math.max(0, tokenShortfall / this.tokensPerMinute);
    const requestWaitMinutes = Math.max(0, requestShortfall / this.requestsPerMinute);

    return Math.ceil(Math.max(tokenWaitMinutes, requestWaitMinutes) * 60000);
  }

  /**
   * Get current available tokens
   * @returns Number of tokens available
   */
  getAvailableTokens(): number {
    return this.tokenBucket;
  }

  /**
   * Get current available requests
   * @returns Number of requests available
   */
  getAvailableRequests(): number {
    return this.requestBucket;
  }

  /**
   * Reset buckets to full capacity
   */
  reset(): void {
    this.tokenBucket = this.tokensPerMinute;
    this.requestBucket = this.requestsPerMinute;
    this.lastRefill = Date.now();
  }
}
