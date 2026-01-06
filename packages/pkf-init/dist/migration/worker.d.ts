/**
 * PKF Init Migration Worker
 * Migrates individual documents by adding PKF frontmatter and handling file moves
 */
import type { AgentOrchestrator } from '../agents/orchestrator.js';
import type { MigrationTask, MigrationOperation } from '../types/index.js';
/**
 * Extended migration task with reorganization flags
 */
export interface ExtendedMigrationTask extends MigrationTask {
    /** Whether file needs to be moved */
    needsMove?: boolean;
    /** Whether file needs frontmatter */
    needsFrontmatter?: boolean;
    /** Whether file needs to be created (doesn't exist yet) */
    needsCreation?: boolean;
    /** Title for the document (used when creating new files) */
    title?: string;
}
/**
 * Result from a migration operation
 */
export interface MigrationResult {
    /** The migration task that was executed */
    task: MigrationTask;
    /** Whether the migration succeeded */
    success: boolean;
    /** Output path where migrated file was written */
    outputPath?: string;
    /** Generated frontmatter content */
    frontmatter?: string;
    /** Tokens used for this migration */
    tokensUsed?: number;
    /** Cost in USD for this migration */
    cost?: number;
    /** Error message if migration failed */
    error?: string;
    /** Whether file was moved */
    moved?: boolean;
    /** Number of references updated */
    referencesUpdated?: number;
    /** Operations performed (for rollback) */
    operations?: MigrationOperation[];
}
/**
 * Migration Worker
 * Handles the migration of individual documents by adding PKF frontmatter
 * and reorganizing files to PKF-compliant structure
 */
export declare class MigrationWorker {
    private orchestrator;
    private schemasYaml;
    private rootDir;
    private parsedSchemas;
    private referenceUpdater;
    private pathMapping;
    private templateManager;
    /**
     * Create a new MigrationWorker
     *
     * @param orchestrator - Agent orchestrator for AI operations
     * @param schemasYaml - YAML string containing schema definitions
     * @param rootDir - Root directory of the project
     * @param customTemplateDir - Optional custom template directory
     */
    constructor(orchestrator: AgentOrchestrator, schemasYaml: string, rootDir: string, customTemplateDir?: string);
    /**
     * Set the path mapping for cross-reference updates
     * Maps old paths to new paths for all files being migrated
     *
     * @param mapping - Map of source paths to target paths
     */
    setPathMapping(mapping: Map<string, string>): void;
    /**
     * Migrate a document by adding PKF frontmatter and optionally moving it
     *
     * @param task - Migration task to execute (can be ExtendedMigrationTask)
     * @returns MigrationResult with outcome and statistics
     */
    migrate(task: MigrationTask | ExtendedMigrationTask): Promise<MigrationResult>;
    /**
     * Migrate a document without using AI (frontmatter-only update or move-only)
     * Useful for files that already have frontmatter or don't need it
     *
     * @param task - Migration task to execute
     * @returns MigrationResult with outcome
     */
    migrateWithoutAI(task: MigrationTask | ExtendedMigrationTask): Promise<MigrationResult>;
    /**
     * Read source file content
     *
     * @param filePath - Path to the source file
     * @returns File content as string
     */
    private readSourceFile;
    /**
     * Get schema definition for a document type
     *
     * @param docType - Document type to get schema for
     * @returns Schema object or null if not found
     */
    private getSchemaForType;
    /**
     * Build the migration prompt for the agent
     *
     * @param content - Original document content
     * @param docType - Document type
     * @param schema - Schema definition for the document type
     * @returns Formatted prompt string
     */
    private buildMigrationPrompt;
    /**
     * Extract YAML frontmatter from agent response
     *
     * @param response - Agent response text
     * @returns Extracted frontmatter string or null if not found
     */
    private extractFrontmatter;
    /**
     * Combine frontmatter with original content
     *
     * @param frontmatter - YAML frontmatter to add
     * @param originalContent - Original document content
     * @returns Combined content
     */
    private combineContent;
    /**
     * Create a new file that doesn't exist yet
     * Generates appropriate content with frontmatter based on document type
     *
     * @param task - Migration task for the new file
     * @returns MigrationResult with outcome
     */
    private createNewFile;
    /**
     * Generate a human-readable title from a file path
     *
     * @param filePath - Path to the file
     * @returns Generated title
     */
    private generateTitle;
    /**
     * Generate frontmatter for a new file
     *
     * @param docType - Document type
     * @param title - Document title
     * @returns YAML frontmatter string
     */
    private generateFrontmatter;
    /**
     * Generate initial content for a new file
     *
     * @param docType - Document type
     * @param title - Document title
     * @returns Initial markdown content
     */
    private generateInitialContent;
    /**
     * Write migrated content to target file
     *
     * @param filePath - Target file path
     * @param content - Content to write
     */
    private writeTargetFile;
}
export default MigrationWorker;
//# sourceMappingURL=worker.d.ts.map