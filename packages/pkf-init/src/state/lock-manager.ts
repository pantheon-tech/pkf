/**
 * Lock Manager for PKF Init
 * Prevents concurrent execution of pkf init using atomic file operations
 */

import { open, readFile, unlink } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import type { LockData } from '../types/index.js';

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
  private readonly lockPath: string;
  private locked: boolean = false;
  private signalHandlersRegistered: boolean = false;

  /**
   * Create a new lock manager
   * @param workingDir - Working directory for lock file (defaults to cwd)
   */
  constructor(workingDir?: string) {
    const dir = workingDir ?? process.cwd();
    this.lockPath = join(dir, LOCK_FILE_NAME);
  }

  /**
   * Acquire the lock
   * @throws Error if lock is already held by another process
   */
  async acquire(): Promise<void> {
    // Check for existing lock
    const existingLock = await this.readLock();

    if (existingLock) {
      const stale = await this.isStale(existingLock);

      if (stale) {
        // Remove stale lock and proceed
        await this.forceRelease();
      } else {
        throw new Error(
          `PKF initialization already in progress (PID: ${existingLock.pid}). Use --force to override.`
        );
      }
    }

    // Create lock data
    const lockData: LockData = {
      pid: process.pid,
      timestamp: Date.now(),
      version: VERSION,
    };

    // Attempt atomic lock acquisition using O_EXCL flag
    // This ensures exclusive creation - if file exists, the operation fails atomically
    try {
      const fileHandle = await open(
        this.lockPath,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY
      );

      try {
        await fileHandle.writeFile(JSON.stringify(lockData, null, 2), 'utf-8');
      } finally {
        await fileHandle.close();
      }
    } catch (error) {
      // File already exists - another process holds the lock
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
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
  async release(): Promise<void> {
    if (!this.locked) {
      return;
    }

    try {
      await unlink(this.lockPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    this.locked = false;
  }

  /**
   * Force release the lock with warning
   * Used for stale lock cleanup or manual override
   */
  async forceRelease(): Promise<void> {
    const existingLock = await this.readLock();

    if (existingLock) {
      console.warn(
        `Warning: Force releasing lock held by PID ${existingLock.pid} (acquired at ${new Date(existingLock.timestamp).toISOString()})`
      );
    }

    try {
      await unlink(this.lockPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    this.locked = false;
  }

  /**
   * Check if lock is currently held by this instance
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Read lock file data
   * @returns Lock data or null if no lock exists
   */
  private async readLock(): Promise<LockData | null> {
    try {
      const content = await readFile(this.lockPath, 'utf-8');
      return JSON.parse(content) as LockData;
    } catch (error) {
      // File doesn't exist or can't be read
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
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
  private async isStale(lockData: LockData): Promise<boolean> {
    const age = Date.now() - lockData.timestamp;
    return age > STALE_THRESHOLD_MS;
  }

  /**
   * Register signal handlers for cleanup on exit
   */
  private registerSignalHandlers(): void {
    if (this.signalHandlersRegistered) {
      return;
    }

    const cleanup = async (): Promise<void> => {
      await this.release();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    this.signalHandlersRegistered = true;
  }
}
