/**
 * PKF Init Migration Planner
 * Analyzes blueprints and creates migration tasks for documents
 */
import type { LoadedConfig, MigrationTask } from '../types/index.js';
import type { PKFConfig } from '../config/pkf-config.js';
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
    /** Whether file needs to be moved (source !== target) */
    needsMove: boolean;
    /** Whether file needs frontmatter added */
    needsFrontmatter: boolean;
    /** Whether file needs to be created (doesn't exist yet) */
    needsCreation: boolean;
    /** Title for the document (used when creating new files) */
    title?: string;
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
    private pkfConfig;
    /**
     * Priority mapping by document type
     * Lower number = higher priority
     */
    private readonly typePriorities;
    /**
     * Create a new MigrationPlanner
     * @param config - Loaded configuration
     * @param schemasYaml - Schemas YAML content for type resolution
     * @param pkfConfig - Optional PKF configuration
     */
    constructor(config: LoadedConfig, schemasYaml: string, pkfConfig?: PKFConfig);
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
     * Calculate priority for a document
     * @param docType - Document type (already normalized)
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
     * Check if a file exists
     * @param filePath - Path to the file
     * @returns Whether the file exists
     */
    private fileExists;
    /**
     * Estimate costs for all migration tasks
     * @param tasks - List of migration tasks
     * @returns Cost estimate
     */
    private estimateCosts;
}
export default MigrationPlanner;
//# sourceMappingURL=planner.d.ts.map