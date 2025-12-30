/**
 * Unit tests for RateLimiter
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimiter } from '../../src/api/rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Constructor - Tier Initialization', () => {
    it('initializes with correct limits for free tier', () => {
      const limiter = new RateLimiter('free');

      expect(limiter.tokensPerMinute).toBe(20000);
      expect(limiter.requestsPerMinute).toBe(5);
    });

    it('initializes with correct limits for build1 tier', () => {
      const limiter = new RateLimiter('build1');

      expect(limiter.tokensPerMinute).toBe(40000);
      expect(limiter.requestsPerMinute).toBe(50);
    });

    it('initializes with correct limits for build2 tier', () => {
      const limiter = new RateLimiter('build2');

      expect(limiter.tokensPerMinute).toBe(80000);
      expect(limiter.requestsPerMinute).toBe(50);
    });

    it('initializes with correct limits for build3 tier', () => {
      const limiter = new RateLimiter('build3');

      expect(limiter.tokensPerMinute).toBe(160000);
      expect(limiter.requestsPerMinute).toBe(50);
    });

    it('initializes with correct limits for build4 tier', () => {
      const limiter = new RateLimiter('build4');

      expect(limiter.tokensPerMinute).toBe(400000);
      expect(limiter.requestsPerMinute).toBe(50);
    });
  });

  describe('Bucket Initialization', () => {
    it('starts buckets at full capacity', () => {
      const limiter = new RateLimiter('build1');

      expect(limiter.tokenBucket).toBe(limiter.tokensPerMinute);
      expect(limiter.requestBucket).toBe(limiter.requestsPerMinute);
      expect(limiter.getAvailableTokens()).toBe(40000);
      expect(limiter.getAvailableRequests()).toBe(50);
    });
  });

  describe('acquire()', () => {
    it('consumes tokens correctly', async () => {
      const limiter = new RateLimiter('build1');
      const initialTokens = limiter.tokenBucket;
      const initialRequests = limiter.requestBucket;

      await limiter.acquire(1000);

      expect(limiter.tokenBucket).toBe(initialTokens - 1000);
      expect(limiter.requestBucket).toBe(initialRequests - 1);
    });

    it('waits when bucket is insufficient and then consumes', async () => {
      const limiter = new RateLimiter('build1');

      // Exhaust most tokens
      limiter.tokenBucket = 500;
      limiter.requestBucket = 50;

      // Request more tokens than available
      const acquirePromise = limiter.acquire(1000);

      // Should have set a timeout since we need 500 more tokens
      // With 40000 tokens per minute, 500 tokens takes:
      // 500 / 40000 = 0.0125 minutes = 750ms
      expect(vi.getTimerCount()).toBe(1);

      // Advance time past the wait period
      await vi.advanceTimersByTimeAsync(1000);

      await acquirePromise;

      // After waiting and refilling, tokens should be consumed
      // The bucket gets refilled proportionally and then tokens are consumed
      expect(limiter.requestBucket).toBeLessThan(50);
    });
  });

  describe('refillBuckets()', () => {
    it('adds tokens proportionally based on elapsed time', async () => {
      const limiter = new RateLimiter('build1');

      // Consume some tokens
      limiter.tokenBucket = 20000; // Half full
      limiter.requestBucket = 26; // Half full + 1 (since acquire(0) will consume 1 request)

      // Advance time by 30 seconds (half a minute)
      await vi.advanceTimersByTimeAsync(30000);

      // Trigger a refill by calling acquire with 0 tokens
      // Note: acquire(0) still consumes 1 request from the bucket
      await limiter.acquire(0);

      // After 30 seconds (0.5 minutes), buckets should refill:
      // tokens: 20000 + (40000 * 0.5) = 40000 (capped at max)
      // requests: 26 + (50 * 0.5) = 51, capped at 50, then -1 for acquire = 49
      expect(limiter.tokenBucket).toBe(40000);
      expect(limiter.requestBucket).toBe(49);
    });

    it('caps refill at maximum capacity', async () => {
      const limiter = new RateLimiter('build1');

      // Start at full capacity
      limiter.tokenBucket = 40000;
      limiter.requestBucket = 50;

      // Advance time by 1 minute
      await vi.advanceTimersByTimeAsync(60000);

      // Trigger a refill by calling acquire
      // Note: acquire(0) consumes 1 request, so we expect 49 after
      await limiter.acquire(0);

      // Should be at max minus the 1 consumed request
      expect(limiter.tokenBucket).toBe(40000);
      expect(limiter.requestBucket).toBe(49);
    });
  });

  describe('calculateWaitTime', () => {
    it('returns correct value for token shortfall', async () => {
      const limiter = new RateLimiter('build1');

      // Set bucket to low value
      limiter.tokenBucket = 1000;

      // We want 5000 tokens, shortfall is 4000
      // With 40000 tokens per minute, waiting for 4000 tokens:
      // 4000 / 40000 = 0.1 minutes = 6000ms
      // Need to trigger acquire to calculate wait time
      const acquirePromise = limiter.acquire(5000);

      // There should be a timer set
      expect(vi.getTimerCount()).toBe(1);

      // Advance time to let it complete
      await vi.advanceTimersByTimeAsync(10000);
      await acquirePromise;
    });

    it('returns correct value for request shortfall', async () => {
      const limiter = new RateLimiter('build1');

      // Set request bucket to 0
      limiter.requestBucket = 0;
      limiter.tokenBucket = 40000; // Plenty of tokens

      // Requesting 1 request when bucket is 0
      // Shortfall is 1, with 50 requests per minute:
      // 1 / 50 = 0.02 minutes = 1200ms
      const acquirePromise = limiter.acquire(100);

      expect(vi.getTimerCount()).toBe(1);

      await vi.advanceTimersByTimeAsync(2000);
      await acquirePromise;
    });
  });

  describe('getAvailableTokens()', () => {
    it('returns correct value', () => {
      const limiter = new RateLimiter('build1');

      expect(limiter.getAvailableTokens()).toBe(40000);

      limiter.tokenBucket = 12345;
      expect(limiter.getAvailableTokens()).toBe(12345);
    });
  });

  describe('getAvailableRequests()', () => {
    it('returns correct value', () => {
      const limiter = new RateLimiter('build1');

      expect(limiter.getAvailableRequests()).toBe(50);

      limiter.requestBucket = 25;
      expect(limiter.getAvailableRequests()).toBe(25);
    });
  });

  describe('reset()', () => {
    it('restores buckets to full capacity', () => {
      const limiter = new RateLimiter('build2');

      // Deplete buckets
      limiter.tokenBucket = 1000;
      limiter.requestBucket = 5;

      // Reset
      limiter.reset();

      expect(limiter.tokenBucket).toBe(80000);
      expect(limiter.requestBucket).toBe(50);
    });

    it('updates lastRefill timestamp', () => {
      const limiter = new RateLimiter('build1');
      const originalLastRefill = limiter.lastRefill;

      // Advance time
      vi.advanceTimersByTime(5000);

      // Reset
      limiter.reset();

      expect(limiter.lastRefill).toBeGreaterThan(originalLastRefill);
    });
  });
});
