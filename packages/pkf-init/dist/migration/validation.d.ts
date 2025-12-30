/**
 * PKF Init Post-Migration Validation
 * Validates migrated files have correct structure and frontmatter
 */
import type { LoadedConfig } from '../types/index.js';
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
 * PostMigrationValidator validates that migrated files have correct structure
 */
export declare class PostMigrationValidator {
    private config;
    /**
     * Create a new PostMigrationValidator
     * @param config - Loaded configuration
     */
    constructor(config: LoadedConfig);
    /**
     * Validate all migrated files
     * @param migratedFiles - List of file paths to validate
     * @returns Validation summary
     */
    validate(migratedFiles: string[]): Promise<ValidationSummary>;
    /**
     * Validate a single file
     * @param filePath - Path to the file to validate
     * @returns Validation result
     */
    private validateFile;
    /**
     * Extract frontmatter from file content
     * @param content - File content
     * @returns Extracted frontmatter or error
     */
    private extractFrontmatter;
    /**
     * Parse simple YAML content (key: value pairs)
     * This is a basic parser for frontmatter; for complex YAML, use js-yaml
     * @param yamlContent - YAML content to parse
     * @returns Parsed object
     */
    private parseSimpleYaml;
    /**
     * Check if a value is a valid date
     * @param value - Value to check
     * @returns True if valid date
     */
    private isValidDate;
}
export default PostMigrationValidator;
//# sourceMappingURL=validation.d.ts.map