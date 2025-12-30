/**
 * PKF Init
 * AI-assisted initialization for PKF in existing projects
 */

// Types
export * from './types/index.js';

// State management
export { WorkflowStateManager } from './state/workflow-state.js';
export { InitLockManager } from './state/lock-manager.js';

// Configuration
export { ConfigLoader } from './config/loader.js';

// Utilities
export { CostTracker, BudgetExceededError } from './utils/cost-tracker.js';
export { TokenEstimator } from './utils/token-estimator.js';
export { TimeEstimator, DryRunReport } from './utils/time-estimator.js';
export { Interactive } from './utils/interactive.js';
export * as logger from './utils/logger.js';
export {
  extractBlueprintSummary,
  displayBlueprintSummary,
  saveBlueprintToFile,
  type BlueprintSummary,
} from './utils/blueprint-summary.js';

// API
export { AnthropicClient } from './api/anthropic-client.js';
export type { CreateMessageParams, MessageResult, StreamEvent } from './api/anthropic-client.js';
export { RateLimiter } from './api/rate-limiter.js';
export { RequestQueue, QueueCancelledError } from './api/request-queue.js';

// Agents
export { AgentOrchestrator } from './agents/orchestrator.js';
export { detectConvergence } from './agents/convergence.js';
export { loadAgentConfig, getDefaultAgentsDir } from './agents/agent-loader.js';

// Generators
export { StructureGenerator } from './generators/structure.js';
export type { GeneratedStructure } from './generators/structure.js';
export { ConfigGenerator } from './generators/config.js';
export { RegisterInitializer } from './generators/registers.js';
export type { InitializedRegisters } from './generators/registers.js';

// Workflow Stages
export { AnalysisStage } from './stages/analysis.js';
export type { AnalysisResult, DiscoveredDoc } from './stages/analysis.js';
export { SchemaDesignStage } from './stages/schema-design.js';
export type { SchemaDesignResult } from './stages/schema-design.js';
export { ImplementationStage } from './stages/implementation.js';
export type { ImplementationResult, StructurePreview } from './stages/implementation.js';
export { MigrationStage } from './stages/migration.js';
export type { MigrationStageResult } from './stages/migration.js';

// Migration
export { MigrationPlanner } from './migration/planner.js';
export type { MigrationPlan, CostEstimate } from './migration/planner.js';
export { MigrationWorker } from './migration/worker.js';
export type { MigrationResult } from './migration/worker.js';
export { ParallelMigrationExecutor } from './migration/executor.js';
export type { ExecutorOptions, ExecutionResult } from './migration/executor.js';
export { PostMigrationValidator } from './migration/validation.js';
export type { ValidationSummary, FileValidationError } from './migration/validation.js';
export { RollbackManager } from './migration/rollback.js';
export type { RollbackResult } from './migration/rollback.js';

// Commands
export { initCommand, runInit } from './commands/init.js';
