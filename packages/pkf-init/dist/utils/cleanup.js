/**
 * Migration Cleanup Utility
 * Handles post-migration cleanup operations
 */
import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * MigrationCleanup - Post-migration cleanup operations
 */
export class MigrationCleanup {
    rootDir;
    /**
     * Create a new MigrationCleanup instance
     *
     * @param rootDir - Root directory of the project
     */
    constructor(rootDir) {
        this.rootDir = rootDir;
    }
    /**
     * Resolve a path relative to root directory
     */
    resolvePath(filePath) {
        if (path.isAbsolute(filePath)) {
            return filePath;
        }
        return path.join(this.rootDir, filePath);
    }
    /**
     * Check if a directory is empty
     */
    async isDirectoryEmpty(dirPath) {
        try {
            const entries = await fs.readdir(dirPath);
            return entries.length === 0;
        }
        catch {
            return false;
        }
    }
    /**
     * Check if a path should be excluded
     */
    shouldExclude(filePath, excludePatterns) {
        const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
        for (const pattern of excludePatterns) {
            const normalizedPattern = pattern.replace(/\\/g, '/');
            // Exact match
            if (normalizedPath === normalizedPattern) {
                return true;
            }
            // Contains pattern
            if (normalizedPath.includes(normalizedPattern)) {
                return true;
            }
            // Starts with pattern (for directories)
            if (normalizedPath.startsWith(normalizedPattern + '/')) {
                return true;
            }
        }
        return false;
    }
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
    async removeEmptyDirectories(startDir = '', options = {}) {
        const result = {
            removedDirectories: [],
            wouldRemove: options.dryRun ? [] : undefined,
            removedFiles: [],
            errors: [],
        };
        const defaultExcludes = [
            'node_modules',
            '.git',
            '.next',
            '.nuxt',
            'dist',
            'build',
            '.pkf-backup',
        ];
        const excludePatterns = [...defaultExcludes, ...(options.exclude || [])];
        const absoluteStart = this.resolvePath(startDir || '.');
        // Collect all directories first
        const allDirs = [];
        const collectDirs = async (dirPath, depth = 0) => {
            try {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (!entry.isDirectory())
                        continue;
                    const fullPath = path.join(dirPath, entry.name);
                    const relativePath = path.relative(this.rootDir, fullPath);
                    if (this.shouldExclude(relativePath, excludePatterns)) {
                        continue;
                    }
                    // Recurse first (depth-first)
                    await collectDirs(fullPath, depth + 1);
                    // Then add this directory
                    allDirs.push(fullPath);
                }
            }
            catch (error) {
                result.errors.push({
                    path: dirPath,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        };
        await collectDirs(absoluteStart);
        // Process directories from deepest to shallowest
        // They're already in the right order from depth-first traversal
        for (const dirPath of allDirs.reverse()) {
            try {
                if (await this.isDirectoryEmpty(dirPath)) {
                    const relativePath = path.relative(this.rootDir, dirPath);
                    if (options.dryRun) {
                        result.wouldRemove?.push(relativePath);
                        options.onLog?.(`Would remove empty directory: ${relativePath}`);
                    }
                    else {
                        await fs.rmdir(dirPath);
                        result.removedDirectories.push(relativePath);
                        options.onLog?.(`Removed empty directory: ${relativePath}`);
                    }
                }
            }
            catch (error) {
                result.errors.push({
                    path: path.relative(this.rootDir, dirPath),
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        return result;
    }
    /**
     * Remove source files after verified moves
     *
     * Only removes source files if the corresponding target file exists.
     *
     * @param verifiedMoves - List of verified move results
     * @param options - Cleanup options
     * @returns Result with removed files
     */
    async removeSourceFiles(verifiedMoves, options = {}) {
        const result = {
            removedDirectories: [],
            removedFiles: [],
            errors: [],
        };
        for (const move of verifiedMoves) {
            if (!move.success)
                continue;
            if (move.operation.type !== 'copy')
                continue;
            if (!move.operation.targetPath)
                continue;
            const sourcePath = move.operation.sourcePath;
            const targetPath = move.operation.targetPath;
            // Skip if source and target are the same
            if (path.normalize(sourcePath) === path.normalize(targetPath)) {
                continue;
            }
            try {
                // Verify target exists before deleting source
                const absoluteTarget = this.resolvePath(targetPath);
                try {
                    await fs.access(absoluteTarget);
                }
                catch {
                    options.onLog?.(`Skipping ${sourcePath}: target not found`);
                    continue;
                }
                const absoluteSource = this.resolvePath(sourcePath);
                if (options.dryRun) {
                    options.onLog?.(`Would remove source: ${sourcePath}`);
                }
                else {
                    await fs.unlink(absoluteSource);
                    result.removedFiles.push(sourcePath);
                    options.onLog?.(`Removed source: ${sourcePath}`);
                }
            }
            catch (error) {
                result.errors.push({
                    path: sourcePath,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        return result;
    }
    /**
     * Find duplicate files (source still exists after copy)
     *
     * @param operations - List of migration operations
     * @returns Array of duplicate source paths
     */
    async findDuplicates(operations) {
        const duplicates = [];
        for (const op of operations) {
            if (op.type !== 'copy' && op.type !== 'move')
                continue;
            if (op.status !== 'completed')
                continue;
            if (!op.targetPath)
                continue;
            const sourcePath = this.resolvePath(op.sourcePath);
            const targetPath = this.resolvePath(op.targetPath);
            // Skip if same path
            if (path.normalize(sourcePath) === path.normalize(targetPath)) {
                continue;
            }
            try {
                // Check if both source and target exist
                await fs.access(sourcePath);
                await fs.access(targetPath);
                // Both exist - this is a duplicate
                duplicates.push(op.sourcePath);
            }
            catch {
                // One or both don't exist - not a duplicate
            }
        }
        return duplicates;
    }
    /**
     * Clean up backup files created during migration
     *
     * @param backupDir - Backup directory to clean
     * @param options - Cleanup options
     * @returns Cleanup result
     */
    async cleanupBackups(backupDir, options = {}) {
        const result = {
            removedDirectories: [],
            removedFiles: [],
            errors: [],
        };
        const absoluteBackup = this.resolvePath(backupDir);
        try {
            // Check if backup directory exists
            await fs.access(absoluteBackup);
        }
        catch {
            // Backup directory doesn't exist
            return result;
        }
        if (options.dryRun) {
            options.onLog?.(`Would remove backup directory: ${backupDir}`);
            return result;
        }
        try {
            // Remove entire backup directory recursively
            await fs.rm(absoluteBackup, { recursive: true, force: true });
            result.removedDirectories.push(backupDir);
            options.onLog?.(`Removed backup directory: ${backupDir}`);
        }
        catch (error) {
            result.errors.push({
                path: backupDir,
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return result;
    }
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
    async fullCleanup(moves, options = {}) {
        const combinedResult = {
            removedDirectories: [],
            removedFiles: [],
            errors: [],
        };
        // Step 1: Remove source files
        options.onLog?.('Removing source files...');
        const sourceResult = await this.removeSourceFiles(moves, options);
        combinedResult.removedFiles.push(...sourceResult.removedFiles);
        combinedResult.errors.push(...sourceResult.errors);
        // Step 2: Remove empty directories
        options.onLog?.('Removing empty directories...');
        const dirResult = await this.removeEmptyDirectories('', options);
        combinedResult.removedDirectories.push(...dirResult.removedDirectories);
        combinedResult.errors.push(...dirResult.errors);
        // Step 3: Clean up backups if requested
        if (options.cleanupBackups) {
            options.onLog?.('Cleaning up backups...');
            const backupResult = await this.cleanupBackups(options.cleanupBackups, options);
            combinedResult.removedDirectories.push(...backupResult.removedDirectories);
            combinedResult.errors.push(...backupResult.errors);
        }
        return combinedResult;
    }
}
export default MigrationCleanup;
//# sourceMappingURL=cleanup.js.map