/**
 * PKF Validator Types
 * Core type definitions for validation results and errors
 */
/**
 * Severity level for validation issues
 */
type Severity = 'error' | 'warning' | 'info';
/**
 * A single validation error or warning
 */
interface ValidationIssue {
    /** Unique error code for programmatic handling */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Severity level */
    severity: Severity;
    /** File path where the issue was found */
    filePath?: string;
    /** Line number (1-based) where the issue was found */
    line?: number;
    /** Column number (1-based) where the issue was found */
    column?: number;
    /** The problematic value */
    value?: unknown;
    /** Expected value or pattern */
    expected?: unknown;
    /** Suggestion for how to fix the issue */
    suggestion?: string;
}
/**
 * Result of a validation operation
 */
interface ValidationResult {
    /** Whether the validation passed (no errors) */
    valid: boolean;
    /** List of errors found */
    errors: ValidationIssue[];
    /** List of warnings found */
    warnings: ValidationIssue[];
    /** List of informational messages */
    info: ValidationIssue[];
    /** Time taken for validation in milliseconds */
    duration?: number;
    /** Number of items validated */
    itemCount?: number;
}
/**
 * Options for validation operations
 */
interface ValidationOptions {
    /** Root directory for resolving paths */
    rootDir?: string;
    /** Whether to include warnings */
    includeWarnings?: boolean;
    /** Whether to include info messages */
    includeInfo?: boolean;
    /** Maximum number of errors before stopping */
    maxErrors?: number;
    /** Whether to validate in strict mode */
    strict?: boolean;
}
/**
 * PKF Configuration structure
 */
interface PkfConfig {
    version: string;
    project: {
        name: string;
        version?: string;
        description?: string;
    };
    structure: {
        root: string;
        registers?: string;
        architecture?: string;
        guides?: string;
        templates?: string;
    };
    schemas?: {
        path?: string;
        documentTypes?: Record<string, unknown>;
    };
    validation?: {
        frontmatter?: boolean;
        links?: boolean;
        prose?: boolean;
    };
}
/**
 * TODO item structure from TODO.md
 */
interface TodoItem {
    id: string;
    title: string;
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
    priority?: 'critical' | 'high' | 'medium' | 'low';
    created?: string;
    updated?: string;
    due_date?: string;
    assignee?: string;
    labels?: string[];
    description?: string;
    blockedBy?: string;
}
/**
 * Issue item structure from ISSUES.md
 */
interface IssueItem {
    id: string;
    title: string;
    status: 'open' | 'investigating' | 'in-progress' | 'resolved' | 'closed';
    severity: 'critical' | 'high' | 'medium' | 'low';
    created?: string;
    updated?: string;
    reporter?: string;
    assignee?: string;
    labels?: string[];
    description?: string;
    resolution?: string;
}
/**
 * Changelog entry structure from CHANGELOG.md
 */
interface ChangelogEntry {
    version: string;
    date: string;
    changes: {
        type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
        description: string;
    }[];
}
/**
 * Validator interface that all validators must implement
 */
interface Validator<T = unknown> {
    /** Name of the validator */
    name: string;
    /** Description of what this validator checks */
    description: string;
    /** Validate the given input */
    validate(input: T, options?: ValidationOptions): Promise<ValidationResult>;
}
/**
 * Create an empty validation result
 */
declare function createEmptyResult(): ValidationResult;
/**
 * Create a validation issue
 */
declare function createIssue(code: string, message: string, severity?: Severity, extra?: Partial<ValidationIssue>): ValidationIssue;
/**
 * Merge multiple validation results into one
 */
declare function mergeResults(...results: ValidationResult[]): ValidationResult;

/**
 * PKF Configuration Validator
 *
 * Validates pkf.config.yaml files against the PKF config schema
 * and verifies that referenced directories exist.
 */

/**
 * PKF Configuration structure as defined in the schema
 */
