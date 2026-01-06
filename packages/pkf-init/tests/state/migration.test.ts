/**
 * Unit tests for state migration system
 */

import { describe, it, expect } from 'vitest';
import {
  migrateState,
  validateState,
  getAvailableMigrations,
  needsMigration,
} from '../../src/state/migration.js';
import { WorkflowStage } from '../../src/types/index.js';

describe('State Migration System', () => {
  describe('migrateState', () => {
    it('handles legacy state without version field', () => {
      const legacyState = {
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.NOT_STARTED,
        checkpoints: [],
        apiCallCount: 0,
        totalCost: 0,
        totalTokens: 0,
      };

      const migrated = migrateState(legacyState, '1.0.0');

      expect(migrated.version).toBe('1.0.0');
      expect(migrated.startedAt).toBe(legacyState.startedAt);
      expect(migrated.currentStage).toBe(legacyState.currentStage);
    });

    it('returns state unchanged if already at target version', () => {
      const state = {
        version: '1.0.0',
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.ANALYZING,
        checkpoints: [],
        apiCallCount: 5,
        totalCost: 1.5,
        totalTokens: 1000,
      };

      const migrated = migrateState(state, '1.0.0');

      expect(migrated).toEqual(state);
    });

    it('migrates from 1.0.0 to 1.1.0', () => {
      const oldState = {
        version: '1.0.0',
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.ANALYZING,
        checkpoints: [],
        apiCallCount: 5,
        totalCost: 1.5,
        totalTokens: 1000,
      };

      const migrated = migrateState(oldState, '1.1.0');

      expect(migrated.version).toBe('1.1.0');
      expect(migrated.apiCallCount).toBe(5);
      expect(migrated.totalCost).toBe(1.5);
    });

    it('prevents downgrade', () => {
      const state = {
        version: '1.1.0',
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.ANALYZING,
        checkpoints: [],
        apiCallCount: 5,
        totalCost: 1.5,
        totalTokens: 1000,
      };

      expect(() => migrateState(state, '1.0.0')).toThrow(
        'Cannot downgrade state from 1.1.0 to 1.0.0'
      );
    });

    it('throws error for invalid current version', () => {
      const state = {
        version: 'invalid-version',
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.ANALYZING,
        checkpoints: [],
        apiCallCount: 0,
        totalCost: 0,
        totalTokens: 0,
      };

      expect(() => migrateState(state, '1.0.0')).toThrow(
        'Invalid current version'
      );
    });

    it('throws error for invalid target version', () => {
      const state = {
        version: '1.0.0',
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.ANALYZING,
        checkpoints: [],
        apiCallCount: 0,
        totalCost: 0,
        totalTokens: 0,
      };

      expect(() => migrateState(state, 'invalid-version')).toThrow(
        'Invalid target version'
      );
    });

    it('throws error when no migration path exists', () => {
      const state = {
        version: '1.0.0',
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.ANALYZING,
        checkpoints: [],
        apiCallCount: 0,
        totalCost: 0,
        totalTokens: 0,
      };

      // Try to migrate to a version that has no migration path
      expect(() => migrateState(state, '2.0.0')).toThrow(
        'No migration path found'
      );
    });

    it('preserves all state fields during migration', () => {
      const oldState = {
        version: '1.0.0',
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.IMPLEMENTING,
        checkpoints: [
          {
            stage: WorkflowStage.ANALYZING,
            timestamp: '2025-01-01T01:00:00Z',
            description: 'Analysis complete',
            data: { filesFound: 42 },
          },
        ],
        apiCallCount: 10,
        totalCost: 2.5,
        totalTokens: 5000,
        maxCost: 10,
        analysis: {
          complete: true,
          blueprint: 'test blueprint',
        },
      };

      const migrated = migrateState(oldState, '1.1.0');

      expect(migrated.checkpoints).toHaveLength(1);
      expect(migrated.checkpoints[0].description).toBe('Analysis complete');
      expect(migrated.apiCallCount).toBe(10);
      expect(migrated.totalCost).toBe(2.5);
      expect(migrated.maxCost).toBe(10);
      expect(migrated.analysis?.complete).toBe(true);
    });
  });

  describe('validateState', () => {
    it('validates valid state object', () => {
      const state = {
        version: '1.0.0',
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.ANALYZING,
        checkpoints: [],
        apiCallCount: 5,
        totalCost: 1.5,
        totalTokens: 1000,
      };

      expect(validateState(state)).toBe(true);
    });

    it('rejects null or undefined', () => {
      expect(validateState(null)).toBe(false);
      expect(validateState(undefined)).toBe(false);
    });

    it('rejects non-object values', () => {
      expect(validateState('string')).toBe(false);
      expect(validateState(123)).toBe(false);
      expect(validateState(true)).toBe(false);
    });

    it('rejects state missing required fields', () => {
      const incompleteState = {
        version: '1.0.0',
        startedAt: '2025-01-01T00:00:00Z',
        // missing updatedAt and other fields
      };

      expect(validateState(incompleteState)).toBe(false);
    });

    it('rejects state with invalid field types', () => {
      const invalidState = {
        version: 123, // should be string
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.ANALYZING,
        checkpoints: [],
        apiCallCount: 5,
        totalCost: 1.5,
        totalTokens: 1000,
      };

      expect(validateState(invalidState)).toBe(false);
    });

    it('rejects state with non-array checkpoints', () => {
      const invalidState = {
        version: '1.0.0',
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.ANALYZING,
        checkpoints: 'not-an-array',
        apiCallCount: 5,
        totalCost: 1.5,
        totalTokens: 1000,
      };

      expect(validateState(invalidState)).toBe(false);
    });

    it('accepts state with optional fields', () => {
      const stateWithOptional = {
        version: '1.0.0',
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.ANALYZING,
        checkpoints: [],
        apiCallCount: 5,
        totalCost: 1.5,
        totalTokens: 1000,
        maxCost: 10,
        analysis: {
          complete: true,
        },
      };

      expect(validateState(stateWithOptional)).toBe(true);
    });
  });

  describe('getAvailableMigrations', () => {
    it('returns list of migration keys', () => {
      const migrations = getAvailableMigrations();

      expect(Array.isArray(migrations)).toBe(true);
      expect(migrations.length).toBeGreaterThan(0);
      expect(migrations).toContain('1.0.0-to-1.1.0');
    });
  });

  describe('needsMigration', () => {
    it('returns false when versions are equal', () => {
      expect(needsMigration('1.0.0', '1.0.0')).toBe(false);
    });

    it('returns true when versions differ', () => {
      expect(needsMigration('1.0.0', '1.1.0')).toBe(true);
    });

    it('returns false for invalid versions', () => {
      expect(needsMigration('invalid', '1.0.0')).toBe(false);
      expect(needsMigration('1.0.0', 'invalid')).toBe(false);
    });
  });

  describe('integration with WorkflowState interface', () => {
    it('migration result is compatible with WorkflowState type', () => {
      const legacyState = {
        startedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        currentStage: WorkflowStage.ANALYZING,
        checkpoints: [
          {
            stage: WorkflowStage.ANALYZING,
            timestamp: '2025-01-01T01:00:00Z',
            description: 'Test checkpoint',
          },
        ],
        apiCallCount: 5,
        totalCost: 1.5,
        totalTokens: 1000,
      };

      const migrated = migrateState(legacyState, '1.0.0');

      // Should have all required WorkflowState fields
      expect(migrated.version).toBeDefined();
      expect(migrated.startedAt).toBeDefined();
      expect(migrated.updatedAt).toBeDefined();
      expect(migrated.currentStage).toBeDefined();
      expect(migrated.checkpoints).toBeDefined();
      expect(migrated.apiCallCount).toBeDefined();
      expect(migrated.totalCost).toBeDefined();
      expect(migrated.totalTokens).toBeDefined();
    });
  });
});
