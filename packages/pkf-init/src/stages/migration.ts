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

import * as fs from 'fs/promises';
import * as path from 'path';
import type { AgentOrchestrator } from '../agents/orchestrator.js';
import type { WorkflowStateManager } from '../state/workflow-state.js';
import type { Interactive } from '../utils/interactive.js';
import type { RequestQueue } from '../api/request-queue.js';
import { MigrationPlanner, type ExtendedMigrationTask } from '../migration/planner.js';
import { MigrationWorker } from '../migration/worker.js';
import { ParallelMigrationExecutor, type ExecutorOptions } from '../migration/executor.js';
import { PostMigrationValidator, type ValidationSummary } from '../migration/validation.js';
import { ReferenceUpdater } from '../utils/reference-updater.js';
import { MigrationCleanup } from '../utils/cleanup.js';
import { WorkflowStage, type LoadedConfig, type MigrationTask, type MigrationConflict, type MigrationOperation } from '../types/index.js';
import logger from '../utils/logger.js';
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
 * Pre-migration validation result
 */
interface PreMigrationValidation {
  /** Whether validation passed */
  valid: boolean;
  /** Missing source files */
  missingFiles: string[];
  /** Target path conflicts (already exists) */
  conflicts: MigrationConflict[];
}

/**
 * Migration Stage (Stage 4)
 * Executes document migration with full reorganization support
 */
export class MigrationStage {
  private orchestrator: AgentOrchestrator;
  private stateManager: WorkflowStateManager;
  private config: LoadedConfig;
  private interactive: Interactive;
  private requestQueue: RequestQueue;
  private referenceUpdater: ReferenceUpdater;
  private cleanup: MigrationCleanup;
  private pkfConfig: PKFConfig;

  /**
   * Create migration stage
   * @param orchestrator - Agent orchestrator for AI interactions
   * @param stateManager - Workflow state manager for checkpointing
   * @param config - Loaded configuration
   * @param interactive - Interactive mode handler
   * @param requestQueue - Request queue for parallel execution
   * @param pkfConfig - Optional PKF configuration
   */
  constructor(
    orchestrator: AgentOrchestrator,
    stateManager: WorkflowStateManager,
    config: LoadedConfig,
    interactive: Interactive,
    requestQueue: RequestQueue,
    pkfConfig?: PKFConfig
  ) {
    this.orchestrator = orchestrator;
    this.stateManager = stateManager;
    this.config = config;
    this.interactive = interactive;
    this.requestQueue = requestQueue;
    this.referenceUpdater = new ReferenceUpdater(config.rootDir);
    this.cleanup = new MigrationCleanup(config.rootDir);
    this.pkfConfig = pkfConfig ?? {
      analysis: { maxParallelInspections: 3 },
      orchestration: { maxIterations: 5 },
      planning: { avgOutputTokensPerDoc: 1000 },
      api: { maxRetries: 3, retryDelayMs: 1000, timeout: 1800000 },
    };
  }

