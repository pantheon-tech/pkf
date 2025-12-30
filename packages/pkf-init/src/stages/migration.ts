/**
 * PKF Init Stage 4: Migration
 * Executes document migration using planner, worker, and parallel executor
 */

import * as path from 'path';
import type { AgentOrchestrator } from '../agents/orchestrator.js';
import type { WorkflowStateManager } from '../state/workflow-state.js';
import type { Interactive } from '../utils/interactive.js';
import type { RequestQueue } from '../api/request-queue.js';
import { MigrationPlanner } from '../migration/planner.js';
import { MigrationWorker } from '../migration/worker.js';
import { ParallelMigrationExecutor, type ExecutorOptions } from '../migration/executor.js';
import { PostMigrationValidator, type ValidationSummary } from '../migration/validation.js';
import { WorkflowStage, type LoadedConfig, type MigrationTask } from '../types/index.js';
import logger from '../utils/logger.js';

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
export class MigrationStage {
  private orchestrator: AgentOrchestrator;
  private stateManager: WorkflowStateManager;
  private config: LoadedConfig;
  private interactive: Interactive;
  private requestQueue: RequestQueue;

  /**
   * Create migration stage
   * @param orchestrator - Agent orchestrator for AI interactions
   * @param stateManager - Workflow state manager for checkpointing
   * @param config - Loaded configuration
   * @param interactive - Interactive mode handler
   * @param requestQueue - Request queue for parallel execution
   */
  constructor(
    orchestrator: AgentOrchestrator,
    stateManager: WorkflowStateManager,
    config: LoadedConfig,
    interactive: Interactive,
    requestQueue: RequestQueue
  ) {
    this.orchestrator = orchestrator;
    this.stateManager = stateManager;
    this.config = config;
    this.interactive = interactive;
    this.requestQueue = requestQueue;
  }

  /**
   * Execute the migration stage
   * @param blueprint - Blueprint YAML from analysis stage
   * @param schemasYaml - Schemas YAML from design stage
   * @returns Migration result
   */
  async execute(blueprint: string, schemasYaml: string): Promise<MigrationStageResult> {
    logger.stage('Stage 4: Migration');
    const startTime = Date.now();

    try {
      // Step 1: Create migration planner and generate plan
      logger.step('Creating migration plan...');
      const planner = new MigrationPlanner(this.config, schemasYaml);
      const plan = await planner.createPlan(blueprint);

      if (plan.tasks.length === 0) {
        logger.info('No files to migrate');
        return {
          success: true,
          migratedCount: 0,
          failedCount: 0,
          totalCost: 0,
          totalTime: Date.now() - startTime,
        };
      }

      logger.info(`Migration plan created: ${plan.totalFiles} files to migrate`);
      logger.info(`Estimated cost: $${plan.estimatedCost.toFixed(4)}, time: ${plan.estimatedTime.toFixed(1)} min`);

      // Step 2: Interactive approval if enabled
      if (this.interactive) {
        logger.step('Awaiting approval...');
        const approved = await this.interactive.approveMigration(plan.tasks);

        if (!approved) {
          logger.warn('Migration cancelled by user');
          return {
            success: false,
            migratedCount: 0,
            failedCount: 0,
            totalCost: 0,
            totalTime: Date.now() - startTime,
            errors: ['Cancelled by user'],
          };
        }
      }

      // Step 3: Create worker and executor
      logger.step('Initializing migration workers...');
      const worker = new MigrationWorker(
        this.orchestrator,
        schemasYaml,
        this.config.rootDir
      );

      // Create executor options with progress callback
      const executorOptions: ExecutorOptions = {
        onProgress: (completed, total, task) => {
          this.reportProgress(completed, total, task);
        },
        onTaskComplete: (result) => {
          logger.debug(`Migrated: ${result.task.sourcePath}`);
        },
        onTaskError: (task, error) => {
          logger.warn(`Failed to migrate ${task.sourcePath}: ${error.message}`);
        },
      };

      const executor = new ParallelMigrationExecutor(
        worker,
        this.requestQueue,
        executorOptions
      );

      // Step 4: Execute migration with progress reporting
      logger.step('Executing migration...');
      const executionResult = await executor.execute({ tasks: plan.tasks });

      // Step 5: Calculate results
      const migratedFiles: string[] = [];
      const errors: string[] = [];

      for (const result of executionResult.completed) {
        if (result.outputPath) {
          migratedFiles.push(result.outputPath);
        }
      }

      for (const result of executionResult.failed) {
        errors.push(`${result.task.sourcePath}: ${result.error || 'Unknown error'}`);
      }

      const migratedCount = executionResult.completed.length;
      const failedCount = executionResult.failed.length;
      const totalCost = executionResult.totalCost;

      logger.info(`Migration completed: ${migratedCount} succeeded, ${failedCount} failed`);
      logger.cost(totalCost, 'Total migration');

      // Step 6: Run post-migration validation
      let validationResult: ValidationSummary | undefined;
      if (migratedFiles.length > 0) {
        logger.step('Running post-migration validation...');
        const validator = new PostMigrationValidator(this.config);
        validationResult = await validator.validate(migratedFiles);

        if (validationResult.valid) {
          logger.success(`Validation passed: ${validationResult.validFiles}/${validationResult.totalFiles} files valid`);
        } else {
          logger.warn(`Validation issues: ${validationResult.invalidFiles} files with errors`);
          for (const fileError of validationResult.errors) {
            logger.debug(`  ${fileError.filePath}: ${fileError.errors.join(', ')}`);
          }
        }
      }

      // Step 7: Save state checkpoint
      logger.step('Saving checkpoint...');
      await this.stateManager.checkpoint(
        WorkflowStage.MIGRATING,
        'Migration stage completed',
        {
          migratedCount,
          failedCount,
          totalCost,
          migratedFiles,
          errors: errors.length > 0 ? errors : undefined,
          validationResult,
        }
      );

      const totalTime = Date.now() - startTime;

      if (failedCount > 0) {
        logger.warn('Migration completed with some failures');
        return {
          success: false,
          migratedCount,
          failedCount,
          totalCost,
          totalTime,
          validationResult,
          errors,
        };
      }

      logger.success('Migration stage completed successfully');

      return {
        success: true,
        migratedCount,
        failedCount,
        totalCost,
        totalTime,
        validationResult,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Migration failed: ${errorMessage}`);

      // Save error state
      await this.stateManager.checkpoint(
        WorkflowStage.FAILED,
        `Migration failed: ${errorMessage}`,
        { error: errorMessage }
      );

      return {
        success: false,
        migratedCount: 0,
        failedCount: 0,
        totalCost: 0,
        totalTime: Date.now() - startTime,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Report migration progress
   * @param completed - Number of completed tasks
   * @param total - Total number of tasks
   * @param current - Current task being processed
   */
  private reportProgress(completed: number, total: number, current?: MigrationTask): void {
    const percentage = Math.round((completed / total) * 100);
    const taskInfo = current ? ` - ${path.basename(current.sourcePath)}` : '';
    logger.info(`Progress: ${completed}/${total} (${percentage}%)${taskInfo}`);
  }
}

export default MigrationStage;
