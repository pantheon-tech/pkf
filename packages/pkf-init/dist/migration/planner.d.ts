/**
 * PKF Init Migration Planner
 * Analyzes blueprints and creates migration tasks for documents
 */
import type { LoadedConfig, MigrationTask } from '../types/index.js';
/**
 * Cost estimate for migration
 */
export interface CostEstimate {
    /** Total estimated tokens (input + output) */
    totalTokens: number;
    /** Total estimated cost in USD */
    totalCost: number;
    /** Estimated time in minutes */
    timeMinutes: number;
}
/**
 * Extended migration task with additional fields
 */
export interface ExtendedMigrationTask extends MigrationTask {
    /** Task priority (0 = highest) */
    priority: number;
    /** Estimated tokens for this task */
    estimatedTokens: number;
}
/**
 * Complete migration plan
 */
export interface MigrationPlan {
    /** List of migration tasks */
    tasks: ExtendedMigrationTask[];
    /** Total number of files to migrate */
    totalFiles: number;
    /** Estimated total cost in USD */
    estimatedCost: number;
    /** Estimated total time in minutes */
    estimatedTime: number;
    /** Count of documents by type */
    byType: Map<string, number>;
}
/**
 * Migration Planner - analyzes blueprints and creates migration tasks
 */
export declare class MigrationPlanner {
    private config;
    private schemasYaml;
    /**
     * Document type patterns for classification
     */
    private readonly docTypePatterns;
    /**
     * Priority mapping by document type
     */
    private readonly typePriorities;
    /**
     * Create a new MigrationPlanner
     * @param config - Loaded configuration
     * @param schemasYaml - Schemas YAML content for type resolution
     */
    constructor(config: LoadedConfig, schemasYaml: string);
    /**
     * Create a migration plan from a blueprint
     * @param blueprint - Blueprint YAML content
     * @returns Complete migration plan
     */
    createPlan(blueprint: string): Promise<MigrationPlan>;
    /**
     * Extract documents from various blueprint structures
     */
    private extractDocuments;
    /**
     * Determine document type based on file path and schemas
     * @param filePath - Path to the file
     * @param schemas - Parsed schemas object
     * @returns Document type string
     */
    private determineDocumentType;
    /**
     * Generate target path based on source path and document type
     * @param sourcePath - Original file path
     * @param docType - Determined document type
     * @returns Target path for migration
     */
    private generateTargetPath;
    /**
     * Calculate priority for a document
     * @param docType - Document type
     * @param sourcePath - Source file path
     * @returns Priority number (0 = highest)
     */
    private calculatePriority;
    /**
     * Estimate tokens for a single file
     * @param filePath - Path to the file
     * @returns Estimated token count
     */
    private estimateFileTokens;
    /**
     * Estimate costs for all migration tasks
     * @param tasks - List of migration tasks
     * @returns Cost estimate
     */
    private estimateCosts;
}
export default MigrationPlanner;
//# sourceMappingURL=planner.d.ts.map