/**
 * PKF Init Command
 * Main initialization command with all CLI flags
 */

import { Command } from 'commander';
import type { InitOptions, WorkflowStage, WorkflowState } from '../types/index.js';
import { WorkflowStage as WS } from '../types/index.js';
import logger from '../utils/logger.js';
import { WorkflowStateManager } from '../state/workflow-state.js';
import { InitLockManager } from '../state/lock-manager.js';
import { ConfigLoader } from '../config/loader.js';
import { AnthropicClient } from '../api/anthropic-client.js';
import { RateLimiter } from '../api/rate-limiter.js';
import { RequestQueue } from '../api/request-queue.js';
import { CostTracker } from '../utils/cost-tracker.js';
import { AgentOrchestrator } from '../agents/orchestrator.js';
import { Interactive } from '../utils/interactive.js';
import { DryRunReport } from '../utils/time-estimator.js';
import { AnalysisStage } from '../stages/analysis.js';
import { SchemaDesignStage } from '../stages/schema-design.js';
import { ImplementationStage } from '../stages/implementation.js';
import { MigrationStage } from '../stages/migration.js';

/**
 * Create the init command with all flags
 */
export const initCommand = new Command('init')
  .description('Initialize PKF in an existing project with AI assistance')
  .option('-i, --interactive', 'Run in interactive mode with approval gates', false)
  .option('--dry-run', 'Show what would happen without making changes')
  .option('--resume', 'Resume from previous run')
  .option('--step <step>', 'Start from specific step (analyzing, designing, implementing, migrating)')
  .option('--docs-path <path>', 'Path to documentation directory', 'docs')
  .option('--max-cost <amount>', 'Maximum cost in USD', parseFloat, 50)
  .option('--workers <count>', 'Number of parallel workers', parseInt, 3)
  .option('--api-key <key>', 'Anthropic API key (or use ANTHROPIC_API_KEY env)')
  .option('--api-tier <tier>', 'API tier: free, build1, build2, build3, build4', 'build1')
  .option('--output <dir>', 'Output directory for generated files', '.')
  .option('--backup-dir <dir>', 'Backup directory', '.pkf-backup')
  .option('--skip-backup', 'Skip creating backup')
  .option('--force', 'Force overwrite and ignore warnings')
  .option('-v, --verbose', 'Verbose output')
  .option('-s, --stream', 'Stream agent output in real-time', true)
  .option('--no-stream', 'Disable streaming output')
  .action(async (options: InitOptions) => {
    await runInit(options);
  });

/**
 * Run the init command
 * @param options - CLI options
 */
