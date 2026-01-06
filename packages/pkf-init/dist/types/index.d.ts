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
 * Known Claude models (for type safety with our hardcoded list)
 */
export type KnownClaudeModel = 'claude-sonnet-4-5-20250929' | 'claude-haiku-4-5-20251001' | 'claude-opus-4-5-20251101' | 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514';
/**
 * Claude model type - any valid model ID string
 * Can be a known model or any model ID from the API
 */
export type ClaudeModel = KnownClaudeModel | (string & {});
/**
 * Model display information for UI
 */
export interface ModelInfo {
    id: ClaudeModel;
    name: string;
    description: string;
    inputCostPerMillion: number;
    outputCostPerMillion: number;
    recommended?: boolean;
}
/**
 * Available models with metadata
 */
export declare const AVAILABLE_MODELS: ModelInfo[];
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
    /** Enable prompt caching for batch operations */
    enableCaching?: boolean;
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
    /** Tokens used to create cache (first call) */
    cacheCreationTokens?: number;
    /** Tokens read from cache (subsequent calls) */
    cacheReadTokens?: number;
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
    /** Stream agent output in real-time */
    stream?: boolean;
    /** Claude model to use */
    model?: ClaudeModel;
    /** List available models and exit */
    listModels?: boolean;
    /** Debug mode: disable UI, save raw outputs */
    debug?: boolean;
    /** Custom template directory */
    customTemplateDir?: string;
    /** PKF configuration file path */
    config?: string;
}
/**
 * Configuration loaded from environment and files
 */
