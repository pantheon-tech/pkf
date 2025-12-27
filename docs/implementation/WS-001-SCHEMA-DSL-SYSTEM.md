# Implementation Plan: Schema DSL System

**Workstream ID:** WS-001
**Component:** Schema DSL System (PKF Architecture Section 7)
**Status:** Draft
**Created:** 2025-12-27
**Priority:** Critical Path

---

## 1. Overview

The Schema DSL System transforms human-friendly YAML schema definitions into valid JSON Schema draft-07 output. This is a core component of the PKF Configuration Processor (Section 5.5) that enables users to define document schemas using simplified syntax.

### 1.1 Scope

This workstream covers:
- DSL Parser (YAML to internal AST)
- Keyword Transformations (`extends`, `type: date`, `statuses`, `id.*`)
- Inheritance Resolution with conflict handling
- JSON Schema Generator (draft-07 output)
- Error Reporting with source location tracking
- Integration with pkf-processor

### 1.2 Architecture Reference

Per PKF-ARCHITECTURE.md Section 7:
- Section 7.1: Schema Hierarchy (base schemas, inheritance)
- Section 7.2: JSON Schema Generation (output format)
- Section 7.3: Schema DSL Reference (keyword transformations)

### 1.3 Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| `yaml` | npm package | Parse YAML schema definitions |
| `zod` | npm package | Runtime validation of DSL structure |
| `zod-to-json-schema` | npm package | Reference for JSON Schema patterns |
| `ajv` | npm package | Validate generated JSON Schema |

---

## 2. Verified API Patterns

### 2.1 Zod Schema Validation

```typescript
import { z } from "zod";

// Safe parsing (doesn't throw)
const result = mySchema.safeParse(input);
// => { success: true; data: T } | { success: false; error: ZodError }

// Enum validation
const StatusEnum = z.enum(["draft", "active", "archived"]);
StatusEnum.parse("draft"); // => "draft"
```

### 2.2 zod-to-json-schema Conversion

```typescript
import { zodToJsonSchema } from "zod-to-json-schema";

const jsonSchema = zodToJsonSchema(zodSchema, {
  target: "jsonSchema7",           // draft-07
  definitionPath: "$defs",         // Use $defs for definitions
  errorMessages: true,             // Include error messages
});

// Output structure:
// {
//   "$schema": "http://json-schema.org/draft-07/schema#",
//   "$ref": "#/$defs/schemaName",
//   "$defs": { ... }
// }
```

### 2.3 Ajv Validation

```typescript
import Ajv from "ajv";
const ajv = new Ajv();

// Compile and validate
const validate = ajv.compile(jsonSchema);
const valid = validate(data);
if (!valid) {
  console.log(validate.errors);
}
```

---

## 3. Task Breakdown

### WS-001-T001: DSL Type Definitions

**Task ID:** WS-001-T001
**Name:** Define DSL Type System with Zod
**Description:** Create Zod schemas for all DSL constructs including schema definitions, properties, and keywords
**Dependencies:** None
**Complexity:** M (2-4 hrs)

**File Structure:**
```
packages/pkf-processor/src/
  schema-dsl/
    types.ts              # Zod schemas for DSL
    index.ts              # Public exports
```

**Implementation Pattern:**
```typescript
// types.ts
import { z } from 'zod';

// Property type enum
export const DslPropertyTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'array',
  'object',
  'date',        // Custom: maps to format: "date"
  'datetime',    // Custom: maps to format: "date-time"
  'enum',        // Custom: requires 'values' property
]);

// Property definition
export const DslPropertySchema = z.object({
  type: DslPropertyTypeSchema,
  required: z.boolean().optional().default(false),
  default: z.unknown().optional(),
  description: z.string().optional(),
  // For type: enum
  values: z.array(z.string()).optional(),
  // For type: array
  items: z.lazy(() => DslPropertySchema).optional(),
  // For type: object
  properties: z.record(z.lazy(() => DslPropertySchema)).optional(),
  // Validation
  pattern: z.string().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
});

// ID configuration
export const DslIdConfigSchema = z.object({
  prefix: z.string().optional(),
  pattern: z.string(),
  padding: z.number().optional().default(3),
});

// Full schema definition
export const DslSchemaDefinitionSchema = z.object({
  description: z.string().optional(),
  abstract: z.boolean().optional().default(false),
  extends: z.string().optional(),
  id: DslIdConfigSchema.optional(),
  statuses: z.array(z.string()).optional(),
  properties: z.record(DslPropertySchema).optional(),
});

// Schemas file structure
export const DslSchemasFileSchema = z.object({
  schemas: z.record(DslSchemaDefinitionSchema),
});

export type DslPropertyType = z.infer<typeof DslPropertyTypeSchema>;
export type DslProperty = z.infer<typeof DslPropertySchema>;
export type DslIdConfig = z.infer<typeof DslIdConfigSchema>;
export type DslSchemaDefinition = z.infer<typeof DslSchemaDefinitionSchema>;
export type DslSchemasFile = z.infer<typeof DslSchemasFileSchema>;
```

**Acceptance Criteria:**
- [ ] All DSL keywords from Section 7.3.1 are represented as Zod schemas
- [ ] Type inference works correctly (`z.infer<typeof Schema>`)
- [ ] Recursive property definitions supported via `z.lazy()`
- [ ] Unit tests validate schema acceptance/rejection
- [ ] 100% coverage of type definitions

