/**
 * State Migration System
 * Handles version detection and migration of WorkflowState between versions
 */
import { WorkflowState } from '../types/index.js';
/**
 * Type for migration function that transforms state between versions
 */
export type StateMigrationFunction = (state: any) => any;
/**
 * Migrate state from current version to target version
 * @param state - State object to migrate (may or may not have version field)
 * @param targetVersion - Target version to migrate to
 * @returns Migrated state
 * @throws Error if downgrade is attempted or migration path not found
 */
export declare function migrateState(state: any, targetVersion: string): WorkflowState;
/**
 * Validate that a state object has the expected structure
 * @param state - State to validate
 * @returns True if state is valid
 */
export declare function validateState(state: any): state is WorkflowState;
/**
 * Get list of available migration paths
 * @returns Array of migration keys
 */
export declare function getAvailableMigrations(): string[];
/**
 * Check if migration is needed from one version to another
 * @param currentVersion - Current state version
 * @param targetVersion - Target version
 * @returns True if migration is needed
 */
export declare function needsMigration(currentVersion: string, targetVersion: string): boolean;
//# sourceMappingURL=migration.d.ts.map