export interface LoadedConfig {
    /** Anthropic API key */
    apiKey: string;
    /** Whether to use OAuth authentication (from CLAUDE_CODE_OAUTH_TOKEN) */
    useOAuth: boolean;
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
    /** Custom template directory (optional) */
    customTemplateDir?: string;
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
/**
 * Blueprint document entry with target path
 */
export interface DocumentWithTarget {
    /** Source path (current location) */
    path: string;
    /** Target path in PKF structure */
    targetPath: string;
    /** Document type */
    type: string;
    /** Document title */
    title?: string;
    /** Whether file has existing frontmatter */
    hasFrontmatter: boolean;
    /** Document complexity */
    complexity: 'simple' | 'medium' | 'complex';
    /** Migration effort required */
    migrationEffort: 'low' | 'medium' | 'high';
    /** Confidence of classification */
    inspectionConfidence?: number;
    /** Key sections identified */
    sections?: string[];
    /** Analyst notes */
    notes?: string;
}
/**
 * Cross-reference link in a document
 */
export interface CrossReference {
    /** File containing the link */
    sourceFile: string;
    /** File being linked to */
    targetFile: string;
    /** Link text displayed */
    linkText: string;
    /** Original path in link */
    originalPath: string;
    /** Updated path after reorganization */
    newPath?: string;
    /** Line number where link appears */
    lineNumber: number;
    /** Column where link starts */
    columnStart?: number;
    /** Column where link ends */
    columnEnd?: number;
}
/**
 * Type of migration operation
 */
export type MigrationOperationType = 'copy' | 'move' | 'delete' | 'update_reference' | 'add_frontmatter' | 'write';
/**
 * Single migration operation for manifest
 */
export interface MigrationOperation {
    /** Type of operation */
    type: MigrationOperationType;
    /** Source file path */
    sourcePath: string;
    /** Target file path (for copy/move) */
    targetPath?: string;
    /** Original content (for rollback of reference updates) */
    originalContent?: string;
    /** New content (for reference updates) */
    newContent?: string;
    /** Operation status */
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
    /** Error message if failed */
    error?: string;
    /** Timestamp when operation was executed */
    executedAt?: string;
    /** Alias for executedAt */
    timestamp?: string;
}
/**
 * Migration manifest for rollback support
 */
export interface MigrationManifest {
    /** Manifest version */
    version: string;
    /** When migration started */
    timestamp: string;
    /** Project root directory */
    rootDir: string;
    /** Backup directory */
    backupDir?: string;
    /** List of operations in execution order */
    operations: MigrationOperation[];
    /** Overall status */
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
    /** Summary statistics */
    summary?: {
        filesMoved: number;
        filesUpdated: number;
        referencesUpdated: number;
        errors: number;
    };
}
/**
 * Extended migration task with reorganization details
 */
export interface ReorganizationTask extends MigrationTask {
    /** Whether file needs to be moved */
    needsMove: boolean;
    /** Whether file needs frontmatter added */
    needsFrontmatter: boolean;
    /** Whether file needs to be created (doesn't exist yet) */
    needsCreation: boolean;
    /** Whether references in file need updating */
    needsReferenceUpdate: boolean;
    /** Links in this file pointing to other files */
    outgoingReferences: CrossReference[];
    /** Other files linking to this file */
    incomingReferences: CrossReference[];
    /** Rollback data for this task */
    rollbackData?: MigrationOperation[];
    /** Task priority (lower = higher priority) */
    priority?: number;
    /** Estimated tokens for AI operations */
    estimatedTokens?: number;
}
/**
 * Reference map for tracking all cross-references
 */
export interface ReferenceMap {
    /** Map of file path to files it references */
    outgoing: Map<string, CrossReference[]>;
    /** Map of file path to files that reference it */
    incoming: Map<string, CrossReference[]>;
    /** All unique file paths involved */
    allFiles: Set<string>;
}
/**
 * Conflict detected during pre-migration validation
 */
export interface MigrationConflict {
    /** Type of conflict */
    type?: 'target_exists' | 'circular_move' | 'missing_source' | 'permission_denied';
    /** Source path */
    sourcePath: string;
    /** Target path */
    targetPath: string;
    /** Description of the conflict (alias for message) */
    reason: string;
    /** Description of the conflict */
    message?: string;
    /** Suggested resolution */
    suggestion?: string;
}
/**
 * Result of pre-migration validation
 */
export interface PreMigrationValidation {
    /** Whether validation passed */
    valid: boolean;
    /** List of conflicts found */
    conflicts: MigrationConflict[];
    /** Files that are ready to migrate */
    readyFiles: string[];
    /** Warnings (non-blocking issues) */
    warnings: string[];
}
/**
 * Result of move operation
 */
export interface MoveResult {
    /** Whether move succeeded */
    success: boolean;
    /** Operation details */
    operation: MigrationOperation;
    /** Error message if failed */
    error?: string;
}
/**
 * Result of reference update operation
 */
export interface ReferenceUpdateResult {
    /** File that was updated */
    filePath: string;
    /** Number of references updated */
    updatedCount: number;
    /** References that were updated */
    updates: Array<{
        original: string;
        updated: string;
        lineNumber: number;
    }>;
    /** Whether update succeeded */
    success: boolean;
    /** Error message if failed */
    error?: string;
}
/**
 * Broken link found during validation
 */
export interface BrokenLink {
    /** File containing the broken link */
    sourceFile: string;
    /** The broken link path */
    linkPath: string;
    /** Line number */
    lineNumber: number;
    /** Suggested fix if available */
    suggestion?: string;
}
/**
 * Result of post-migration validation
 */
export interface PostMigrationValidation {
    /** Whether all validations passed */
    valid: boolean;
    /** Files that are now valid */
    validFiles: number;
    /** Files with issues */
    invalidFiles: number;
    /** Total files checked */
    totalFiles: number;
    /** Broken links found */
    brokenLinks: BrokenLink[];
    /** Files missing frontmatter */
    missingFrontmatter: string[];
    /** Other errors */
    errors: Array<{
        filePath: string;
        errors: string[];
    }>;
}
/**
 * Dry run report for reorganization
 */
export interface ReorganizationDryRunReport {
    /** Files that would be moved */
    filesToMove: Array<{
        from: string;
        to: string;
    }>;
    /** Files that would stay in place */
    filesToKeep: string[];
    /** Directories that would be created */
    directoriesToCreate: string[];
    /** Directories that would become empty */
    directoriesToRemove: string[];
    /** References that would be updated */
    referencesToUpdate: Array<{
        file: string;
        count: number;
    }>;
    /** Conflicts that would block migration */
    conflicts: MigrationConflict[];
    /** Estimated API cost */
    estimatedCost: number;
    /** Estimated time in minutes */
    estimatedTimeMinutes: number;
}
//# sourceMappingURL=index.d.ts.map