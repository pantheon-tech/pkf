/**
 * Schema loading and validation interfaces
 * @packageDocumentation
 */

import type { PKFDocument, PKFSchema, ValidationError, ValidationWarning } from './core.js';

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
