/**
 * Unit tests for WorkflowStateManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { WorkflowStateManager } from '../../src/state/workflow-state.js';
import { WorkflowStage } from '../../src/types/index.js';

describe('WorkflowStateManager', () => {
  let tempDir: string;
  let stateManager: WorkflowStateManager;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-init-test-'));
    stateManager = new WorkflowStateManager(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('createInitialState', () => {
    it('creates initial state correctly', () => {
      const state = stateManager.createInitialState();

      expect(state).toBeDefined();
      expect(state.version).toBe('1.0.0');
      expect(state.currentStage).toBe(WorkflowStage.NOT_STARTED);
      expect(state.checkpoints).toEqual([]);
      expect(state.apiCallCount).toBe(0);
      expect(state.totalCost).toBe(0);
      expect(state.totalTokens).toBe(0);
      expect(state.startedAt).toBeDefined();
      expect(state.updatedAt).toBeDefined();
    });
  });

  describe('save', () => {
    it('saves state atomically using temp file pattern', async () => {
      const state = stateManager.createInitialState();

      // Save the state
      await stateManager.save(state);

      // Verify the state file exists
      const statePath = path.join(tempDir, '.pkf-init-state.json');
      const content = await fs.readFile(statePath, 'utf-8');
      const savedState = JSON.parse(content);

      expect(savedState.version).toBe('1.0.0');
      expect(savedState.currentStage).toBe(WorkflowStage.NOT_STARTED);

      // Verify temp file was cleaned up
      const tempPath = `${statePath}.tmp`;
      await expect(fs.access(tempPath)).rejects.toThrow();
    });

    it('updates updatedAt on save', async () => {
      const state = stateManager.createInitialState();
      const originalUpdatedAt = state.updatedAt;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await stateManager.save(state);

      expect(state.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('load', () => {
    it('loads existing state', async () => {
      // Create and save initial state
      const originalState = stateManager.createInitialState();
      originalState.currentStage = WorkflowStage.ANALYZING;
      originalState.apiCallCount = 5;
      await stateManager.save(originalState);

      // Create a new manager and load
      const newManager = new WorkflowStateManager(tempDir);
      const loadedState = await newManager.load();

      expect(loadedState).toBeDefined();
      expect(loadedState?.currentStage).toBe(WorkflowStage.ANALYZING);
      expect(loadedState?.apiCallCount).toBe(5);
    });

    it('returns null for non-existent state', async () => {
      const loadedState = await stateManager.load();

      expect(loadedState).toBeNull();
    });

    it('handles JSON parse errors gracefully', async () => {
      // Write invalid JSON to state file
      const statePath = path.join(tempDir, '.pkf-init-state.json');
      await fs.writeFile(statePath, 'not valid json{{{', 'utf-8');

      // Loading should throw on invalid JSON
      await expect(stateManager.load()).rejects.toThrow();
    });
  });

  describe('checkpoint', () => {
    it('creates checkpoint correctly', async () => {
      await stateManager.checkpoint(
        WorkflowStage.ANALYZING,
        'Started analysis'
      );

      const loadedState = await stateManager.load();

      expect(loadedState?.checkpoints).toHaveLength(1);
      expect(loadedState?.checkpoints[0].stage).toBe(WorkflowStage.ANALYZING);
      expect(loadedState?.checkpoints[0].description).toBe('Started analysis');
      expect(loadedState?.checkpoints[0].timestamp).toBeDefined();
    });

    it('updates stage on checkpoint', async () => {
      await stateManager.checkpoint(
        WorkflowStage.DESIGNING,
        'Moved to design phase'
      );

      const loadedState = await stateManager.load();

      expect(loadedState?.currentStage).toBe(WorkflowStage.DESIGNING);
    });

    it('multiple checkpoints accumulate', async () => {
      await stateManager.checkpoint(
        WorkflowStage.ANALYZING,
        'Analysis started'
      );
      await stateManager.checkpoint(
        WorkflowStage.DESIGNING,
        'Design started'
      );
      await stateManager.checkpoint(
        WorkflowStage.IMPLEMENTING,
        'Implementation started'
      );

      const loadedState = await stateManager.load();

      expect(loadedState?.checkpoints).toHaveLength(3);
      expect(loadedState?.checkpoints[0].stage).toBe(WorkflowStage.ANALYZING);
      expect(loadedState?.checkpoints[1].stage).toBe(WorkflowStage.DESIGNING);
      expect(loadedState?.checkpoints[2].stage).toBe(WorkflowStage.IMPLEMENTING);
    });

    it('preserves stage-specific state', async () => {
      await stateManager.checkpoint(
        WorkflowStage.ANALYZING,
        'Analysis checkpoint',
        { filesDiscovered: 42, summary: 'Found 42 files' }
      );

      const loadedState = await stateManager.load();

      expect(loadedState?.checkpoints[0].data).toEqual({
        filesDiscovered: 42,
        summary: 'Found 42 files',
      });
    });
  });

  describe('canResume', () => {
    it('returns false when no state exists', async () => {
      // Ensure state is loaded (null)
      await stateManager.load();

      const canResume = stateManager.canResume();

      expect(canResume).toBe(false);
    });

    it('returns true when state exists and not completed', async () => {
      await stateManager.checkpoint(
        WorkflowStage.ANALYZING,
        'In progress'
      );

      const canResume = stateManager.canResume();

      expect(canResume).toBe(true);
    });

    it('returns false when state is COMPLETED', async () => {
      await stateManager.checkpoint(
        WorkflowStage.COMPLETED,
        'Workflow completed'
      );

      const canResume = stateManager.canResume();

      expect(canResume).toBe(false);
    });

    it('returns false when state is FAILED', async () => {
      await stateManager.checkpoint(
        WorkflowStage.FAILED,
        'Workflow failed'
      );

      const canResume = stateManager.canResume();

      expect(canResume).toBe(false);
    });
  });

  describe('clear', () => {
    it('clears state file', async () => {
      // Create and save state
      await stateManager.checkpoint(
        WorkflowStage.ANALYZING,
        'In progress'
      );

      // Clear state
      await stateManager.clear();

      // Verify state file is deleted
      const statePath = path.join(tempDir, '.pkf-init-state.json');
      await expect(fs.access(statePath)).rejects.toThrow();

      // canResume should return false after clear
      expect(stateManager.canResume()).toBe(false);
    });
  });
});
