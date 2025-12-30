/**
 * Lock Manager for PKF Init
 * Prevents concurrent execution of pkf init using atomic file operations
 */
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
/** Lock file name */
const LOCK_FILE_NAME = '.pkf-init.lock';
/** Stale lock threshold in milliseconds (1 hour) */
const STALE_THRESHOLD_MS = 3600000;
/** Package version */
const VERSION = '1.0.0';
/**
 * Manages initialization lock to prevent concurrent executions
 */
export class InitLockManager {
    lockPath;
    locked = false;
    signalHandlersRegistered = false;
    /**
     * Create a new lock manager
     * @param workingDir - Working directory for lock file (defaults to cwd)
     */
    constructor(workingDir) {
        const dir = workingDir ?? process.cwd();
        this.lockPath = join(dir, LOCK_FILE_NAME);
    }
    /**
     * Acquire the lock
     * @throws Error if lock is already held by another process
     */
    async acquire() {
        // Check for existing lock
        const existingLock = await this.readLock();
        if (existingLock) {
            const stale = await this.isStale(existingLock);
            if (stale) {
                // Remove stale lock and proceed
                await this.forceRelease();
            }
            else {
                throw new Error(`PKF initialization already in progress (PID: ${existingLock.pid}). Use --force to override.`);
            }
        }
        // Create lock data
        const lockData = {
            pid: process.pid,
            timestamp: Date.now(),
            version: VERSION,
        };
        // Attempt atomic lock acquisition using exclusive write flag
        try {
            await writeFile(this.lockPath, JSON.stringify(lockData, null, 2), {
                flag: 'wx',
                encoding: 'utf-8',
            });
        }
        catch (error) {
            // File already exists - race condition
            if (error.code === 'EEXIST') {
                throw new Error('PKF initialization already in progress (race condition)');
            }
            throw error;
        }
        this.locked = true;
        this.registerSignalHandlers();
    }
    /**
     * Release the lock if held by this instance
     */
    async release() {
        if (!this.locked) {
            return;
        }
        try {
            await unlink(this.lockPath);
        }
        catch (error) {
            // Ignore if file doesn't exist
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        this.locked = false;
    }
    /**
     * Force release the lock with warning
     * Used for stale lock cleanup or manual override
     */
    async forceRelease() {
        const existingLock = await this.readLock();
        if (existingLock) {
            console.warn(`Warning: Force releasing lock held by PID ${existingLock.pid} (acquired at ${new Date(existingLock.timestamp).toISOString()})`);
        }
        try {
            await unlink(this.lockPath);
        }
        catch (error) {
            // Ignore if file doesn't exist
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        this.locked = false;
    }
    /**
     * Check if lock is currently held by this instance
     */
    isLocked() {
        return this.locked;
    }
    /**
     * Read lock file data
     * @returns Lock data or null if no lock exists
     */
    async readLock() {
        try {
            const content = await readFile(this.lockPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            // File doesn't exist or can't be read
            if (error.code === 'ENOENT') {
                return null;
            }
            // Invalid JSON or other read error - treat as no lock
            return null;
        }
    }
    /**
     * Check if lock is stale (older than threshold)
     * @param lockData - Lock data to check
     * @returns True if lock is stale
     */
    async isStale(lockData) {
        const age = Date.now() - lockData.timestamp;
        return age > STALE_THRESHOLD_MS;
    }
    /**
     * Register signal handlers for cleanup on exit
     */
    registerSignalHandlers() {
        if (this.signalHandlersRegistered) {
            return;
        }
        const cleanup = async () => {
            await this.release();
            process.exit(0);
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        this.signalHandlersRegistered = true;
    }
}
//# sourceMappingURL=lock-manager.js.map