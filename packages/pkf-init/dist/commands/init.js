/**
 * PKF Init Command
 * Main initialization command with all CLI flags
 */
import { Command } from 'commander';
import { AVAILABLE_MODELS, WorkflowStage as WS } from '../types/index.js';
import { fetchAvailableModels, formatModelForDisplay } from '../api/model-fetcher.js';
import logger from '../utils/logger.js';
import { WorkflowStateManager } from '../state/workflow-state.js';
import { InitLockManager } from '../state/lock-manager.js';
import { ConfigLoader } from '../config/loader.js';
import { loadPKFConfig } from '../config/pkf-config.js';
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
    .option('--debug', 'Debug mode: disable UI, save raw outputs')
    .option('-m, --model <model>', 'Claude model to use (see --list-models)')
    .option('--list-models', 'List available Claude models and exit')
    .option('--custom-template-dir <path>', 'Custom template directory for document generation')
    .option('-c, --config <path>', 'Path to PKF configuration file (YAML)')
    .action(async (options) => {
    // Handle --list-models
    if (options.listModels) {
        await listModels(options.apiKey);
        return;
    }
    await runInit(options);
});
/**
 * List available models from API or fallback to hardcoded list
 * @param apiKey - Optional API key (uses env if not provided)
 */
async function listModels(apiKey) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN;
    console.log('\nAvailable Claude Models:');
    console.log('─'.repeat(70));
    if (key) {
        // Try to fetch from API
        console.log('Fetching models from Anthropic API...\n');
        const apiModels = await fetchAvailableModels(key);
        if (apiModels && apiModels.length > 0) {
            for (const model of apiModels) {
                const formatted = formatModelForDisplay(model);
                const rec = formatted.recommended ? ' (Recommended)' : '';
                console.log(`  ${formatted.name}${rec}`);
                console.log(`    ${formatted.description}`);
                console.log(`    Cost: $${formatted.inputCost}/$${formatted.outputCost} per 1M tokens (in/out)`);
                console.log(`    ID:   ${formatted.id}`);
                console.log(`    Released: ${new Date(formatted.createdAt).toLocaleDateString()}`);
                console.log('');
            }
            console.log(`Total: ${apiModels.length} models available`);
            console.log('\nUse --model <ID> to select a model.\n');
            return;
        }
        console.log('Could not fetch from API, showing known models:\n');
    }
    else {
        console.log('(Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN to fetch live model list)\n');
    }
    // Fallback to hardcoded list
    for (const model of AVAILABLE_MODELS) {
        const rec = model.recommended ? ' (Recommended)' : '';
        console.log(`  ${model.name}${rec}`);
        console.log(`    ${model.description}`);
        console.log(`    Cost: $${model.inputCostPerMillion}/$${model.outputCostPerMillion} per 1M tokens (in/out)`);
        console.log(`    ID:   ${model.id}`);
        console.log('');
    }
    console.log('\nUse --model <ID> to select a model.\n');
}
/**
 * Run the init command
 * @param options - CLI options
 */
