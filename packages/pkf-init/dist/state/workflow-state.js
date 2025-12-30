/**
 * WorkflowStateManager
 * Manages workflow state persisted to .pkf-init-state.json
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { WorkflowStage, } from '../types/index.js';
/** State file name */
const STATE_FILE_NAME = '.pkf-init-state.json';
/** Current state version */
const STATE_VERSION = '1.0.0';
/**
 * Manages workflow state for PKF initialization
 * Provides persistence, checkpointing, and atomic save operations
 */
export class WorkflowStateManager {
    /** Path to state file */
    statePath;
    /** Working directory */
    workingDir;
    /** Cached state */
    state = null;
    /**
     * Initialize with working directory
     * @param workingDir - Directory where state file is stored (defaults to cwd)
     */
    constructor(workingDir) {
        this.workingDir = workingDir ?? process.cwd();
        this.statePath = path.join(this.workingDir, STATE_FILE_NAME);
    }
    /**
     * Load state from file
     * @returns Loaded state or null if file doesn't exist
     */
    async load() {
        try {
            const content = await fs.readFile(this.statePath, 'utf-8');
            this.state = JSON.parse(content);
            return this.state;
        }
        catch (error) {
            // File doesn't exist or is invalid
            if (error.code === 'ENOENT') {
                this.state = null;
                return null;
            }
            // Re-throw other errors (e.g., JSON parse errors)
            throw error;
        }
    }
    /**
     * Save state atomically (write to temp file, then rename)
     * @param state - State to save
     */
    async save(state) {
        // Update the timestamp
        state.updatedAt = new Date().toISOString();
        // Write to temp file first
        const tempPath = `${this.statePath}.tmp`;
        await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf-8');
        // Rename atomically
        await fs.rename(tempPath, this.statePath);
        // Update cached state
        this.state = state;
    }
    /**
     * Create checkpoint in current state
     * @param stage - Stage when checkpoint was created
     * @param description - Description of checkpoint
     * @param data - Optional data to include in checkpoint
     */
    async checkpoint(stage, description, data) {
        // Load state if not already loaded
        if (this.state === null) {
            await this.load();
        }
        // If still null, create initial state
        if (this.state === null) {
            this.state = this.createInitialState();
        }
        // Create checkpoint
        const checkpoint = {
            stage,
            timestamp: new Date().toISOString(),
            description,
            data,
        };
        // Add checkpoint to state
        this.state.checkpoints.push(checkpoint);
        // Update current stage
        this.state.currentStage = stage;
        // Save state
        await this.save(this.state);
    }
    /**
     * Check if state exists and can be resumed
     * @returns True if state exists and is resumable
     */
    canResume() {
        if (this.state === null) {
            return false;
        }
        // Can resume if not completed or failed
        return (this.state.currentStage !== WorkflowStage.COMPLETED &&
            this.state.currentStage !== WorkflowStage.FAILED);
    }
    /**
     * Clear state file on completion
     */
    async clear() {
        try {
            await fs.unlink(this.statePath);
        }
        catch (error) {
            // Ignore error if file doesn't exist
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        this.state = null;
    }
    /**
     * Create fresh initial state
     * @returns Initial workflow state
     */
    createInitialState() {
        const now = new Date().toISOString();
        return {
            version: STATE_VERSION,
            startedAt: now,
            updatedAt: now,
            currentStage: WorkflowStage.NOT_STARTED,
            checkpoints: [],
            apiCallCount: 0,
            totalCost: 0,
            totalTokens: 0,
        };
    }
}
//# sourceMappingURL=workflow-state.js.map