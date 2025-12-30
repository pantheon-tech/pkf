/**
 * PKF Init Request Queue
 * Manages concurrent API requests with rate limiting
 */

import type { RateLimiter } from './rate-limiter.js';

/**
 * Queue item representing a pending request
 */
interface QueueItem<T> {
  /** Function to execute the request */
  execute: () => Promise<T>;
  /** Estimated tokens for rate limiting */
  estimatedTokens: number;
  /** Resolve function for the promise */
  resolve: (value: T) => void;
  /** Reject function for the promise */
  reject: (error: Error) => void;
  /** Priority level (lower = higher priority) */
  priority: number;
  /** Timestamp when added (for FIFO within same priority) */
  addedAt: number;
}

/**
 * Error thrown when queue is cleared
 */
export class QueueCancelledError extends Error {
  code = 'QUEUE_CANCELLED' as const;

  constructor() {
    super('Request was cancelled due to queue clear');
    this.name = 'QueueCancelledError';
  }
}

/**
 * Manages concurrent API requests with rate limiting
 */
export class RequestQueue {
  private rateLimiter: RateLimiter;
  private maxConcurrent: number;
  private activeCount: number = 0;
  private queue: QueueItem<unknown>[] = [];
  private paused: boolean = false;

  /**
   * Create a new RequestQueue
   * @param rateLimiter - Rate limiter instance for token management
   * @param maxConcurrent - Maximum number of concurrent requests (default: 3)
   */
  constructor(rateLimiter: RateLimiter, maxConcurrent: number = 3) {
    this.rateLimiter = rateLimiter;
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Enqueue a request for execution
   * @param execute - Function that performs the request
   * @param estimatedTokens - Estimated tokens for rate limiting
   * @param priority - Priority level (0 = highest, default: 0)
   * @returns Promise that resolves with the request result
   */
  async enqueue<T>(
    execute: () => Promise<T>,
    estimatedTokens: number,
    priority: number = 0
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const item: QueueItem<T> = {
        execute,
        estimatedTokens,
        resolve,
        reject,
        priority,
        addedAt: Date.now(),
      };

      this.queue.push(item as QueueItem<unknown>);
      this.processQueue();
    });
  }

  /**
   * Process the queue, executing requests within concurrency limits
   */
  private async processQueue(): Promise<void> {
    if (this.paused) {
      return;
    }

    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      // Sort by priority (lower first), then by addedAt (earlier first) for FIFO
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.addedAt - b.addedAt;
      });

      const item = this.queue.shift();
      if (!item) {
        break;
      }

      this.activeCount++;

      // Process item asynchronously to not block the loop
      this.executeItem(item);
    }
  }

  /**
   * Execute a single queue item
   */
  private async executeItem<T>(item: QueueItem<T>): Promise<void> {
    try {
      // Acquire rate limit tokens before executing
      await this.rateLimiter.acquire(item.estimatedTokens);

      // Execute the request
      const result = await item.execute();
      item.resolve(result);
    } catch (error) {
      item.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.activeCount--;
      // Continue processing the queue
      this.processQueue();
    }
  }

  /**
   * Pause queue processing
   * Active requests will complete, but no new ones will start
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    this.paused = false;
    this.processQueue();
  }

  /**
   * Clear all pending items from the queue
   * Rejects all pending promises with QueueCancelledError
   */
  clear(): void {
    const pendingItems = [...this.queue];
    this.queue = [];

    for (const item of pendingItems) {
      item.reject(new QueueCancelledError());
    }
  }

  /**
   * Get the number of pending requests in the queue
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get the number of currently active (executing) requests
   */
  getActiveCount(): number {
    return this.activeCount;
  }
}

export default RequestQueue;