**Test Cases:**
```typescript
// Valid DSL input
const validSchema = {
  schemas: {
    'todo-item': {
      extends: 'base-entry',
      id: { prefix: 'TODO', pattern: '^TODO-\\d{3,}$', padding: 3 },
      statuses: ['pending', 'in-progress', 'completed'],
      properties: {
        priority: { type: 'enum', values: ['low', 'medium', 'high'] },
      },
    },
  },
};
expect(DslSchemasFileSchema.safeParse(validSchema).success).toBe(true);

// Invalid: unknown type
const invalidType = {
  schemas: {
    test: { properties: { field: { type: 'uuid' } } }, // 'uuid' not valid
  },
};
expect(DslSchemasFileSchema.safeParse(invalidType).success).toBe(false);
```

---

### WS-001-T002: YAML Parser with Source Tracking

**Task ID:** WS-001-T002
**Name:** YAML Parser with Source Location
**Description:** Parse YAML schema files with source location tracking for error reporting
**Dependencies:** WS-001-T001
**Complexity:** M (2-4 hrs)

**File Structure:**
```
packages/pkf-processor/src/
  schema-dsl/
    parser.ts             # YAML parsing with locations
    types.ts
    index.ts
```

**Implementation Pattern:**
```typescript
// parser.ts
import { parse, parseDocument } from 'yaml';
import type { Document, YAMLMap, Pair, Scalar } from 'yaml';
import { DslSchemasFileSchema, type DslSchemasFile } from './types';
import { Result, ok, err } from '@pkf/utils';

export interface SourceLocation {
  line: number;
  column: number;
  file: string;
}

export interface ParsedSchema {
  data: DslSchemasFile;
  sourceMap: Map<string, SourceLocation>; // path -> location
}

export interface ParseError {
  message: string;
  location?: SourceLocation;
  code: string;
}

export function parseSchemaFile(
  content: string,
  filePath: string
): Result<ParsedSchema, ParseError[]> {
  const errors: ParseError[] = [];

  // Parse with source tracking
  const doc = parseDocument(content, {
    keepSourceTokens: true,
    strict: true,
  });

  // Check for YAML syntax errors
  if (doc.errors.length > 0) {
    for (const error of doc.errors) {
      errors.push({
        message: error.message,
        location: {
          line: error.linePos?.[0]?.line ?? 1,
          column: error.linePos?.[0]?.col ?? 1,
          file: filePath,
        },
        code: 'YAML_SYNTAX_ERROR',
      });
    }
    return err(errors);
  }

  // Convert to plain object
  const rawData = doc.toJSON();

  // Validate against DSL schema
  const validation = DslSchemasFileSchema.safeParse(rawData);
  if (!validation.success) {
    for (const issue of validation.error.issues) {
      errors.push({
        message: issue.message,
        location: getLocationFromPath(doc, issue.path, filePath),
        code: 'DSL_VALIDATION_ERROR',
      });
    }
    return err(errors);
  }

  // Build source map for later error reporting
  const sourceMap = buildSourceMap(doc, filePath);

  return ok({
    data: validation.data,
    sourceMap,
  });
}

function buildSourceMap(
  doc: Document,
  filePath: string
): Map<string, SourceLocation> {
  const sourceMap = new Map<string, SourceLocation>();

  function traverse(node: unknown, path: string[]): void {
    if (node instanceof YAMLMap) {
      for (const pair of node.items) {
        if (pair.key instanceof Scalar) {
          const keyPath = [...path, String(pair.key.value)].join('.');
          const range = pair.key.range;
          if (range) {
            sourceMap.set(keyPath, {
              line: /* calculate from range */ 1,
              column: range[0],
              file: filePath,
            });
          }
          traverse(pair.value, [...path, String(pair.key.value)]);
        }
      }
    }
  }

  traverse(doc.contents, []);
  return sourceMap;
}

function getLocationFromPath(
  doc: Document,
  path: (string | number)[],
  filePath: string
): SourceLocation {
  // Navigate to node and extract source location
  // Implementation details...
  return { line: 1, column: 1, file: filePath };
}
```

**Acceptance Criteria:**
- [ ] YAML syntax errors include line/column information
- [ ] Zod validation errors map back to source locations
- [ ] Source map built for all schema keys
- [ ] Invalid YAML gracefully handled with error array
- [ ] Unit tests for valid and invalid YAML inputs

**Test Cases:**
```typescript
// Valid YAML
const validYaml = `
schemas:
  base-entry:
    abstract: true
    properties:
      id:
        type: string
        required: true
`;
const result = parseSchemaFile(validYaml, 'schemas.yaml');
expect(result.success).toBe(true);

// Invalid YAML syntax
const invalidYaml = `
schemas:
  base-entry:
    abstract: true
    properties
      id: # Missing colon above
`;
const errorResult = parseSchemaFile(invalidYaml, 'schemas.yaml');
expect(errorResult.success).toBe(false);
expect(errorResult.error[0].code).toBe('YAML_SYNTAX_ERROR');
```

---

### WS-001-T003: Inheritance Resolver

**Task ID:** WS-001-T003
**Name:** Schema Inheritance Resolution
**Description:** Resolve `extends` keyword with circular dependency detection and conflict resolution
**Dependencies:** WS-001-T001, WS-001-T002
**Complexity:** L (4-8 hrs)

**File Structure:**
```
packages/pkf-processor/src/
  schema-dsl/
    resolver.ts           # Inheritance resolution
    types.ts
    parser.ts
    index.ts
```

