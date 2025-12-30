# pkf-validator

PKF Validation library for validating PKF configuration files, registers (TODO, ISSUES, CHANGELOG), and documentation frontmatter.

## Installation

```bash
npm install pkf-validator
```

## Quick Start

### CLI Usage

```bash
# Run all validators
npx pkf-validator validate

# Validate specific files
npx pkf-validator validate:config
npx pkf-validator validate:todo
npx pkf-validator validate:issues
npx pkf-validator validate:changelog
```

### Programmatic Usage

```typescript
import { validateAll, validateConfig, validateTodo } from 'pkf-validator';

// Validate everything
const result = await validateAll({ rootDir: '/path/to/project' });
console.log(result.valid); // true or false
console.log(result.errors); // Array of validation errors

// Validate specific files
const configResult = await validateConfig({ rootDir: process.cwd() });
const todoResult = await validateTodo('docs/registers/TODO.md');
```

## CLI Reference

### Commands

#### `validate`

Run all validators on the project.

```bash
pkf-validator validate [options]
```

**Options:**
- `-v, --verbose` - Show detailed output including info messages
- `--json` - Output results as JSON
- `-r, --root <path>` - Root directory (default: current directory)

#### `validate:config`

Validate `pkf.config.yaml` configuration file.

```bash
pkf-validator validate:config [options]
```

**Options:**
- `-v, --verbose` - Show detailed output
- `--json` - Output results as JSON
- `-c, --config <path>` - Path to config file

#### `validate:todo`

Validate `TODO.md` register file.

```bash
pkf-validator validate:todo [options]
```

**Options:**
- `-v, --verbose` - Show detailed output
- `--json` - Output results as JSON
- `-f, --file <path>` - Path to TODO.md file (default: `docs/registers/TODO.md`)

#### `validate:issues`

Validate `ISSUES.md` register file.

```bash
pkf-validator validate:issues [options]
```

**Options:**
- `-v, --verbose` - Show detailed output
- `--json` - Output results as JSON
- `-f, --file <path>` - Path to ISSUES.md file (default: `docs/registers/ISSUES.md`)

#### `validate:changelog`

Validate `CHANGELOG.md` register file.

```bash
pkf-validator validate:changelog [options]
```

**Options:**
- `-v, --verbose` - Show detailed output
- `--json` - Output results as JSON
- `-f, --file <path>` - Path to CHANGELOG.md file (default: `docs/registers/CHANGELOG.md`)

### Exit Codes

- `0` - Validation passed
- `1` - Validation failed (errors found)
- `2` - Execution error (file not found, etc.)

## API Reference

### Validators

#### `validateAll(options?)`

Run all validators and return a merged result.

```typescript
import { validateAll, ValidateAllOptions } from 'pkf-validator';

const options: ValidateAllOptions = {
  rootDir: '/path/to/project',
  skipConfig: false,
  skipTodo: false,
  skipIssues: false,
  skipChangelog: false,
};

const result = await validateAll(options);
```

#### `validateConfig(options?)`

Validate PKF configuration file against schema.

```typescript
import { validateConfig, ConfigValidationOptions } from 'pkf-validator';

const options: ConfigValidationOptions = {
  rootDir: process.cwd(),
  configPath: 'pkf.config.yaml',
  schemaPath: 'schemas/pkf-config.schema.json',
  skipDirectoryChecks: false,
  checkOptionalDirectories: false,
};

const result = await validateConfig(options);
```

#### `loadConfig(options?)`

Load and validate PKF configuration, returning both the config and validation result.

```typescript
import { loadConfig } from 'pkf-validator';

const { config, result } = await loadConfig({ rootDir: process.cwd() });

if (config) {
  console.log('Project name:', config.project.name);
}
```

#### `validateTodo(filePath, options?)`

Validate a TODO.md register file.

```typescript
import { validateTodo } from 'pkf-validator';

const result = await validateTodo('docs/registers/TODO.md');
```

