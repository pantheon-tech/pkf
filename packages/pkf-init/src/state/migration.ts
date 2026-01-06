/**
 * State Migration System
 * Handles version detection and migration of WorkflowState between versions
 */

import * as semver from 'semver';
import { WorkflowState } from '../types/index.js';

/**
 * Type for migration function that transforms state between versions
 */
export type StateMigrationFunction = (state: any) => any;

/**
 * Registry of migration functions keyed by version transition
 * Format: 'from-version-to-target-version'
 */
const migrations: Record<string, StateMigrationFunction> = {
  // Example migration from 1.0.0 to 1.1.0
  // This would handle any new fields or structural changes
  '1.0.0-to-1.1.0': (oldState: any): any => {
    return {
      ...oldState,
      version: '1.1.0',
      // Example: Add new field with default value
      // newField: 'default-value',
    };
  },

  // Future migrations can be added here as needed
  // '1.1.0-to-1.2.0': (oldState: any): any => { ... },
};

/**
 * Parse migration key to extract from and to versions
 * @param key - Migration key in format 'from-to'
 * @returns Object with from and to versions
 */
function parseMigrationKey(key: string): { from: string; to: string } {
  const parts = key.split('-to-');
  if (parts.length !== 2) {
    throw new Error(`Invalid migration key format: ${key}`);
  }
  return { from: parts[0], to: parts[1] };
}

/**
 * Migrate state from current version to target version
 * @param state - State object to migrate (may or may not have version field)
 * @param targetVersion - Target version to migrate to
 * @returns Migrated state
 * @throws Error if downgrade is attempted or migration path not found
 */
export function migrateState(
  state: any,
  targetVersion: string
): WorkflowState {
  // Handle legacy state without version field
  if (!state.version) {
    state = {
      ...state,
      version: '1.0.0', // Assume legacy state is 1.0.0
    };
  }

  const currentVersion = state.version;

  // Validate versions
  if (!semver.valid(currentVersion)) {
    throw new Error(`Invalid current version: ${currentVersion}`);
  }
  if (!semver.valid(targetVersion)) {
    throw new Error(`Invalid target version: ${targetVersion}`);
  }

  // If already at target version, return as-is
  if (semver.eq(currentVersion, targetVersion)) {
    return state as WorkflowState;
  }

  // Prevent downgrade
  if (semver.gt(currentVersion, targetVersion)) {
    throw new Error(
      `Cannot downgrade state from ${currentVersion} to ${targetVersion}`
    );
  }

  // Find applicable migration path
  const applicableMigrations = Object.keys(migrations)
    .map(key => {
      const { from, to } = parseMigrationKey(key);
      return { key, from, to };
    })
    .filter(({ from, to }) => {
      // Migration is applicable if it helps bridge from current to target:
      // 1. from version is <= current version (we're at or past the starting point)
      // 2. to version is > current version (it moves us forward)
      // 3. to version is <= target version (it doesn't overshoot)
      return (
        semver.lte(from, currentVersion) &&
        semver.gt(to, currentVersion) &&
        semver.lte(to, targetVersion)
      );
    })
    .sort((a, b) => {
      // Sort by from version ascending to apply in order
      return semver.compare(a.from, b.from);
    });

  // If no migrations found but versions differ, this is an error
  if (applicableMigrations.length === 0) {
    throw new Error(
      `No migration path found from ${currentVersion} to ${targetVersion}`
    );
  }

  // Apply migrations sequentially
  let migratedState = state;
  for (const { key } of applicableMigrations) {
    migratedState = migrations[key](migratedState);
  }

  // Verify we reached the target version
  if (!semver.eq(migratedState.version, targetVersion)) {
    throw new Error(
      `No migration path found from ${currentVersion} to ${targetVersion}`
    );
  }

  return migratedState as WorkflowState;
}

/**
 * Validate that a state object has the expected structure
 * @param state - State to validate
 * @returns True if state is valid
 */
export function validateState(state: any): state is WorkflowState {
  if (!state || typeof state !== 'object') {
    return false;
  }

  // Check required fields
  const requiredFields = [
    'version',
    'startedAt',
    'updatedAt',
    'currentStage',
    'checkpoints',
    'apiCallCount',
    'totalCost',
    'totalTokens',
  ];

  for (const field of requiredFields) {
    if (!(field in state)) {
      return false;
    }
  }

  // Check types
  if (typeof state.version !== 'string') return false;
  if (typeof state.startedAt !== 'string') return false;
  if (typeof state.updatedAt !== 'string') return false;
  if (typeof state.currentStage !== 'string') return false;
  if (!Array.isArray(state.checkpoints)) return false;
  if (typeof state.apiCallCount !== 'number') return false;
  if (typeof state.totalCost !== 'number') return false;
  if (typeof state.totalTokens !== 'number') return false;

  return true;
}

/**
 * Get list of available migration paths
 * @returns Array of migration keys
 */
export function getAvailableMigrations(): string[] {
  return Object.keys(migrations);
}

/**
 * Check if migration is needed from one version to another
 * @param currentVersion - Current state version
 * @param targetVersion - Target version
 * @returns True if migration is needed
 */
export function needsMigration(
  currentVersion: string,
  targetVersion: string
): boolean {
  if (!semver.valid(currentVersion) || !semver.valid(targetVersion)) {
    return false;
  }
  return !semver.eq(currentVersion, targetVersion);
}
