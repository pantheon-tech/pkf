/**
 * PKF Init Types
 * Core type definitions for the AI-assisted initialization system
 */
/**
 * Workflow stages
 */
export declare enum WorkflowStage {
    NOT_STARTED = "not_started",
    ANALYZING = "analyzing",
    DESIGNING = "designing",
    IMPLEMENTING = "implementing",
    MIGRATING = "migrating",
    COMPLETED = "completed",
    FAILED = "failed"
}
/**
 * Checkpoint data for workflow state
 */
export interface Checkpoint {
    /** Stage when checkpoint was created */
    stage: WorkflowStage;
    /** Timestamp of checkpoint */
    timestamp: string;
    /** Description of checkpoint */
    description: string;
    /** Data at checkpoint */
    data?: Record<string, unknown>;
}
/**
 * Analysis stage state
 */
export interface AnalysisState {
    /** Whether analysis is complete */
    complete: boolean;
    /** Generated blueprint YAML */
    blueprint?: string;
    /** List of discovered documentation files */
    discoveredDocs?: string[];
    /** Analysis summary */
    summary?: string;
}
/**
 * Schema design stage state
 */
export interface DesignState {
    /** Whether design is complete */
    complete: boolean;
    /** Generated schemas.yaml content */
    schemasYaml?: string;
    /** Number of conversation iterations */
    iterations?: number;
    /** Convergence reason if converged */
    convergenceReason?: string;
}
/**
 * Implementation stage state
 */
export interface ImplementationState {
    /** Whether implementation is complete */
    complete: boolean;
    /** Created directories */
    createdDirs?: string[];
    /** Created files */
    createdFiles?: string[];
    /** Generated config content */
    configContent?: string;
}
/**
 * Migration task
 */
export interface MigrationTask {
    /** Source file path */
    sourcePath: string;
    /** Target file path */
    targetPath: string;
    /** Document type */
    docType: string;
    /** Task status */
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    /** Error message if failed */
    error?: string;
}
/**
 * Migration stage state
 */
export interface MigrationState {
    /** Whether migration is complete */
    complete: boolean;
    /** Migration tasks */
    tasks?: MigrationTask[];
    /** Number of completed tasks */
    completedCount?: number;
    /** Total number of tasks */
    totalCount?: number;
}
/**
 * Full workflow state persisted to .pkf-init-state.json
 */
export interface WorkflowState {
    /** State version for compatibility */
    version: string;
    /** When workflow started */
    startedAt: string;
    /** When state was last updated */
    updatedAt: string;
    /** Current workflow stage */
    currentStage: WorkflowStage;
    /** List of checkpoints */
    checkpoints: Checkpoint[];
    /** Stage-specific states */
    analysis?: AnalysisState;
    design?: DesignState;
    implementation?: ImplementationState;
    migration?: MigrationState;
    /** API call tracking */
    apiCallCount: number;
    /** Total cost in USD */
    totalCost: number;
    /** Maximum cost limit in USD */
    maxCost?: number;
    /** Total tokens used */
    totalTokens: number;
}
/**
 * Lock file data
 */
export interface LockData {
    /** Process ID holding the lock */
    pid: number;
    /** When lock was acquired */
    timestamp: number;
    /** Version of pkf-init */
    version: string;
}
/**
 * API tier for rate limiting
 */
export type ApiTier = 'free' | 'build1' | 'build2' | 'build3' | 'build4';
/**
 * Cost per model per million tokens
 */
export interface ModelPricing {
    /** Input cost per million tokens */
    inputPerMillion: number;
    /** Output cost per million tokens */
    outputPerMillion: number;
}
/**
 * Supported Claude models
 */
export type ClaudeModel = 'claude-sonnet-4-20250514' | 'claude-haiku-3-5-20241022' | 'claude-opus-4-20250514';
/**
 * Agent configuration
 */
export interface AgentConfig {
    /** Agent name */
    name: string;
    /** System instructions from agent markdown file */
    instructions: string;
    /** Model to use */
    model: ClaudeModel;
    /** Temperature for generation */
    temperature: number;
    /** Maximum output tokens */
    maxTokens: number;
}
/**
 * Agent message in conversation
 */
export interface AgentMessage {
    /** Message role */
    role: 'user' | 'assistant';
    /** Message content */
    content: string;
}
/**
 * Result from agent execution
 */
export interface AgentResult {
    /** Whether execution succeeded */
    success: boolean;
    /** Agent output */
    output: string;
    /** Cost in USD */
    cost: number;
    /** Tokens used (input + output) */
    tokensUsed: number;
    /** Input tokens */
    inputTokens?: number;
    /** Output tokens */
    outputTokens?: number;
    /** Error message if failed */
    error?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Convergence detection result
 */
export interface ConvergenceResult {
    /** Whether convergence was detected */
    converged: boolean;
    /** Reason for convergence/non-convergence */
    reason?: string;
    /** Explicit convergence signal if found */
    signal?: string;
}
/**
 * CLI options for init command
 */
export interface InitOptions {
    /** Run in interactive mode */
    interactive?: boolean;
    /** Dry run - show what would happen */
    dryRun?: boolean;
    /** Resume from previous run */
    resume?: boolean;
    /** Start from specific step */
    step?: string;
    /** Path to docs directory */
    docsPath?: string;
    /** Maximum cost in USD */
    maxCost?: number;
    /** Number of parallel workers */
    workers?: number;
    /** Anthropic API key */
    apiKey?: string;
    /** API tier for rate limiting */
    apiTier?: ApiTier;
    /** Output directory for generated files */
    output?: string;
    /** Backup directory */
    backupDir?: string;
    /** Skip backup creation */
    skipBackup?: boolean;
    /** Force overwrite existing files */
    force?: boolean;
    /** Verbose output */
    verbose?: boolean;
}
/**
 * Configuration loaded from environment and files
 */
export interface LoadedConfig {
    /** Anthropic API key */
    apiKey: string;
    /** API tier */
    apiTier: ApiTier;
    /** Root directory */
    rootDir: string;
    /** Docs directory */
    docsDir: string;
    /** Output directory */
    outputDir: string;
    /** Backup directory */
    backupDir: string;
    /** Maximum cost */
    maxCost: number;
    /** Number of workers */
    workers: number;
    /** Whether PKF is already initialized */
    pkfInitialized: boolean;
}
/**
 * Dry run estimate result
 */
export interface DryRunEstimate {
    /** Estimated total cost in USD */
    estimatedCost: number;
    /** Cost breakdown by stage */
    costBreakdown: {
        analysis: number;
        design: number;
        implementation: number;
        migration: number;
    };
    /** Estimated total time in minutes */
    estimatedTimeMinutes: number;
    /** Time breakdown by stage */
    timeBreakdown: {
        analysis: number;
        design: number;
        implementation: number;
        migration: number;
    };
    /** Estimated token usage */
    estimatedTokens: number;
    /** Number of documents to migrate */
    documentsToMigrate: number;
    /** Discovered document types */
    documentTypes: string[];
}
/**
 * Progress callback for reporting
 */
export type ProgressCallback = (stage: WorkflowStage, message: string, progress?: {
    current: number;
    total: number;
}) => void;
//# sourceMappingURL=index.d.ts.map