interface PkfConfigSchema {
    $schema?: string;
    version: string;
    project: {
        name: string;
        version?: string;
        description?: string;
        repository?: string;
    };
    structure?: {
        docsDir?: string;
        archiveDir?: string;
        registersDir?: string;
        templatesDir?: string;
        schemasDir?: string;
        agentsDir?: string;
    };
    registers?: {
        todoFile?: string;
        issuesFile?: string;
        changelogFile?: string;
        idPrefix?: {
            todo?: string;
            issue?: string;
            proposal?: string;
            adr?: string;
        };
        idPadding?: number;
    };
    ai?: {
        enabled?: boolean;
        guidanceFile?: string;
        systemPromptFile?: string;
        customAgents?: boolean;
    };
    packages?: {
        enabled?: boolean;
        directory?: string;
        inheritRules?: boolean;
    };
    validation?: {
        validateSchemas?: boolean;
        validateLinks?: boolean;
        requireNavHubs?: boolean;
    };
    proposals?: {
        enabled?: boolean;
        ranges?: Record<string, {
            min: number;
            max: number;
            description?: string;
        }>;
    };
}
/**
 * Options for config validation
 */
interface ConfigValidationOptions extends ValidationOptions {
    /** Path to the config file (defaults to pkf.config.yaml in rootDir) */
    configPath?: string;
    /** Path to the schema file (defaults to schemas/pkf-config.schema.json) */
    schemaPath?: string;
    /** Whether to skip directory existence checks */
    skipDirectoryChecks?: boolean;
    /** Whether to check optional directories (only checks configured ones if false) */
    checkOptionalDirectories?: boolean;
}
/**
 * Validate a PKF configuration file
 *
 * @param options - Validation options
 * @returns Validation result with errors, warnings, and info messages
 */
declare function validateConfig(options?: ConfigValidationOptions): Promise<ValidationResult>;
/**
 * Load and return the parsed PKF config
 *
 * @param options - Options for loading the config
 * @returns The parsed config or null if invalid
 */
declare function loadConfig(options?: ConfigValidationOptions): Promise<{
    config: PkfConfigSchema | null;
    result: ValidationResult;
}>;

/**
 * PKF TODO Register Validator
 *
 * Validates TODO.md files against the PKF TODO item schema.
 * Parses TODO items from markdown, validates frontmatter against schema,
 * and checks for ID uniqueness and valid date formats.
 */

/**
 * Options for TODO validation
 */
interface TodoValidationOptions extends ValidationOptions {
    /** Path to the TODO item schema. If not provided, uses default. */
    schemaPath?: string;
    /** Whether to validate date values are semantically valid */
    validateDates?: boolean;
    /** Whether to check for orphaned dependencies (references to non-existent TODOs) */
    checkDependencies?: boolean;
}
/**
 * Validate a TODO.md file
 *
 * @param todoPath - Path to the TODO.md file
 * @param options - Validation options
 * @returns Validation result with errors, warnings, and info messages
 */
declare function validateTodo(todoPath: string, options?: TodoValidationOptions): Promise<ValidationResult>;

/**
 * PKF Issue Validator
 *
 * Validates ISSUES.md register files against the PKF issue-item schema.
 * Parses issue items, validates frontmatter, checks ID uniqueness, and validates
 * status/severity values.
 */

/**
 * Parsed issue item from ISSUES.md
 */
interface ParsedIssueItem {
    /** The issue ID (e.g., ISSUE-001) */
    id: string;
    /** The issue title from the heading */
    title: string;
    /** Line number where the issue starts */
    lineNumber: number;
    /** The parsed frontmatter/YAML data */
    frontmatter: Record<string, unknown>;
    /** Raw YAML content */
    rawYaml: string;
}
/**
 * Main validation function for ISSUES.md
 *
 * @param issuesPath - Path to the ISSUES.md file
 * @param options - Validation options
 * @returns Validation result with errors and warnings
 */
declare function validateIssues(issuesPath: string, options?: ValidationOptions): Promise<ValidationResult>;
/**
 * Export the parsed issues for use by other validators/tools
 */
declare function parseIssues(issuesPath: string): Promise<ParsedIssueItem[]>;

/**
 * CHANGELOG.md Validator
 *
 * Validates CHANGELOG.md files against PKF standards including:
 * - Frontmatter schema validation (changelog-entry.schema.json)
 * - Semver format validation
 * - Date format validation
 * - Valid change types (added, changed, deprecated, removed, fixed, security)
 * - Reverse chronological order verification
 */