**Implementation Pattern:**
```typescript
// resolver.ts
import type { DslSchemaDefinition, DslSchemasFile } from './types';
import type { SourceLocation } from './parser';
import { Result, ok, err } from '@pkf/utils';

export interface ResolvedSchema extends Omit<DslSchemaDefinition, 'extends'> {
  _resolvedFrom?: string[];  // Inheritance chain
}

export interface ResolverError {
  message: string;
  location?: SourceLocation;
  code: 'CIRCULAR_INHERITANCE' | 'MISSING_BASE' | 'CONFLICT';
}

export interface ResolverResult {
  schemas: Record<string, ResolvedSchema>;
  warnings: ResolverError[];
}

export function resolveInheritance(
  schemas: DslSchemasFile,
  sourceMap: Map<string, SourceLocation>
): Result<ResolverResult, ResolverError[]> {
  const resolved: Record<string, ResolvedSchema> = {};
  const errors: ResolverError[] = [];
  const warnings: ResolverError[] = [];
  const resolving = new Set<string>(); // Cycle detection

  function resolve(name: string, chain: string[] = []): ResolvedSchema | undefined {
    // Already resolved
    if (resolved[name]) {
      return resolved[name];
    }

    // Cycle detection
    if (resolving.has(name)) {
      errors.push({
        message: `Circular inheritance detected: ${[...chain, name].join(' -> ')}`,
        location: sourceMap.get(`schemas.${name}.extends`),
        code: 'CIRCULAR_INHERITANCE',
      });
      return undefined;
    }

    const schema = schemas.schemas[name];
    if (!schema) {
      errors.push({
        message: `Cannot resolve schema reference "${name}"`,
        location: sourceMap.get(`schemas.${chain[chain.length - 1]}.extends`),
        code: 'MISSING_BASE',
      });
      return undefined;
    }

    resolving.add(name);

    let result: ResolvedSchema;

    if (schema.extends) {
      const base = resolve(schema.extends, [...chain, name]);
      if (!base) {
        resolving.delete(name);
        return undefined;
      }

      // Merge: child properties override parent
      result = mergeSchemas(base, schema, [...chain, name]);
    } else {
      result = {
        ...schema,
        _resolvedFrom: [name],
      };
    }

    resolving.delete(name);
    resolved[name] = result;
    return result;
  }

  // Resolve all schemas
  for (const name of Object.keys(schemas.schemas)) {
    resolve(name, []);
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({ schemas: resolved, warnings });
}

function mergeSchemas(
  base: ResolvedSchema,
  child: DslSchemaDefinition,
  chain: string[]
): ResolvedSchema {
  return {
    description: child.description ?? base.description,
    abstract: child.abstract ?? base.abstract,
    id: child.id ?? base.id,
    // statuses: child overrides completely (not merged)
    statuses: child.statuses ?? base.statuses,
    // properties: deep merge, child overrides
    properties: {
      ...base.properties,
      ...child.properties,
    },
    _resolvedFrom: chain,
  };
}
```

**Acceptance Criteria:**
- [ ] `extends` chains resolved correctly
- [ ] Circular inheritance detected with clear error message including full cycle path
- [ ] Missing base schema reported with source location
- [ ] Child properties override parent properties (conflict resolution)
- [ ] Resolved schemas retain inheritance chain in `_resolvedFrom`
- [ ] Unit tests for 3+ level inheritance chains
- [ ] Unit tests for diamond inheritance patterns

**Test Cases:**
```typescript
// Simple inheritance
const schemas = {
  schemas: {
    'base': {
      properties: { id: { type: 'string', required: true } }
    },
    'child': {
      extends: 'base',
      properties: { name: { type: 'string' } }
    },
  },
};
// Result: child has both 'id' and 'name' properties

// Circular detection
const circular = {
  schemas: {
    'a': { extends: 'b' },
    'b': { extends: 'a' },
  },
};
// Error: "Circular inheritance detected: a -> b -> a"

// Override
const override = {
  schemas: {
    'base': {
      properties: { status: { type: 'string' } },
      statuses: ['draft'],
    },
    'child': {
      extends: 'base',
      statuses: ['pending', 'complete'],  // Overrides parent
    },
  },
};
// Result: child.statuses = ['pending', 'complete'], not merged
```

---

### WS-001-T004: Keyword Transformer

**Task ID:** WS-001-T004
**Name:** DSL Keyword Transformations
**Description:** Transform DSL keywords to JSON Schema equivalents per Section 7.3.2
**Dependencies:** WS-001-T003
**Complexity:** L (4-8 hrs)

**File Structure:**
```
packages/pkf-processor/src/
  schema-dsl/
    transformer.ts        # Keyword transformations
    resolver.ts
    types.ts
    parser.ts
    index.ts
```