export async function runInit(options: InitOptions): Promise<void> {
  // Set verbose mode
  if (options.verbose) {
    logger.setVerbose(true);
  }

  logger.debug('Init options:', options);

  // Load configuration
  const configLoader = new ConfigLoader(options);
  const config = await configLoader.load();

  logger.debug('Loaded config:', config);

  // Acquire lock
  const lockManager = new InitLockManager(config.rootDir);

  try {
    await lockManager.acquire();
    logger.debug('Lock acquired');

    // Dry run mode - analyze and show estimate
    if (options.dryRun) {
      logger.info('Dry run mode - analyzing project...');
      const dryRunReport = new DryRunReport(config);
      const estimate = await dryRunReport.analyze(config.rootDir);
      dryRunReport.displayReport(estimate);
      logger.info('No changes will be made.');
      return;
    }

    const stateManager = new WorkflowStateManager(config.rootDir);

    // Create core components
    const client = new AnthropicClient(config.apiKey);
    const rateLimiter = new RateLimiter(config.apiTier);
    const costTracker = new CostTracker(config.maxCost);

    // Configure streaming if enabled (default: true)
    const streamingEnabled = options.stream !== false;
    const streamCallback = streamingEnabled
      ? logger.createStreamCallback('Agent Output')
      : undefined;

    const orchestrator = new AgentOrchestrator(client, rateLimiter, costTracker, {
      streaming: streamingEnabled,
      onStream: streamCallback,
    });
    const interactive = new Interactive(options.interactive ?? false);
    const requestQueue = new RequestQueue(rateLimiter, config.workers);

    // Load existing state or create new
    let state: WorkflowState;
    let blueprint: string | undefined;
    let schemasYaml: string | undefined;

    // Resume mode - load existing state
    if (options.resume) {
      logger.info('Resume mode - loading previous state...');
      const existingState = await stateManager.load();
      if (existingState) {
        state = existingState;
        logger.info(`Resuming from stage: ${state.currentStage}`);
        logger.info(`Previous cost: $${state.totalCost.toFixed(4)}`);
        logger.info(`Previous API calls: ${state.apiCallCount}`);

        // Restore intermediate results from state
        if (state.analysis?.blueprint) {
          blueprint = state.analysis.blueprint;
        }
        if (state.design?.schemasYaml) {
          schemasYaml = state.design.schemasYaml;
        }
      } else {
        logger.warn('No previous state found. Starting fresh.');
        state = stateManager.createInitialState();
      }
    } else {
      // Start from specified step or beginning
      state = stateManager.createInitialState();
      if (options.step) {
        state.currentStage = options.step as WorkflowStage;
      }
    }

    // Set max cost in state
    state.maxCost = config.maxCost;

    // Save initial state
    await stateManager.save(state);
    logger.debug('Initial state saved');

    // Show starting message
    logger.stage('Starting PKF initialization...');
    logger.info(`Output directory: ${config.outputDir}`);
    logger.info(`Docs directory: ${config.docsDir}`);
    logger.info(`Max cost: $${config.maxCost}`);
    logger.info(`Workers: ${config.workers}`);
    logger.info(`API tier: ${config.apiTier}`);
    logger.info(`Interactive mode: ${options.interactive ? 'enabled' : 'disabled'}`);

    // Interactive confirmation
    if (options.interactive) {
      const confirmed = await interactive.confirmStart(config);
      if (!confirmed) {
        logger.warn('Initialization cancelled by user.');
        return;
      }
    }

    // Determine starting stage
    const currentStage = state.currentStage;
    const stageOrder: WorkflowStage[] = [
      WS.NOT_STARTED,
      WS.ANALYZING,
      WS.DESIGNING,
      WS.IMPLEMENTING,
      WS.MIGRATING,
      WS.COMPLETED,
    ];
    const currentStageIndex = stageOrder.indexOf(currentStage);

    // =========================================================================
    // Stage 1: Analysis
    // =========================================================================
    if (currentStageIndex <= stageOrder.indexOf(WS.ANALYZING) && !state.analysis?.complete) {
      try {
        const analysisStage = new AnalysisStage(
          orchestrator,
          stateManager,
          config,
          interactive
        );

        const analysisResult = await analysisStage.execute();

        if (!analysisResult.success) {
          throw new Error(analysisResult.error || 'Analysis stage failed');
        }

        blueprint = analysisResult.blueprint;

        // Update state
        state.analysis = {
          complete: true,
          blueprint,
          discoveredDocs: analysisResult.discoveredDocs.map((d) => d.relativePath),
          summary: `Found ${analysisResult.discoveredDocs.length} documentation files`,
        };
        state.currentStage = WS.DESIGNING;
        state.totalCost = costTracker.getTotalCost();
        state.totalTokens = costTracker.getTotalTokens();
        await stateManager.save(state);

        logger.success('Stage 1 (Analysis) completed');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Analysis stage failed: ${errorMessage}`);
        state.currentStage = WS.FAILED;
        await stateManager.save(state);
        logger.info('State saved. You can resume with --resume flag.');
        throw error;
      }
    } else if (state.analysis?.blueprint) {
      blueprint = state.analysis.blueprint;
      logger.info('Skipping Stage 1 (Analysis) - already completed');
    }

    // Ensure blueprint is available
    if (!blueprint) {
      throw new Error('Blueprint is required for schema design stage');
    }

    // =========================================================================
    // Stage 2: Schema Design
    // =========================================================================
    if (currentStageIndex <= stageOrder.indexOf(WS.DESIGNING) && !state.design?.complete) {
      try {
        const schemaDesignStage = new SchemaDesignStage(
          orchestrator,
          stateManager,
          config,
          interactive
        );

        const designResult = await schemaDesignStage.execute(blueprint);

        if (!designResult.success) {
          throw new Error(designResult.error || 'Schema design stage failed');
        }

        schemasYaml = designResult.schemasYaml;

        // Update state
        state.design = {
          complete: true,
          schemasYaml,
          iterations: designResult.iterations,
          convergenceReason: designResult.convergenceReason,
        };
        state.currentStage = WS.IMPLEMENTING;
        state.totalCost = costTracker.getTotalCost();
        state.totalTokens = costTracker.getTotalTokens();
        await stateManager.save(state);

        logger.success('Stage 2 (Schema Design) completed');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Schema design stage failed: ${errorMessage}`);
        state.currentStage = WS.FAILED;
        await stateManager.save(state);
        logger.info('State saved. You can resume with --resume flag.');
        throw error;
      }
    } else if (state.design?.schemasYaml) {
      schemasYaml = state.design.schemasYaml;
      logger.info('Skipping Stage 2 (Schema Design) - already completed');
    }

    // Ensure schemasYaml is available
    if (!schemasYaml) {
      throw new Error('Schemas YAML is required for implementation stage');
    }

    // =========================================================================
    // Stage 3: Implementation
    // =========================================================================
    if (currentStageIndex <= stageOrder.indexOf(WS.IMPLEMENTING) && !state.implementation?.complete) {
      try {
        const implementationStage = new ImplementationStage(
          stateManager,
          config,
          interactive,
          {
            skipBackup: options.skipBackup,
            force: options.force,
          }
        );

        const implResult = await implementationStage.execute(schemasYaml);

        if (!implResult.success) {
          throw new Error(implResult.error || 'Implementation stage failed');
        }

        // Update state
        state.implementation = {
          complete: true,
          createdDirs: implResult.structure?.createdDirs,
          createdFiles: [
            implResult.configPath,
            implResult.schemasPath,
            ...(implResult.registers?.created || []),
          ].filter((f): f is string => f !== undefined),
          configContent: schemasYaml,
        };
        state.currentStage = WS.MIGRATING;
        await stateManager.save(state);

        logger.success('Stage 3 (Implementation) completed');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Implementation stage failed: ${errorMessage}`);
        state.currentStage = WS.FAILED;
        await stateManager.save(state);
        logger.info('State saved. You can resume with --resume flag.');
        throw error;
      }
    } else {
      logger.info('Skipping Stage 3 (Implementation) - already completed');
    }

    // =========================================================================
    // Stage 4: Migration
    // =========================================================================
    if (currentStageIndex <= stageOrder.indexOf(WS.MIGRATING) && !state.migration?.complete) {
      try {
        const migrationStage = new MigrationStage(
          orchestrator,
          stateManager,
          config,
          interactive,
          requestQueue
        );

        const migrationResult = await migrationStage.execute(blueprint, schemasYaml);

        if (!migrationResult.success && migrationResult.failedCount > 0) {
          logger.warn(`Migration completed with ${migrationResult.failedCount} failures`);
        }

        // Update state
        state.migration = {
          complete: true,
          completedCount: migrationResult.migratedCount,
          totalCount: migrationResult.migratedCount + migrationResult.failedCount,
        };
        state.currentStage = WS.COMPLETED;
        state.totalCost = costTracker.getTotalCost();
        state.totalTokens = costTracker.getTotalTokens();
        await stateManager.save(state);

        logger.success('Stage 4 (Migration) completed');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Migration stage failed: ${errorMessage}`);
        state.currentStage = WS.FAILED;
        await stateManager.save(state);
        logger.info('State saved. You can resume with --resume flag.');
        throw error;
      }
    } else {
      logger.info('Skipping Stage 4 (Migration) - already completed');
    }

    // =========================================================================
    // Completion
    // =========================================================================
    logger.stage('PKF initialization completed successfully!');
    logger.info('');
    logger.info('Summary:');
    logger.info(`  Total cost: $${costTracker.getTotalCost().toFixed(4)}`);
    logger.info(`  Total tokens: ${costTracker.getTotalTokens().toLocaleString()}`);
    if (state.analysis?.discoveredDocs) {
      logger.info(`  Documents analyzed: ${state.analysis.discoveredDocs.length}`);
    }
    if (state.migration?.completedCount !== undefined) {
      logger.info(`  Documents migrated: ${state.migration.completedCount}`);
    }
    logger.info('');

    // Clear workflow state on success
    await stateManager.clear();
    logger.debug('Workflow state cleared');

  } finally {
    // Always release lock
    await lockManager.release();
    logger.debug('Lock released');
  }
}
