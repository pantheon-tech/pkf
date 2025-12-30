/**
 * Rate Limiter for Anthropic API
 * Implements token bucket algorithm for rate limiting
 */
import type { ApiTier } from '../types/index.js';
/**
 * Token bucket rate limiter for Anthropic API
 */
export declare class RateLimiter {
    /** Maximum tokens per minute */
    readonly tokensPerMinute: number;
    /** Maximum requests per minute */
    readonly requestsPerMinute: number;
    /** Current tokens available in bucket */
    tokenBucket: number;
    /** Current requests available in bucket */
    requestBucket: number;
    /** Timestamp of last refill */
    lastRefill: number;
    /**
     * Create a new rate limiter
     * @param tier - API tier (defaults to 'build1')
     */
    constructor(tier?: ApiTier);
    /**
     * Acquire resources for an API call
     * Waits if necessary until capacity is available
     * @param estimatedTokens - Estimated tokens for the request
     */
    acquire(estimatedTokens: number): Promise<void>;
    /**
     * Refill buckets based on elapsed time since last refill
     */
    private refillBuckets;
    /**
     * Calculate how long to wait for capacity
     * @param estimatedTokens - Estimated tokens needed
     * @returns Wait time in milliseconds
     */
    private calculateWaitTime;
    /**
     * Get current available tokens
     * @returns Number of tokens available
     */
    getAvailableTokens(): number;
    /**
     * Get current available requests
     * @returns Number of requests available
     */
    getAvailableRequests(): number;
    /**
     * Reset buckets to full capacity
     */
    reset(): void;
}
//# sourceMappingURL=rate-limiter.d.ts.map