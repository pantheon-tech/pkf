/**
 * PKF Init Parallel Migration Executor
 * Manages parallel migration of multiple documents through the request queue
 */
/**
 * Parallel Migration Executor
 *
 * Manages parallel execution of migration tasks through a rate-limited
 * request queue. Supports pause/resume/cancel operations and tracks
 * progress and costs.
 */
export class ParallelMigrationExecutor {
    worker;
    requestQueue;
    options;
    state = 'idle';
    pendingPromises = [];
    /**
     * Create a new ParallelMigrationExecutor
     *
     * @param worker - Migration worker for executing individual tasks
     * @param requestQueue - Request queue for rate limiting and concurrency
     * @param options - Optional executor configuration
     */
    constructor(worker, requestQueue, options) {
        this.worker = worker;
        this.requestQueue = requestQueue;
        this.options = options;
    }
    /**
     * Execute a migration plan
     *
     * Sorts tasks by priority, executes them through the request queue,
     * and returns aggregated results.
     *
     * @param plan - Migration plan containing tasks to execute
     * @returns Execution result with completed/failed tasks and statistics
     */
    async execute(plan) {
        const startTime = Date.now();
        const completed = [];
        const failed = [];
        let totalCost = 0;
        let totalTokens = 0;
        // Reset state
        this.state = 'running';
        this.pendingPromises = [];
        // Sort tasks by priority (lower priority number = higher priority)
        // Tasks with no explicit priority get priority 0
        const sortedTasks = [...plan.tasks].sort((a, b) => {
            const priorityA = a.priority ?? 0;
            const priorityB = b.priority ?? 0;
            return priorityA - priorityB;
        });
        const total = sortedTasks.length;
        // Execute all tasks through the queue
        const promises = sortedTasks.map((task) => {
            // Get estimated tokens and priority from task if available
            const estimatedTokens = task.estimatedTokens ?? 1000;
            const priority = task.priority ?? 0;
            const promise = this.requestQueue.enqueue(async () => {
                // Check if cancelled before executing
                if (this.state === 'cancelled') {
                    const cancelledResult = {
                        task,
                        success: false,
                        error: 'Migration cancelled',
                    };
                    return cancelledResult;
                }
                // Execute the task
                const result = await this.executeTask(task);
                // Track results
                if (result.success) {
                    completed.push(result);
                    totalCost += result.cost ?? 0;
                    totalTokens += result.tokensUsed ?? 0;
                    this.options?.onTaskComplete?.(result);
                }
                else {
                    failed.push(result);
                    if (result.error) {
                        this.options?.onTaskError?.(task, new Error(result.error));
                    }
                }
                // Report progress
                this.options?.onProgress?.(completed.length + failed.length, total, task);
                return result;
            }, estimatedTokens, priority);
            this.pendingPromises.push(promise);
            return promise;
        });
        // Wait for all tasks to complete
        // We catch errors individually to prevent Promise.all from failing fast
        await Promise.all(promises.map((p) => p.catch((error) => {
            // Handle queue cancellation or other errors
            const errorResult = {
                task: { sourcePath: '', targetPath: '', docType: '', status: 'failed' },
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
            failed.push(errorResult);
            return errorResult;
        })));
        // Reset state
        this.state = 'idle';
        this.pendingPromises = [];
        return {
            completed,
            failed,
            totalTime: Date.now() - startTime,
            totalCost,
            totalTokens,
        };
    }
    /**
     * Execute a single migration task
     *
     * Updates task status, calls the worker, and handles errors.
     *
     * @param task - Migration task to execute
     * @returns Migration result
     */
    async executeTask(task) {
        // Update task status to in_progress
        task.status = 'in_progress';
        try {
            // Call the worker to perform the migration
            const result = await this.worker.migrate(task);
            // Update task status based on result
            task.status = result.success ? 'completed' : 'failed';
            if (!result.success && result.error) {
                task.error = result.error;
            }
            return result;
        }
        catch (error) {
            // Handle unexpected errors
            const errorMessage = error instanceof Error ? error.message : String(error);
            task.status = 'failed';
            task.error = errorMessage;
            return {
                task,
                success: false,
                error: errorMessage,
            };
        }
    }
    /**
     * Pause execution
     *
     * Active tasks will complete, but no new tasks will start.
     */
    pause() {
        if (this.state === 'running') {
            this.state = 'paused';
            this.requestQueue.pause();
        }
    }
    /**
     * Resume execution
     *
     * Resumes processing of queued tasks.
     */
    resume() {
        if (this.state === 'paused') {
            this.state = 'running';
            this.requestQueue.resume();
        }
    }
    /**
     * Cancel remaining tasks
     *
     * Clears the queue and marks executor as cancelled.
     * Active tasks may still complete.
     */
    cancel() {
        if (this.state === 'running' || this.state === 'paused') {
            this.state = 'cancelled';
            this.requestQueue.clear();
        }
    }
    /**
     * Get current execution state
     *
     * @returns Current state of the executor
     */
    getState() {
        return this.state;
    }
}
export default ParallelMigrationExecutor;
//# sourceMappingURL=executor.js.map