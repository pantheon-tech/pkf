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

  describe('state migration', () => {
    it('loads and migrates legacy state without version', async () => {
      // Create a legacy state file without version field
      const legacyState = {
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.ANALYZING,
        checkpoints: [],
        apiCallCount: 5,
        totalCost: 1.5,
        totalTokens: 1000,
      };

      const statePath = path.join(tempDir, '.pkf-init-state.json');
      await fs.writeFile(statePath, JSON.stringify(legacyState), 'utf-8');

      // Load should migrate it to current version
      const loadedState = await stateManager.load();

      expect(loadedState).toBeDefined();
      expect(loadedState?.version).toBe('1.0.0');
      expect(loadedState?.apiCallCount).toBe(5);
      expect(loadedState?.currentStage).toBe(WorkflowStage.ANALYZING);
    });

    it('loads state with old version and migrates to current', async () => {
      // Create a state file with version 1.0.0
      const oldState = {
        version: '1.0.0',
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.DESIGNING,
        checkpoints: [
          {
            stage: WorkflowStage.ANALYZING,
            timestamp: '2025-01-01T01:00:00Z',
            description: 'Analysis complete',
          },
        ],
        apiCallCount: 10,
        totalCost: 2.5,
        totalTokens: 5000,
      };

      const statePath = path.join(tempDir, '.pkf-init-state.json');
      await fs.writeFile(statePath, JSON.stringify(oldState), 'utf-8');

      // Load should succeed and preserve all data
      const loadedState = await stateManager.load();

      expect(loadedState).toBeDefined();
      expect(loadedState?.version).toBe('1.0.0'); // Current version
      expect(loadedState?.checkpoints).toHaveLength(1);
      expect(loadedState?.apiCallCount).toBe(10);
    });

    it('throws error when loading invalid state structure', async () => {
      // Create a state file missing required fields
      const invalidState = {
        version: '1.0.0',
        startedAt: '2025-01-01T00:00:00Z',
        // Missing required fields
      };

      const statePath = path.join(tempDir, '.pkf-init-state.json');
      await fs.writeFile(statePath, JSON.stringify(invalidState), 'utf-8');

      // Load should throw validation error
      await expect(stateManager.load()).rejects.toThrow();
    });

    it('saves state with current version', async () => {
      const state = stateManager.createInitialState();

      await stateManager.save(state);

      const statePath = path.join(tempDir, '.pkf-init-state.json');
      const content = await fs.readFile(statePath, 'utf-8');
      const savedState = JSON.parse(content);

      expect(savedState.version).toBe('1.0.0');
    });

    it('rejects saving invalid state', async () => {
      const invalidState = {
        version: '1.0.0',
        // Missing required fields
      } as any;

      await expect(stateManager.save(invalidState)).rejects.toThrow(
        'Cannot save invalid state'
      );
    });

    it('preserves stage-specific state during migration', async () => {
      // Create state with stage-specific data
      const oldState = {
        version: '1.0.0',
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.IMPLEMENTING,
        checkpoints: [],
        apiCallCount: 15,
        totalCost: 3.5,
        totalTokens: 7500,
        analysis: {
          complete: true,
          blueprint: 'test blueprint',
          discoveredDocs: ['doc1.md', 'doc2.md'],
        },
        design: {
          complete: true,
          schemasYaml: 'schemas: test',
        },
      };

      const statePath = path.join(tempDir, '.pkf-init-state.json');
      await fs.writeFile(statePath, JSON.stringify(oldState), 'utf-8');

      const loadedState = await stateManager.load();

      expect(loadedState?.analysis?.complete).toBe(true);
      expect(loadedState?.analysis?.blueprint).toBe('test blueprint');
      expect(loadedState?.design?.complete).toBe(true);
    });
  });
});
