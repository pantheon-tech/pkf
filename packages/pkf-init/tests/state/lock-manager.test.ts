/**
 * Unit tests for InitLockManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { InitLockManager } from '../../src/state/lock-manager.js';

describe('InitLockManager', () => {
  let tempDir: string;
  let lockManager: InitLockManager;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-init-lock-test-'));
    lockManager = new InitLockManager(tempDir);

    // Reset mocks
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    // Release lock if held
    try {
      await lockManager.release();
    } catch {
      // Ignore
    }

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('acquire', () => {
    it('acquires lock successfully', async () => {
      await lockManager.acquire();

      expect(lockManager.isLocked()).toBe(true);
    });

    it('creates lock file with correct format', async () => {
      await lockManager.acquire();

      const lockPath = path.join(tempDir, '.pkf-init.lock');
      const content = await fs.readFile(lockPath, 'utf-8');
      const lockData = JSON.parse(content);

      expect(lockData).toHaveProperty('pid');
      expect(lockData.pid).toBe(process.pid);
      expect(lockData).toHaveProperty('timestamp');
      expect(typeof lockData.timestamp).toBe('number');
      expect(lockData).toHaveProperty('version');
      expect(lockData.version).toBe('1.0.0');
    });

    it('throws error when lock already exists', async () => {
      // Create a lock file manually (simulating another process)
      const lockPath = path.join(tempDir, '.pkf-init.lock');
      const lockData = {
        pid: 99999, // Different PID
        timestamp: Date.now(), // Fresh timestamp
        version: '1.0.0',
      };
      await fs.writeFile(lockPath, JSON.stringify(lockData), 'utf-8');

      await expect(lockManager.acquire()).rejects.toThrow(
        /PKF initialization already in progress/
      );
    });

    it('detects stale lock and acquires when older than 1 hour', async () => {
      // Create a stale lock file (>1 hour old)
      const lockPath = path.join(tempDir, '.pkf-init.lock');
      const staleTimestamp = Date.now() - 3700000; // 1 hour + 100 seconds
      const lockData = {
        pid: 99999,
        timestamp: staleTimestamp,
        version: '1.0.0',
      };
      await fs.writeFile(lockPath, JSON.stringify(lockData), 'utf-8');

      // Spy on console.warn
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Should acquire successfully by removing stale lock
      await lockManager.acquire();

      expect(lockManager.isLocked()).toBe(true);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('handles race condition with EEXIST error', async () => {
      // Acquire lock first
      await lockManager.acquire();

      // Try to acquire with a new manager
      const anotherManager = new InitLockManager(tempDir);

      await expect(anotherManager.acquire()).rejects.toThrow(
        /PKF initialization already in progress/
      );
    });

    it('prevents concurrent lock acquisition attempts', async () => {
      // Create multiple lock managers attempting to acquire simultaneously
      const managers = Array.from({ length: 5 }, () => new InitLockManager(tempDir));

      // Attempt to acquire locks concurrently
      const results = await Promise.allSettled(
        managers.map(manager => manager.acquire())
      );

      // Exactly one should succeed, others should fail
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(4);

      // All failures should be due to existing lock
      failures.forEach(result => {
        expect((result as PromiseRejectedResult).reason.message).toMatch(
          /PKF initialization already in progress/
        );
      });

      // Clean up - find and release the successful lock
      for (const manager of managers) {
        if (manager.isLocked()) {
          await manager.release();
          break;
        }
      }
    });

    it('handles concurrent attempts with stale lock removal', async () => {
      // Create a stale lock
      const lockPath = path.join(tempDir, '.pkf-init.lock');
      const staleTimestamp = Date.now() - 3700000; // > 1 hour old
      const staleLockData = {
        pid: 99999,
        timestamp: staleTimestamp,
        version: '1.0.0',
      };
      await fs.writeFile(lockPath, JSON.stringify(staleLockData), 'utf-8');

      // Suppress console.warn for this test
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create multiple managers attempting to acquire simultaneously
      const managers = Array.from({ length: 3 }, () => new InitLockManager(tempDir));

      // All should detect stale lock and attempt to acquire
      const results = await Promise.allSettled(
        managers.map(manager => manager.acquire())
      );

      // Exactly one should succeed after removing stale lock
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(2);

      // At least one warning about force releasing stale lock
      expect(warnSpy).toHaveBeenCalled();

      // Clean up
      for (const manager of managers) {
        if (manager.isLocked()) {
          await manager.release();
          break;
        }
      }

      warnSpy.mockRestore();
    });

    it('atomic lock creation prevents TOCTOU vulnerability', async () => {
      // This test verifies that even if two processes check simultaneously,
      // only one can create the lock due to O_EXCL flag

      const manager1 = new InitLockManager(tempDir);
      const manager2 = new InitLockManager(tempDir);

      // Start both acquisitions at nearly the same time
      const [result1, result2] = await Promise.allSettled([
        manager1.acquire(),
        manager2.acquire(),
      ]);

      // One succeeds, one fails
      const success = [result1, result2].find(r => r.status === 'fulfilled');
      const failure = [result1, result2].find(r => r.status === 'rejected');

      expect(success).toBeDefined();
      expect(failure).toBeDefined();
      expect((failure as PromiseRejectedResult).reason.message).toMatch(
        /PKF initialization already in progress/
      );

      // Clean up
      if (manager1.isLocked()) await manager1.release();
      if (manager2.isLocked()) await manager2.release();
    });
  });

  describe('release', () => {
    it('releases lock correctly', async () => {
      await lockManager.acquire();
      expect(lockManager.isLocked()).toBe(true);

      await lockManager.release();

      expect(lockManager.isLocked()).toBe(false);

      // Lock file should be deleted
      const lockPath = path.join(tempDir, '.pkf-init.lock');
      await expect(fs.access(lockPath)).rejects.toThrow();
    });

    it('release is idempotent', async () => {
      await lockManager.acquire();

      // Release multiple times should not throw
      await lockManager.release();
      await lockManager.release();
      await lockManager.release();

      expect(lockManager.isLocked()).toBe(false);
    });
  });

  describe('forceRelease', () => {
    it('force releases stale lock', async () => {
      // Create a lock file manually
      const lockPath = path.join(tempDir, '.pkf-init.lock');
      const lockData = {
        pid: 99999,
        timestamp: Date.now() - 7200000, // 2 hours old
        version: '1.0.0',
      };
      await fs.writeFile(lockPath, JSON.stringify(lockData), 'utf-8');

      // Spy on console.warn
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await lockManager.forceRelease();

      // Lock file should be deleted
      await expect(fs.access(lockPath)).rejects.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Force releasing lock')
      );
    });

    it('forceRelease works when lock exists', async () => {
      // Acquire lock
      await lockManager.acquire();

      // Force release
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await lockManager.forceRelease();

      expect(lockManager.isLocked()).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('isLocked', () => {
    it('returns correct state when not locked', () => {
      expect(lockManager.isLocked()).toBe(false);
    });

    it('returns correct state when locked', async () => {
      await lockManager.acquire();
      expect(lockManager.isLocked()).toBe(true);
    });

    it('returns correct state after release', async () => {
      await lockManager.acquire();
      await lockManager.release();
      expect(lockManager.isLocked()).toBe(false);
    });
  });
});
