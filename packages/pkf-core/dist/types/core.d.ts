/**
 * Core types shared across all pkf-core modules
 * @packageDocumentation
 */
/**
 * Represents a discovered PKF document
 */
export interface PKFDocument {
    /** Absolute path to the document */
    path: string;
    /** Path relative to project root */
    relativePath: string;
    /** Detected document type */
    type: string;
    /** Whether document has YAML frontmatter */
    hasFrontmatter: boolean;
    /** File size in bytes */
    size: number;
    /** Document content (optional, loaded on demand) */
    content?: string;
    /** Parsed metadata from frontmatter or analysis */
    metadata?: DocumentMetadata;
}
/**
 * Document metadata extracted from frontmatter or content
 */
export interface DocumentMetadata {
    /** Document title */
    title?: string;
    /** Document description */
    description?: string;
    /** Document category */
    category?: string;
    /** Document tags */
    tags?: string[];
    /** Custom metadata fields */
    [key: string]: unknown;
}
/**
 * PKF schema definition
 */
export interface PKFSchema {
    /** Schema name (e.g., 'guide', 'adr', 'spec') */
    name: string;
    /** Description of this schema */
    description?: string;
    /** Required frontmatter fields */
    required: string[];
    /** All available fields with types */
    fields: SchemaField[];
    /** Schema to extend (inheritance) */
    extends?: string;
}
/**
 * Individual field in a schema
 */
export interface SchemaField {
    /** Field name */
    name: string;
    /** Field type (string, number, array, etc.) */
    type: string;
    /** Field description */
    description?: string;
    /** Whether field is required */
    required?: boolean;
    /** Default value */
    default?: unknown;
    /** Allowed values (for enums) */
    enum?: unknown[];
}
/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = {
    success: true;
    value: T;
} | {
    success: false;
    error: E;
};
/**
 * Validation error details
 */
export interface ValidationError {
    /** Field path (e.g., 'frontmatter.title') */
    field: string;
    /** Error message */
    message: string;
    /** Error code for programmatic handling */
    code: string;
}
/**
 * Validation warning (non-blocking)
 */
export interface ValidationWarning {
    /** Field path */
    field: string;
    /** Warning message */
    message: string;
}
//# sourceMappingURL=core.d.ts.map