**Implementation Pattern:**
```typescript
// transformer.ts
import type { ResolvedSchema } from './resolver';
import type { DslProperty, DslPropertyType } from './types';

export interface JsonSchemaProperty {
  type?: string | string[];
  format?: string;
  enum?: string[];
  pattern?: string;
  default?: unknown;
  description?: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  additionalProperties?: boolean;
}

export interface JsonSchema {
  $schema: string;
  $id?: string;
  title?: string;
  description?: string;
  type: string;
  required?: string[];
  properties?: Record<string, JsonSchemaProperty>;
  allOf?: Array<{ $ref: string } | object>;
  $defs?: Record<string, JsonSchema>;
}

// Transform DSL type to JSON Schema type + format
function transformType(dslType: DslPropertyType): { type: string; format?: string } {
  switch (dslType) {
    case 'date':
      return { type: 'string', format: 'date' };
    case 'datetime':
      return { type: 'string', format: 'date-time' };
    case 'enum':
      return { type: 'string' }; // enum values added separately
    default:
      return { type: dslType };
  }
}

// Transform DSL property to JSON Schema property
function transformProperty(dslProp: DslProperty): JsonSchemaProperty {
  const { type, format } = transformType(dslProp.type);

  const result: JsonSchemaProperty = {
    type,
    ...(format && { format }),
    ...(dslProp.description && { description: dslProp.description }),
    ...(dslProp.default !== undefined && { default: dslProp.default }),
    ...(dslProp.pattern && { pattern: dslProp.pattern }),
    ...(dslProp.minLength && { minLength: dslProp.minLength }),
    ...(dslProp.maxLength && { maxLength: dslProp.maxLength }),
    ...(dslProp.minimum && { minimum: dslProp.minimum }),
    ...(dslProp.maximum && { maximum: dslProp.maximum }),
  };

  // Enum values
  if (dslProp.type === 'enum' && dslProp.values) {
    result.enum = dslProp.values;
  }

  // Array items
  if (dslProp.type === 'array' && dslProp.items) {
    result.items = transformProperty(dslProp.items);
  }

  // Nested object
  if (dslProp.type === 'object' && dslProp.properties) {
    const { properties, required } = transformProperties(dslProp.properties);
    result.properties = properties;
    if (required.length > 0) {
      result.required = required;
    }
  }

  return result;
}

// Transform all properties, extracting required array
function transformProperties(
  dslProps: Record<string, DslProperty>
): { properties: Record<string, JsonSchemaProperty>; required: string[] } {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const [name, prop] of Object.entries(dslProps)) {
    properties[name] = transformProperty(prop);
    if (prop.required) {
      required.push(name);
    }
  }

  return { properties, required };
}

// Transform 'statuses' shorthand to status property
function transformStatuses(statuses: string[]): JsonSchemaProperty {
  return {
    type: 'string',
    enum: statuses,
  };
}

// Transform 'id' config to id property
function transformIdConfig(
  idConfig: { prefix?: string; pattern: string; padding?: number }
): JsonSchemaProperty {
  return {
    type: 'string',
    pattern: idConfig.pattern,
    // prefix and padding are metadata for ID generation, not validation
  };
}

// Main transformer
export function transformToJsonSchema(
  schema: ResolvedSchema,
  name: string,
  baseUri: string = 'https://pkf.dev/schemas'
): JsonSchema {
  const required: string[] = [];
  const properties: Record<string, JsonSchemaProperty> = {};

  // Transform regular properties
  if (schema.properties) {
    const transformed = transformProperties(schema.properties);
    Object.assign(properties, transformed.properties);
    required.push(...transformed.required);
  }

  // Handle 'statuses' shorthand
  if (schema.statuses) {
    properties['status'] = transformStatuses(schema.statuses);
    required.push('status');
  }

  // Handle 'id' config
  if (schema.id) {
    properties['id'] = transformIdConfig(schema.id);
    required.push('id');
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `${baseUri}/${name}.schema.json`,
    title: `PKF ${name}`,
    description: schema.description,
    type: 'object',
    required: required.length > 0 ? required : undefined,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
  };
}
```

**Acceptance Criteria:**
- [ ] `type: date` transforms to `{ type: "string", format: "date" }`
- [ ] `type: datetime` transforms to `{ type: "string", format: "date-time" }`
- [ ] `type: enum` with `values` transforms to `{ type: "string", enum: [...] }`
- [ ] `statuses` shorthand adds `status` property with enum and marks required
- [ ] `id.pattern` transforms to `pattern` on id property
- [ ] `required: true` adds property name to `required` array
- [ ] Nested objects and arrays transform recursively
- [ ] Unit tests for each transformation rule

**Test Cases:**
```typescript
// Date type transformation
const dateSchema: ResolvedSchema = {
  properties: {
    created: { type: 'date', required: true },
  },
};
const jsonSchema = transformToJsonSchema(dateSchema, 'test');
expect(jsonSchema.properties.created).toEqual({
  type: 'string',
  format: 'date',
});
expect(jsonSchema.required).toContain('created');

// Statuses shorthand
const statusesSchema: ResolvedSchema = {
  statuses: ['pending', 'active', 'completed'],
};
const statusJson = transformToJsonSchema(statusesSchema, 'test');
expect(statusJson.properties.status).toEqual({
  type: 'string',
  enum: ['pending', 'active', 'completed'],
});
expect(statusJson.required).toContain('status');

// ID config
const idSchema: ResolvedSchema = {
  id: { prefix: 'TODO', pattern: '^TODO-\\d{3,}$', padding: 3 },
};
const idJson = transformToJsonSchema(idSchema, 'test');
expect(idJson.properties.id.pattern).toBe('^TODO-\\d{3,}$');
```

---

### WS-001-T005: JSON Schema Generator

**Task ID:** WS-001-T005
**Name:** JSON Schema Output Generator
**Description:** Generate complete JSON Schema draft-07 output with $defs for base schemas
**Dependencies:** WS-001-T004
**Complexity:** M (2-4 hrs)

**File Structure:**
```
packages/pkf-processor/src/
  schema-dsl/
    generator.ts          # JSON Schema output
    transformer.ts
    resolver.ts
    types.ts
    parser.ts
    index.ts
```

