/**
 * File Mover Utility
 * Handles atomic file move operations with rollback support
 */

import * as fs from 'fs/promises';
import * as path from 'path';
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
export class FileMover {
  private rootDir: string;

  /**
   * Create a new FileMover
   *
   * @param rootDir - Root directory for resolving paths
   */
  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  /**
   * Resolve a path relative to root directory
   */
  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.rootDir, filePath);
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Move a single file atomically
   *
   * @param sourcePath - Source file path
   * @param targetPath - Target file path
   * @param options - Move options
   * @returns Move result
   */
  async moveFile(
    sourcePath: string,
    targetPath: string,
    options: MoveOptions = {}
  ): Promise<MoveResult> {
    const operation: MigrationOperation = {
      type: 'move',
      sourcePath,
      targetPath,
      status: 'pending',
    };

    try {
      const absoluteSource = this.resolvePath(sourcePath);
      const absoluteTarget = this.resolvePath(targetPath);

      // Check source exists
      if (!(await this.fileExists(sourcePath))) {
        operation.status = 'failed';
        operation.error = `Source file does not exist: ${sourcePath}`;
        return { success: false, operation, error: operation.error };
      }

      // Check target doesn't exist (unless overwrite)
      if (await this.fileExists(targetPath)) {
        if (!options.overwrite) {
          operation.status = 'failed';
          operation.error = `Target file already exists: ${targetPath}`;
          return { success: false, operation, error: operation.error };
        }

        // Create backup if requested
        if (options.createBackup) {
          const backupPath = `${absoluteTarget}.backup`;
          await fs.copyFile(absoluteTarget, backupPath);
        }
      }

      // Dry run - don't actually move
      if (options.dryRun) {
        operation.status = 'completed';
        return { success: true, operation };
      }

      // Create target directory if needed
      const targetDir = path.dirname(absoluteTarget);
      await fs.mkdir(targetDir, { recursive: true });

      // Read source file
      const content = await fs.readFile(absoluteSource);

      // Get source stats for timestamp preservation
      let stats: Awaited<ReturnType<typeof fs.stat>> | undefined;
      if (options.preserveTimestamps) {
        stats = await fs.stat(absoluteSource);
      }

      // Write to target
      await fs.writeFile(absoluteTarget, content);

      // Preserve timestamps if requested
      if (stats && options.preserveTimestamps) {
        await fs.utimes(absoluteTarget, stats.atime, stats.mtime);
      }

      // Delete source file
      await fs.unlink(absoluteSource);

      operation.status = 'completed';
      operation.executedAt = new Date().toISOString();

      return { success: true, operation };
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : String(error);
      return { success: false, operation, error: operation.error };
    }
  }

  /**
   * Copy a file (without deleting source)
   *
   * @param sourcePath - Source file path
   * @param targetPath - Target file path
   * @param options - Move options
   * @returns Move result
   */
  async copyFile(
    sourcePath: string,
    targetPath: string,
    options: MoveOptions = {}
  ): Promise<MoveResult> {
    const operation: MigrationOperation = {
      type: 'copy',
      sourcePath,
      targetPath,
      status: 'pending',
    };

    try {
      const absoluteSource = this.resolvePath(sourcePath);
      const absoluteTarget = this.resolvePath(targetPath);

      // Check source exists
      if (!(await this.fileExists(sourcePath))) {
        operation.status = 'failed';
        operation.error = `Source file does not exist: ${sourcePath}`;
        return { success: false, operation, error: operation.error };
      }

      // Check target doesn't exist (unless overwrite)
      if (await this.fileExists(targetPath)) {
        if (!options.overwrite) {
          operation.status = 'failed';
          operation.error = `Target file already exists: ${targetPath}`;
          return { success: false, operation, error: operation.error };
        }

        if (options.createBackup) {
          const backupPath = `${absoluteTarget}.backup`;
          await fs.copyFile(absoluteTarget, backupPath);
        }
      }

      // Dry run
      if (options.dryRun) {
        operation.status = 'completed';
        return { success: true, operation };
      }

      // Create target directory
      const targetDir = path.dirname(absoluteTarget);
      await fs.mkdir(targetDir, { recursive: true });

      // Copy file
      await fs.copyFile(absoluteSource, absoluteTarget);

      // Preserve timestamps if requested
      if (options.preserveTimestamps) {
        const stats = await fs.stat(absoluteSource);
        await fs.utimes(absoluteTarget, stats.atime, stats.mtime);
      }

      operation.status = 'completed';
      operation.executedAt = new Date().toISOString();

      return { success: true, operation };
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : String(error);
      return { success: false, operation, error: operation.error };
    }
  }

  /**
   * Delete a file
   *
   * @param filePath - File to delete
   * @param options - Options
   * @returns Move result
   */
  async deleteFile(
    filePath: string,
    options: { dryRun?: boolean; backupPath?: string } = {}
  ): Promise<MoveResult> {
    const operation: MigrationOperation = {
      type: 'delete',
      sourcePath: filePath,
      status: 'pending',
    };

    try {
      const absolutePath = this.resolvePath(filePath);

      // Check file exists
      if (!(await this.fileExists(filePath))) {
        // File already deleted is not an error
        operation.status = 'completed';
        return { success: true, operation };
      }

      // Create backup if path provided
      if (options.backupPath) {
        const absoluteBackup = this.resolvePath(options.backupPath);
        const backupDir = path.dirname(absoluteBackup);
        await fs.mkdir(backupDir, { recursive: true });
        await fs.copyFile(absolutePath, absoluteBackup);
      }

      // Dry run
      if (options.dryRun) {
        operation.status = 'completed';
        return { success: true, operation };
      }

      // Delete file
      await fs.unlink(absolutePath);

      operation.status = 'completed';
      operation.executedAt = new Date().toISOString();

      return { success: true, operation };
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : String(error);
      return { success: false, operation, error: operation.error };
    }
  }

  /**
   * Move multiple files in batch
   *
   * @param operations - List of move operations
   * @param options - Batch options
   * @returns Array of results
   */
  async moveFiles(
    operations: MoveOperation[],
    options: BatchMoveOptions = {}
  ): Promise<MoveResult[]> {
    const results: MoveResult[] = [];
    const { parallel = false, stopOnError = false, maxParallel = 5 } = options;

    if (parallel) {
      // Parallel execution with concurrency limit
      const chunks: MoveOperation[][] = [];
      for (let i = 0; i < operations.length; i += maxParallel) {
        chunks.push(operations.slice(i, i + maxParallel));
      }

      let completed = 0;
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map((op) =>
            this.moveFile(op.sourcePath, op.targetPath, options)
          )
        );

        for (const result of chunkResults) {
          results.push(result);
          completed++;
          options.onProgress?.(completed, operations.length, result.operation.sourcePath);

          if (stopOnError && !result.success) {
            return results;
          }
        }
      }
    } else {
      // Sequential execution
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        const result = await this.moveFile(op.sourcePath, op.targetPath, options);
        results.push(result);

        options.onProgress?.(i + 1, operations.length, op.sourcePath);

        if (stopOnError && !result.success) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Verify a move was successful
   *
   * @param operation - Move operation to verify
   * @returns true if verified
   */
  async verifyMove(operation: MoveOperation): Promise<boolean> {
    // Target should exist
    if (!(await this.fileExists(operation.targetPath))) {
      return false;
    }

    // Source should not exist (unless it's the same as target)
    if (operation.sourcePath !== operation.targetPath) {
      if (await this.fileExists(operation.sourcePath)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Rollback a move operation
   *
   * @param operation - Operation to rollback
   * @returns true if rollback successful
   */
  async rollback(operation: MigrationOperation): Promise<boolean> {
    try {
      switch (operation.type) {
        case 'move':
          // Move back from target to source
          if (operation.targetPath) {
            await this.moveFile(operation.targetPath, operation.sourcePath, {
              overwrite: true,
            });
          }
          break;

        case 'copy':
          // Delete the copy
          if (operation.targetPath) {
            await this.deleteFile(operation.targetPath);
          }
          break;

        case 'delete':
          // Cannot restore deleted file without backup
          // This should be handled by manifest-based rollback
          return false;

        default:
          return false;
      }

      operation.status = 'rolled_back';
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Pre-validate a list of move operations
   *
   * @param operations - Operations to validate
   * @returns Validation result with conflicts
   */
  async preValidate(
    operations: MoveOperation[]
  ): Promise<{
    valid: boolean;
    conflicts: Array<{ operation: MoveOperation; reason: string }>;
  }> {
    const conflicts: Array<{ operation: MoveOperation; reason: string }> = [];
    const targetPaths = new Set<string>();

    for (const op of operations) {
      // Check for duplicate targets
      const normalizedTarget = path.normalize(op.targetPath);
      if (targetPaths.has(normalizedTarget)) {
        conflicts.push({
          operation: op,
          reason: `Multiple files would be moved to: ${op.targetPath}`,
        });
      }
      targetPaths.add(normalizedTarget);

      // Check source exists
      if (!(await this.fileExists(op.sourcePath))) {
        conflicts.push({
          operation: op,
          reason: `Source file does not exist: ${op.sourcePath}`,
        });
      }

      // Check target doesn't already exist (unless it's a source being moved)
      if (await this.fileExists(op.targetPath)) {
        const isSourceMovingThere = operations.some(
          (other) =>
            other.sourcePath === op.targetPath &&
            other.targetPath !== op.targetPath
        );
        if (!isSourceMovingThere) {
          conflicts.push({
            operation: op,
            reason: `Target file already exists: ${op.targetPath}`,
          });
        }
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
    };
  }
}

export default FileMover;
