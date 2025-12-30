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