  /**
   * Execute the migration stage with full reorganization
   * @param blueprint - Blueprint YAML from analysis stage
   * @param schemasYaml - Schemas YAML from design stage
   * @returns Migration result
   */
  async execute(blueprint: string, schemasYaml: string): Promise<MigrationStageResult> {
    logger.stage('Stage 4: Migration');
    const startTime = Date.now();
    const allOperations: MigrationOperation[] = [];

    try {
      // Step 1: Create migration planner and generate plan
      logger.step('Creating migration plan...');
      const planner = new MigrationPlanner(this.config, schemasYaml, this.pkfConfig);
      const plan = await planner.createPlan(blueprint);

      if (plan.tasks.length === 0) {
        logger.info('No files to migrate');
        return {
          success: true,
          migratedCount: 0,
          createdCount: 0,
          movedCount: 0,
          failedCount: 0,
          referencesUpdated: 0,
          directoriesRemoved: 0,
          totalCost: 0,
          totalTime: Date.now() - startTime,
        };
      }

      // Count files by operation type
      const tasksNeedingCreation = plan.tasks.filter(t => t.needsCreation);
      const tasksNeedingMove = plan.tasks.filter(t => t.needsMove);
      const tasksNeedingFrontmatter = plan.tasks.filter(t => t.needsFrontmatter);

      logger.info(`Migration plan created: ${plan.totalFiles} files`);
      logger.info(`  Files to create: ${tasksNeedingCreation.length}`);
      logger.info(`  Files to move: ${tasksNeedingMove.length}`);
      logger.info(`  Files needing frontmatter: ${tasksNeedingFrontmatter.length}`);
      logger.info(`Estimated cost: $${plan.estimatedCost.toFixed(4)}, time: ${plan.estimatedTime.toFixed(1)} min`);

      // Sub-phase 4a: Pre-Migration Validation
      logger.step('Sub-phase 4a: Pre-migration validation...');
      const preValidation = await this.preMigrationValidation(plan.tasks);

      if (!preValidation.valid) {
        if (preValidation.missingFiles.length > 0) {
          logger.error(`Missing source files: ${preValidation.missingFiles.join(', ')}`);
        }
        if (preValidation.conflicts.length > 0) {
          logger.error(`Target conflicts found:`);
          for (const conflict of preValidation.conflicts) {
            logger.error(`  ${conflict.targetPath}: ${conflict.reason}`);
          }
        }

        return {
          success: false,
          migratedCount: 0,
          createdCount: 0,
          movedCount: 0,
          failedCount: 0,
          referencesUpdated: 0,
          directoriesRemoved: 0,
          totalCost: 0,
          totalTime: Date.now() - startTime,
          conflicts: preValidation.conflicts,
          errors: [
            ...preValidation.missingFiles.map(f => `Missing: ${f}`),
            ...preValidation.conflicts.map(c => `Conflict: ${c.targetPath}`),
          ],
        };
      }
      logger.success('Pre-migration validation passed');

      // Step 2: Interactive approval if enabled
      if (this.interactive) {
        logger.step('Awaiting approval...');
        const approved = await this.interactive.approveMigration(plan.tasks);

        if (!approved) {
          logger.warn('Migration cancelled by user');
          return {
            success: false,
            migratedCount: 0,
            createdCount: 0,
            movedCount: 0,
            failedCount: 0,
            referencesUpdated: 0,
            directoriesRemoved: 0,
            totalCost: 0,
            totalTime: Date.now() - startTime,
            errors: ['Cancelled by user'],
          };
        }
      }

      // Sub-phase 4b: Build path mapping for cross-reference updates
      logger.step('Sub-phase 4b: Building reference mapping...');
      const pathMapping = new Map<string, string>();
      for (const task of plan.tasks) {
        if (task.needsMove) {
          pathMapping.set(task.sourcePath, task.targetPath);
        }
      }
      logger.info(`Reference mapping: ${pathMapping.size} paths to update`);

      // Step 3: Create worker and executor
      logger.step('Initializing migration workers...');
      const worker = new MigrationWorker(
        this.orchestrator,
        schemasYaml,
        this.config.rootDir,
        this.config.customTemplateDir
      );

      // Set path mapping for cross-reference updates
      worker.setPathMapping(pathMapping);

      // Create executor options with progress callback
      const executorOptions: ExecutorOptions = {
        onProgress: (completed, total, task) => {
          this.reportProgress(completed, total, task);
        },
        onTaskComplete: (result) => {
          const moveInfo = result.moved ? ' (moved)' : '';
          const refInfo = result.referencesUpdated ? ` [${result.referencesUpdated} refs updated]` : '';
          logger.debug(`Migrated: ${result.task.sourcePath}${moveInfo}${refInfo}`);
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

      // Sub-phase 4c: Execute migration with progress reporting
      logger.step('Sub-phase 4c: Executing file migration...');
      const executionResult = await executor.execute({ tasks: plan.tasks });

      // Collect results
      const migratedFiles: string[] = [];
      const errors: string[] = [];
      let createdCount = 0;
      let movedCount = 0;
      let totalReferencesUpdated = 0;

      for (const result of executionResult.completed) {
        if (result.outputPath) {
          migratedFiles.push(result.outputPath);
        }
        // Check if this was a created file (task had needsCreation flag)
        const extTask = result.task as ExtendedMigrationTask;
        if (extTask.needsCreation) {
          createdCount++;
        }
        if (result.moved) {
          movedCount++;
        }
        if (result.referencesUpdated) {
          totalReferencesUpdated += result.referencesUpdated;
        }
        if (result.operations) {
          allOperations.push(...result.operations);
        }
      }

      for (const result of executionResult.failed) {
        errors.push(`${result.task.sourcePath}: ${result.error || 'Unknown error'}`);
        if (result.operations) {
          allOperations.push(...result.operations);
        }
      }

      const migratedCount = executionResult.completed.length;
      const failedCount = executionResult.failed.length;
      const totalCost = executionResult.totalCost;

      logger.info(`Migration completed: ${migratedCount} succeeded, ${failedCount} failed`);
      logger.info(`  Files created: ${createdCount}`);
      logger.info(`  Files moved: ${movedCount}`);
      logger.info(`  References updated: ${totalReferencesUpdated}`);
      logger.cost(totalCost, 'Total migration');

      // Sub-phase 4d: Update external references (files not being migrated)
      // This is handled within the worker for now; external files would need separate pass

      // Sub-phase 4e: Cleanup empty directories
      let directoriesRemoved = 0;
      if (movedCount > 0) {
        logger.step('Sub-phase 4e: Cleaning up empty directories...');
        const cleanupResult = await this.cleanup.removeEmptyDirectories('', {
          onLog: (msg) => logger.debug(msg),
        });
        directoriesRemoved = cleanupResult.removedDirectories.length;
        if (directoriesRemoved > 0) {
          logger.info(`Removed ${directoriesRemoved} empty directories`);
        }
      }

      // Sub-phase 4f: Run post-migration validation
      let validationResult: ValidationSummary | undefined;
      if (migratedFiles.length > 0) {
        logger.step('Sub-phase 4f: Running post-migration validation...');
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
          createdCount,
          movedCount,
          failedCount,
          referencesUpdated: totalReferencesUpdated,
          directoriesRemoved,
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
          createdCount,
          movedCount,
          failedCount,
          referencesUpdated: totalReferencesUpdated,
          directoriesRemoved,
          totalCost,
          totalTime,
          validationResult,
          operations: allOperations,
          errors,
        };
      }

      logger.success('Migration stage completed successfully');

      return {
        success: true,
        migratedCount,
        createdCount,
        movedCount,
        failedCount,
        referencesUpdated: totalReferencesUpdated,
        directoriesRemoved,
        totalCost,
        totalTime,
        validationResult,
        operations: allOperations,
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
        createdCount: 0,
        movedCount: 0,
        failedCount: 0,
        referencesUpdated: 0,
        directoriesRemoved: 0,
        totalCost: 0,
        totalTime: Date.now() - startTime,
        operations: allOperations,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Pre-migration validation
   * Checks that all source files exist (unless marked for creation) and warns about target conflicts
   * Note: Target conflicts are warnings only - migration will overwrite existing files
   * This is intentional because Stage 3 creates template registers that should be
   * replaced with actual migrated content.
   */
  private async preMigrationValidation(
    tasks: ExtendedMigrationTask[]
  ): Promise<PreMigrationValidation> {
    const missingFiles: string[] = [];
    const conflicts: MigrationConflict[] = [];
    let filesToCreate = 0;

    for (const task of tasks) {
      // Skip existence check for files that need to be created
      if (task.needsCreation) {
        filesToCreate++;
        continue;
      }

      // Check source exists
      const sourcePath = path.isAbsolute(task.sourcePath)
        ? task.sourcePath
        : path.join(this.config.rootDir, task.sourcePath);

      try {
        await fs.access(sourcePath);
      } catch {
        missingFiles.push(task.sourcePath);
        continue;
      }

      // Check if target exists (for informational purposes only)
      // We allow overwriting because Stage 3 creates template files that
      // should be replaced by actual migrated content
      if (task.needsMove) {
        const targetPath = path.isAbsolute(task.targetPath)
          ? task.targetPath
          : path.join(this.config.rootDir, task.targetPath);

        try {
          await fs.access(targetPath);
          // Target exists - log as warning but don't block migration
          logger.debug(`Target will be overwritten: ${task.targetPath}`);
        } catch {
          // Target doesn't exist - good
        }
      }
    }

    if (filesToCreate > 0) {
      logger.info(`${filesToCreate} files will be created from templates`);
    }

    // Only unexpected missing source files are errors
    // Files marked as needsCreation are expected to not exist
    return {
      valid: missingFiles.length === 0,
      missingFiles,
      conflicts, // Empty - we no longer treat existing targets as conflicts
    };
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
