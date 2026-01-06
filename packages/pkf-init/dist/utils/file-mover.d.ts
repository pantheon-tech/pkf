/**
 * File Mover Utility
 * Handles atomic file move operations with rollback support
 */
import type { MigrationOperation, MoveResult } from '../types/index.js';
/**
 * Options for move operations
 */
export interface MoveOptions {
    /** Create a backup before overwriting */
    createBackup?: boolean;
    /** Allow overwriting existing files */
    overwrite?: boolean;
    /** Preserve file timestamps */
    preserveTimestamps?: boolean;
    /** Dry run - don't actually move */
    dryRun?: boolean;
}
/**
 * Options for batch move operations
 */
export interface BatchMoveOptions extends MoveOptions {
    /** Run moves in parallel */
    parallel?: boolean;
    /** Stop on first error */
    stopOnError?: boolean;
    /** Maximum parallel operations */
    maxParallel?: number;
    /** Progress callback */
    onProgress?: (completed: number, total: number, current?: string) => void;
}
/**
 * Move operation for batching
 */
export interface MoveOperation {
    /** Source file path */
    sourcePath: string;
    /** Target file path */
    targetPath: string;
    /** Optional backup path */
    backupPath?: string;
}
/**
 * FileMover - Atomic file move operations
 */
export declare class FileMover {
    private rootDir;
    /**
     * Create a new FileMover
     *
     * @param rootDir - Root directory for resolving paths
     */
    constructor(rootDir: string);
    /**
     * Resolve a path relative to root directory
     */
    private resolvePath;
    /**
     * Check if a file exists
     */
    private fileExists;
    /**
     * Move a single file atomically
     *
     * @param sourcePath - Source file path
     * @param targetPath - Target file path
     * @param options - Move options
     * @returns Move result
     */
    moveFile(sourcePath: string, targetPath: string, options?: MoveOptions): Promise<MoveResult>;
    /**
     * Copy a file (without deleting source)
     *
     * @param sourcePath - Source file path
     * @param targetPath - Target file path
     * @param options - Move options
     * @returns Move result
     */
    copyFile(sourcePath: string, targetPath: string, options?: MoveOptions): Promise<MoveResult>;
    /**
     * Delete a file
     *
     * @param filePath - File to delete
     * @param options - Options
     * @returns Move result
     */
    deleteFile(filePath: string, options?: {
        dryRun?: boolean;
        backupPath?: string;
    }): Promise<MoveResult>;
    /**
     * Move multiple files in batch
     *
     * @param operations - List of move operations
     * @param options - Batch options
     * @returns Array of results
     */
    moveFiles(operations: MoveOperation[], options?: BatchMoveOptions): Promise<MoveResult[]>;
    /**
     * Verify a move was successful
     *
     * @param operation - Move operation to verify
     * @returns true if verified
     */
    verifyMove(operation: MoveOperation): Promise<boolean>;
    /**
     * Rollback a move operation
     *
     * @param operation - Operation to rollback
     * @returns true if rollback successful
     */
    rollback(operation: MigrationOperation): Promise<boolean>;
    /**
     * Pre-validate a list of move operations
     *
     * @param operations - Operations to validate
     * @returns Validation result with conflicts
     */
    preValidate(operations: MoveOperation[]): Promise<{
        valid: boolean;
        conflicts: Array<{
            operation: MoveOperation;
            reason: string;
        }>;
    }>;
}
export default FileMover;
//# sourceMappingURL=file-mover.d.ts.map