**Implementation Pattern:**
```typescript
// generator.ts
import type { ResolvedSchema } from './resolver';
import type { JsonSchema } from './transformer';
import { transformToJsonSchema } from './transformer';

export interface GeneratorOptions {
  baseUri?: string;
  includeAbstract?: boolean;      // Include abstract schemas in $defs
  inlineRefs?: boolean;           // Inline $ref or use allOf
  prettyPrint?: boolean;
  outputDir?: string;
}

export interface GeneratedSchema {
  name: string;
  schema: JsonSchema;
  filePath: string;
  content: string;
}

export interface GeneratorResult {
  schemas: GeneratedSchema[];
  indexSchema: JsonSchema;        // Combined schema with all $defs
}

export function generateSchemas(
  resolved: Record<string, ResolvedSchema>,
  options: GeneratorOptions = {}
): GeneratorResult {
  const {
    baseUri = 'https://pkf.dev/schemas',
    includeAbstract = true,
    prettyPrint = true,
    outputDir = '.pkf/generated/schemas',
  } = options;

  const schemas: GeneratedSchema[] = [];
  const defs: Record<string, JsonSchema> = {};

  for (const [name, schema] of Object.entries(resolved)) {
    // Skip abstract schemas for individual files
    if (schema.abstract && !includeAbstract) {
      continue;
    }

    const jsonSchema = transformToJsonSchema(schema, name, baseUri);

    // Add to individual schemas
    if (!schema.abstract) {
      const content = prettyPrint
        ? JSON.stringify(jsonSchema, null, 2)
        : JSON.stringify(jsonSchema);

      schemas.push({
        name,
        schema: jsonSchema,
        filePath: `${outputDir}/${name}.schema.json`,
        content,
      });
    }

    // Add to $defs for reference
    defs[name] = jsonSchema;
  }

  // Create index schema with all definitions
  const indexSchema: JsonSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `${baseUri}/index.schema.json`,
    title: 'PKF Schemas Index',
    description: 'Combined schema with all PKF definitions',
    type: 'object',
    $defs: defs,
  };

  return { schemas, indexSchema };
}

// Handle extends as allOf with $ref
export function generateWithInheritance(
  schema: ResolvedSchema,
  name: string,
  baseUri: string = 'https://pkf.dev/schemas'
): JsonSchema {
  const baseSchema = transformToJsonSchema(schema, name, baseUri);

  // If schema had extends, use allOf pattern
  if (schema._resolvedFrom && schema._resolvedFrom.length > 1) {
    const baseRef = schema._resolvedFrom[0];
    return {
      ...baseSchema,
      allOf: [
        { $ref: `#/$defs/${baseRef}` },
        {
          type: 'object',
          properties: baseSchema.properties,
          required: baseSchema.required,
        },
      ],
      properties: undefined,
      required: undefined,
    };
  }

  return baseSchema;
}
```

**Acceptance Criteria:**
- [ ] Output valid JSON Schema draft-07 with correct `$schema`
- [ ] Each non-abstract schema generates individual `.schema.json` file
- [ ] Index schema contains all schemas in `$defs`
- [ ] Inheritance represented with `allOf` + `$ref` pattern
- [ ] Output validates with Ajv
- [ ] Pretty-print option for readable output
- [ ] Unit tests validate output against Ajv

**Test Cases:**
```typescript
// Complete generation
const resolved = {
  'base-entry': {
    abstract: true,
    properties: { id: { type: 'string', required: true } },
    _resolvedFrom: ['base-entry'],
  },
  'todo-item': {
    extends: 'base-entry',
    statuses: ['pending', 'done'],
    properties: { title: { type: 'string', required: true } },
    _resolvedFrom: ['base-entry', 'todo-item'],
  },
};

const result = generateSchemas(resolved);

// Verify individual schema
expect(result.schemas.length).toBe(1); // Only non-abstract
expect(result.schemas[0].name).toBe('todo-item');

// Verify schema is valid
const ajv = new Ajv();
expect(ajv.validateSchema(result.schemas[0].schema)).toBe(true);

// Verify index has both
expect(result.indexSchema.$defs['base-entry']).toBeDefined();
expect(result.indexSchema.$defs['todo-item']).toBeDefined();
```

---

### WS-001-T006: Error Reporter

**Task ID:** WS-001-T006
**Name:** DSL Error Reporter
**Description:** Format errors with source locations per Section 7.3.3
**Dependencies:** WS-001-T002, WS-001-T003
**Complexity:** S (1-2 hrs)

**File Structure:**
```
packages/pkf-processor/src/
  schema-dsl/
    errors.ts             # Error formatting
    generator.ts
    transformer.ts
    resolver.ts
    types.ts
    parser.ts
    index.ts
```

**Implementation Pattern:**
```typescript
// errors.ts
import type { SourceLocation, ParseError } from './parser';
import type { ResolverError } from './resolver';

export type DslError = ParseError | ResolverError;

export interface FormattedError {
  message: string;
  formatted: string;     // Human-readable with context
  location?: SourceLocation;
  code: string;
  severity: 'error' | 'warning';
}

export function formatError(
  error: DslError,
  sourceContent?: string
): FormattedError {
  const { message, location, code } = error;

  let formatted = '';

  if (location) {
    // File:line:column format (clickable in IDEs)
    formatted += `${location.file}:${location.line}:${location.column}\n`;

    // Show source context if available
    if (sourceContent) {
      const lines = sourceContent.split('\n');
      const errorLine = lines[location.line - 1];

      if (errorLine) {
        formatted += `  ${location.line} | ${errorLine}\n`;
        formatted += `  ${' '.repeat(String(location.line).length)} | ${' '.repeat(location.column - 1)}^\n`;
      }
    }
  }

  formatted += `error[${code}]: ${message}\n`;

  return {
    message,
    formatted,
    location,
    code,
    severity: 'error',
  };
}