/**
 * Validate a CHANGELOG.md file
 *
 * @param changelogPath - Path to the CHANGELOG.md file
 * @param options - Validation options
 * @returns Validation result with all errors and warnings
 */
declare function validateChangelog(changelogPath: string, options?: ValidationOptions): Promise<ValidationResult>;
/**
 * Changelog Validator class implementing the Validator interface
 */
declare const changelogValidator: {
    name: string;
    description: string;
    validate(changelogPath: string, options?: ValidationOptions): Promise<ValidationResult>;
};

/**
 * PKF Frontmatter Validator
 *
 * Validates YAML frontmatter blocks in markdown files against JSON schemas.
 * Supports both standard --- delimited frontmatter and ```yaml code blocks.
 */

/**
 * Result of extracting frontmatter from content
 */
interface ExtractedFrontmatter {
    /** Parsed frontmatter data, or null if none found */
    data: Record<string, unknown> | null;
    /** Raw YAML string, or null if none found */
    raw: string | null;
    /** Line number where frontmatter starts (1-based) */
    line: number;
    /** The type of frontmatter block found */
    type: 'standard' | 'codeblock' | 'none';
}
/**
 * Options for frontmatter validation
 */
interface FrontmatterValidationOptions extends ValidationOptions {
    /** Path to the JSON schema file for validation */
    schemaPath?: string;
    /** Inline schema object (takes precedence over schemaPath) */
    schema?: object;
    /** Whether to validate common fields even without a schema */
    validateCommonFields?: boolean;
    /** Required frontmatter fields */
    requiredFields?: string[];
    /** Expected document type (validates against 'type' field in frontmatter) */
    expectedType?: string;
    /** Whether to allow additional properties not defined in schema */
    allowAdditionalProperties?: boolean;
}
/**
 * Extract YAML frontmatter from markdown content
 *
 * Supports two formats:
 * 1. Standard frontmatter: Content starting with --- delimiter
 * 2. YAML code block: ```yaml or ```yml at the start of the file
 *
 * @param content - The markdown content to extract frontmatter from
 * @returns Extracted frontmatter data, raw string, and line number
 */
declare function extractFrontmatter(content: string): ExtractedFrontmatter;
/**
 * Validate frontmatter content against a schema and common field rules
 *
 * @param content - The markdown content containing frontmatter
 * @param schema - JSON schema object to validate against
 * @param filePath - Optional file path for error reporting
 * @returns Validation result with errors, warnings, and info
 */
declare function validateFrontmatterContent(content: string, schema: object, filePath?: string): ValidationResult;
/**
 * Validate a markdown file's frontmatter
 *
 * @param filePath - Path to the markdown file
 * @param options - Validation options
 * @returns Validation result with errors, warnings, and info
 */
declare function validateFrontmatter(filePath: string, options?: FrontmatterValidationOptions): Promise<ValidationResult>;
/**
 * Batch validate multiple files' frontmatter
 *
 * @param filePaths - Array of file paths to validate
 * @param options - Validation options (applied to all files)
 * @returns Aggregated validation result
 */
declare function validateMultipleFrontmatter(filePaths: string[], options?: FrontmatterValidationOptions): Promise<ValidationResult>;
/**
 * Create a frontmatter schema for a specific document type
 *
 * @param docType - The document type name
 * @param requiredFields - Fields required for this document type
 * @param additionalProperties - Additional schema properties
 * @returns JSON Schema object
 */
declare function createFrontmatterSchema(docType: string, requiredFields?: string[], additionalProperties?: Record<string, object>): object;

/**
 * PKF Schema DSL Parser
 *
 * Parses PKF Schema DSL (YAML-based) files and converts them to JSON Schema format.
 * Supports schema inheritance via _extends, field definitions with types and constraints,
 * and generates valid JSON Schema draft-07 output.
 *
 * @see docs/framework/specifications/PKF-SCHEMA-DSL.md
 */

/**
 * Supported property types in PKF Schema DSL
 */
