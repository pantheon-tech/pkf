/**
 * PKF Init Request Queue
 * Manages concurrent API requests with rate limiting
 */
/**
 * Error thrown when queue is cleared
 */
export class QueueCancelledError extends Error {
    code = 'QUEUE_CANCELLED';
    constructor() {
        super('Request was cancelled due to queue clear');
        this.name = 'QueueCancelledError';
    }
}
/**
 * Manages concurrent API requests with rate limiting
 */
export class RequestQueue {
    rateLimiter;
    maxConcurrent;
    activeCount = 0;
    queue = [];
    paused = false;
    /**
     * Create a new RequestQueue
     * @param rateLimiter - Rate limiter instance for token management
     * @param maxConcurrent - Maximum number of concurrent requests (default: 3)
     */
    constructor(rateLimiter, maxConcurrent = 3) {
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
    async enqueue(execute, estimatedTokens, priority = 0) {
        return new Promise((resolve, reject) => {
            const item = {
                execute,
                estimatedTokens,
                resolve,
                reject,
                priority,
                addedAt: Date.now(),
            };
            this.queue.push(item);
            this.processQueue();
        });
    }
    /**
     * Process the queue, executing requests within concurrency limits
     */
    async processQueue() {
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
    async executeItem(item) {
        try {
            // Acquire rate limit tokens before executing
            await this.rateLimiter.acquire(item.estimatedTokens);
            // Execute the request
            const result = await item.execute();
            item.resolve(result);
        }
        catch (error) {
            item.reject(error instanceof Error ? error : new Error(String(error)));
        }
        finally {
            this.activeCount--;
            // Continue processing the queue
            this.processQueue();
        }
    }
    /**
     * Pause queue processing
     * Active requests will complete, but no new ones will start
     */
    pause() {
        this.paused = true;
    }
    /**
     * Resume queue processing
     */
    resume() {
        this.paused = false;
        this.processQueue();
    }
    /**
     * Clear all pending items from the queue
     * Rejects all pending promises with QueueCancelledError
     */
    clear() {
        const pendingItems = [...this.queue];
        this.queue = [];
        for (const item of pendingItems) {
            item.reject(new QueueCancelledError());
        }
    }
    /**
     * Get the number of pending requests in the queue
     */
    getQueueLength() {
        return this.queue.length;
    }
    /**
     * Get the number of currently active (executing) requests
     */
    getActiveCount() {
        return this.activeCount;
    }
}
export default RequestQueue;
//# sourceMappingURL=request-queue.js.map