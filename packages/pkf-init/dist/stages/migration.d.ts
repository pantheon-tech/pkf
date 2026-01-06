/**
 * PKF Init Stage 4: Migration
 * Executes document migration with full reorganization support
 *
 * Sub-phases:
 * 4a: Pre-Migration Validation - Verify sources exist, no target conflicts
 * 4b: Reference Mapping - Scan all docs, build link dependency graph
 * 4c: File Migration - Execute moves with tracking
 * 4d: External Reference Updates - Update links in non-migrated files
 * 4e: Cleanup - Remove empty directories
 * 4f: Post-Validation - Verify structure, validate links
 */
import type { AgentOrchestrator } from '../agents/orchestrator.js';
import type { WorkflowStateManager } from '../state/workflow-state.js';
import type { Interactive } from '../utils/interactive.js';
import type { RequestQueue } from '../api/request-queue.js';
import { type ValidationSummary } from '../migration/validation.js';
import { type LoadedConfig, type MigrationConflict, type MigrationOperation } from '../types/index.js';
import type { PKFConfig } from '../config/pkf-config.js';
/**
 * Result from migration stage execution
 */
export interface MigrationStageResult {
    /** Whether migration succeeded */
    success: boolean;
    /** Number of successfully migrated files */
    migratedCount: number;
    /** Number of files that were created (didn't exist before) */
    createdCount: number;
    /** Number of files that were moved */
    movedCount: number;
    /** Number of failed migrations */
    failedCount: number;
    /** Total references updated across all files */
    referencesUpdated: number;
    /** Number of empty directories removed */
    directoriesRemoved: number;
    /** Total cost in USD */
    totalCost: number;
    /** Total time in milliseconds */
    totalTime: number;
    /** Post-migration validation result */
    validationResult?: ValidationSummary;
    /** All migration operations performed (for rollback) */
    operations?: MigrationOperation[];
    /** Conflicts detected during pre-validation */
    conflicts?: MigrationConflict[];
    /** Error messages if any */
    errors?: string[];
}
/**
 * Migration Stage (Stage 4)
 * Executes document migration with full reorganization support
 */
export declare class MigrationStage {
    private orchestrator;
    private stateManager;
    private config;
    private interactive;
    private requestQueue;
    private referenceUpdater;
    private cleanup;
    private pkfConfig;
    /**
     * Create migration stage
     * @param orchestrator - Agent orchestrator for AI interactions
     * @param stateManager - Workflow state manager for checkpointing
     * @param config - Loaded configuration
     * @param interactive - Interactive mode handler
     * @param requestQueue - Request queue for parallel execution
     * @param pkfConfig - Optional PKF configuration
     */
    constructor(orchestrator: AgentOrchestrator, stateManager: WorkflowStateManager, config: LoadedConfig, interactive: Interactive, requestQueue: RequestQueue, pkfConfig?: PKFConfig);
    /**
     * Execute the migration stage with full reorganization
     * @param blueprint - Blueprint YAML from analysis stage
     * @param schemasYaml - Schemas YAML from design stage
     * @returns Migration result
     */
    execute(blueprint: string, schemasYaml: string): Promise<MigrationStageResult>;
    /**
     * Pre-migration validation
     * Checks that all source files exist (unless marked for creation) and warns about target conflicts
     * Note: Target conflicts are warnings only - migration will overwrite existing files
     * This is intentional because Stage 3 creates template registers that should be
     * replaced with actual migrated content.
     */
    private preMigrationValidation;
    /**
     * Report migration progress
     * @param completed - Number of completed tasks
     * @param total - Total number of tasks
     * @param current - Current task being processed
     */
    private reportProgress;
}
export default MigrationStage;
//# sourceMappingURL=migration.d.ts.map