#### `validateIssues(filePath, options?)`

Validate an ISSUES.md register file.

```typescript
import { validateIssues, parseIssues } from 'pkf-validator';

const result = await validateIssues('docs/registers/ISSUES.md');

// Parse issues without validation
const issues = await parseIssues('docs/registers/ISSUES.md');
```

#### `validateChangelog(filePath, options?)`

Validate a CHANGELOG.md register file.

```typescript
import { validateChangelog } from 'pkf-validator';

const result = await validateChangelog('docs/registers/CHANGELOG.md');
```

### Frontmatter Validation

#### `extractFrontmatter(content)`

Extract YAML frontmatter from markdown content.

```typescript
import { extractFrontmatter } from 'pkf-validator';

const content = `---
title: My Document
type: guide
---
# Content here`;

const extracted = extractFrontmatter(content);
// {
//   data: { title: 'My Document', type: 'guide' },
//   raw: 'title: My Document\ntype: guide',
//   line: 2,
//   type: 'standard'
// }
```

#### `validateFrontmatter(filePath, options?)`

Validate a markdown file's frontmatter against a schema.

```typescript
import { validateFrontmatter, FrontmatterValidationOptions } from 'pkf-validator';

const options: FrontmatterValidationOptions = {
  schemaPath: 'schemas/guide.schema.json',
  requiredFields: ['title', 'type'],
  expectedType: 'guide',
  validateCommonFields: true,
};

const result = await validateFrontmatter('docs/guides/my-guide.md', options);
```

#### `validateFrontmatterContent(content, schema, filePath?)`

Validate frontmatter content directly against a JSON schema.

```typescript
import { validateFrontmatterContent } from 'pkf-validator';

const content = `---
title: My Doc
---
# Content`;

const schema = {
  type: 'object',
  required: ['title'],
  properties: {
    title: { type: 'string' },
  },
};

const result = validateFrontmatterContent(content, schema, 'my-doc.md');
```

#### `validateMultipleFrontmatter(filePaths, options?)`

Batch validate multiple files' frontmatter.

```typescript
import { validateMultipleFrontmatter } from 'pkf-validator';

const result = await validateMultipleFrontmatter([
  'docs/guide-1.md',
  'docs/guide-2.md',
], { requiredFields: ['title'] });
```

#### `createFrontmatterSchema(docType, requiredFields?, additionalProperties?)`

Generate a JSON schema for a specific document type.

```typescript
import { createFrontmatterSchema } from 'pkf-validator';

const schema = createFrontmatterSchema('proposal', ['title', 'type', 'status'], {
  proposalId: { type: 'string', pattern: '^PKF-\\d+$' },
});
```

### Schema DSL Parser

Parse PKF Schema DSL (YAML-based) files and convert them to JSON Schema format.

#### `SchemaDSLParser` Class

```typescript
import { SchemaDSLParser } from 'pkf-validator';

const parser = new SchemaDSLParser();

// Parse from string
const result = parser.parse(yamlContent);

// Parse from file
const result = await parser.parseFile('schemas/types.yaml');

// Convert to JSON Schema
const jsonSchema = parser.toJsonSchema('document-base');
const allSchemas = parser.toAllJsonSchemas();

// Get parsing errors
const errors = parser.getErrors();
```

#### `parseSchemasDSL(yamlContent, filePath?)`

Parse Schema DSL from YAML content.

```typescript
import { parseSchemasDSL } from 'pkf-validator';

const { result, errors } = parseSchemasDSL(yamlContent);

if (result) {
  console.log('Schemas:', result.schemas);
  console.log('Relationships:', result.relationships);
}
```

#### `parseSchemasDSLFile(filePath)`

Parse Schema DSL from a file.

```typescript
import { parseSchemasDSLFile } from 'pkf-validator';

