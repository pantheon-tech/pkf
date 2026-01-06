/**
 * Migration Cleanup Utility
 * Handles post-migration cleanup operations
 */
import type { MoveResult, MigrationOperation } from '../types/index.js';
/**
 * Options for directory cleanup
 */
export interface CleanupOptions {
    /** Directories to exclude from cleanup */
    exclude?: string[];
    /** Dry run - don't actually delete */
    dryRun?: boolean;
    /** Verbose logging */
    verbose?: boolean;
    /** Log callback */
    onLog?: (message: string) => void;
}
/**
 * Result of cleanup operation
 */
export interface CleanupResult {
    /** Directories that were removed */
    removedDirectories: string[];
    /** Directories that would have been removed (dry run) */
    wouldRemove?: string[];
    /** Files that were removed */
    removedFiles: string[];
    /** Errors encountered */
    errors: Array<{
        path: string;
        error: string;
    }>;
}
/**
 * MigrationCleanup - Post-migration cleanup operations
 */
export declare class MigrationCleanup {
    private rootDir;
    /**
     * Create a new MigrationCleanup instance
     *
     * @param rootDir - Root directory of the project
     */
    constructor(rootDir: string);
    /**
     * Resolve a path relative to root directory
     */
    private resolvePath;
    /**
     * Check if a directory is empty
     */
    private isDirectoryEmpty;
    /**
     * Check if a path should be excluded
     */
    private shouldExclude;
    /**
     * Remove empty directories recursively
     *
     * Traverses from deepest directories up, removing any that become empty
     * after child directories are removed.
     *
     * @param startDir - Directory to start from (relative to root)
     * @param options - Cleanup options
     * @returns Result with removed directories
     */
    removeEmptyDirectories(startDir?: string, options?: CleanupOptions): Promise<CleanupResult>;
    /**
     * Remove source files after verified moves
     *
     * Only removes source files if the corresponding target file exists.
     *
     * @param verifiedMoves - List of verified move results
     * @param options - Cleanup options
     * @returns Result with removed files
     */
    removeSourceFiles(verifiedMoves: MoveResult[], options?: CleanupOptions): Promise<CleanupResult>;
    /**
     * Find duplicate files (source still exists after copy)
     *
     * @param operations - List of migration operations
     * @returns Array of duplicate source paths
     */
    findDuplicates(operations: MigrationOperation[]): Promise<string[]>;
    /**
     * Clean up backup files created during migration
     *
     * @param backupDir - Backup directory to clean
     * @param options - Cleanup options
     * @returns Cleanup result
     */
    cleanupBackups(backupDir: string, options?: CleanupOptions): Promise<CleanupResult>;
    /**
     * Full cleanup after migration
     *
     * Performs all cleanup operations in order:
     * 1. Remove source files (after verified copies)
     * 2. Remove empty directories
     * 3. Optionally clean up backups
     *
     * @param moves - List of move results
     * @param options - Cleanup options with additional settings
     * @returns Combined cleanup result
     */
    fullCleanup(moves: MoveResult[], options?: CleanupOptions & {
        cleanupBackups?: string;
    }): Promise<CleanupResult>;
}
export default MigrationCleanup;
//# sourceMappingURL=cleanup.d.ts.map