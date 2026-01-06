/**
 * Shared Utilities Module
 *
 * Provides common utilities for YAML parsing, file operations, and other
 * shared functionality used across PKF packages.
 *
 * This module will be extracted from pkf-init utils in a subsequent task.
 *
 * @module utils
 */
/**
 * Safely parses YAML content with error handling.
 *
 * TODO: Extract implementation from pkf-init utils
 *
 * @param _content - YAML content to parse
 * @returns Parse result with data or error
 */
export declare function safeParseYaml(_content: string): Record<string, unknown>;
/**
 * Reads a file with error handling.
 *
 * TODO: Extract implementation from pkf-init utils
 *
 * @param _filePath - Path to the file to read
 * @returns File read result with content or error
 */
export declare function safeReadFile(_filePath: string): Promise<string>;
/**
 * Writes content to a file with error handling.
 *
 * TODO: Extract implementation from pkf-init utils
 *
 * @param _filePath - Path to the file to write
 * @param _content - Content to write
 * @returns Write operation result
 */
export declare function safeWriteFile(_filePath: string, _content: string): Promise<void>;
//# sourceMappingURL=index.d.ts.map