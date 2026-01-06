/**
 * Type definitions for PKF Schema module
 */
/**
 * Parsed PKF Schema DSL structure
 */
export interface SchemasYaml {
    /** Schema version (e.g., "1.0") */
    version: string;
    /** Schema definitions */
    schemas: Record<string, SchemaDefinition>;
}
/**
 * A single schema definition from schemas.yaml
 */
export interface SchemaDefinition {
    /** Schema this one extends (inheritance) */
    _extends?: string;
    /** Human-readable description of the schema */
    _description?: string;
    /** Property definitions for this schema */
    properties?: Record<string, PropertyDefinition>;
}
/**
 * Property definition within a schema
 */
export interface PropertyDefinition {
    /** Property type */
    type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
    /** Whether this property is required */
    required?: boolean;
    /** Human-readable description */
    description?: string;
    /** Default value or placeholder */
    default?: unknown;
    /** Allowed enum values */
    enum?: unknown[];
    /** Regex pattern for string validation */
    pattern?: string;
    /** Item definition for array types */
    items?: {
        type: string;
        enum?: unknown[];
    };
}
/**
 * Result of schema validation
 */
export interface SchemaValidationResult {
    /** Whether the schema is valid */
    valid: boolean;
    /** Validation errors (fatal issues) */
    errors: string[];
    /** Validation warnings (non-fatal issues) */
    warnings: string[];
}
/**
 * Schema loading options
 */
export interface SchemaLoadOptions {
    /** Whether to validate schema structure after loading */
    validate?: boolean;
    /** Whether to resolve inheritance (_extends) */
    resolveInheritance?: boolean;
}
//# sourceMappingURL=types.d.ts.map