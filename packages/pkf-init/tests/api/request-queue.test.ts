/**
 * Unit tests for RequestQueue
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RequestQueue, QueueCancelledError } from '../../src/api/request-queue.js';
import { RateLimiter } from '../../src/api/rate-limiter.js';

describe('RequestQueue', () => {
  let mockRateLimiter: RateLimiter;
  let queue: RequestQueue;

  beforeEach(() => {
    // Create a mock rate limiter that immediately resolves
    mockRateLimiter = {
      acquire: vi.fn().mockResolvedValue(undefined),
      tokensPerMinute: 40000,
      requestsPerMinute: 50,
      tokenBucket: 40000,
      requestBucket: 50,
      lastRefill: Date.now(),
      getAvailableTokens: vi.fn().mockReturnValue(40000),
      getAvailableRequests: vi.fn().mockReturnValue(50),
      reset: vi.fn(),
    } as unknown as RateLimiter;

    queue = new RequestQueue(mockRateLimiter, 3);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Concurrency Control', () => {
    it('executes requests up to maxConcurrent', async () => {
      const executionOrder: number[] = [];
      const resolvers: Array<() => void> = [];

      // Create 3 promises that we control
      const createControlledPromise = (id: number) => {
        return new Promise<number>((resolve) => {
          resolvers.push(() => {
            executionOrder.push(id);
            resolve(id);
          });
        });
      };

      // Enqueue 3 requests (maxConcurrent is 3)
      const promise1 = queue.enqueue(() => createControlledPromise(1), 100);
      const promise2 = queue.enqueue(() => createControlledPromise(2), 100);
      const promise3 = queue.enqueue(() => createControlledPromise(3), 100);

      // Wait a tick for async processing
      await new Promise((resolve) => setImmediate(resolve));

      // All 3 should have started (acquire called 3 times)
      expect(mockRateLimiter.acquire).toHaveBeenCalledTimes(3);
      expect(queue.getActiveCount()).toBe(3);

      // Resolve all
      resolvers.forEach((r) => r());

      await Promise.all([promise1, promise2, promise3]);
    });

    it('queues requests beyond maxConcurrent', async () => {
      const resolvers: Array<() => void> = [];

      const createControlledPromise = (id: number) => {
        return new Promise<number>((resolve) => {
          resolvers.push(() => resolve(id));
        });
      };

      // Enqueue 5 requests (maxConcurrent is 3)
      const promise1 = queue.enqueue(() => createControlledPromise(1), 100);
      const promise2 = queue.enqueue(() => createControlledPromise(2), 100);
      const promise3 = queue.enqueue(() => createControlledPromise(3), 100);
      const promise4 = queue.enqueue(() => createControlledPromise(4), 100);
      const promise5 = queue.enqueue(() => createControlledPromise(5), 100);

      await new Promise((resolve) => setImmediate(resolve));

      // Only 3 should be active
      expect(queue.getActiveCount()).toBe(3);
      expect(queue.getQueueLength()).toBe(2);

      // Resolve the first 3
      resolvers[0]();
      resolvers[1]();
      resolvers[2]();

      await new Promise((resolve) => setImmediate(resolve));

      // Now the 4th and 5th should have started
      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Resolve remaining
      resolvers[3]?.();
      resolvers[4]?.();

      await Promise.all([promise1, promise2, promise3, promise4, promise5]);
    });
  });

  describe('Priority Ordering', () => {
    it('respects priority ordering (lower number = higher priority)', async () => {
      const executionOrder: number[] = [];

      // Create a slow rate limiter that lets us control timing
      let acquireCount = 0;
      const slowAcquire = vi.fn().mockImplementation(async () => {
        acquireCount++;
        // First 3 calls proceed immediately, rest wait
        if (acquireCount <= 3) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      mockRateLimiter.acquire = slowAcquire;

      const blockingResolvers: Array<() => void> = [];

      // First 3 requests block
      const block = (id: number) =>
        new Promise<number>((resolve) => {
          blockingResolvers.push(() => {
            executionOrder.push(id);
            resolve(id);
          });
        });

      // Enqueue 3 blocking requests first
      const b1 = queue.enqueue(() => block(1), 100, 0);
      const b2 = queue.enqueue(() => block(2), 100, 0);
      const b3 = queue.enqueue(() => block(3), 100, 0);

      await new Promise((resolve) => setImmediate(resolve));

      // Now enqueue with different priorities (high priority = lower number)
      const p1 = queue.enqueue(
        async () => {
          executionOrder.push(4);
          return 4;
        },
        100,
        2
      ); // Low priority
      const p2 = queue.enqueue(
        async () => {
          executionOrder.push(5);
          return 5;
        },
        100,
        0
      ); // High priority
      const p3 = queue.enqueue(
        async () => {
          executionOrder.push(6);
          return 6;
        },
        100,
        1
      ); // Medium priority

      // Resolve blockers
      blockingResolvers.forEach((r) => r());

      await Promise.all([b1, b2, b3, p1, p2, p3]);

      // After blocking tasks, execution should be: 5 (priority 0), 6 (priority 1), 4 (priority 2)
      const prioritizedOrder = executionOrder.slice(3);
      expect(prioritizedOrder).toEqual([5, 6, 4]);
    });

    it('maintains FIFO within same priority', async () => {
      const executionOrder: number[] = [];
      const blockingResolvers: Array<() => void> = [];

      const block = (id: number) =>
        new Promise<number>((resolve) => {
          blockingResolvers.push(() => {
            executionOrder.push(id);
            resolve(id);
          });
        });

      // Fill up concurrent slots
      queue.enqueue(() => block(1), 100, 0);
      queue.enqueue(() => block(2), 100, 0);
      queue.enqueue(() => block(3), 100, 0);

      await new Promise((resolve) => setImmediate(resolve));

      // Add requests with same priority
      const p1 = queue.enqueue(
        async () => {
          executionOrder.push(4);
          return 4;
        },
        100,
        1
      );
      const p2 = queue.enqueue(
        async () => {
          executionOrder.push(5);
          return 5;
        },
        100,
        1
      );
      const p3 = queue.enqueue(
        async () => {
          executionOrder.push(6);
          return 6;
        },
        100,
        1
      );

      // Resolve blockers
      blockingResolvers.forEach((r) => r());

      await Promise.all([p1, p2, p3]);

      // Same priority, should be FIFO: 4, 5, 6
      const fifoPart = executionOrder.slice(3);
      expect(fifoPart).toEqual([4, 5, 6]);
    });
  });

  describe('pause() and resume()', () => {
    it('pause() stops new executions', async () => {
      const executionOrder: number[] = [];

      queue.pause();

      // Enqueue after pause
      const promise = queue.enqueue(
        async () => {
          executionOrder.push(1);
          return 1;
        },
        100
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not have executed
      expect(executionOrder).toHaveLength(0);
      expect(queue.getQueueLength()).toBe(1);
      expect(queue.getActiveCount()).toBe(0);

      // Resume to complete
      queue.resume();
      await promise;

      expect(executionOrder).toEqual([1]);
    });

    it('resume() continues processing', async () => {
      const executionOrder: number[] = [];

      queue.pause();

      const promise1 = queue.enqueue(async () => {
        executionOrder.push(1);
        return 1;
      }, 100);
      const promise2 = queue.enqueue(async () => {
        executionOrder.push(2);
        return 2;
      }, 100);

      expect(queue.getQueueLength()).toBe(2);

      // Resume
      queue.resume();

      await Promise.all([promise1, promise2]);

      expect(executionOrder).toContain(1);
      expect(executionOrder).toContain(2);
    });
  });

  describe('clear()', () => {
    it('rejects pending with QueueCancelledError', async () => {
      const blockingResolvers: Array<() => void> = [];

      const block = () =>
        new Promise<number>((resolve) => {
          blockingResolvers.push(() => resolve(1));
        });

      // Fill concurrent slots
      queue.enqueue(() => block(), 100);
      queue.enqueue(() => block(), 100);
      queue.enqueue(() => block(), 100);

      await new Promise((resolve) => setImmediate(resolve));

      // Add pending requests
      const pendingPromise = queue.enqueue(async () => 999, 100);

      expect(queue.getQueueLength()).toBe(1);

      // Clear the queue
      queue.clear();

      // The pending request should be rejected
      await expect(pendingPromise).rejects.toThrow(QueueCancelledError);
      await expect(pendingPromise).rejects.toHaveProperty('code', 'QUEUE_CANCELLED');

      expect(queue.getQueueLength()).toBe(0);

      // Resolve blockers to clean up
      blockingResolvers.forEach((r) => r());
    });
  });

  describe('getQueueLength()', () => {
    it('returns correct count', async () => {
      expect(queue.getQueueLength()).toBe(0);

      const blockingResolvers: Array<() => void> = [];
      const block = () =>
        new Promise<number>((resolve) => {
          blockingResolvers.push(() => resolve(1));
        });

      // Fill slots
      queue.enqueue(() => block(), 100);
      queue.enqueue(() => block(), 100);
      queue.enqueue(() => block(), 100);

      await new Promise((resolve) => setImmediate(resolve));

      // Add to queue
      queue.enqueue(async () => 1, 100);
      queue.enqueue(async () => 2, 100);

      expect(queue.getQueueLength()).toBe(2);

      // Cleanup
      blockingResolvers.forEach((r) => r());
    });
  });

  describe('getActiveCount()', () => {
    it('returns correct count', async () => {
      expect(queue.getActiveCount()).toBe(0);

      const blockingResolvers: Array<() => void> = [];
      const block = () =>
        new Promise<number>((resolve) => {
          blockingResolvers.push(() => resolve(1));
        });

      queue.enqueue(() => block(), 100);
      queue.enqueue(() => block(), 100);

      await new Promise((resolve) => setImmediate(resolve));

      expect(queue.getActiveCount()).toBe(2);

      // Cleanup
      blockingResolvers.forEach((r) => r());
    });
  });

  describe('Error Handling', () => {
    it('individual failures do not stop queue', async () => {
      const results: Array<number | string> = [];

      const promise1 = queue.enqueue(async () => {
        results.push(1);
        return 1;
      }, 100);

      const promise2 = queue.enqueue(async () => {
        results.push('error');
        throw new Error('Test error');
      }, 100);

      const promise3 = queue.enqueue(async () => {
        results.push(3);
        return 3;
      }, 100);

      await promise1;
      await expect(promise2).rejects.toThrow('Test error');
      await promise3;

      // Both successful requests should have completed
      expect(results).toContain(1);
      expect(results).toContain(3);
      expect(results).toContain('error');
    });
  });
});
