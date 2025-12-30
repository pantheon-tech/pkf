/**
 * PKF Init Stage 3: Implementation
 * Uses generators to create the PKF directory structure, config, and registers
 */
import { GeneratedStructure } from '../generators/structure.js';
import { InitializedRegisters } from '../generators/registers.js';
import { WorkflowStateManager } from '../state/workflow-state.js';
import { Interactive } from '../utils/interactive.js';
import { LoadedConfig } from '../types/index.js';
/**
 * Preview of structure to be created
 */
export interface StructurePreview {
    /** Directories to create */
    dirs: string[];
    /** Files to create */
    files: string[];
}
/**
 * Result from implementation stage execution
 */
export interface ImplementationResult {
    /** Whether implementation succeeded */
    success: boolean;
    /** Generated directory structure */
    structure?: GeneratedStructure;
    /** Path to generated pkf.config.yaml */
    configPath?: string;
    /** Path to generated schemas.yaml */
    schemasPath?: string;
    /** Initialized registers */
    registers?: InitializedRegisters;
    /** Path to backup (null if skipped) */
    backupPath?: string | null;
    /** Error message if failed */
    error?: string;
}
/**
 * Options for implementation stage
 */
export interface ImplementationOptions {
    /** Skip creating backup of existing docs */
    skipBackup?: boolean;
    /** Force overwrite existing files */
    force?: boolean;
}
/**
 * Implementation Stage (Stage 3)
 * Creates the PKF directory structure, configuration, and registers
 */
export declare class ImplementationStage {
    private stateManager;
    private config;
    private interactive;
    private options;
    /**
     * Create implementation stage
     * @param stateManager - Workflow state manager for checkpointing
     * @param config - Loaded configuration
     * @param interactive - Interactive mode handler
     * @param options - Implementation options
     */
    constructor(stateManager: WorkflowStateManager, config: LoadedConfig, interactive: Interactive, options?: ImplementationOptions);
    /**
     * Execute the implementation stage
     * @param schemasYaml - Generated schemas.yaml content from design stage
     * @returns Implementation result
     */
    execute(schemasYaml: string): Promise<ImplementationResult>;
    /**
     * Create backup of existing docs directory
     * @returns Backup path or null if skipped
     */
    private createBackup;
    /**
     * Recursively copy a directory
     * @param src - Source directory
     * @param dest - Destination directory
     */
    private copyDirectory;
    /**
     * Write schemas.yaml to schemas directory
     * @param schemasYaml - Schemas YAML content
     * @returns Path to written schemas file
     */
    private writeSchemas;
    /**
     * Build preview object for interactive approval
     * @param structure - Generated structure
     * @param registersDir - Registers directory path
     * @returns Structure preview
     */
    private buildPreview;
}
export default ImplementationStage;
//# sourceMappingURL=implementation.d.ts.map