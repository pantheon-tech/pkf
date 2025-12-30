/**
 * Lock Manager for PKF Init
 * Prevents concurrent execution of pkf init using atomic file operations
 */
/**
 * Manages initialization lock to prevent concurrent executions
 */
export declare class InitLockManager {
    private readonly lockPath;
    private locked;
    private signalHandlersRegistered;
    /**
     * Create a new lock manager
     * @param workingDir - Working directory for lock file (defaults to cwd)
     */
    constructor(workingDir?: string);
    /**
     * Acquire the lock
     * @throws Error if lock is already held by another process
     */
    acquire(): Promise<void>;
    /**
     * Release the lock if held by this instance
     */
    release(): Promise<void>;
    /**
     * Force release the lock with warning
     * Used for stale lock cleanup or manual override
     */
    forceRelease(): Promise<void>;
    /**
     * Check if lock is currently held by this instance
     */
    isLocked(): boolean;
    /**
     * Read lock file data
     * @returns Lock data or null if no lock exists
     */
    private readLock;
    /**
     * Check if lock is stale (older than threshold)
     * @param lockData - Lock data to check
     * @returns True if lock is stale
     */
    private isStale;
    /**
     * Register signal handlers for cleanup on exit
     */
    private registerSignalHandlers;
}
//# sourceMappingURL=lock-manager.d.ts.map