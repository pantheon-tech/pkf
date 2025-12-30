/**
 * PKF Init Request Queue
 * Manages concurrent API requests with rate limiting
 */
import type { RateLimiter } from './rate-limiter.js';
/**
 * Error thrown when queue is cleared
 */
export declare class QueueCancelledError extends Error {
    code: "QUEUE_CANCELLED";
    constructor();
}
/**
 * Manages concurrent API requests with rate limiting
 */
export declare class RequestQueue {
    private rateLimiter;
    private maxConcurrent;
    private activeCount;
    private queue;
    private paused;
    /**
     * Create a new RequestQueue
     * @param rateLimiter - Rate limiter instance for token management
     * @param maxConcurrent - Maximum number of concurrent requests (default: 3)
     */
    constructor(rateLimiter: RateLimiter, maxConcurrent?: number);
    /**
     * Enqueue a request for execution
     * @param execute - Function that performs the request
     * @param estimatedTokens - Estimated tokens for rate limiting
     * @param priority - Priority level (0 = highest, default: 0)
     * @returns Promise that resolves with the request result
     */
    enqueue<T>(execute: () => Promise<T>, estimatedTokens: number, priority?: number): Promise<T>;
    /**
     * Process the queue, executing requests within concurrency limits
     */
    private processQueue;
    /**
     * Execute a single queue item
     */
    private executeItem;
    /**
     * Pause queue processing
     * Active requests will complete, but no new ones will start
     */
    pause(): void;
    /**
     * Resume queue processing
     */
    resume(): void;
    /**
     * Clear all pending items from the queue
     * Rejects all pending promises with QueueCancelledError
     */
    clear(): void;
    /**
     * Get the number of pending requests in the queue
     */
    getQueueLength(): number;
    /**
     * Get the number of currently active (executing) requests
     */
    getActiveCount(): number;
}
export default RequestQueue;
//# sourceMappingURL=request-queue.d.ts.map