/**
 * Type definitions for PKF Template Processing module
 */

/**
 * Template variable values for substitution
 *
 * @example
 * ```typescript
 * const vars: TemplateVariables = {
 *   PROJECT_NAME: 'My Project',
 *   DESCRIPTION: 'A great project',
 *   VERSION: '1.0.0'
 * };
 * ```
 */
export interface TemplateVariables {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Options for template processing and management
 */
export interface TemplateProcessorOptions {
  /** Directory containing default template files */
  templateDir?: string;
  /** Custom template directory to override defaults */
  customTemplateDir?: string | null;
  /** Placeholder delimiters, defaults to ['{{', '}}'] */
  delimiters?: [string, string];
  /** Throw error on missing variables vs leaving placeholder */
  strict?: boolean;
  /** Default values for common variables */
  defaults?: TemplateVariables;
}

/**
 * Result of template processing with variable tracking
 */
export interface ProcessedTemplate {
  /** Processed content with variables substituted */
  content: string;
  /** Variables that were successfully substituted */
  usedVariables: string[];
  /** Variables found in template but not provided */
  missingVariables: string[];
  /** Source template path (if loaded from file) */
  sourcePath?: string;
}

/**
 * Template metadata extracted from file
 */
export interface TemplateInfo {
  /** Template name (filename without extension) */
  name: string;
  /** Full path to template file */
  path: string;
  /** Variables found in the template */
  variables: string[];
  /** Document type this template is for (if detectable) */
  docType?: string;
}

/**
 * Built-in template names matching common document types
 */
export type BuiltInTemplateName =
  | 'readme'
  | 'guide'
  | 'guide-user'
  | 'guide-developer'
  | 'adr'
  | 'spec'
  | 'specification'
  | 'proposal'
  | 'changelog'
  | 'todo'
  | 'issues'
  | 'api'
  | 'api-reference'
  | 'architecture'
  | 'design-doc'
  | 'claude'
  | 'contributing';

/**
 * Options for configuring the TemplateManager
 */
export interface TemplateManagerOptions {
  /** Default template directory (defaults to built-in templates) */
  templateDir?: string;
  /** Custom template directory for user overrides */
  customTemplateDir?: string | null;
}
