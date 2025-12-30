/**
 * PKF Init Post-Migration Validation
 * Validates migrated files have correct structure and frontmatter
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { LoadedConfig } from '../types/index.js';
import logger from '../utils/logger.js';

/**
 * Summary of validation results
 */
export interface ValidationSummary {
  /** Whether all files are valid */
  valid: boolean;
  /** Total number of files validated */
  totalFiles: number;
  /** Number of valid files */
  validFiles: number;
  /** Number of invalid files */
  invalidFiles: number;
  /** Detailed errors for each invalid file */
  errors: FileValidationError[];
}

/**
 * Validation errors for a single file
 */
export interface FileValidationError {
  /** Path to the invalid file */
  filePath: string;
  /** List of validation errors */
  errors: string[];
}

/**
 * Result of validating a single file
 */
export interface FileValidationResult {
  /** Path to the file */
  filePath: string;
  /** Whether the file is valid */
  valid: boolean;
  /** Validation errors if invalid */
  errors: string[];
  /** Parsed frontmatter if available */
  frontmatter?: Record<string, unknown>;
}

/**
 * Required frontmatter fields for PKF documents
 */
const REQUIRED_FRONTMATTER_FIELDS = ['title', 'type'];

/**
 * Optional but recommended frontmatter fields
 */
const RECOMMENDED_FRONTMATTER_FIELDS = ['created', 'updated', 'status'];

/**
 * PostMigrationValidator validates that migrated files have correct structure
 */
export class PostMigrationValidator {
  private config: LoadedConfig;

  /**
   * Create a new PostMigrationValidator
   * @param config - Loaded configuration
   */
  constructor(config: LoadedConfig) {
    this.config = config;
  }

  /**
   * Validate all migrated files
   * @param migratedFiles - List of file paths to validate
   * @returns Validation summary
   */
  async validate(migratedFiles: string[]): Promise<ValidationSummary> {
    const errors: FileValidationError[] = [];
    let validCount = 0;

    for (const filePath of migratedFiles) {
      const result = await this.validateFile(filePath);

      if (result.valid) {
        validCount++;
      } else {
        errors.push({
          filePath: result.filePath,
          errors: result.errors,
        });
      }
    }

    const invalidCount = migratedFiles.length - validCount;

    return {
      valid: invalidCount === 0,
      totalFiles: migratedFiles.length,
      validFiles: validCount,
      invalidFiles: invalidCount,
      errors,
    };
  }

  /**
   * Validate a single file
   * @param filePath - Path to the file to validate
   * @returns Validation result
   */
  private async validateFile(filePath: string): Promise<FileValidationResult> {
    const errors: string[] = [];

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return {
        filePath,
        valid: false,
        errors: ['File does not exist'],
      };
    }

    // Read file content
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        filePath,
        valid: false,
        errors: [`Failed to read file: ${errorMessage}`],
      };
    }

    // Check for frontmatter
    const frontmatterResult = this.extractFrontmatter(content);

    if (!frontmatterResult.hasFrontmatter) {
      errors.push('Missing YAML frontmatter');
      return {
        filePath,
        valid: false,
        errors,
      };
    }

    if (frontmatterResult.parseError) {
      errors.push(`Invalid YAML frontmatter: ${frontmatterResult.parseError}`);
      return {
        filePath,
        valid: false,
        errors,
      };
    }

    const frontmatter = frontmatterResult.data;

    if (!frontmatter || typeof frontmatter !== 'object') {
      errors.push('Frontmatter is not a valid object');
      return {
        filePath,
        valid: false,
        errors,
      };
    }

    // Validate required fields
    for (const field of REQUIRED_FRONTMATTER_FIELDS) {
      if (!(field in frontmatter)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check for recommended fields (warnings, not errors)
    for (const field of RECOMMENDED_FRONTMATTER_FIELDS) {
      if (!(field in frontmatter)) {
        logger.debug(`File ${path.basename(filePath)} missing recommended field: ${field}`);
      }
    }

    // Validate field types if present
    if ('title' in frontmatter && typeof frontmatter.title !== 'string') {
      errors.push('Field "title" must be a string');
    }

    if ('type' in frontmatter && typeof frontmatter.type !== 'string') {
      errors.push('Field "type" must be a string');
    }

    if ('status' in frontmatter && typeof frontmatter.status !== 'string') {
      errors.push('Field "status" must be a string');
    }

    if ('created' in frontmatter) {
      if (!this.isValidDate(frontmatter.created)) {
        errors.push('Field "created" must be a valid date');
      }
    }

    if ('updated' in frontmatter) {
      if (!this.isValidDate(frontmatter.updated)) {
        errors.push('Field "updated" must be a valid date');
      }
    }

    // Validate content has body after frontmatter
    const bodyContent = frontmatterResult.body?.trim();
    if (!bodyContent) {
      logger.debug(`File ${path.basename(filePath)} has empty body content`);
    }

    return {
      filePath,
      valid: errors.length === 0,
      errors,
      frontmatter: frontmatter as Record<string, unknown>,
    };
  }

  /**
   * Extract frontmatter from file content
   * @param content - File content
   * @returns Extracted frontmatter or error
   */
  private extractFrontmatter(content: string): {
    hasFrontmatter: boolean;
    data?: Record<string, unknown>;
    body?: string;
    parseError?: string;
  } {
    const trimmed = content.trimStart();

    // Check if content starts with frontmatter delimiter
    if (!trimmed.startsWith('---')) {
      return { hasFrontmatter: false };
    }

    // Find the closing delimiter
    const endIndex = trimmed.indexOf('\n---', 3);
    if (endIndex === -1) {
      return {
        hasFrontmatter: true,
        parseError: 'Unclosed frontmatter block',
      };
    }

    // Extract frontmatter content
    const frontmatterContent = trimmed.slice(4, endIndex).trim();
    const bodyContent = trimmed.slice(endIndex + 4).trim();

    // Parse YAML frontmatter
    try {
      const data = this.parseSimpleYaml(frontmatterContent);
      return {
        hasFrontmatter: true,
        data,
        body: bodyContent,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        hasFrontmatter: true,
        parseError: errorMessage,
      };
    }
  }

  /**
   * Parse simple YAML content (key: value pairs)
   * This is a basic parser for frontmatter; for complex YAML, use js-yaml
   * @param yamlContent - YAML content to parse
   * @returns Parsed object
   */
  private parseSimpleYaml(yamlContent: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yamlContent.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Match key: value pattern
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, colonIndex).trim();
      let value: unknown = trimmedLine.slice(colonIndex + 1).trim();

      // Parse value types
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (value === 'null' || value === '') {
        value = null;
      } else if (/^-?\d+$/.test(value as string)) {
        value = parseInt(value as string, 10);
      } else if (/^-?\d+\.\d+$/.test(value as string)) {
        value = parseFloat(value as string);
      } else if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
        value = (value as string).slice(1, -1);
      } else if ((value as string).startsWith("'") && (value as string).endsWith("'")) {
        value = (value as string).slice(1, -1);
      }

      result[key] = value;
    }

    return result;
  }

  /**
   * Check if a value is a valid date
   * @param value - Value to check
   * @returns True if valid date
   */
  private isValidDate(value: unknown): boolean {
    if (typeof value === 'string') {
      // Check ISO date format
      const date = new Date(value);
      return !isNaN(date.getTime());
    }

    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }

    return false;
  }
}

export default PostMigrationValidator;
