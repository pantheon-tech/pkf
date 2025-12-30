/**
 * PKF Init Interactive Mode Utilities
 * Provides interactive prompts and approval gates for workflow stages
 */
import type { LoadedConfig, MigrationTask, WorkflowStage } from '../types/index.js';
/**
 * Interactive mode handler for PKF initialization workflow
 * Provides approval gates and user interaction at each stage
 */
export declare class Interactive {
    private enabled;
    constructor(enabled?: boolean);
    /**
     * Show configuration summary and confirm initialization start
     */
    confirmStart(config: LoadedConfig): Promise<boolean>;
    /**
     * Stage 1 approval: Review and approve generated blueprint
     */
    approveBlueprint(blueprint: string): Promise<{
        approved: boolean;
        edited?: string;
    }>;
    /**
     * Stage 2 approval: Review and approve generated schemas
     */
    approveSchema(schemasYaml: string, iterations: number): Promise<{
        approved: boolean;
        edited?: string;
    }>;
    /**
     * Stage 3 approval: Review and approve directory/file structure
     */
    approveStructure(structure: {
        dirs: string[];
        files: string[];
    }): Promise<boolean>;
    /**
     * Stage 4 approval: Review and approve migration tasks
     */
    approveMigration(tasks: MigrationTask[]): Promise<boolean>;
    /**
     * Confirm rollback operation
     */
    confirmRollback(): Promise<boolean>;
    /**
     * Prompt user to select which workflow step to start from
     */
    promptStep(): Promise<WorkflowStage | null>;
    /**
     * Show progress message with optional progress bar
     */
    showProgress(stage: WorkflowStage, message: string, progress?: {
        current: number;
        total: number;
    }): Promise<void>;
    /**
     * Format YAML preview with optional line limit
     */
    private formatYamlPreview;
    /**
     * Get human-readable label for workflow stage
     */
    private getStageLabel;
}
export default Interactive;
//# sourceMappingURL=interactive.d.ts.map