export function formatErrors(
  errors: DslError[],
  sourceContent?: string
): string {
  const formatted = errors.map(e => formatError(e, sourceContent));

  return [
    'Schema DSL Validation Failed:',
    '',
    ...formatted.map(e => e.formatted),
    `${errors.length} error(s) found`,
  ].join('\n');
}

// Error messages per Section 7.3.3
export const ERROR_MESSAGES = {
  UNKNOWN_TYPE: (type: string) =>
    `Unknown type "${type}". Valid types: string, number, boolean, array, object, date, datetime, enum`,
  MISSING_BASE: (name: string) =>
    `Cannot resolve schema reference "${name}"`,
  CIRCULAR_INHERITANCE: (chain: string[]) =>
    `Circular inheritance detected: ${chain.join(' -> ')}`,
  MISSING_ENUM_VALUES: () =>
    `Enum type requires "values" property`,
  YAML_SYNTAX_ERROR: (msg: string) =>
    `YAML syntax error: ${msg}`,
} as const;
```

**Acceptance Criteria:**
- [ ] Errors include file:line:column format (IDE-clickable)
- [ ] Source context shown with caret pointing to error
- [ ] Error codes match Section 7.3.3 table
- [ ] Human-readable messages per error type
- [ ] Multiple errors aggregated in single report
- [ ] Unit tests for each error type formatting

**Test Cases:**
```typescript
// Format with location
const error: ParseError = {
  message: 'Unknown type "uuid"',
  location: { file: 'schemas.yaml', line: 5, column: 12 },
  code: 'DSL_VALIDATION_ERROR',
};

const source = `schemas:
  test:
    properties:
      field:
        type: uuid`;

const formatted = formatError(error, source);
expect(formatted.formatted).toContain('schemas.yaml:5:12');
expect(formatted.formatted).toContain('type: uuid');
expect(formatted.formatted).toContain('^');
```

---

### WS-001-T007: Main Entry Point and Integration

**Task ID:** WS-001-T007
**Name:** Schema DSL Entry Point
**Description:** Create main entry point that orchestrates parsing, resolution, transformation, and generation
**Dependencies:** WS-001-T001 through WS-001-T006
**Complexity:** M (2-4 hrs)

**File Structure:**
```
packages/pkf-processor/src/
  schema-dsl/
    index.ts              # Public API
    compile.ts            # Main orchestration
    errors.ts
    generator.ts
    transformer.ts
    resolver.ts
    types.ts
    parser.ts
```

**Implementation Pattern:**
```typescript
// compile.ts
import { parseSchemaFile } from './parser';
import { resolveInheritance } from './resolver';
import { generateSchemas, type GeneratorOptions } from './generator';
import { formatErrors } from './errors';
import { Result, ok, err } from '@pkf/utils';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CompileOptions extends GeneratorOptions {
  schemaFiles: string[];           // Paths to schemas.yaml files
  outputDir: string;               // Output directory for JSON Schema
  strict?: boolean;                // Fail on warnings
}

export interface CompileResult {
  success: boolean;
  schemas: Array<{
    name: string;
    outputPath: string;
  }>;
  errors: string[];
  warnings: string[];
}

export async function compileSchemas(
  options: CompileOptions
): Promise<CompileResult> {
  const { schemaFiles, outputDir, strict = true } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Parse all schema files
  const allSchemas: Record<string, unknown> = {};
  const allSourceMaps = new Map<string, unknown>();

  for (const filePath of schemaFiles) {
    const content = await fs.readFile(filePath, 'utf-8');
    const parseResult = parseSchemaFile(content, filePath);

    if (!parseResult.success) {
      errors.push(formatErrors(parseResult.error, content));
      continue;
    }

    // Merge schemas from multiple files
    Object.assign(allSchemas, parseResult.data.data.schemas);
    for (const [key, loc] of parseResult.data.sourceMap) {
      allSourceMaps.set(key, loc);
    }
  }

  if (errors.length > 0) {
    return { success: false, schemas: [], errors, warnings };
  }

  // 2. Resolve inheritance
  const resolveResult = resolveInheritance(
    { schemas: allSchemas },
    allSourceMaps
  );

  if (!resolveResult.success) {
    errors.push(formatErrors(resolveResult.error));
    return { success: false, schemas: [], errors, warnings };
  }

  // Collect warnings
  for (const warn of resolveResult.data.warnings) {
    warnings.push(formatErrors([warn]));
  }

  // 3. Generate JSON Schema
  const generated = generateSchemas(resolveResult.data.schemas, {
    ...options,
    outputDir,
  });

  // 4. Write output files
  await fs.mkdir(outputDir, { recursive: true });

  const outputSchemas: Array<{ name: string; outputPath: string }> = [];

  for (const schema of generated.schemas) {
    const outputPath = path.join(outputDir, `${schema.name}.schema.json`);
    await fs.writeFile(outputPath, schema.content, 'utf-8');
    outputSchemas.push({ name: schema.name, outputPath });
  }

  // Write index schema
  const indexPath = path.join(outputDir, 'index.schema.json');
  await fs.writeFile(
    indexPath,
    JSON.stringify(generated.indexSchema, null, 2),
    'utf-8'
  );

  const success = errors.length === 0 && (!strict || warnings.length === 0);

  return { success, schemas: outputSchemas, errors, warnings };
}