type SchemaPropertyType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
/**
 * Array item definition for array-type properties
 */
interface SchemaArrayItems {
    type: SchemaPropertyType;
    enum?: unknown[];
    pattern?: string;
}
/**
 * A single field/property definition in a schema
 */
interface SchemaField {
    /** Field name */
    name: string;
    /** Field type */
    type: SchemaPropertyType;
    /** Whether the field is required */
    required: boolean;
    /** Human-readable description */
    description?: string;
    /** Default value or placeholder */
    defaultValue?: unknown;
    /** Allowed values (for enums) */
    enum?: unknown[];
    /** Regex pattern for string validation */
    pattern?: string;
    /** Minimum value (for numbers) */
    minimum?: number;
    /** Maximum value (for numbers) */
    maximum?: number;
    /** Minimum string length */
    minLength?: number;
    /** Maximum string length */
    maxLength?: number;
    /** Array item schema */
    items?: SchemaArrayItems;
    /** Minimum array length */
    minItems?: number;
    /** Maximum array length */
    maxItems?: number;
    /** Whether array items must be unique */
    uniqueItems?: boolean;
}
/**
 * Metadata for a schema definition
 */
interface SchemaMetadata {
    /** Human-readable description */
    description?: string;
    /** Example file paths */
    examples?: string[];
    /** Whether this schema is deprecated */
    deprecated?: boolean;
    /** Schema version */
    version?: string;
}
/**
 * A complete schema definition
 */
interface SchemaDefinition {
    /** Schema name (identifier) */
    name: string;
    /** Parent schema to extend from */
    extends?: string;
    /** Field definitions */
    fields: SchemaField[];
    /** Schema metadata */
    metadata: SchemaMetadata;
}
/**
 * Inheritance relationship between schemas
 */
interface SchemaRelationship {
    /** Child schema name */
    child: string;
    /** Parent schema name */
    parent: string;
}
/**
 * Result of parsing a Schema DSL file
 */
interface ParsedSchemaDSL {
    /** DSL version */
    version: string;
    /** Parsed schema definitions */
    schemas: Map<string, SchemaDefinition>;
    /** Inheritance relationships */
    relationships: SchemaRelationship[];
    /** Schemas with resolved inheritance (fields from parents merged) */
    resolvedSchemas: Map<string, SchemaDefinition>;
}
/**
 * Parser for PKF Schema DSL files
 *
 * Parses YAML-based schema definitions and converts them to internal
 * schema representation and JSON Schema format.
 */
declare class SchemaDSLParser {
    private rawDSL;
    private parsed;
    private errors;
    private filePath;
    /**
     * Parse Schema DSL from a YAML string
     *
     * @param yamlContent - YAML content to parse
     * @param filePath - Optional file path for error reporting
     * @returns Parsed schema DSL or null if parsing failed
     */
    parse(yamlContent: string, filePath?: string): ParsedSchemaDSL | null;
    /**
     * Parse Schema DSL from a file
     *
     * @param filePath - Path to the YAML file
     * @returns Parsed schema DSL or null if parsing failed
     */
    parseFile(filePath: string): Promise<ParsedSchemaDSL | null>;
    /**
     * Get parsing errors
     */
    getErrors(): ValidationIssue[];
    /**
     * Get the last parsed result
     */
    getResult(): ParsedSchemaDSL | null;
    /**
     * Convert a parsed schema to JSON Schema format
     *
     * @param schemaName - Name of the schema to convert
     * @param useResolved - Whether to use resolved (inheritance merged) schema
     * @returns JSON Schema object or null if schema not found
     */
    toJsonSchema(schemaName: string, useResolved?: boolean): object | null;
    /**
     * Convert all parsed schemas to JSON Schema format
     *
     * @param useResolved - Whether to use resolved (inheritance merged) schemas
     * @returns Map of schema names to JSON Schema objects
     */
    toAllJsonSchemas(useResolved?: boolean): Map<string, object>;
    /**
     * Add an error to the error list
     */
    private addError;
    /**
     * Validate the basic structure of the raw DSL
     */
    private validateStructure;
    /**
     * Parse all schema definitions
     */
    private parseSchemas;
    /**
     * Parse a single schema definition
     */
    private parseSchemaDefinition;
    /**
     * Parse a single field definition
     */
    private parseFieldDefinition;
    /**
     * Validate field constraints are appropriate for the field type
     */
    private validateFieldConstraints;
    /**
     * Build inheritance relationships from parsed schemas
     */
    private buildRelationships;
    /**
     * Resolve schema inheritance by merging parent fields into children
     */
    private resolveInheritance;
    /**
     * Convert a SchemaDefinition to JSON Schema format
     */
    private schemaDefinitionToJsonSchema;
    /**
     * Convert a SchemaField to a JSON Schema property definition
     */
    private fieldToJsonSchemaProperty;
}
/**
 * Parse Schema DSL from YAML content
 *
 * @param yamlContent - YAML content to parse
 * @param filePath - Optional file path for error reporting
 * @returns Object containing parsed result and any errors
 */
