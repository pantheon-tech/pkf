/**
 * PKF Init Parallel Migration Executor
 * Manages parallel migration of multiple documents through the request queue
 */
import type { MigrationWorker, MigrationResult } from './worker.js';
import type { RequestQueue } from '../api/request-queue.js';
import type { MigrationTask } from '../types/index.js';
/**
 * Migration plan containing tasks to execute
 */
export interface MigrationPlan {
    /** List of migration tasks to execute */
    tasks: MigrationTask[];
    /** Total estimated tokens for all tasks */
    totalEstimatedTokens?: number;
    /** Estimated cost for the migration */
    estimatedCost?: number;
}
/**
 * Extended migration task with estimated tokens and priority
 */
export interface PrioritizedMigrationTask extends MigrationTask {
    /** Estimated tokens for the task */
    estimatedTokens: number;
    /** Priority level (lower = higher priority) */
    priority: number;
}
/**
 * Options for the executor
 */
export interface ExecutorOptions {
    /** Progress callback - called when a task completes */
    onProgress?: (completed: number, total: number, current?: MigrationTask) => void;
    /** Callback when a task completes successfully */
    onTaskComplete?: (result: MigrationResult) => void;
    /** Callback when a task fails */
    onTaskError?: (task: MigrationTask, error: Error) => void;
    /** Stop execution on first error */
    stopOnError?: boolean;
}
/**
 * Result from executing a migration plan
 */
export interface ExecutionResult {
    /** Successfully completed migration results */
    completed: MigrationResult[];
    /** Failed migration results */
    failed: MigrationResult[];
    /** Total execution time in milliseconds */
    totalTime: number;
    /** Total cost in USD */
    totalCost: number;
    /** Total tokens used */
    totalTokens: number;
}
/**
 * Execution state
 */
type ExecutionState = 'idle' | 'running' | 'paused' | 'cancelled';
/**
 * Parallel Migration Executor
 *
 * Manages parallel execution of migration tasks through a rate-limited
 * request queue. Supports pause/resume/cancel operations and tracks
 * progress and costs.
 */
export declare class ParallelMigrationExecutor {
    private worker;
    private requestQueue;
    private options?;
    private state;
    private pendingPromises;
    /**
     * Create a new ParallelMigrationExecutor
     *
     * @param worker - Migration worker for executing individual tasks
     * @param requestQueue - Request queue for rate limiting and concurrency
     * @param options - Optional executor configuration
     */
    constructor(worker: MigrationWorker, requestQueue: RequestQueue, options?: ExecutorOptions);
    /**
     * Execute a migration plan
     *
     * Sorts tasks by priority, executes them through the request queue,
     * and returns aggregated results.
     *
     * @param plan - Migration plan containing tasks to execute
     * @returns Execution result with completed/failed tasks and statistics
     */
    execute(plan: MigrationPlan): Promise<ExecutionResult>;
    /**
     * Execute a single migration task
     *
     * Updates task status, calls the worker, and handles errors.
     *
     * @param task - Migration task to execute
     * @returns Migration result
     */
    private executeTask;
    /**
     * Pause execution
     *
     * Active tasks will complete, but no new tasks will start.
     */
    pause(): void;
    /**
     * Resume execution
     *
     * Resumes processing of queued tasks.
     */
    resume(): void;
    /**
     * Cancel remaining tasks
     *
     * Clears the queue and marks executor as cancelled.
     * Active tasks may still complete.
     */
    cancel(): void;
    /**
     * Get current execution state
     *
     * @returns Current state of the executor
     */
    getState(): ExecutionState;
}
export default ParallelMigrationExecutor;
//# sourceMappingURL=executor.d.ts.map