// index.ts - Public exports
export { compileSchemas, type CompileOptions, type CompileResult } from './compile';
export { parseSchemaFile, type ParsedSchema, type ParseError } from './parser';
export { resolveInheritance, type ResolvedSchema } from './resolver';
export { transformToJsonSchema, type JsonSchema } from './transformer';
export { generateSchemas, type GeneratorOptions } from './generator';
export { formatErrors, type FormattedError } from './errors';
export * from './types';
```

**Acceptance Criteria:**
- [ ] Single `compileSchemas()` function handles end-to-end compilation
- [ ] Multiple schema files can be merged
- [ ] Output directory created if not exists
- [ ] JSON Schema files written with proper names
- [ ] Index schema written with all definitions
- [ ] Returns structured result with success/errors/warnings
- [ ] Integration test with full schema file

**Test Cases:**
```typescript
// Integration test
const testSchemaYaml = `
schemas:
  base-entry:
    abstract: true
    properties:
      id:
        type: string
        required: true
      created:
        type: date
        required: true

  todo-item:
    extends: base-entry
    id:
      prefix: TODO
      pattern: "^TODO-\\\\d{3,}$"
      padding: 3
    statuses: [pending, in-progress, completed]
    properties:
      title:
        type: string
        required: true
      priority:
        type: enum
        values: [low, medium, high]
        default: medium
`;

// Write test file
await fs.writeFile('/tmp/test-schemas.yaml', testSchemaYaml);

// Compile
const result = await compileSchemas({
  schemaFiles: ['/tmp/test-schemas.yaml'],
  outputDir: '/tmp/pkf-schemas',
});

expect(result.success).toBe(true);
expect(result.schemas).toHaveLength(1);
expect(result.schemas[0].name).toBe('todo-item');

// Verify output is valid JSON Schema
const outputContent = await fs.readFile(
  '/tmp/pkf-schemas/todo-item.schema.json',
  'utf-8'
);
const outputSchema = JSON.parse(outputContent);

