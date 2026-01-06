/**
 * Frontmatter generation and parsing interfaces
 * @packageDocumentation
 */

import type { PKFSchema } from './core.js';

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
