/**
 * PKF Validator Types
 * Core type definitions for validation results and errors
 */

/**
 * Severity level for validation issues
 */
export type Severity = 'error' | 'warning' | 'info';

/**
 * A single validation error or warning
 */
export interface ValidationIssue {
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
export interface ValidationResult {
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
export interface ValidationOptions {
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
export interface PkfConfig {
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
export interface TodoItem {
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
export interface IssueItem {
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
export interface ChangelogEntry {
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
export interface Validator<T = unknown> {
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
export function createEmptyResult(): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  };
}

/**
 * Create a validation issue
 */
export function createIssue(
  code: string,
  message: string,
  severity: Severity = 'error',
  extra?: Partial<ValidationIssue>
): ValidationIssue {
  return {
    code,
    message,
    severity,
    ...extra,
  };
}

/**
 * Merge multiple validation results into one
 */
export function mergeResults(...results: ValidationResult[]): ValidationResult {
  const merged: ValidationResult = createEmptyResult();

  for (const result of results) {
    merged.errors.push(...result.errors);
    merged.warnings.push(...result.warnings);
    merged.info.push(...result.info);
    if (result.duration !== undefined) {
      merged.duration = (merged.duration ?? 0) + result.duration;
    }
    if (result.itemCount !== undefined) {
      merged.itemCount = (merged.itemCount ?? 0) + result.itemCount;
    }
  }

  merged.valid = merged.errors.length === 0;
  return merged;
}