declare function parseSchemasDSL(yamlContent: string, filePath?: string): {
    result: ParsedSchemaDSL | null;
    errors: ValidationIssue[];
};
/**
 * Parse Schema DSL from a file
 *
 * @param filePath - Path to the YAML file
 * @returns Object containing parsed result and any errors
 */
declare function parseSchemasDSLFile(filePath: string): Promise<{
    result: ParsedSchemaDSL | null;
    errors: ValidationIssue[];
}>;
/**
 * Convert Schema DSL YAML to JSON Schema
 *
 * @param yamlContent - YAML content to parse
 * @param schemaName - Optional specific schema name to convert (converts all if not specified)
 * @param useResolved - Whether to use resolved (inheritance merged) schemas
 * @returns Map of schema names to JSON Schema objects, or null on error
 */
declare function schemaDSLToJsonSchema(yamlContent: string, schemaName?: string, useResolved?: boolean): {
    schemas: Map<string, object> | null;
    errors: ValidationIssue[];
};
/**
 * Validate Schema DSL content
 *
 * @param yamlContent - YAML content to validate
 * @param filePath - Optional file path for error reporting
 * @returns ValidationResult with errors, warnings, and info
 */
declare function validateSchemaDSL(yamlContent: string, filePath?: string): ValidationResult;
/**
 * Validate Schema DSL from a file
 *
 * @param filePath - Path to the YAML file
 * @returns ValidationResult with errors, warnings, and info
 */
declare function validateSchemaDSLFile(filePath: string): Promise<ValidationResult>;

/**
 * PKF Validator
 * Main entry point for validation functions
 */

/**
 * Options for validateAll
 */
interface ValidateAllOptions extends ValidationOptions {
    /** Skip config validation */
    skipConfig?: boolean;
    /** Skip TODO validation */
    skipTodo?: boolean;
    /** Skip Issues validation */
    skipIssues?: boolean;
    /** Skip Changelog validation */
    skipChangelog?: boolean;
}
/**
 * Run all validators
 */
declare function validateAll(options?: ValidateAllOptions): Promise<ValidationResult>;

export { type ChangelogEntry, type ConfigValidationOptions, type ExtractedFrontmatter, type FrontmatterValidationOptions, type IssueItem, type ParsedIssueItem, type ParsedSchemaDSL, type PkfConfig, type PkfConfigSchema, type SchemaArrayItems, SchemaDSLParser, type SchemaDefinition, type SchemaField, type SchemaMetadata, type SchemaPropertyType, type SchemaRelationship, type Severity, type TodoItem, type TodoValidationOptions, type ValidateAllOptions, type ValidationIssue, type ValidationOptions, type ValidationResult, type Validator, changelogValidator, createEmptyResult, createFrontmatterSchema, createIssue, extractFrontmatter, loadConfig, mergeResults, parseIssues, parseSchemasDSL, parseSchemasDSLFile, schemaDSLToJsonSchema, validateAll, validateChangelog, validateConfig, validateFrontmatter, validateFrontmatterContent, validateIssues, validateMultipleFrontmatter, validateSchemaDSL, validateSchemaDSLFile, validateTodo };
