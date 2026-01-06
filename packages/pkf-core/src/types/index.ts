/**
 * pkf-core type definitions
 * Re-exports all types from individual modules
 * @packageDocumentation
 */

// Core types
export type {
  PKFDocument,
  DocumentMetadata,
  PKFSchema,
  SchemaField,
  Result,
  ValidationError,
  ValidationWarning,
} from './core.js';

// Type mapper
export type {
  DocumentType,
  TypeMappingOptions,
  ResolvedPath,
} from './type-mapper.js';

// Schema
export type {
  SchemaLoaderOptions,
  ValidationResult,
  ISchemaLoader,
} from './schema.js';

// Templates
export type {
  TemplateVariables,
  TemplateProcessorOptions,
  ProcessedTemplate,
  ITemplateProcessor,
} from './templates.js';

// Frontmatter
export type {
  FrontmatterGeneratorOptions,
  GeneratedFrontmatter,
  ParsedFrontmatter,
} from './frontmatter.js';

// Scanner
export type {
  ScannerOptions,
  ScanResult,
  ScanError,
  IDocumentScanner,
} from './scanner.js';

// Blueprint
export type {
  ParsedBlueprint,
  AnalysisSummary,
  DocumentEntry,
  DirectoryStructure,
  DirectoryEntry,
  SchemaType,
  MigrationPlan,
  MigrationPhase,
  Warning,
  BlueprintSummary,
} from './blueprint.js';

// Utils
export type {
  AtomicWriteOptions,
  SafeYamlOptions,
} from './utils.js';
