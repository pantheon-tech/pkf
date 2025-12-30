/**
 * PKF Init Migration Worker
 * Migrates individual documents by adding PKF frontmatter
 */
import type { AgentOrchestrator } from '../agents/orchestrator.js';
import type { MigrationTask } from '../types/index.js';
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
}
/**
 * Migration Worker
 * Handles the migration of individual documents by adding PKF frontmatter
 */
export declare class MigrationWorker {
    private orchestrator;
    private schemasYaml;
    private rootDir;
    private parsedSchemas;
    /**
     * Create a new MigrationWorker
     *
     * @param orchestrator - Agent orchestrator for AI operations
     * @param schemasYaml - YAML string containing schema definitions
     * @param rootDir - Root directory of the project
     */
    constructor(orchestrator: AgentOrchestrator, schemasYaml: string, rootDir: string);
    /**
     * Migrate a document by adding PKF frontmatter
     *
     * @param task - Migration task to execute
     * @returns MigrationResult with outcome and statistics
     */
    migrate(task: MigrationTask): Promise<MigrationResult>;
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
     * Write migrated content to target file
     *
     * @param filePath - Target file path
     * @param content - Content to write
     */
    private writeTargetFile;
}
export default MigrationWorker;
//# sourceMappingURL=worker.d.ts.map