const { result, errors } = await parseSchemasDSLFile('schemas/types.yaml');
```

#### `schemaDSLToJsonSchema(yamlContent, schemaName?, useResolved?)`

Convert Schema DSL to JSON Schema format.

```typescript
import { schemaDSLToJsonSchema } from 'pkf-validator';

// Convert all schemas
const { schemas, errors } = schemaDSLToJsonSchema(yamlContent);

// Convert specific schema
const { schemas, errors } = schemaDSLToJsonSchema(yamlContent, 'proposal');
```

#### `validateSchemaDSL(yamlContent, filePath?)`

Validate Schema DSL content.

```typescript
import { validateSchemaDSL } from 'pkf-validator';

const result = validateSchemaDSL(yamlContent);
console.log(result.valid);
console.log(result.errors);
```

#### `validateSchemaDSLFile(filePath)`

Validate Schema DSL from a file.

```typescript
import { validateSchemaDSLFile } from 'pkf-validator';

const result = await validateSchemaDSLFile('schemas/types.yaml');
```

## TypeScript Types

### Core Types

```typescript
import type {
  // Validation result types
  ValidationResult,
  ValidationIssue,
  ValidationOptions,
  Severity,

  // Configuration types
  PkfConfig,

  // Register item types
  TodoItem,
  IssueItem,
  ChangelogEntry,

  // Validator interface
  Validator,
} from 'pkf-validator';
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  duration?: number;
  itemCount?: number;
}
```

### ValidationIssue

```typescript
interface ValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  filePath?: string;
  line?: number;
  column?: number;
  value?: unknown;
  expected?: unknown;
  suggestion?: string;
}
```

### ValidationOptions

```typescript
interface ValidationOptions {
  rootDir?: string;
  includeWarnings?: boolean;
  includeInfo?: boolean;
  maxErrors?: number;
  strict?: boolean;
}
```

### Schema DSL Types

```typescript
import type {
  SchemaPropertyType,
  SchemaArrayItems,
  SchemaField,
  SchemaMetadata,
  SchemaDefinition,
  SchemaRelationship,
  ParsedSchemaDSL,
} from 'pkf-validator';
```

### Frontmatter Types

```typescript
import type {
  ExtractedFrontmatter,
  FrontmatterValidationOptions,
} from 'pkf-validator';
```

## Utility Functions

### Result Helpers

```typescript
import {
  createEmptyResult,
  createIssue,
  mergeResults,
} from 'pkf-validator';

// Create an empty validation result
const result = createEmptyResult();

// Create a validation issue
const issue = createIssue(
  'CUSTOM_ERROR',
  'Something went wrong',
  'error',
  { filePath: 'file.md', line: 10 }
);

// Merge multiple results
const merged = mergeResults(result1, result2, result3);
```

## Error Codes

Common error codes returned by validators:

| Code | Description |
|------|-------------|
| `CONFIG_NOT_FOUND` | PKF configuration file not found |
| `CONFIG_PARSE_ERROR` | Failed to parse YAML configuration |
| `CONFIG_EMPTY` | Configuration file is empty |
| `REQUIRED_FIELD` | Required field is missing |
| `INVALID_VERSION` | Version string is not valid SemVer |
| `DIRECTORY_NOT_FOUND` | Required directory does not exist |
| `REGISTER_FILE_MISSING` | Register file (TODO/ISSUES/CHANGELOG) not found |
| `FRONTMATTER_PARSE_ERROR` | Failed to parse YAML frontmatter |
| `NO_FRONTMATTER` | Document is missing frontmatter |
| `SCHEMA_NOT_FOUND` | JSON schema file not found |
| `INVALID_FIELD_TYPE` | Frontmatter field has wrong type |
| `INVALID_FIELD_FORMAT` | Frontmatter field format is invalid |
| `DSL_PARSE_ERROR` | Failed to parse Schema DSL |
| `INVALID_SCHEMA_NAME` | Schema name format is invalid |
| `CIRCULAR_INHERITANCE` | Circular schema inheritance detected |

## License

MIT
