/**
 * PKF Init Stage 4: Migration
 * Executes document migration using planner, worker, and parallel executor
 */
import type { AgentOrchestrator } from '../agents/orchestrator.js';
import type { WorkflowStateManager } from '../state/workflow-state.js';
import type { Interactive } from '../utils/interactive.js';
import type { RequestQueue } from '../api/request-queue.js';
import { type ValidationSummary } from '../migration/validation.js';
import { type LoadedConfig } from '../types/index.js';
/**
 * Result from migration stage execution
 */
export interface MigrationStageResult {
    /** Whether migration succeeded */
    success: boolean;
    /** Number of successfully migrated files */
    migratedCount: number;
    /** Number of failed migrations */
    failedCount: number;
    /** Total cost in USD */
    totalCost: number;
    /** Total time in milliseconds */
    totalTime: number;
    /** Post-migration validation result */
    validationResult?: ValidationSummary;
    /** Error messages if any */
    errors?: string[];
}
/**
 * Migration Stage (Stage 4)
 * Executes document migration based on the blueprint and schemas
 */
export declare class MigrationStage {
    private orchestrator;
    private stateManager;
    private config;
    private interactive;
    private requestQueue;
    /**
     * Create migration stage
     * @param orchestrator - Agent orchestrator for AI interactions
     * @param stateManager - Workflow state manager for checkpointing
     * @param config - Loaded configuration
     * @param interactive - Interactive mode handler
     * @param requestQueue - Request queue for parallel execution
     */
    constructor(orchestrator: AgentOrchestrator, stateManager: WorkflowStateManager, config: LoadedConfig, interactive: Interactive, requestQueue: RequestQueue);
    /**
     * Execute the migration stage
     * @param blueprint - Blueprint YAML from analysis stage
     * @param schemasYaml - Schemas YAML from design stage
     * @returns Migration result
     */
    execute(blueprint: string, schemasYaml: string): Promise<MigrationStageResult>;
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