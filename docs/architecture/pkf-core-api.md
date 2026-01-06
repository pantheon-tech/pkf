# @pantheon-tech/pkf-core API Design

**Version:** 0.1.0
**Status:** Design Phase
**Last Updated:** 2026-01-05

## Table of Contents

1. [Design Principles](#design-principles)
2. [Module Architecture](#module-architecture)
3. [Public API Reference](#public-api-reference)
4. [Usage Examples](#usage-examples)
5. [Extension Points](#extension-points)
6. [Design Decisions](#design-decisions)

---

## Design Principles

### 1. Framework-Agnostic

**Rationale:** pkf-core must work identically in CLI (pkf-init), MCP server (pkf-mcp-server), and future integrations.

**Implementation:**
- No direct dependencies on CLI frameworks (commander, inquirer)
- No MCP-specific code (server setup, protocol handling)
- Pure TypeScript with minimal runtime dependencies
- Environment-agnostic file operations

**Dependencies:**
- `js-yaml` (peer dependency for YAML parsing)
- Node.js built-in modules only (fs, path)

### 2. Stateless Operations

**Rationale:** Predictable behavior, easier testing, and clear data flow.

**Implementation:**
- All functions accept required data as parameters
- No module-level state that persists between calls
- Side effects (file I/O) clearly marked with `async` keyword
- Pure functions for all business logic transformations

### 3. Composable Modules

**Rationale:** Enable selective imports and tree-shaking for optimal bundle size.

**Implementation:**
- Each module has a single, well-defined responsibility
- Modules can be imported independently via subpath exports
- No circular dependencies between modules
- Clear dependency hierarchy

### 4. Comprehensive Typing

**Rationale:** Type safety prevents bugs and improves developer experience.

**Implementation:**
- All public APIs have explicit TypeScript types
- Use generics where appropriate for flexibility
- Export all types used in public APIs
- JSDoc comments for complex types

### 5. Error Handling

**Rationale:** Failures should be explicit and recoverable where possible.

**Implementation:**
- Use `Result<T, E>` types for operations that can fail gracefully
- Throw only for programmer errors (invalid arguments)
- Include context in error messages (file paths, operation details)
- Validation errors return structured error objects

---

## Module Architecture

```
@pantheon-tech/pkf-core
├── type-mapper         # Document type classification and directory mapping
├── schema              # Schema loading and validation
├── templates           # Template processing and rendering
├── frontmatter         # Frontmatter generation and parsing
├── scanner             # Document scanning and discovery
├── blueprint           # Blueprint parsing and summary extraction
├── utils               # Common utilities (YAML, file operations)
└── types               # Shared TypeScript types
```

### Module Dependency Graph

```
┌─────────────┐
│   scanner   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ type-mapper │────▶│   schema    │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       └───────────▶│ frontmatter │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  templates  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  blueprint  │
                    └─────────────┘
                           ▲
                           │
                    ┌──────┴──────┐
                    │    utils    │
                    └─────────────┘
```

**Dependency Rules:**
- All modules depend on `types` (no circular dependency)
- `utils` is a pure utility module with no business logic dependencies
- Higher-level modules (`blueprint`) may depend on lower-level modules
- No module may depend on modules at the same level

---

## Public API Reference

### Core Types Module

**Import:** `@pantheon-tech/pkf-core/types`

```typescript
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
  title?: string;
  description?: string;
  category?: string;
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
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

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
```

### Type Mapper Module

**Import:** `@pantheon-tech/pkf-core/type-mapper`

```typescript
/**
 * Supported PKF document types
 */
export type DocumentType =
  | 'readme'
  | 'guide'
  | 'api-reference'
  | 'architecture'
  | 'adr'
  | 'spec'
  | 'proposal'
  | 'register'
  | 'template'
  | 'generic';

/**
 * Configuration for type detection and mapping
 */
export interface TypeMappingOptions {
  /** Preserve subdirectory structure in target paths */
  preserveSubdirectories?: boolean;
  /** Custom type-to-directory mappings */
  customMappings?: Record<string, string>;
  /** Custom type detection patterns */
  customPatterns?: Array<{ pattern: RegExp; type: string }>;
}

/**
 * Result of type detection and path resolution
 */
export interface ResolvedPath {
  /** Target path in PKF structure */
  targetPath: string;
  /** Detected document type */
  docType: DocumentType;
  /** Schema name to use for validation */
  schemaName: string;
}

/**
 * Detect document type from file path and optional content
 *
 * @param filePath - Relative or absolute path to the file
 * @param content - Optional file content for content-based detection
 * @returns Detected document type
 *
 * @example
 * ```typescript
 * const type = detectDocumentType('docs/guides/getting-started.md');
 * // Returns: 'guide'
 * ```
 */
export function detectDocumentType(
  filePath: string,
  content?: string
): DocumentType;

/**
 * Resolve target path for a document based on its type
 *
 * @param sourcePath - Current path relative to project root
 * @param docType - Document type
 * @param options - Optional mapping configuration
 * @returns Resolved target path in PKF structure
 *
 * @example
 * ```typescript
 * const target = resolveTargetPath(
 *   'old/location/api-docs.md',
 *   'api-reference'
 * );
 * // Returns: 'docs/api/api-docs.md'
 * ```
 */
export function resolveTargetPath(
  sourcePath: string,
  docType: DocumentType,
  options?: TypeMappingOptions
): string;

/**
 * Get schema name for a document type
 *
 * @param docType - Document type
 * @returns PKF schema name
 *
 * @example
 * ```typescript
 * const schema = getSchemaForDocType('guide');
 * // Returns: 'guide'
 * ```
 */
export function getSchemaForDocType(docType: DocumentType): string;

/**
 * Get required directories for a set of document types
 *
 * @param docTypes - Set of document types found in project
 * @param options - Optional mapping configuration
 * @returns Array of directory paths to create
 *
 * @example
 * ```typescript
 * const dirs = getRequiredDirectories(new Set(['guide', 'api-reference']));
 * // Returns: ['docs', 'docs/guides', 'docs/api']
 * ```
 */
export function getRequiredDirectories(
  docTypes: Set<DocumentType>,
  options?: TypeMappingOptions
): string[];
```

### Schema Module

**Import:** `@pantheon-tech/pkf-core/schema`

```typescript
/**
 * Options for schema loader
 */
export interface SchemaLoaderOptions {
  /** Directory containing schema YAML files */
  schemaDir?: string;
  /** Strict mode: fail on unknown schemas */
  strictMode?: boolean;
  /** Allow schema extensions */
  allowExtensions?: boolean;
}

/**
 * Schema validation result
 */
export interface ValidationResult {
  /** Whether document is valid */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Non-blocking warnings */
  warnings: ValidationWarning[];
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

/**
 * Schema loader interface
 */
export interface ISchemaLoader {
  /** Load a single schema by name */
  load(schemaName: string): Promise<PKFSchema>;
  /** Load all available schemas */
  loadAll(): Promise<PKFSchema[]>;
  /** Validate a document against a schema */
  validate(document: PKFDocument, schemaName: string): Promise<ValidationResult>;
}

/**
 * Create a schema loader instance
 *
 * @param options - Configuration options
 * @returns Schema loader instance
 *
 * @example
 * ```typescript
 * const loader = createSchemaLoader({
 *   schemaDir: './schemas',
 *   strictMode: true
 * });
 * const schema = await loader.load('guide');
 * ```
 */
export function createSchemaLoader(options?: SchemaLoaderOptions): ISchemaLoader;

/**
 * Validate document against schema
 *
 * @param document - Document to validate
 * @param schema - Schema to validate against
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateDocument(doc, schema);
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
export function validateDocument(
  document: PKFDocument,
  schema: PKFSchema
): ValidationResult;
```

### Templates Module

**Import:** `@pantheon-tech/pkf-core/templates`

```typescript
/**
 * Template variable substitution map
 */
export interface TemplateVariables {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Template processor options
 */
export interface TemplateProcessorOptions {
  /** Directory containing templates */
  templateDir?: string;
  /** Custom delimiter pair (default: ['{{', '}}']) */
  customDelimiters?: [string, string];
  /** Strict mode: fail on missing variables */
  strict?: boolean;
}

/**
 * Processed template result
 */
export interface ProcessedTemplate {
  /** Rendered content */
  content: string;
  /** Variables that were used */
  usedVariables: string[];
  /** Variables that were missing (empty if strict mode) */
  missingVariables: string[];
}

/**
 * Template processor interface
 */
export interface ITemplateProcessor {
  /** Load a template by name */
  loadTemplate(templateName: string): Promise<string>;
  /** Render a template with variables */
  renderTemplate(templateName: string, variables: TemplateVariables): Promise<ProcessedTemplate>;
  /** Check if a template exists */
  templateExists(templateName: string): Promise<boolean>;
  /** Get list of available templates */
  getAvailableTemplates(): Promise<string[]>;
}

/**
 * Create a template processor instance
 *
 * @param options - Configuration options
 * @returns Template processor instance
 *
 * @example
 * ```typescript
 * const processor = createTemplateProcessor({
 *   templateDir: './templates'
 * });
 * const result = await processor.renderTemplate('guide', {
 *   title: 'Getting Started',
 *   project: 'My Project'
 * });
 * ```
 */
export function createTemplateProcessor(
  options?: TemplateProcessorOptions
): ITemplateProcessor;
```

### Frontmatter Module

**Import:** `@pantheon-tech/pkf-core/frontmatter`

```typescript
/**
 * Options for frontmatter generation
 */
export interface FrontmatterGeneratorOptions {
  /** Schema to generate frontmatter from */
  schema: PKFSchema;
  /** Date format for date fields (default: ISO 8601) */
  dateFormat?: string;
  /** Include optional fields with empty values */
  includeOptional?: boolean;
}

/**
 * Generated frontmatter result
 */
export interface GeneratedFrontmatter {
  /** YAML string (without delimiters) */
  yaml: string;
  /** Parsed fields object */
  fields: Record<string, unknown>;
}

/**
 * Parsed frontmatter from document
 */
export interface ParsedFrontmatter {
  /** Parsed frontmatter data */
  data: Record<string, unknown>;
  /** Document content without frontmatter */
  content: string;
  /** Raw frontmatter YAML */
  raw: string;
}

/**
 * Generate frontmatter from schema
 *
 * @param schema - PKF schema definition
 * @param values - Values to populate (optional)
 * @param options - Generation options
 * @returns Generated frontmatter
 *
 * @example
 * ```typescript
 * const frontmatter = generateFrontmatter(schema, {
 *   title: 'API Reference',
 *   category: 'api'
 * });
 * console.log(frontmatter.yaml);
 * ```
 */
export function generateFrontmatter(
  schema: PKFSchema,
  values?: Record<string, unknown>,
  options?: FrontmatterGeneratorOptions
): GeneratedFrontmatter;

/**
 * Parse frontmatter from document content
 *
 * @param content - Full document content
 * @returns Parsed frontmatter and remaining content
 *
 * @example
 * ```typescript
 * const parsed = parseFrontmatter(documentContent);
 * console.log(parsed.data.title);
 * console.log(parsed.content);
 * ```
 */
export function parseFrontmatter(content: string): ParsedFrontmatter | null;

/**
 * Add or update frontmatter in document
 *
 * @param content - Current document content
 * @param frontmatter - Frontmatter data to add/update
 * @returns Updated document content
 *
 * @example
 * ```typescript
 * const updated = addFrontmatter(content, {
 *   title: 'New Title',
 *   updated: new Date().toISOString()
 * });
 * ```
 */
export function addFrontmatter(
  content: string,
  frontmatter: Record<string, unknown>
): string;
```

### Scanner Module

**Import:** `@pantheon-tech/pkf-core/scanner`

```typescript
/**
 * Scanner configuration options
 */
export interface ScannerOptions {
  /** Root directory to scan */
  rootDir: string;
  /** Glob patterns to include (default: ['**\/*.md']) */
  patterns?: string[];
  /** Patterns to exclude (default: common build dirs) */
  excludePatterns?: string[];
  /** Include hidden files (default: false) */
  includeHidden?: boolean;
  /** Maximum directory depth (default: unlimited) */
  maxDepth?: number;
  /** Load file content during scan (default: false) */
  loadContent?: boolean;
}

/**
 * Scan result with discovered documents
 */
export interface ScanResult {
  /** Discovered documents */
  documents: PKFDocument[];
  /** Total files scanned */
  totalScanned: number;
  /** Scan errors encountered */
  errors: ScanError[];
}

/**
 * Error encountered during scanning
 */
export interface ScanError {
  /** File path that caused error */
  path: string;
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
}

/**
 * Document scanner interface
 */
export interface IDocumentScanner {
  /** Scan directory for documents */
  scan(options?: Partial<ScannerOptions>): Promise<ScanResult>;
  /** Scan a single file */
  scanFile(filePath: string): Promise<PKFDocument | null>;
}

/**
 * Create a document scanner instance
 *
 * @param baseOptions - Base scanner configuration
 * @returns Scanner instance
 *
 * @example
 * ```typescript
 * const scanner = createScanner({ rootDir: process.cwd() });
 * const result = await scanner.scan({
 *   patterns: ['**\/*.md'],
 *   excludePatterns: ['node_modules/**']
 * });
 * ```
 */
export function createScanner(baseOptions: ScannerOptions): IDocumentScanner;
```

### Blueprint Module

**Import:** `@pantheon-tech/pkf-core/blueprint`

```typescript
/**
 * Parsed PKF blueprint structure
 */
export interface ParsedBlueprint {
  /** Analysis summary */
  analysisSummary: AnalysisSummary;
  /** Discovered documents */
  discoveredDocuments: DocumentEntry[];
  /** Recommended directory structure */
  recommendedStructure: DirectoryStructure;
  /** Recommended document types */
  recommendedTypes: SchemaType[];
  /** Migration plan */
  migrationPlan: MigrationPlan;
  /** Warnings */
  warnings: Warning[];
}

/**
 * Analysis summary from blueprint
 */
export interface AnalysisSummary {
  totalDocuments: number;
  withFrontmatter: number;
  migrationComplexity: {
    low: number;
    medium: number;
    high: number;
  };
}

/**
 * Document entry in blueprint
 */
export interface DocumentEntry {
  path: string;
  type: string;
  title?: string;
  hasFrontmatter: boolean;
  complexity: 'simple' | 'medium' | 'complex';
  migrationEffort: 'low' | 'medium' | 'high';
}

/**
 * Blueprint summary for display
 */
export interface BlueprintSummary {
  totalDocuments: number;
  withFrontmatter: number;
  documentTypes: Map<string, number>;
  migrationComplexity: 'low' | 'medium' | 'high';
  warnings: string[];
}

/**
 * Parse blueprint YAML content
 *
 * @param yamlContent - Blueprint YAML string
 * @returns Parsed blueprint or error result
 *
 * @example
 * ```typescript
 * const result = parseBlueprint(yamlContent);
 * if (result.success) {
 *   console.log(result.value.analysisSummary);
 * }
 * ```
 */
export function parseBlueprint(yamlContent: string): Result<ParsedBlueprint>;

/**
 * Extract summary from blueprint
 *
 * @param blueprint - Parsed blueprint
 * @returns Concise summary for display
 *
 * @example
 * ```typescript
 * const summary = extractBlueprintSummary(blueprint);
 * console.log(`Total documents: ${summary.totalDocuments}`);
 * ```
 */
export function extractBlueprintSummary(blueprint: ParsedBlueprint): BlueprintSummary;
```

### Utils Module

**Import:** `@pantheon-tech/pkf-core/utils`

```typescript
/**
 * Options for atomic file writes
 */
export interface AtomicWriteOptions {
  /** File mode/permissions */
  mode?: number;
  /** Create backup before overwriting */
  backup?: boolean;
  /** Encoding (default: 'utf-8') */
  encoding?: BufferEncoding;
}

/**
 * Options for safe YAML parsing
 */
export interface SafeYamlOptions {
  /** YAML schema to use */
  schema?: 'json' | 'core' | 'failsafe';
  /** Strict mode: fail on unknown tags */
  strict?: boolean;
}

/**
 * Safely parse YAML content
 *
 * @param content - YAML string to parse
 * @param options - Parsing options
 * @returns Parsed object or error result
 *
 * @example
 * ```typescript
 * const result = safeParseYaml(content);
 * if (result.success) {
 *   console.log(result.value);
 * }
 * ```
 */
export function safeParseYaml<T = unknown>(
  content: string,
  options?: SafeYamlOptions
): Result<T>;

/**
 * Safely dump object to YAML
 *
 * @param data - Object to serialize
 * @param options - Dumping options
 * @returns YAML string or error result
 */
export function safeDumpYaml(
  data: unknown,
  options?: SafeYamlOptions
): Result<string>;

/**
 * Atomically write file with backup support
 *
 * @param filePath - Target file path
 * @param content - Content to write
 * @param options - Write options
 * @returns Write result
 *
 * @example
 * ```typescript
 * const result = await atomicWriteFile(
 *   'config.yaml',
 *   yamlContent,
 *   { backup: true }
 * );
 * ```
 */
export function atomicWriteFile(
  filePath: string,
  content: string,
  options?: AtomicWriteOptions
): Promise<Result<void>>;

/**
 * Normalize file path separators
 *
 * @param filePath - Path to normalize
 * @returns Normalized path with forward slashes
 */
export function normalizePath(filePath: string): string;

/**
 * Check if path should be excluded from processing
 *
 * @param filePath - Path to check
 * @returns True if path should be excluded
 */
export function shouldExcludePath(filePath: string): boolean;
```

---

## Usage Examples

### Example 1: Scan and Classify Documents

```typescript
import { createScanner } from '@pantheon-tech/pkf-core/scanner';
import { detectDocumentType, getSchemaForDocType } from '@pantheon-tech/pkf-core/type-mapper';

const scanner = createScanner({ rootDir: process.cwd() });
const result = await scanner.scan();

for (const doc of result.documents) {
  const type = detectDocumentType(doc.relativePath, doc.content);
  const schema = getSchemaForDocType(type);
  console.log(`${doc.relativePath} -> ${type} (schema: ${schema})`);
}
```

### Example 2: Validate Documents Against Schemas

```typescript
import { createScanner } from '@pantheon-tech/pkf-core/scanner';
import { createSchemaLoader } from '@pantheon-tech/pkf-core/schema';
import { detectDocumentType, getSchemaForDocType } from '@pantheon-tech/pkf-core/type-mapper';

const scanner = createScanner({ rootDir: process.cwd() });
const loader = createSchemaLoader({ schemaDir: './schemas' });

const result = await scanner.scan({ loadContent: true });

for (const doc of result.documents) {
  const schemaName = getSchemaForDocType(detectDocumentType(doc.relativePath));
  const validation = await loader.validate(doc, schemaName);

  if (!validation.valid) {
    console.error(`${doc.path}:`, validation.errors);
  }
}
```

### Example 3: Generate Frontmatter from Template

```typescript
import { createSchemaLoader } from '@pantheon-tech/pkf-core/schema';
import { generateFrontmatter, addFrontmatter } from '@pantheon-tech/pkf-core/frontmatter';
import { readFile, writeFile } from 'fs/promises';

const loader = createSchemaLoader();
const schema = await loader.load('guide');

const frontmatter = generateFrontmatter(schema, {
  title: 'Getting Started Guide',
  category: 'user-guide',
  tags: ['tutorial', 'beginner']
});

const content = await readFile('guide.md', 'utf-8');
const updated = addFrontmatter(content, frontmatter.fields);
await writeFile('guide.md', updated);
```

### Example 4: Process Blueprint

```typescript
import { parseBlueprint, extractBlueprintSummary } from '@pantheon-tech/pkf-core/blueprint';
import { readFile } from 'fs/promises';

const yamlContent = await readFile('.pkf-blueprint.yaml', 'utf-8');
const result = parseBlueprint(yamlContent);

if (result.success) {
  const summary = extractBlueprintSummary(result.value);
  console.log(`Total documents: ${summary.totalDocuments}`);
  console.log(`Migration complexity: ${summary.migrationComplexity}`);

  for (const [type, count] of summary.documentTypes) {
    console.log(`${type}: ${count}`);
  }
}
```

---

## Extension Points

### Custom Type Mappings

```typescript
import { detectDocumentType, resolveTargetPath } from '@pantheon-tech/pkf-core/type-mapper';

const customMappings = {
  'api-reference': 'documentation/api',
  'guide': 'documentation/guides'
};

const targetPath = resolveTargetPath(
  'old/api-doc.md',
  detectDocumentType('old/api-doc.md'),
  { customMappings }
);
```

### Custom Schema Validation

```typescript
import { createSchemaLoader, validateDocument } from '@pantheon-tech/pkf-core/schema';

const loader = createSchemaLoader({
  schemaDir: './custom-schemas',
  allowExtensions: true
});

// Custom post-validation logic
function validateWithCustomRules(doc: PKFDocument, schema: PKFSchema) {
  const baseResult = validateDocument(doc, schema);

  // Add custom validation
  if (doc.type === 'api-reference' && !doc.metadata?.version) {
    baseResult.errors.push({
      field: 'version',
      message: 'API reference must have version field',
      code: 'MISSING_VERSION'
    });
  }

  return baseResult;
}
```

### Custom Template Delimiters

```typescript
import { createTemplateProcessor } from '@pantheon-tech/pkf-core/templates';

const processor = createTemplateProcessor({
  customDelimiters: ['<<', '>>']
});

// Now templates use << TITLE >> instead of {{ TITLE }}
```

---

## Design Decisions

### Alternative Designs Considered

#### 1. Class-Based vs Function-Based API

**Decision:** Hybrid approach with factory functions returning interfaces

**Rationale:**
- Factory functions (`createScanner`, `createSchemaLoader`) provide clean initialization
- Interfaces (`IDocumentScanner`, `ISchemaLoader`) enable easy mocking in tests
- Pure functions for stateless operations (`detectDocumentType`, `parseBlueprint`)
- Classes used internally for state management (TemplateManager, SchemaLoader)

**Alternative:** Pure class-based API was rejected because it couples consumers to implementation details

#### 2. Synchronous vs Asynchronous APIs

**Decision:** Async for I/O operations, sync for pure transformations

**Rationale:**
- File operations (`scan`, `loadTemplate`) are naturally async
- Pure functions (`detectDocumentType`, `parseBlueprint`) are sync for simplicity
- Consistent with Node.js fs/promises patterns

**Alternative:** Making everything async was rejected as unnecessary overhead for pure functions

#### 3. Error Handling Strategy

**Decision:** `Result<T, E>` types for expected failures, exceptions for programmer errors

**Rationale:**
- `Result` type makes error handling explicit and type-safe
- Parsing failures, validation errors are expected and recoverable
- Invalid arguments (null where string expected) throw exceptions

**Alternative:** Exception-only approach was rejected because it makes error handling implicit

#### 4. Module Granularity

**Decision:** Fine-grained modules with subpath exports

**Rationale:**
- Enables tree-shaking for optimal bundle size
- Clear separation of concerns
- Consumers import only what they need

**Alternative:** Single barrel export was rejected due to larger bundle sizes

### Compatibility Requirements

**Node.js:** >= 18.0.0 (for native ESM support)

**TypeScript:** >= 5.0.0 (for improved type inference)

**Dependencies:**
- `js-yaml` (peer dependency): ^4.1.0
- No other runtime dependencies

### Performance Considerations

**Lazy Loading:** Schemas and templates are loaded on first use and cached

**Streaming:** Scanner supports streaming for large repositories (future enhancement)

**Caching:** All modules support caching for repeated operations

**Memory:** Limit document content loading to on-demand basis

---

## Future Enhancements

### v0.2.0
- Streaming document scanner for large repositories
- Schema inheritance and composition
- Template includes and partials

### v0.3.0
- Plugin system for custom validators
- Document transformation pipelines
- CLI tool for standalone use

### v1.0.0
- Stable API with semantic versioning guarantees
- Comprehensive documentation site
- Performance benchmarks

---

**Related Documents:**
- [Versioning Policy](./pkf-core-versioning.md)
- Migration Guide (future - not yet created)
