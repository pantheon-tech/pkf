/**
 * Integration tests for PKF Init Phase 1
 * Tests multiple components working together
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { WorkflowStateManager } from '../../src/state/workflow-state.js';
import { InitLockManager } from '../../src/state/lock-manager.js';
import { CostTracker, BudgetExceededError } from '../../src/utils/cost-tracker.js';
import { ConfigLoader } from '../../src/config/loader.js';
import { WorkflowStage } from '../../src/types/index.js';
import type { InitOptions, ClaudeModel } from '../../src/types/index.js';

describe('Phase 1 Integration Tests', () => {
  let tempDir: string;
  const originalEnv = process.env;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-init-integration-'));

    // Reset environment
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    // Restore environment
    process.env = originalEnv;

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('INT-006: State save and load', () => {
    it('persists and loads state correctly across manager instances', async () => {
      // Create first WorkflowStateManager instance
      const manager1 = new WorkflowStateManager(tempDir);

      // Create initial state with specific values
      const initialState = manager1.createInitialState();
      initialState.currentStage = WorkflowStage.ANALYZING;
      initialState.apiCallCount = 7;
      initialState.totalCost = 1.25;
      initialState.totalTokens = 15000;
      initialState.analysis = {
        complete: false,
        discoveredDocs: ['README.md', 'CONTRIBUTING.md'],
        summary: 'Found 2 documentation files',
      };

      // Save state
      await manager1.save(initialState);

      // Create NEW instance of WorkflowStateManager (same directory)
      const manager2 = new WorkflowStateManager(tempDir);

      // Load state
      const loadedState = await manager2.load();

      // Verify loaded state matches saved state
      expect(loadedState).not.toBeNull();
      expect(loadedState?.currentStage).toBe(WorkflowStage.ANALYZING);
      expect(loadedState?.apiCallCount).toBe(7);
      expect(loadedState?.totalCost).toBe(1.25);
      expect(loadedState?.totalTokens).toBe(15000);
      expect(loadedState?.analysis?.complete).toBe(false);
      expect(loadedState?.analysis?.discoveredDocs).toEqual(['README.md', 'CONTRIBUTING.md']);
      expect(loadedState?.analysis?.summary).toBe('Found 2 documentation files');
      expect(loadedState?.version).toBe('1.0.0');
    });
  });

  describe('INT-007: Concurrent lock acquisition', () => {
    it('prevents second instance from acquiring lock', async () => {
      // Create two InitLockManager instances (same directory)
      const lockManager1 = new InitLockManager(tempDir);
      const lockManager2 = new InitLockManager(tempDir);

      try {
        // First instance acquires lock
        await lockManager1.acquire();
        expect(lockManager1.isLocked()).toBe(true);

        // Second instance attempts to acquire lock
        await expect(lockManager2.acquire()).rejects.toThrow(/already in progress/);

        // Verify first manager still holds the lock
        expect(lockManager1.isLocked()).toBe(true);
        expect(lockManager2.isLocked()).toBe(false);
      } finally {
        // Clean up
        await lockManager1.release();
      }
    });
  });

  describe('INT-008: Lock stale detection', () => {
    it('auto-removes stale lock and acquires new one', async () => {
      // Create lock file manually with timestamp >1 hour old
      const lockPath = path.join(tempDir, '.pkf-init.lock');
      const staleTimestamp = Date.now() - 3700000; // 1 hour + 100 seconds
      const staleLockData = {
        pid: 99999, // Fake PID
        timestamp: staleTimestamp,
        version: '1.0.0',
      };
      await fs.writeFile(lockPath, JSON.stringify(staleLockData, null, 2), 'utf-8');

      // Verify stale lock file exists
      const staleLockContent = await fs.readFile(lockPath, 'utf-8');
      const parsedStaleLock = JSON.parse(staleLockContent);
      expect(parsedStaleLock.pid).toBe(99999);

      // Spy on console.warn (stale lock removal logs a warning)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create InitLockManager
      const lockManager = new InitLockManager(tempDir);

      try {
        // Acquire lock - should succeed (stale lock auto-removed)
        await lockManager.acquire();
        expect(lockManager.isLocked()).toBe(true);

        // Verify old lock file was replaced with new one
        const newLockContent = await fs.readFile(lockPath, 'utf-8');
        const parsedNewLock = JSON.parse(newLockContent);

        expect(parsedNewLock.pid).toBe(process.pid);
        expect(parsedNewLock.timestamp).toBeGreaterThan(staleTimestamp);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Force releasing lock'));
      } finally {
        await lockManager.release();
        warnSpy.mockRestore();
      }
    });
  });

  describe('INT-009: Cost tracking across multiple calls', () => {
    it('accumulates costs correctly for multiple model calls', () => {
      // Create CostTracker with no budget
      const tracker = new CostTracker();

      // Record usage for 3 different model calls
      const sonnetModel: ClaudeModel = 'claude-sonnet-4-20250514';
      const haikuModel: ClaudeModel = 'claude-haiku-3-5-20241022';
      const opusModel: ClaudeModel = 'claude-opus-4-20250514';

      // Sonnet: $3.00/M input, $15.00/M output
      // 1000 input + 500 output = (1000/1M)*3 + (500/1M)*15 = 0.003 + 0.0075 = 0.0105
      const cost1 = tracker.recordUsage(sonnetModel, 1000, 500);

      // Haiku: $0.80/M input, $4.00/M output
      // 2000 input + 1000 output = (2000/1M)*0.8 + (1000/1M)*4 = 0.0016 + 0.004 = 0.0056
      const cost2 = tracker.recordUsage(haikuModel, 2000, 1000);

      // Opus: $15.00/M input, $75.00/M output
      // 500 input + 200 output = (500/1M)*15 + (200/1M)*75 = 0.0075 + 0.015 = 0.0225
      const cost3 = tracker.recordUsage(opusModel, 500, 200);

      // Verify total cost equals sum of individual costs
      const expectedTotal = cost1 + cost2 + cost3;
      expect(tracker.getTotalCost()).toBeCloseTo(expectedTotal, 6);
      expect(tracker.getTotalCost()).toBeCloseTo(0.0105 + 0.0056 + 0.0225, 4);

      // Verify token counts are correct
      // Total: (1000+500) + (2000+1000) + (500+200) = 1500 + 3000 + 700 = 5200
      expect(tracker.getTotalTokens()).toBe(5200);

      // Verify per-model breakdown
      const usageByModel = tracker.getUsageByModel();

      const sonnetUsage = usageByModel.get(sonnetModel);
      expect(sonnetUsage?.inputTokens).toBe(1000);
      expect(sonnetUsage?.outputTokens).toBe(500);

      const haikuUsage = usageByModel.get(haikuModel);
      expect(haikuUsage?.inputTokens).toBe(2000);
      expect(haikuUsage?.outputTokens).toBe(1000);

      const opusUsage = usageByModel.get(opusModel);
      expect(opusUsage?.inputTokens).toBe(500);
      expect(opusUsage?.outputTokens).toBe(200);
    });
  });

  describe('INT-010: Budget enforcement', () => {
    it('throws BudgetExceededError when exceeding maxCost', () => {
      // Create CostTracker with maxCost = $0.01
      const tracker = new CostTracker(0.01);

      // Record small usage that's under budget
      // Haiku: (100/1M)*0.8 + (50/1M)*4 = 0.00008 + 0.0002 = 0.00028
      const smallCost = tracker.recordUsage('claude-haiku-3-5-20241022', 100, 50);
      expect(smallCost).toBeLessThan(0.01);
      expect(tracker.getTotalCost()).toBeLessThan(0.01);

      // Attempt to record large usage that exceeds budget
      // Opus: (100000/1M)*15 + (50000/1M)*75 = 1.5 + 3.75 = 5.25 (way over budget)
      expect(() => {
        tracker.recordUsage('claude-opus-4-20250514', 100000, 50000);
      }).toThrow(BudgetExceededError);

      // Verify BudgetExceededError has correct code
      try {
        tracker.recordUsage('claude-opus-4-20250514', 100000, 50000);
      } catch (error) {
        expect(error).toBeInstanceOf(BudgetExceededError);
        expect((error as BudgetExceededError).code).toBe('BUDGET_EXCEEDED');
      }
    });
  });

  describe('INT-011: ConfigLoader with environment variables', () => {
    it('loads API key from environment and applies defaults', async () => {
      // Set ANTHROPIC_API_KEY environment variable
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-from-env-var';

      // Create ConfigLoader with minimal options
      const options: InitOptions = {};
      const loader = new ConfigLoader(options, tempDir);

      // Load config
      const config = await loader.load();

      // Verify API key loaded from environment
      expect(config.apiKey).toBe('sk-ant-test-key-from-env-var');

      // Verify default values applied correctly
      expect(config.apiTier).toBe('build1');
      expect(config.maxCost).toBe(50);
      expect(config.workers).toBe(3);
      expect(config.docsDir).toBe(path.resolve(tempDir, 'docs'));
      expect(config.outputDir).toBe(path.resolve(tempDir, '.'));
      expect(config.backupDir).toBe(path.resolve(tempDir, '.pkf-backup'));
      expect(config.pkfInitialized).toBe(false);

      // Clean up environment variable (handled in afterEach)
    });
  });

  describe('INT-012: Workflow state checkpoint and resume flow', () => {
    it('creates checkpoints and supports resume detection', async () => {
      // Create WorkflowStateManager
      const manager1 = new WorkflowStateManager(tempDir);

      // Create initial state
      const initialState = manager1.createInitialState();
      await manager1.save(initialState);

      // Add checkpoint for ANALYZING stage
      await manager1.checkpoint(
        WorkflowStage.ANALYZING,
        'Started project analysis',
        { startTime: Date.now() }
      );

      // Update with analysis state data
      const stateAfterCheckpoint = await manager1.load();
      expect(stateAfterCheckpoint).not.toBeNull();
      stateAfterCheckpoint!.analysis = {
        complete: false,
        discoveredDocs: ['README.md', 'docs/guide.md', 'CHANGELOG.md'],
        summary: 'Discovered 3 documentation files',
      };
      stateAfterCheckpoint!.apiCallCount = 2;
      stateAfterCheckpoint!.totalCost = 0.05;

      // Save state
      await manager1.save(stateAfterCheckpoint!);

      // Verify canResume() returns true
      expect(manager1.canResume()).toBe(true);

      // Create new instance (simulating restart)
      const manager2 = new WorkflowStateManager(tempDir);

      // Load state
      const loadedState = await manager2.load();

      // Verify checkpoint exists
      expect(loadedState?.checkpoints).toHaveLength(1);
      expect(loadedState?.checkpoints[0].stage).toBe(WorkflowStage.ANALYZING);
      expect(loadedState?.checkpoints[0].description).toBe('Started project analysis');
      expect(loadedState?.checkpoints[0].data?.startTime).toBeDefined();

      // Verify analysis state data preserved
      expect(loadedState?.analysis?.complete).toBe(false);
      expect(loadedState?.analysis?.discoveredDocs).toEqual([
        'README.md',
        'docs/guide.md',
        'CHANGELOG.md',
      ]);
      expect(loadedState?.analysis?.summary).toBe('Discovered 3 documentation files');
      expect(loadedState?.apiCallCount).toBe(2);
      expect(loadedState?.totalCost).toBe(0.05);

      // Verify canResume on new instance
      expect(manager2.canResume()).toBe(true);
    });
  });

  describe('INT-013: Full init flow simulation (dry-run path)', () => {
    it('simulates init flow without API calls', async () => {
      // Create temp directory (already done in beforeEach)
      expect(tempDir).toBeDefined();

      // Verify no pkf.config.yaml exists
      const configPath = path.join(tempDir, 'pkf.config.yaml');
      await expect(fs.access(configPath)).rejects.toThrow();

      // Create ConfigLoader with valid API key (mock: 'sk-ant-test-key')
      const options: InitOptions = {
        apiKey: 'sk-ant-test-key',
        dryRun: true,
      };
      const loader = new ConfigLoader(options, tempDir);

      // Load config
      const config = await loader.load();

      // Verify pkfInitialized is false (no pkf.config.yaml)
      expect(config.pkfInitialized).toBe(false);
      expect(config.apiKey).toBe('sk-ant-test-key');
      expect(config.rootDir).toBe(path.resolve(tempDir));

      // Create WorkflowStateManager
      const stateManager = new WorkflowStateManager(tempDir);

      // Create initial state
      const initialState = stateManager.createInitialState();
      expect(initialState.currentStage).toBe(WorkflowStage.NOT_STARTED);
      expect(initialState.apiCallCount).toBe(0);
      expect(initialState.totalCost).toBe(0);

      // Save state
      await stateManager.save(initialState);

      // Verify state is saved
      const statePath = path.join(tempDir, '.pkf-init-state.json');
      const stateContent = await fs.readFile(statePath, 'utf-8');
      const parsedState = JSON.parse(stateContent);

      expect(parsedState.version).toBe('1.0.0');
      expect(parsedState.currentStage).toBe(WorkflowStage.NOT_STARTED);
      expect(parsedState.checkpoints).toEqual([]);

      // Verify we can load the state again
      const loadedState = await stateManager.load();
      expect(loadedState?.currentStage).toBe(WorkflowStage.NOT_STARTED);

      // Clean up is handled in afterEach
    });
  });
});
