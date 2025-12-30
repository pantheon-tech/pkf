/**
 * PKF Schema DSL Parser
 *
 * Parses PKF Schema DSL (YAML-based) files and converts them to JSON Schema format.
 * Supports schema inheritance via _extends, field definitions with types and constraints,
 * and generates valid JSON Schema draft-07 output.
 *
 * @see docs/framework/specifications/PKF-SCHEMA-DSL.md
 */

import { parse as parseYaml } from 'yaml';
import {
  createEmptyResult,
  createIssue,
  type ValidationResult,
  type ValidationOptions,
  type ValidationIssue,
} from '../types/index.js';
import { fileExists, readTextFile, readYamlFile } from '../utils/index.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported property types in PKF Schema DSL
 */
export type SchemaPropertyType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

/**
 * Array item definition for array-type properties
 */
export interface SchemaArrayItems {
  type: SchemaPropertyType;
  enum?: unknown[];
  pattern?: string;
}

/**
 * A single field/property definition in a schema
 */
export interface SchemaField {
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
export interface SchemaMetadata {
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
export interface SchemaDefinition {
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
export interface SchemaRelationship {
  /** Child schema name */
  child: string;
  /** Parent schema name */
  parent: string;
}

/**
 * Result of parsing a Schema DSL file
 */
export interface ParsedSchemaDSL {
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
 * Raw property definition as it appears in the YAML
 */
interface RawPropertyDefinition {
  type: string;
  required?: boolean;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  items?: {
    type?: string;
    enum?: unknown[];
    pattern?: string;
  };
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

/**
 * Raw schema definition as it appears in the YAML
 */
interface RawSchemaDefinition {
  _extends?: string;
  _description?: string;
  _examples?: string[];
  _deprecated?: boolean;
  _version?: string;
  properties?: Record<string, RawPropertyDefinition>;
}

/**
 * Raw DSL file structure
 */
interface RawSchemaDSL {
  version: string;
  schemas: Record<string, RawSchemaDefinition>;
}

// ============================================================================
// SchemaDSLParser Class
// ============================================================================

/**
 * Parser for PKF Schema DSL files
 *
 * Parses YAML-based schema definitions and converts them to internal
 * schema representation and JSON Schema format.
 */
export class SchemaDSLParser {
  private rawDSL: RawSchemaDSL | null = null;
  private parsed: ParsedSchemaDSL | null = null;
  private errors: ValidationIssue[] = [];
  private filePath: string | null = null;