expect(outputSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
expect(outputSchema.properties.id.pattern).toBe('^TODO-\\d{3,}$');
expect(outputSchema.properties.status.enum).toEqual(['pending', 'in-progress', 'completed']);
expect(outputSchema.properties.created.format).toBe('date');
expect(outputSchema.required).toContain('id');
expect(outputSchema.required).toContain('created');
expect(outputSchema.required).toContain('title');
expect(outputSchema.required).toContain('status');

// Validate with Ajv
const ajv = new Ajv();
expect(ajv.validateSchema(outputSchema)).toBe(true);
```

---

### WS-001-T008: pkf-processor Integration

**Task ID:** WS-001-T008
**Name:** Integrate Schema DSL with pkf-processor
**Description:** Wire Schema DSL compiler into the main pkf-processor build pipeline
**Dependencies:** WS-001-T007
**Complexity:** M (2-4 hrs)

**File Structure:**
```
packages/pkf-processor/src/
  processor.ts            # Main processor (modify)
  schema-dsl/
    index.ts
    ...
```

**Implementation Pattern:**
```typescript
// processor.ts (additions)
import { compileSchemas } from './schema-dsl';
import type { ProcessorInput, ProcessorOutput } from './types';

export async function processConfig(
  input: ProcessorInput
): Promise<ProcessorOutput> {
  const startTime = Date.now();
  const errors: ProcessorOutput['errors'] = [];
  const artifacts = {
    schemas: [] as string[],
    structureJson: '',
    remarkConfig: '',
    pathSchemaMap: '',
  };

  // 1. Load and parse pkf.config.yaml
  const config = await loadConfig(input.configPath);

  // 2. Resolve component references
  const schemaFiles = await resolveComponentPaths(
    config.components?.schemas,
    input.configPath
  );

  // 3. Compile Schema DSL -> JSON Schema
  const schemaResult = await compileSchemas({
    schemaFiles,
    outputDir: `${input.outputDir}/schemas`,
    strict: input.strict,
  });

  if (!schemaResult.success) {
    for (const error of schemaResult.errors) {
      errors.push({
        file: 'schemas.yaml',
        message: error,
        severity: 'error',
      });
    }
  }

  artifacts.schemas = schemaResult.schemas.map(s => s.outputPath);

  // 4. Generate path-schema-map.json
  const pathSchemaMap = generatePathSchemaMap(config, schemaResult.schemas);
  artifacts.pathSchemaMap = `${input.outputDir}/path-schema-map.json`;
  await fs.writeFile(
    artifacts.pathSchemaMap,
    JSON.stringify(pathSchemaMap, null, 2)
  );

  // 5. Generate .remarkrc.generated.mjs
  const remarkConfig = generateRemarkConfig(pathSchemaMap);
  artifacts.remarkConfig = `${input.outputDir}/.remarkrc.generated.mjs`;
  await fs.writeFile(artifacts.remarkConfig, remarkConfig);

  // 6. Generate structure.json
  artifacts.structureJson = `${input.outputDir}/structure.json`;
  const structure = generateStructure(config);
  await fs.writeFile(
    artifacts.structureJson,
    JSON.stringify(structure, null, 2)
  );

  return {
    success: errors.filter(e => e.severity === 'error').length === 0,
    artifacts,
    errors,
    duration: Date.now() - startTime,
  };
}

function generatePathSchemaMap(
  config: PkfConfig,
  schemas: Array<{ name: string; outputPath: string }>
): Record<string, string> {
  const map: Record<string, string> = {};

  // Walk the docs tree and map paths to schemas
  function walkTree(node: TreeNode, currentPath: string): void {
    if (node._items?._schema) {
      const schemaPath = schemas.find(s => s.name === node._items._schema)?.outputPath;
      if (schemaPath) {
        map[`${currentPath}/**/*.md`] = schemaPath;
      }
    }

    for (const [key, child] of Object.entries(node)) {
      if (!key.startsWith('_') && typeof child === 'object') {
        walkTree(child, `${currentPath}/${key}`);
      }
    }
  }

  walkTree(config.docs, 'docs');
  return map;
}

function generateRemarkConfig(pathSchemaMap: Record<string, string>): string {
  return `// Auto-generated by pkf-processor
import remarkFrontmatter from 'remark-frontmatter';
import remarkLintFrontmatterSchema from 'remark-lint-frontmatter-schema';

export default {
  plugins: [
    remarkFrontmatter,
    [remarkLintFrontmatterSchema, {
      schemas: ${JSON.stringify(pathSchemaMap, null, 6)}
    }],
  ],
};
`;
}
```

**Acceptance Criteria:**
- [ ] `pkf-processor build` invokes schema compilation
- [ ] Schema paths resolved from `components.schemas` config
- [ ] Generated schemas written to `outputDir/schemas/`
- [ ] `path-schema-map.json` maps glob patterns to schemas
- [ ] `.remarkrc.generated.mjs` generated with correct mappings
- [ ] Errors from schema compilation surface in processor output
- [ ] Integration test with full pkf.config.yaml

**Test Cases:**
```typescript
// Full processor integration test
const pkfConfig = `
version: "1.0.0"
project:
  name: "test-project"

components:
  schemas: "./pkf/schemas.yaml"

docs:
  _type: root
  proposals:
    _type: section
    _items:
      _type: document
      _schema: proposal
`;

const schemasYaml = `
schemas:
  proposal:
    properties:
      id:
        type: string
        pattern: "^P\\\\d{2}$"
        required: true
      title:
        type: string
        required: true
      status:
        type: enum
        values: [draft, approved, rejected]
        required: true
`;

// Write test files
await fs.writeFile('/tmp/pkf.config.yaml', pkfConfig);
await fs.writeFile('/tmp/pkf/schemas.yaml', schemasYaml);

// Run processor
const result = await processConfig({
  configPath: '/tmp/pkf.config.yaml',
  outputDir: '/tmp/.pkf/generated',
});

expect(result.success).toBe(true);
expect(result.artifacts.schemas).toContain('/tmp/.pkf/generated/schemas/proposal.schema.json');

// Check path-schema-map
const pathMap = JSON.parse(
  await fs.readFile(result.artifacts.pathSchemaMap, 'utf-8')
);
expect(pathMap['docs/proposals/**/*.md']).toContain('proposal.schema.json');
```

---

## 4. Dependency Graph

```
                    ┌─────────────────────┐
                    │   WS-001-T001       │
                    │   Type Definitions  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   WS-001-T002       │
                    │   YAML Parser       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   WS-001-T003       │
                    │   Inheritance       │
                    │   Resolver          │
                    └──────────┬──────────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
               ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  WS-001-T004    │ │  WS-001-T006    │ │                 │
    │  Keyword        │ │  Error          │ │  (parallel)     │
    │  Transformer    │ │  Reporter       │ │                 │
    └────────┬────────┘ └────────┬────────┘ └─────────────────┘
             │                   │
             ▼                   │
    ┌─────────────────┐          │
    │  WS-001-T005    │          │
    │  JSON Schema    │          │
    │  Generator      │          │
    └────────┬────────┘          │
             │                   │
             └─────────┬─────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │   WS-001-T007       │
            │   Entry Point       │
            │   & Integration     │
            └──────────┬──────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │   WS-001-T008       │
            │   pkf-processor     │
            │   Integration       │
            └─────────────────────┘
```

**Parallelization Opportunities:**
- T004 (Transformer) and T006 (Error Reporter) can run in parallel after T003

---

## 5. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| YAML source location tracking complex | M | Use `yaml` library's built-in source tracking; fallback to line-counting |
| Inheritance edge cases (diamond) | M | Explicit test coverage; document behavior |
| JSON Schema draft-07 compliance | H | Validate all output with Ajv; use zod-to-json-schema as reference |
| Performance with large schema files | L | Lazy resolution; cache resolved schemas |
| Error messages not matching spec | M | Reference Section 7.3.3 for exact messages |

---

## 6. Complexity Summary

| Task | Complexity | Estimated Hours |
|------|------------|-----------------|
| WS-001-T001 | M | 2-4 hrs |
| WS-001-T002 | M | 2-4 hrs |
| WS-001-T003 | L | 4-8 hrs |
| WS-001-T004 | L | 4-8 hrs |
| WS-001-T005 | M | 2-4 hrs |
| WS-001-T006 | S | 1-2 hrs |
| WS-001-T007 | M | 2-4 hrs |
| WS-001-T008 | M | 2-4 hrs |
| **Total** | - | **19-38 hrs** |

---

## 7. Verification Checklist

Before marking this workstream complete:

- [ ] All 8 tasks have passing unit tests
- [ ] Integration test with real schemas.yaml passes
- [ ] Generated JSON Schema validates with Ajv
- [ ] Error messages match Section 7.3.3 exactly
- [ ] Source locations accurate for all error types
- [ ] Documentation for public API generated
- [ ] No circular dependencies in module graph
- [ ] Code coverage >90% for all modules

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-27
