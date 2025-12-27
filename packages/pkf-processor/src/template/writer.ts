/**
 * File system template writer.
 *
 * Writes generated templates to disk with proper paths.
 *
 * @module template/writer
 */
import { writeFile, mkdir, access, constants } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { GeneratedTemplate } from './generator.js';
import type { Result } from '../types.js';
import { ok, err } from '../types.js';

/**
 * Write operation error.
 */
export interface WriteError {
  type: 'write_failed' | 'mkdir_failed' | 'file_exists';
  message: string;
  path: string;
  cause?: Error;
}

/**
 * Write operation result.
 */
export interface WriteResult {
  path: string;
  written: boolean;
  bytes: number;
}

/**
 * Write options.
 */
export interface WriteOptions {
  /** Overwrite existing files (default: false) */
  overwrite?: boolean;
  /** Dry run mode - don't actually write (default: false) */
  dryRun?: boolean;
}

/**
 * Check if file exists.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write generated template to file system.
 */
export async function writeTemplate(
  template: GeneratedTemplate,
  outputDir: string,
  options: WriteOptions = {}
): Promise<Result<WriteResult, WriteError>> {
  const { overwrite = false, dryRun = false } = options;
  const outputPath = join(outputDir, template.filename);
  const bytes = Buffer.byteLength(template.content, 'utf8');

  // Check if file exists
  if (!overwrite && await fileExists(outputPath)) {
    return err({
      type: 'file_exists',
      message: `File already exists: ${outputPath}`,
      path: outputPath,
    });
  }

  // Dry run mode
  if (dryRun) {
    return ok({
      path: outputPath,
      written: false,
      bytes,
    });
  }

  // Ensure directory exists
  try {
    await mkdir(dirname(outputPath), { recursive: true });
  } catch (error) {
    return err({
      type: 'mkdir_failed',
      message: `Failed to create directory: ${dirname(outputPath)}`,
      path: dirname(outputPath),
      cause: error instanceof Error ? error : undefined,
    });
  }

  // Write file
  try {
    await writeFile(outputPath, template.content, { encoding: 'utf8' });
  } catch (error) {
    return err({
      type: 'write_failed',
      message: `Failed to write template: ${outputPath}`,
      path: outputPath,
      cause: error instanceof Error ? error : undefined,
    });
  }

  return ok({
    path: outputPath,
    written: true,
    bytes,
  });
}

/**
 * Batch write options.
 */
export interface BatchWriteOptions extends WriteOptions {
  /** Stop on first error (default: false) */
  stopOnError?: boolean;
}

/**
 * Batch write result.
 */
export interface BatchWriteResult {
  successful: WriteResult[];
  failed: Array<{ template: GeneratedTemplate; error: WriteError }>;
}

/**
 * Write multiple templates to file system.
 */
export async function writeTemplates(
  templates: GeneratedTemplate[],
  outputDir: string,
  options: BatchWriteOptions = {}
): Promise<BatchWriteResult> {
  const { stopOnError = false, ...writeOptions } = options;
  const successful: WriteResult[] = [];
  const failed: Array<{ template: GeneratedTemplate; error: WriteError }> = [];

  for (const template of templates) {
    const result = await writeTemplate(template, outputDir, writeOptions);
    if (result.success) {
      successful.push(result.data);
    } else {
      failed.push({ template, error: result.error });
      if (stopOnError) break;
    }
  }

  return { successful, failed };
}
