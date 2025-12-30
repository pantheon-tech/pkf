/**
 * WorkflowStateManager
 * Manages workflow state persisted to .pkf-init-state.json
 */
import { WorkflowState, WorkflowStage } from '../types/index.js';
/**
 * Manages workflow state for PKF initialization
 * Provides persistence, checkpointing, and atomic save operations
 */
export declare class WorkflowStateManager {
    /** Path to state file */
    private readonly statePath;
    /** Working directory */
    private readonly workingDir;
    /** Cached state */
    private state;
    /**
     * Initialize with working directory
     * @param workingDir - Directory where state file is stored (defaults to cwd)
     */
    constructor(workingDir?: string);
    /**
     * Load state from file
     * @returns Loaded state or null if file doesn't exist
     */
    load(): Promise<WorkflowState | null>;
    /**
     * Save state atomically (write to temp file, then rename)
     * @param state - State to save
     */
    save(state: WorkflowState): Promise<void>;
    /**
     * Create checkpoint in current state
     * @param stage - Stage when checkpoint was created
     * @param description - Description of checkpoint
     * @param data - Optional data to include in checkpoint
     */
    checkpoint(stage: WorkflowStage, description: string, data?: Record<string, unknown>): Promise<void>;
    /**
     * Check if state exists and can be resumed
     * @returns True if state exists and is resumable
     */
    canResume(): boolean;
    /**
     * Clear state file on completion
     */
    clear(): Promise<void>;
    /**
     * Create fresh initial state
     * @returns Initial workflow state
     */
    createInitialState(): WorkflowState;
}
//# sourceMappingURL=workflow-state.d.ts.map