/**
 * Tests for the Schema DSL Parser
 *
 * Tests parsing of PKF Schema DSL (YAML-based) files and conversion to JSON Schema format.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  SchemaDSLParser,
  parseSchemasDSL,
  schemaDSLToJsonSchema,
  validateSchemaDSL,
} from '../../src/parsers/index.js';

const fixturesDir = join(__dirname, '..', 'fixtures');
let exampleDSL: string;

beforeAll(async () => {
  exampleDSL = await readFile(join(fixturesDir, 'schema-dsl-example.yaml'), 'utf-8');
});

describe('SchemaDSLParser', () => {
  describe('Basic Parsing', () => {
    it('should parse a valid Schema DSL YAML', () => {
      const parser = new SchemaDSLParser();
      const result = parser.parse(exampleDSL);

      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.0');
      expect(result?.schemas.size).toBeGreaterThan(0);
    });

    it('should return null for invalid YAML', () => {
      const parser = new SchemaDSLParser();
      const result = parser.parse('invalid: yaml: syntax: [');

      expect(result).toBeNull();
      expect(parser.getErrors()).toHaveLength(1);
      expect(parser.getErrors()[0]?.code).toBe('DSL_PARSE_ERROR');
    });

    it('should require version field', () => {
      const parser = new SchemaDSLParser();
      const yaml = `
schemas:
  test-schema:
    properties:
      name:
        type: string
`;
      const result = parser.parse(yaml);

      expect(result).toBeNull();
      expect(parser.getErrors().some(e => e.code === 'MISSING_VERSION')).toBe(true);
    });

    it('should validate version format (X.Y)', () => {
      const parser = new SchemaDSLParser();
      const yaml = `
version: "invalid"
schemas:
  test-schema:
    properties:
      name:
        type: string
`;
      const result = parser.parse(yaml);

      expect(result).toBeNull();
      expect(parser.getErrors().some(e => e.code === 'INVALID_VERSION')).toBe(true);
    });

    it('should require schemas object', () => {
      const parser = new SchemaDSLParser();
      const yaml = `version: "1.0"`;
      const result = parser.parse(yaml);

      expect(result).toBeNull();
      expect(parser.getErrors().some(e => e.code === 'MISSING_SCHEMAS')).toBe(true);
    });

    it('should require at least one schema', () => {
      const parser = new SchemaDSLParser();
      const yaml = `
version: "1.0"
schemas: {}
`;
      const result = parser.parse(yaml);

      expect(result).toBeNull();
      expect(parser.getErrors().some(e => e.code === 'EMPTY_SCHEMAS')).toBe(true);
    });
  });

  describe('Schema Name Validation', () => {
    it('should reject invalid schema names', () => {
      const parser = new SchemaDSLParser();
      const yaml = `
version: "1.0"
schemas:
  InvalidName:
    properties:
      name:
        type: string
`;
      const result = parser.parse(yaml);

      expect(parser.getErrors().some(e => e.code === 'INVALID_SCHEMA_NAME')).toBe(true);
    });

    it('should accept valid lowercase schema names with hyphens', () => {
      const parser = new SchemaDSLParser();
      const yaml = `
version: "1.0"
schemas:
  valid-schema-name:
    properties:
      name:
        type: string
`;
      const result = parser.parse(yaml);

      expect(result).not.toBeNull();
      expect(result?.schemas.has('valid-schema-name')).toBe(true);
    });

    it('should accept schema names with numbers', () => {
      const parser = new SchemaDSLParser();
      const yaml = `
version: "1.0"
schemas:
  schema-v2:
    properties:
      name:
        type: string
`;
      const result = parser.parse(yaml);

      expect(result).not.toBeNull();
      expect(result?.schemas.has('schema-v2')).toBe(true);
    });
  });

  describe('Field Type Validation', () => {
    it('should parse all valid types (string, number, boolean, date, array, object)', () => {
      const yaml = `
version: "1.0"
schemas:
  all-types:
    properties:
      string-field:
        type: string
      number-field:
        type: number
      boolean-field:
        type: boolean
      date-field:
        type: date
      array-field:
        type: array
        items:
          type: string
      object-field:
        type: object
`;
      const parser = new SchemaDSLParser();
      const result = parser.parse(yaml);

      expect(result).not.toBeNull();
      const schema = result?.schemas.get('all-types');
      expect(schema?.fields).toHaveLength(6);

      const fieldTypes = schema?.fields.map(f => f.type);
      expect(fieldTypes).toContain('string');
      expect(fieldTypes).toContain('number');
      expect(fieldTypes).toContain('boolean');
      expect(fieldTypes).toContain('date');
      expect(fieldTypes).toContain('array');
      expect(fieldTypes).toContain('object');
    });

    it('should reject invalid types', () => {
      const yaml = `
version: "1.0"
schemas:
  invalid-type:
    properties:
      bad-field:
        type: invalid-type
`;
      const parser = new SchemaDSLParser();
      const result = parser.parse(yaml);

      expect(parser.getErrors().some(e => e.code === 'INVALID_TYPE')).toBe(true);
    });

    it('should require type field on properties', () => {
      const yaml = `
version: "1.0"
schemas:
  missing-type:
    properties:
      bad-field:
        description: "No type specified"
`;
      const parser = new SchemaDSLParser();
      const result = parser.parse(yaml);

      expect(parser.getErrors().some(e => e.code === 'MISSING_TYPE')).toBe(true);
    });
  });

  describe('Required Fields Handling', () => {
    it('should correctly identify required fields', () => {
      const yaml = `
version: "1.0"
schemas:
  with-required:
    properties:
      required-field:
        type: string
        required: true
      optional-field:
        type: string
        required: false
      default-optional:
        type: string
`;
      const parser = new SchemaDSLParser();
      const result = parser.parse(yaml);

      expect(result).not.toBeNull();
      const schema = result?.schemas.get('with-required');

      const requiredField = schema?.fields.find(f => f.name === 'required-field');
      const optionalField = schema?.fields.find(f => f.name === 'optional-field');
      const defaultOptional = schema?.fields.find(f => f.name === 'default-optional');

      expect(requiredField?.required).toBe(true);
      expect(optionalField?.required).toBe(false);
      expect(defaultOptional?.required).toBe(false);
    });
  });

  describe('Array and Object Types', () => {
    it('should parse array fields with items definition', () => {
      const yaml = `
version: "1.0"
schemas:
  with-arrays:
    properties:
      tags:
        type: array
        items:
          type: string
        minItems: 1
        maxItems: 10
        uniqueItems: true
`;
      const parser = new SchemaDSLParser();
      const result = parser.parse(yaml);

      expect(result).not.toBeNull();
      const schema = result?.schemas.get('with-arrays');
      const tagsField = schema?.fields.find(f => f.name === 'tags');

      expect(tagsField?.type).toBe('array');
      expect(tagsField?.items?.type).toBe('string');
      expect(tagsField?.minItems).toBe(1);
      expect(tagsField?.maxItems).toBe(10);
      expect(tagsField?.uniqueItems).toBe(true);
    });

    it('should parse array items with enum', () => {
      const yaml = `
version: "1.0"
schemas:
  with-enum-array:
    properties:
      status-list:
        type: array
        items:
          type: string
          enum:
            - active
            - inactive
            - pending
`;
      const parser = new SchemaDSLParser();
      const result = parser.parse(yaml);

      expect(result).not.toBeNull();
      const schema = result?.schemas.get('with-enum-array');
      const field = schema?.fields.find(f => f.name === 'status-list');

      expect(field?.items?.enum).toEqual(['active', 'inactive', 'pending']);
    });

    it('should warn when array constraints are used on non-array types', () => {
      const yaml = `
version: "1.0"
schemas:
  invalid-constraints:
    properties:
      bad-field:
        type: string
        minItems: 1
`;
      const parser = new SchemaDSLParser();
      parser.parse(yaml);

      expect(parser.getErrors().some(e =>
        e.code === 'INVALID_CONSTRAINT' && e.severity === 'warning'
      )).toBe(true);
    });
  });

  describe('Schema Inheritance via _extends', () => {
    it('should resolve simple inheritance', () => {
      const parser = new SchemaDSLParser();
      const result = parser.parse(exampleDSL);

      expect(result).not.toBeNull();

      // todo-item extends base-document
      const todoSchema = result?.resolvedSchemas.get('todo-item');
      expect(todoSchema).toBeDefined();

      // Should have fields from both base-document and todo-item
      const fieldNames = todoSchema?.fields.map(f => f.name);
      expect(fieldNames).toContain('type');    // from base-document
      expect(fieldNames).toContain('title');   // from base-document
      expect(fieldNames).toContain('created'); // from base-document
      expect(fieldNames).toContain('id');      // from todo-item
      expect(fieldNames).toContain('status');  // from todo-item
      expect(fieldNames).toContain('priority'); // from todo-item
    });

    it('should track relationships', () => {
      const parser = new SchemaDSLParser();
      const result = parser.parse(exampleDSL);

      expect(result).not.toBeNull();
      expect(result?.relationships.length).toBeGreaterThan(0);

      const todoRelation = result?.relationships.find(r => r.child === 'todo-item');
      expect(todoRelation?.parent).toBe('base-document');
    });

    it('should error on unknown parent schema', () => {
      const yaml = `
version: "1.0"
schemas:
  child-schema:
    _extends: nonexistent-parent
    properties:
      name:
        type: string
`;
      const parser = new SchemaDSLParser();
      const result = parser.parse(yaml);

      expect(result).toBeNull();
      expect(parser.getErrors().some(e => e.code === 'UNKNOWN_PARENT')).toBe(true);
    });

    it('should detect circular inheritance', () => {
      const yaml = `
version: "1.0"
schemas:
  schema-a:
    _extends: schema-b
    properties:
      field-a:
        type: string
  schema-b:
    _extends: schema-a
    properties:
      field-b:
        type: string
`;
      const parser = new SchemaDSLParser();
      const result = parser.parse(yaml);

      expect(result).toBeNull();
      expect(parser.getErrors().some(e => e.code === 'CIRCULAR_INHERITANCE')).toBe(true);
    });

    it('should allow child fields to override parent fields', () => {
      const yaml = `
version: "1.0"
schemas:
  parent:
    properties:
      shared-field:
        type: string
        description: "Parent description"
  child:
    _extends: parent
    properties:
      shared-field:
        type: string
        description: "Child description"
        required: true
`;
      const parser = new SchemaDSLParser();
      const result = parser.parse(yaml);

      expect(result).not.toBeNull();
      const childResolved = result?.resolvedSchemas.get('child');
      const sharedField = childResolved?.fields.find(f => f.name === 'shared-field');

      expect(sharedField?.description).toBe('Child description');
      expect(sharedField?.required).toBe(true);
    });
  });

  describe('Metadata Parsing', () => {
    it('should parse schema metadata (_description, _examples, _deprecated, _version)', () => {
      const parser = new SchemaDSLParser();
      const result = parser.parse(exampleDSL);

      expect(result).not.toBeNull();

      const baseSchema = result?.schemas.get('base-document');
      expect(baseSchema?.metadata.description).toBe('Base schema for PKF documents');
      expect(baseSchema?.metadata.version).toBe('1.0.0');

      const todoSchema = result?.schemas.get('todo-item');
      expect(todoSchema?.metadata.description).toBe('Schema for TODO register items');
      expect(todoSchema?.metadata.examples).toContain('docs/registers/TODO.md');

      const issueSchema = result?.schemas.get('issue-item');
      expect(issueSchema?.metadata.deprecated).toBe(false);
    });
  });

  describe('String Constraints', () => {
    it('should parse string constraints (pattern, minLength, maxLength)', () => {
      const yaml = `
version: "1.0"
schemas:
  string-constraints:
    properties:
      id:
        type: string
        pattern: "^ID-\\\\d{4}$"
        minLength: 7
        maxLength: 7
      description:
        type: string
        minLength: 10
        maxLength: 1000
`;
      const parser = new SchemaDSLParser();
      const result = parser.parse(yaml);

      expect(result).not.toBeNull();
      const schema = result?.schemas.get('string-constraints');

      const idField = schema?.fields.find(f => f.name === 'id');
      expect(idField?.pattern).toBeDefined();
      expect(idField?.minLength).toBe(7);
      expect(idField?.maxLength).toBe(7);

      const descField = schema?.fields.find(f => f.name === 'description');
      expect(descField?.minLength).toBe(10);
      expect(descField?.maxLength).toBe(1000);
    });

    it('should warn when string constraints are used on non-string types', () => {
      const yaml = `
version: "1.0"
schemas:
  invalid-string-constraint:
    properties:
      count:
        type: number
        minLength: 1
`;
      const parser = new SchemaDSLParser();
      parser.parse(yaml);

      expect(parser.getErrors().some(e =>
        e.code === 'INVALID_CONSTRAINT' && e.severity === 'warning'
      )).toBe(true);
    });
  });

  describe('Number Constraints', () => {
    it('should parse number constraints (minimum, maximum)', () => {
      const yaml = `
version: "1.0"
schemas:
  number-constraints:
    properties:
      percentage:
        type: number
        minimum: 0
        maximum: 100
      temperature:
        type: number
        minimum: -273.15
`;
      const parser = new SchemaDSLParser();
      const result = parser.parse(yaml);

      expect(result).not.toBeNull();
      const schema = result?.schemas.get('number-constraints');

      const percentField = schema?.fields.find(f => f.name === 'percentage');
      expect(percentField?.minimum).toBe(0);
      expect(percentField?.maximum).toBe(100);

      const tempField = schema?.fields.find(f => f.name === 'temperature');
      expect(tempField?.minimum).toBe(-273.15);
    });

    it('should warn when number constraints are used on non-number types', () => {
      const yaml = `
version: "1.0"
schemas:
  invalid-number-constraint:
    properties:
      name:
        type: string
        minimum: 1
`;
      const parser = new SchemaDSLParser();
      parser.parse(yaml);

      expect(parser.getErrors().some(e =>
        e.code === 'INVALID_CONSTRAINT' && e.severity === 'warning'
      )).toBe(true);
    });
  });

  describe('Enum Values', () => {
    it('should parse enum values', () => {
      const yaml = `
version: "1.0"
schemas:
  with-enum:
    properties:
      status:
        type: string
        enum:
          - active
          - inactive
          - pending
`;
      const parser = new SchemaDSLParser();
      const result = parser.parse(yaml);

      expect(result).not.toBeNull();
      const schema = result?.schemas.get('with-enum');
      const statusField = schema?.fields.find(f => f.name === 'status');

      expect(statusField?.enum).toEqual(['active', 'inactive', 'pending']);
    });
  });
});

describe('Conversion to JSON Schema', () => {
  it('should convert a schema to JSON Schema format', () => {
    const parser = new SchemaDSLParser();
    parser.parse(exampleDSL);

    const jsonSchema = parser.toJsonSchema('simple-note');

    expect(jsonSchema).not.toBeNull();
    expect(jsonSchema).toHaveProperty('$schema', 'http://json-schema.org/draft-07/schema#');
    expect(jsonSchema).toHaveProperty('type', 'object');
    expect(jsonSchema).toHaveProperty('properties');
    expect(jsonSchema).toHaveProperty('required');
  });

  it('should include required fields in JSON Schema', () => {
    const parser = new SchemaDSLParser();
    parser.parse(exampleDSL);

    const jsonSchema = parser.toJsonSchema('simple-note') as {
      required?: string[];
      properties?: Record<string, unknown>;
    };

    expect(jsonSchema.required).toContain('content');
  });

  it('should map date type to string with format', () => {
    const yaml = `
version: "1.0"
schemas:
  with-date:
    properties:
      created:
        type: date
`;
    const parser = new SchemaDSLParser();
    parser.parse(yaml);

    const jsonSchema = parser.toJsonSchema('with-date') as {
      properties?: Record<string, { type?: string; format?: string }>;
    };

    expect(jsonSchema.properties?.created?.type).toBe('string');
    expect(jsonSchema.properties?.created?.format).toBe('date');
  });

  it('should include array constraints in JSON Schema', () => {
    const yaml = `
version: "1.0"
schemas:
  with-array:
    properties:
      tags:
        type: array
        items:
          type: string
        minItems: 1
        maxItems: 5
        uniqueItems: true
`;
    const parser = new SchemaDSLParser();
    parser.parse(yaml);

    const jsonSchema = parser.toJsonSchema('with-array') as {
      properties?: Record<string, {
        type?: string;
        items?: { type?: string };
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
      }>;
    };

    expect(jsonSchema.properties?.tags?.type).toBe('array');
    expect(jsonSchema.properties?.tags?.items?.type).toBe('string');
    expect(jsonSchema.properties?.tags?.minItems).toBe(1);
    expect(jsonSchema.properties?.tags?.maxItems).toBe(5);
    expect(jsonSchema.properties?.tags?.uniqueItems).toBe(true);
  });

  it('should convert resolved schema with inherited fields', () => {
    const parser = new SchemaDSLParser();
    parser.parse(exampleDSL);

    const jsonSchema = parser.toJsonSchema('todo-item', true) as {
      properties?: Record<string, unknown>;
      required?: string[];
    };

    // Should have properties from both parent and child
    expect(jsonSchema.properties).toHaveProperty('type');    // from parent
    expect(jsonSchema.properties).toHaveProperty('title');   // from parent
    expect(jsonSchema.properties).toHaveProperty('id');      // from child
    expect(jsonSchema.properties).toHaveProperty('status');  // from child
    expect(jsonSchema.properties).toHaveProperty('priority'); // from child
  });

  it('should return all JSON schemas when converting all', () => {
    const parser = new SchemaDSLParser();
    parser.parse(exampleDSL);

    const allSchemas = parser.toAllJsonSchemas();

    expect(allSchemas.size).toBeGreaterThan(0);
    expect(allSchemas.has('base-document')).toBe(true);
    expect(allSchemas.has('todo-item')).toBe(true);
    expect(allSchemas.has('issue-item')).toBe(true);
    expect(allSchemas.has('simple-note')).toBe(true);
  });

  it('should skip placeholder default values in JSON Schema', () => {
    const yaml = `
version: "1.0"
schemas:
  with-placeholder:
    properties:
      created:
        type: date
        default: "{{TODAY}}"
      author:
        type: string
        default: "{{GIT_USER}}"
      static-value:
        type: string
        default: "default-value"
`;
    const parser = new SchemaDSLParser();
    parser.parse(yaml);

    const jsonSchema = parser.toJsonSchema('with-placeholder') as {
      properties?: Record<string, { default?: unknown }>;
    };

    // Placeholder defaults should not be included
    expect(jsonSchema.properties?.created?.default).toBeUndefined();
    expect(jsonSchema.properties?.author?.default).toBeUndefined();
    // Static defaults should be included
    expect(jsonSchema.properties?.['static-value']?.default).toBe('default-value');
  });
});

describe('Standalone Functions', () => {
  describe('parseSchemasDSL', () => {
    it('should parse valid DSL and return result with no errors', () => {
      const { result, errors } = parseSchemasDSL(exampleDSL);

      expect(result).not.toBeNull();
      expect(errors.filter(e => e.severity === 'error')).toHaveLength(0);
    });

    it('should return errors for invalid DSL', () => {
      const { result, errors } = parseSchemasDSL('invalid yaml [');

      expect(result).toBeNull();
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('schemaDSLToJsonSchema', () => {
    it('should convert all schemas when no specific schema is requested', () => {
      const { schemas, errors } = schemaDSLToJsonSchema(exampleDSL);

      expect(schemas).not.toBeNull();
      expect(schemas?.size).toBeGreaterThan(0);
      expect(errors.filter(e => e.severity === 'error')).toHaveLength(0);
    });

    it('should convert specific schema when requested', () => {
      const { schemas, errors } = schemaDSLToJsonSchema(exampleDSL, 'simple-note');

      expect(schemas).not.toBeNull();
      expect(schemas?.size).toBe(1);
      expect(schemas?.has('simple-note')).toBe(true);
    });

    it('should return error for non-existent schema', () => {
      const { schemas, errors } = schemaDSLToJsonSchema(exampleDSL, 'nonexistent');

      expect(schemas).toBeNull();
      expect(errors.some(e => e.code === 'SCHEMA_NOT_FOUND')).toBe(true);
    });
  });

  describe('validateSchemaDSL', () => {
    it('should return valid result for correct DSL', () => {
      const result = validateSchemaDSL(exampleDSL);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.itemCount).toBeGreaterThan(0);
    });

    it('should return info about parsed schemas', () => {
      const result = validateSchemaDSL(exampleDSL);

      expect(result.info.some(i => i.code === 'SCHEMAS_PARSED')).toBe(true);
    });

    it('should return info about resolved inheritance', () => {
      const result = validateSchemaDSL(exampleDSL);

      expect(result.info.some(i => i.code === 'INHERITANCE_RESOLVED')).toBe(true);
    });

    it('should return invalid result for malformed DSL', () => {
      const result = validateSchemaDSL('version: "1.0"\nschemas: {}');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Property Name Validation', () => {
  it('should accept valid property names with underscores', () => {
    const yaml = `
version: "1.0"
schemas:
  valid-props:
    properties:
      field_with_underscores:
        type: string
      field-with-hyphens:
        type: string
`;
    const parser = new SchemaDSLParser();
    const result = parser.parse(yaml);

    expect(result).not.toBeNull();
    const schema = result?.schemas.get('valid-props');
    expect(schema?.fields).toHaveLength(2);
  });

  it('should reject property names starting with uppercase', () => {
    const yaml = `
version: "1.0"
schemas:
  invalid-props:
    properties:
      InvalidName:
        type: string
`;
    const parser = new SchemaDSLParser();
    parser.parse(yaml);

    expect(parser.getErrors().some(e => e.code === 'INVALID_PROPERTY_NAME')).toBe(true);
  });
});