export async function runInit(options) {
    // Set verbose mode
    if (options.verbose) {
        logger.setVerbose(true);
    }
    logger.debug('Init options:', options);
    // Load PKF configuration (with configurable constants)
    const pkfConfig = await loadPKFConfig(options.config);
    logger.debug('Loaded PKF config:', pkfConfig);
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
            // Pass API key for accurate token counting (uses Token Count API)
            const dryRunReport = new DryRunReport(config, config.apiKey);
            const estimate = await dryRunReport.analyze(config.rootDir);
            dryRunReport.displayReport(estimate);
            logger.info('No changes will be made.');
            return;
        }
        const stateManager = new WorkflowStateManager(config.rootDir);
        // Create core components with PKF config
        const client = new AnthropicClient(config.apiKey, {
            useOAuth: config.useOAuth,
            maxRetries: pkfConfig.api.maxRetries,
            retryDelayMs: pkfConfig.api.retryDelayMs,
            timeout: pkfConfig.api.timeout,
        });
        const rateLimiter = new RateLimiter(config.apiTier);
        const costTracker = new CostTracker(config.maxCost);
        // Configure streaming if enabled (default: true)
        // Debug mode disables terminal UI output but keeps API streaming (required for long calls)
        const debugMode = options.debug === true;
        const streamingEnabled = options.stream !== false; // Always keep streaming for API
        const streamCallback = (!debugMode && streamingEnabled)
            ? logger.createStreamCallback('Agent Output')
            : undefined; // In debug mode, no terminal output but API still streams
        if (debugMode) {
            logger.info('Debug mode enabled - terminal UI disabled, API streaming enabled');
        }
        const orchestrator = new AgentOrchestrator(client, rateLimiter, costTracker, {
            streaming: streamingEnabled,
            onStream: streamCallback,
            pkfConfig,
        });
        const interactive = new Interactive(options.interactive ?? false);
        const requestQueue = new RequestQueue(rateLimiter, config.workers);
        // Load existing state or create new
        let state;
        let blueprint;
        let schemasYaml;
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
                    logger.info(`Restored blueprint from checkpoint`);
                }
                if (state.design?.schemasYaml) {
                    schemasYaml = state.design.schemasYaml;
                    const status = state.design.complete ? 'completed' : 'in progress';
                    logger.info(`Restored schemas from checkpoint (${status})`);
                }
            }
            else {
                logger.warn('No previous state found. Starting fresh.');
                state = stateManager.createInitialState();
            }
        }
        else {
            // Start from specified step or beginning
            state = stateManager.createInitialState();
            if (options.step) {
                state.currentStage = options.step;
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
        const stageOrder = [
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
                const analysisStage = new AnalysisStage(orchestrator, stateManager, config, interactive, { debug: debugMode, pkfConfig });
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
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error(`Analysis stage failed: ${errorMessage}`);
                state.currentStage = WS.FAILED;
                await stateManager.save(state);
                logger.info('State saved. You can resume with --resume flag.');
                throw error;
            }
        }
        else if (state.analysis?.blueprint) {
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
        // Run schema design if not complete OR if we have partial progress
        const shouldRunSchemaDesign = currentStageIndex <= stageOrder.indexOf(WS.DESIGNING) &&
            (!state.design?.complete || (state.design?.inProgress && !state.design?.complete));
        if (shouldRunSchemaDesign) {
            try {
                const schemaDesignStage = new SchemaDesignStage(orchestrator, stateManager, config, interactive);
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
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error(`Schema design stage failed: ${errorMessage}`);
                state.currentStage = WS.FAILED;
                state.totalCost = costTracker.getTotalCost();
                state.totalTokens = costTracker.getTotalTokens();
                await stateManager.save(state);
                logger.info('State saved. You can resume with --resume flag.');
                logger.info(`Total cost so far: $${state.totalCost.toFixed(4)}`);
                logger.info(`Total tokens: ${state.totalTokens.toLocaleString()}`);
                throw error;
            }
        }
        else if (state.design?.schemasYaml) {
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
                const implementationStage = new ImplementationStage(stateManager, config, interactive, {
                    skipBackup: options.skipBackup,
                    force: options.force,
                });
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
                    ].filter((f) => f !== undefined),
                    configContent: schemasYaml,
                };
                state.currentStage = WS.MIGRATING;
                await stateManager.save(state);
                logger.success('Stage 3 (Implementation) completed');
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error(`Implementation stage failed: ${errorMessage}`);
                state.currentStage = WS.FAILED;
                await stateManager.save(state);
                logger.info('State saved. You can resume with --resume flag.');
                throw error;
            }
        }
        else {
            logger.info('Skipping Stage 3 (Implementation) - already completed');
        }
        // =========================================================================
        // Stage 4: Migration
        // =========================================================================
        if (currentStageIndex <= stageOrder.indexOf(WS.MIGRATING) && !state.migration?.complete) {
            try {
                const migrationStage = new MigrationStage(orchestrator, stateManager, config, interactive, requestQueue, pkfConfig);
                const migrationResult = await migrationStage.execute(blueprint, schemasYaml);
                // Check for migration failures
                if (!migrationResult.success) {
                    if (migrationResult.errors && migrationResult.errors.length > 0) {
                        // Pre-validation or other errors occurred
                        throw new Error(`Migration failed: ${migrationResult.errors.join('; ')}`);
                    }
                    else if (migrationResult.failedCount > 0) {
                        logger.warn(`Migration completed with ${migrationResult.failedCount} failures`);
                    }
                }
                // Update state
                state.migration = {
                    complete: migrationResult.success,
                    completedCount: migrationResult.migratedCount,
                    totalCount: migrationResult.migratedCount + migrationResult.failedCount,
                };
                state.currentStage = migrationResult.success ? WS.COMPLETED : WS.FAILED;
                state.totalCost = costTracker.getTotalCost();
                state.totalTokens = costTracker.getTotalTokens();
                await stateManager.save(state);
                if (migrationResult.success) {
                    logger.success('Stage 4 (Migration) completed');
                }
                else {
                    logger.warn('Stage 4 (Migration) completed with issues');
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error(`Migration stage failed: ${errorMessage}`);
                state.currentStage = WS.FAILED;
                await stateManager.save(state);
                logger.info('State saved. You can resume with --resume flag.');
                throw error;
            }
        }
        else {
            logger.info('Skipping Stage 4 (Migration) - already completed');
        }
        // =========================================================================
        // Completion
        // =========================================================================
        logger.stage('PKF initialization completed successfully!');
        logger.info('');
        logger.info('Summary:');
        logger.info(`  Total cost: $${costTracker.getTotalCost().toFixed(4)}`);
        logger.info(`  Input tokens: ${costTracker.getTotalInputTokens().toLocaleString()}`);
        logger.info(`  Output tokens: ${costTracker.getTotalOutputTokens().toLocaleString()}`);
        const cacheTokens = costTracker.getCacheTokens();
        if (cacheTokens.cacheReadTokens > 0 || cacheTokens.cacheCreationTokens > 0) {
            logger.info(`  Cache read: ${cacheTokens.cacheReadTokens.toLocaleString()} tokens`);
            logger.info(`  Cache written: ${cacheTokens.cacheCreationTokens.toLocaleString()} tokens`);
            const savings = costTracker.getEstimatedCacheSavings();
            if (savings > 0) {
                logger.info(`  Cache savings: $${savings.toFixed(4)}`);
            }
        }
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
    }
    finally {
        // Always release lock
        await lockManager.release();
        logger.debug('Lock released');
    }
}
//# sourceMappingURL=init.js.map