  /**
   * Parse Schema DSL from a YAML string
   *
   * @param yamlContent - YAML content to parse
   * @param filePath - Optional file path for error reporting
   * @returns Parsed schema DSL or null if parsing failed
   */
  parse(yamlContent: string, filePath?: string): ParsedSchemaDSL | null {
    this.errors = [];
    this.filePath = filePath || null;

    try {
      // Parse YAML
      const raw = parseYaml(yamlContent) as RawSchemaDSL;
      this.rawDSL = raw;

      // Validate basic structure
      if (!this.validateStructure(raw)) {
        return null;
      }

      // Parse schemas
      const schemas = this.parseSchemas(raw.schemas);
      if (!schemas) {
        return null;
      }

      // Build relationships
      const relationships = this.buildRelationships(schemas);

      // Resolve inheritance
      const resolvedSchemas = this.resolveInheritance(schemas, relationships);
      if (!resolvedSchemas) {
        return null;
      }

      this.parsed = {
        version: raw.version,
        schemas,
        relationships,
        resolvedSchemas,
      };

      return this.parsed;
    } catch (error) {
      this.addError(
        'DSL_PARSE_ERROR',
        `Failed to parse Schema DSL: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Parse Schema DSL from a file
   *
   * @param filePath - Path to the YAML file
   * @returns Parsed schema DSL or null if parsing failed
   */
  async parseFile(filePath: string): Promise<ParsedSchemaDSL | null> {
    this.filePath = filePath;
    this.errors = [];

    if (!(await fileExists(filePath))) {
      this.addError('FILE_NOT_FOUND', `Schema DSL file not found: ${filePath}`);
      return null;
    }

    try {
      const content = await readTextFile(filePath);
      return this.parse(content, filePath);
    } catch (error) {
      this.addError(
        'FILE_READ_ERROR',
        `Failed to read Schema DSL file: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Get parsing errors
   */
  getErrors(): ValidationIssue[] {
    return [...this.errors];
  }

  /**
   * Get the last parsed result
   */
  getResult(): ParsedSchemaDSL | null {
    return this.parsed;
  }

  /**
   * Convert a parsed schema to JSON Schema format
   *
   * @param schemaName - Name of the schema to convert
   * @param useResolved - Whether to use resolved (inheritance merged) schema
   * @returns JSON Schema object or null if schema not found
   */
  toJsonSchema(schemaName: string, useResolved: boolean = true): object | null {
    if (!this.parsed) {
      return null;
    }

    const schemaMap = useResolved ? this.parsed.resolvedSchemas : this.parsed.schemas;
    const schema = schemaMap.get(schemaName);

    if (!schema) {
      return null;
    }

    return this.schemaDefinitionToJsonSchema(schema);
  }

  /**
   * Convert all parsed schemas to JSON Schema format
   *
   * @param useResolved - Whether to use resolved (inheritance merged) schemas
   * @returns Map of schema names to JSON Schema objects
   */
  toAllJsonSchemas(useResolved: boolean = true): Map<string, object> {
    const result = new Map<string, object>();

    if (!this.parsed) {
      return result;
    }

    const schemaMap = useResolved ? this.parsed.resolvedSchemas : this.parsed.schemas;

    for (const [name, schema] of schemaMap) {
      const jsonSchema = this.schemaDefinitionToJsonSchema(schema);
      result.set(name, jsonSchema);
    }

    return result;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Add an error to the error list
   */
  private addError(code: string, message: string, line?: number): void {
    this.errors.push(
      createIssue(code, message, 'error', {
        filePath: this.filePath || undefined,
        line,
      })
    );
  }

  /**
   * Validate the basic structure of the raw DSL
   */
  private validateStructure(raw: RawSchemaDSL): boolean {
    if (!raw || typeof raw !== 'object') {
      this.addError('INVALID_STRUCTURE', 'Schema DSL must be a valid YAML object');
      return false;
    }

    if (!raw.version) {
      this.addError('MISSING_VERSION', 'Schema DSL must have a "version" field');
      return false;
    }

    if (!/^\d+\.\d+$/.test(raw.version)) {
      this.addError(
        'INVALID_VERSION',
        `Invalid version format: "${raw.version}". Expected format: "X.Y" (e.g., "1.0")`
      );
      return false;
    }

    if (!raw.schemas || typeof raw.schemas !== 'object') {
      this.addError('MISSING_SCHEMAS', 'Schema DSL must have a "schemas" object');
      return false;
    }

    if (Object.keys(raw.schemas).length === 0) {
      this.addError('EMPTY_SCHEMAS', 'Schema DSL must define at least one schema');
      return false;
    }

    return true;
  }

  /**
   * Parse all schema definitions
   */
  private parseSchemas(
    rawSchemas: Record<string, RawSchemaDefinition>
  ): Map<string, SchemaDefinition> | null {
    const schemas = new Map<string, SchemaDefinition>();
    let hasErrors = false;

    for (const [name, rawSchema] of Object.entries(rawSchemas)) {
      // Validate schema name format
      if (!/^[a-z][a-z0-9-]*$/.test(name)) {
        this.addError(
          'INVALID_SCHEMA_NAME',
          `Invalid schema name: "${name}". Must be lowercase alphanumeric with hyphens, starting with a letter.`
        );
        hasErrors = true;
        continue;
      }

      const schema = this.parseSchemaDefinition(name, rawSchema);
      if (schema) {
        schemas.set(name, schema);
      } else {
        hasErrors = true;
      }
    }

    return hasErrors && schemas.size === 0 ? null : schemas;
  }

  /**
   * Parse a single schema definition
   */
  private parseSchemaDefinition(
    name: string,
    raw: RawSchemaDefinition
  ): SchemaDefinition | null {
    if (!raw || typeof raw !== 'object') {
      this.addError('INVALID_SCHEMA', `Schema "${name}" must be an object`);
      return null;
    }

    // Parse metadata
    const metadata: SchemaMetadata = {
      description: raw._description,
      examples: raw._examples,
      deprecated: raw._deprecated,
      version: raw._version,
    };

    // Parse fields from properties
    const fields: SchemaField[] = [];

    if (raw.properties && typeof raw.properties === 'object') {
      for (const [propName, propDef] of Object.entries(raw.properties)) {
        // Validate property name format
        if (!/^[a-z][a-z0-9_-]*$/.test(propName)) {
          this.addError(
            'INVALID_PROPERTY_NAME',
            `Invalid property name "${propName}" in schema "${name}". Must be lowercase alphanumeric with hyphens/underscores, starting with a letter.`
          );
          continue;
        }

        const field = this.parseFieldDefinition(name, propName, propDef);
        if (field) {
          fields.push(field);
        }
      }
    }

    return {
      name,
      extends: raw._extends,
      fields,
      metadata,
    };
  }

  /**
   * Parse a single field definition
   */
  private parseFieldDefinition(
    schemaName: string,
    fieldName: string,
    raw: RawPropertyDefinition
  ): SchemaField | null {
    if (!raw || typeof raw !== 'object') {
      this.addError(
        'INVALID_PROPERTY',
        `Property "${fieldName}" in schema "${schemaName}" must be an object`
      );
      return null;
    }

    if (!raw.type) {
      this.addError(
        'MISSING_TYPE',
        `Property "${fieldName}" in schema "${schemaName}" must have a "type" field`
      );
      return null;
    }

    const validTypes: SchemaPropertyType[] = ['string', 'number', 'boolean', 'date', 'array', 'object'];
    if (!validTypes.includes(raw.type as SchemaPropertyType)) {
      this.addError(
        'INVALID_TYPE',
        `Property "${fieldName}" in schema "${schemaName}" has invalid type "${raw.type}". ` +
          `Must be one of: ${validTypes.join(', ')}`
      );
      return null;
    }

    const field: SchemaField = {
      name: fieldName,
      type: raw.type as SchemaPropertyType,
      required: raw.required ?? false,
      description: raw.description,
      defaultValue: raw.default,
      enum: raw.enum,
      pattern: raw.pattern,
      minimum: raw.minimum,
      maximum: raw.maximum,
      minLength: raw.minLength,
      maxLength: raw.maxLength,
      minItems: raw.minItems,
      maxItems: raw.maxItems,
      uniqueItems: raw.uniqueItems,
    };

    // Parse array items if present
    if (raw.type === 'array' && raw.items) {
      field.items = {
        type: (raw.items.type as SchemaPropertyType) || 'string',
        enum: raw.items.enum,
        pattern: raw.items.pattern,
      };
    }

    // Validate constraints based on type
    this.validateFieldConstraints(schemaName, field);

    return field;
  }

  /**
   * Validate field constraints are appropriate for the field type
   */
  private validateFieldConstraints(schemaName: string, field: SchemaField): void {
    const { name, type } = field;

    // String-specific constraints
    if (type !== 'string' && type !== 'date') {
      if (field.pattern !== undefined) {
        this.errors.push(
          createIssue(
            'INVALID_CONSTRAINT',
            `Property "${name}" in schema "${schemaName}": "pattern" is only valid for string/date types`,
            'warning',
            { filePath: this.filePath || undefined }
          )
        );
      }
      if (field.minLength !== undefined || field.maxLength !== undefined) {
        this.errors.push(
          createIssue(
            'INVALID_CONSTRAINT',
            `Property "${name}" in schema "${schemaName}": "minLength/maxLength" are only valid for string types`,
            'warning',
            { filePath: this.filePath || undefined }
          )
        );
      }
    }

    // Number-specific constraints
    if (type !== 'number') {
      if (field.minimum !== undefined || field.maximum !== undefined) {
        this.errors.push(
          createIssue(
            'INVALID_CONSTRAINT',
            `Property "${name}" in schema "${schemaName}": "minimum/maximum" are only valid for number types`,
            'warning',
            { filePath: this.filePath || undefined }
          )
        );
      }
    }

    // Array-specific constraints
    if (type !== 'array') {
      if (field.items !== undefined || field.minItems !== undefined ||
          field.maxItems !== undefined || field.uniqueItems !== undefined) {
        this.errors.push(
          createIssue(
            'INVALID_CONSTRAINT',
            `Property "${name}" in schema "${schemaName}": array constraints are only valid for array types`,
            'warning',
            { filePath: this.filePath || undefined }
          )
        );
      }
    }
  }

  /**
   * Build inheritance relationships from parsed schemas
   */
  private buildRelationships(schemas: Map<string, SchemaDefinition>): SchemaRelationship[] {
    const relationships: SchemaRelationship[] = [];

    for (const [name, schema] of schemas) {
      if (schema.extends) {
        relationships.push({
          child: name,
          parent: schema.extends,
        });
      }
    }

    return relationships;
  }

  /**
   * Resolve schema inheritance by merging parent fields into children
   */
  private resolveInheritance(
    schemas: Map<string, SchemaDefinition>,
    relationships: SchemaRelationship[]
  ): Map<string, SchemaDefinition> | null {
    const resolved = new Map<string, SchemaDefinition>();
    const visited = new Set<string>();
    const visiting = new Set<string>();

    // Validate all extends references exist
    for (const rel of relationships) {
      if (!schemas.has(rel.parent)) {
        this.addError(
          'UNKNOWN_PARENT',
          `Schema "${rel.child}" extends unknown schema "${rel.parent}"`
        );
        return null;
      }
    }

    // Resolve each schema (topological sort via DFS)
    const resolveSchema = (name: string): SchemaDefinition | null => {
      if (resolved.has(name)) {
        return resolved.get(name)!;
      }

      if (visiting.has(name)) {
        this.addError(
          'CIRCULAR_INHERITANCE',
          `Circular inheritance detected involving schema "${name}"`
        );
        return null;
      }

      const schema = schemas.get(name);
      if (!schema) {
        return null;
      }

      visiting.add(name);

      let resolvedFields: SchemaField[];

      if (schema.extends) {
        // First resolve the parent
        const parentResolved = resolveSchema(schema.extends);
        if (!parentResolved) {
          visiting.delete(name);
          return null;
        }

        // Merge fields: parent fields first, then child fields (child overrides)
        const fieldMap = new Map<string, SchemaField>();

        for (const field of parentResolved.fields) {
          fieldMap.set(field.name, { ...field });
        }

        for (const field of schema.fields) {
          fieldMap.set(field.name, { ...field });
        }

        resolvedFields = Array.from(fieldMap.values());
      } else {
        resolvedFields = schema.fields.map(f => ({ ...f }));
      }

      const resolvedSchema: SchemaDefinition = {
        name: schema.name,
        extends: schema.extends,
        fields: resolvedFields,
        metadata: { ...schema.metadata },
      };

      visiting.delete(name);
      visited.add(name);
      resolved.set(name, resolvedSchema);

      return resolvedSchema;
    };

    // Resolve all schemas
    for (const name of schemas.keys()) {
      if (!resolveSchema(name)) {
        return null;
      }
    }

    return resolved;
  }

  /**
   * Convert a SchemaDefinition to JSON Schema format
   */
  private schemaDefinitionToJsonSchema(schema: SchemaDefinition): object {
    const jsonSchema: Record<string, unknown> = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
    };

    // Add metadata
    if (schema.metadata.description) {
      jsonSchema.description = schema.metadata.description;
    }

    // Collect required fields and build properties
    const required: string[] = [];
    const properties: Record<string, object> = {};

    for (const field of schema.fields) {
      if (field.required) {
        required.push(field.name);
      }
      properties[field.name] = this.fieldToJsonSchemaProperty(field);
    }

    if (required.length > 0) {
      jsonSchema.required = required;
    }

    if (Object.keys(properties).length > 0) {
      jsonSchema.properties = properties;
    }

    return jsonSchema;
  }

  /**
   * Convert a SchemaField to a JSON Schema property definition
   */
  private fieldToJsonSchemaProperty(field: SchemaField): object {
    const prop: Record<string, unknown> = {};

    // Map PKF types to JSON Schema types
    switch (field.type) {
      case 'string':
        prop.type = 'string';
        break;
      case 'number':
        prop.type = 'number';
        break;
      case 'boolean':
        prop.type = 'boolean';
        break;
      case 'date':
        // Date is represented as a string with format
        prop.type = 'string';
        prop.format = 'date';
        break;
      case 'array':
        prop.type = 'array';
        break;
      case 'object':
        prop.type = 'object';
        break;
    }

    // Add description
    if (field.description) {
      prop.description = field.description;
    }

    // Add default value (skip placeholders for JSON Schema)
    if (field.defaultValue !== undefined) {
      const defaultStr = String(field.defaultValue);
      // Skip placeholder defaults like {{TODAY}}, {{GIT_USER}}
      if (!defaultStr.startsWith('{{') || !defaultStr.endsWith('}}')) {
        prop.default = field.defaultValue;
      }
    }

    // Add enum
    if (field.enum && field.enum.length > 0) {
      prop.enum = field.enum;
    }

    // Add pattern (for string types)
    if (field.pattern && (field.type === 'string' || field.type === 'date')) {
      prop.pattern = field.pattern;
    }

    // Add number constraints
    if (field.type === 'number') {
      if (field.minimum !== undefined) {
        prop.minimum = field.minimum;
      }
      if (field.maximum !== undefined) {
        prop.maximum = field.maximum;
      }
    }

    // Add string length constraints
    if (field.type === 'string') {
      if (field.minLength !== undefined) {
        prop.minLength = field.minLength;
      }
      if (field.maxLength !== undefined) {
        prop.maxLength = field.maxLength;
      }
    }

    // Add array constraints
    if (field.type === 'array') {
      if (field.items) {
        const itemSchema: Record<string, unknown> = {
          type: field.items.type === 'date' ? 'string' : field.items.type,
        };
        if (field.items.type === 'date') {
          itemSchema.format = 'date';
        }
        if (field.items.enum) {
          itemSchema.enum = field.items.enum;
        }
        if (field.items.pattern) {
          itemSchema.pattern = field.items.pattern;
        }
        prop.items = itemSchema;
      }
      if (field.minItems !== undefined) {
        prop.minItems = field.minItems;
      }
      if (field.maxItems !== undefined) {
        prop.maxItems = field.maxItems;
      }
      if (field.uniqueItems !== undefined) {
        prop.uniqueItems = field.uniqueItems;
      }
    }

    return prop;
  }
}

// ============================================================================
// Standalone Functions
// ============================================================================

/**
 * Parse Schema DSL from YAML content
 *
 * @param yamlContent - YAML content to parse
 * @param filePath - Optional file path for error reporting
 * @returns Object containing parsed result and any errors
 */
export function parseSchemasDSL(
  yamlContent: string,
  filePath?: string
): { result: ParsedSchemaDSL | null; errors: ValidationIssue[] } {
  const parser = new SchemaDSLParser();
  const result = parser.parse(yamlContent, filePath);
  return {
    result,
    errors: parser.getErrors(),
  };
}

/**
 * Parse Schema DSL from a file
 *
 * @param filePath - Path to the YAML file
 * @returns Object containing parsed result and any errors
 */
export async function parseSchemasDSLFile(
  filePath: string
): Promise<{ result: ParsedSchemaDSL | null; errors: ValidationIssue[] }> {
  const parser = new SchemaDSLParser();
  const result = await parser.parseFile(filePath);
  return {
    result,
    errors: parser.getErrors(),
  };
}

/**
 * Convert Schema DSL YAML to JSON Schema
 *
 * @param yamlContent - YAML content to parse
 * @param schemaName - Optional specific schema name to convert (converts all if not specified)
 * @param useResolved - Whether to use resolved (inheritance merged) schemas
 * @returns Map of schema names to JSON Schema objects, or null on error
 */
export function schemaDSLToJsonSchema(
  yamlContent: string,
  schemaName?: string,
  useResolved: boolean = true
): { schemas: Map<string, object> | null; errors: ValidationIssue[] } {
  const parser = new SchemaDSLParser();
  const parseResult = parser.parse(yamlContent);

  if (!parseResult) {
    return {
      schemas: null,
      errors: parser.getErrors(),
    };
  }

  if (schemaName) {
    const jsonSchema = parser.toJsonSchema(schemaName, useResolved);
    if (!jsonSchema) {
      return {
        schemas: null,
        errors: [
          createIssue('SCHEMA_NOT_FOUND', `Schema "${schemaName}" not found in DSL`, 'error'),
        ],
      };
    }
    const result = new Map<string, object>();
    result.set(schemaName, jsonSchema);
    return { schemas: result, errors: [] };
  }

  return {
    schemas: parser.toAllJsonSchemas(useResolved),
    errors: parser.getErrors(),
  };
}

/**
 * Validate Schema DSL content
 *
 * @param yamlContent - YAML content to validate
 * @param filePath - Optional file path for error reporting
 * @returns ValidationResult with errors, warnings, and info
 */
export function validateSchemaDSL(
  yamlContent: string,
  filePath?: string
): ValidationResult {
  const startTime = Date.now();
  const result = createEmptyResult();

  const parser = new SchemaDSLParser();
  const parseResult = parser.parse(yamlContent, filePath);
  const errors = parser.getErrors();

  // Separate errors and warnings
  for (const issue of errors) {
    if (issue.severity === 'error') {
      result.errors.push(issue);
    } else if (issue.severity === 'warning') {
      result.warnings.push(issue);
    } else {
      result.info.push(issue);
    }
  }

  if (parseResult) {
    result.itemCount = parseResult.schemas.size;

    // Add info about parsed schemas
    result.info.push(
      createIssue(
        'SCHEMAS_PARSED',
        `Successfully parsed ${parseResult.schemas.size} schema(s): ${Array.from(parseResult.schemas.keys()).join(', ')}`,
        'info',
        { filePath }
      )
    );

    // Add info about inheritance
    if (parseResult.relationships.length > 0) {
      result.info.push(
        createIssue(
          'INHERITANCE_RESOLVED',
          `Resolved ${parseResult.relationships.length} inheritance relationship(s)`,
          'info',
          { filePath }
        )
      );
    }
  }

  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;

  return result;
}

/**
 * Validate Schema DSL from a file
 *
 * @param filePath - Path to the YAML file
 * @returns ValidationResult with errors, warnings, and info
 */
export async function validateSchemaDSLFile(
  filePath: string
): Promise<ValidationResult> {
  const startTime = Date.now();

  if (!(await fileExists(filePath))) {
    const result = createEmptyResult();
    result.errors.push(
      createIssue('FILE_NOT_FOUND', `Schema DSL file not found: ${filePath}`, 'error', {
        filePath,
      })
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }

  try {
    const content = await readTextFile(filePath);
    return validateSchemaDSL(content, filePath);
  } catch (error) {
    const result = createEmptyResult();
    result.errors.push(
      createIssue(
        'FILE_READ_ERROR',
        `Failed to read Schema DSL file: ${error instanceof Error ? error.message : String(error)}`,
        'error',
        { filePath }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
}

/**
 * Default export
 */
export default SchemaDSLParser;
