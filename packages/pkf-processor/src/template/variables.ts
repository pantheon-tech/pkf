/**
 * Template variable substitution engine.
 *
 * Implements variable parsing, escaping, and substitution per Architecture Section 8.2.
 *
 * @module template/variables
 */
import type { Result } from '../types.js';
import { ok, err } from '../types.js';

/**
 * Standard template variables per Architecture Section 8.2.
 */
export interface TemplateVariables {
  /** Document ID (e.g., 'P01', 'TODO-001') */
  id: string;
  /** Document title */
  title: string;
  /** Document status */
  status: string;
  /** Creation date (YYYY-MM-DD) */
  created: string;
  /** Last update date (YYYY-MM-DD) */
  updated: string;
  /** URL-friendly title slug */
  slug: string;
  /** Zero-padded 2-digit number */
  nn: string;
  /** Zero-padded 3-digit number */
  nnn: string;
  /** Current date (YYYY-MM-DD) */
  date: string;
  /** Document author */
  author: string;
  /** Allow custom variables */
  [key: string]: string;
}

/**
 * Error from variable substitution.
 */
export interface SubstitutionError {
  type: 'unknown_variables';
  variables: string[];
  message: string;
}

/**
 * Temporary placeholders for escape sequences.
 * Using null characters to avoid collision with content.
 */
const ESCAPE_OPEN = '\x00BRACE_OPEN\x00';
const ESCAPE_CLOSE = '\x00BRACE_CLOSE\x00';

/**
 * Pattern for variable references: {varName}
 */
const VARIABLE_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

/**
 * Substitute variables in template string.
 *
 * Processing order (per Section 8.2.1):
 * 1. Replace {{ with temporary placeholder
 * 2. Replace }} with temporary placeholder
 * 3. Substitute {variable} patterns
 * 4. Restore {{ -> { and }} -> }
 *
 * @example
 * substituteVariables('ID: {id}, Pattern: {{id}}', { id: 'P01' })
 * // Returns: { success: true, data: 'ID: P01, Pattern: {id}' }
 */
export function substituteVariables(
  template: string,
  variables: Partial<TemplateVariables>
): Result<string, SubstitutionError> {
  // Step 1: Escape double braces
  let result = template
    .replace(/\{\{/g, ESCAPE_OPEN)
    .replace(/\}\}/g, ESCAPE_CLOSE);

  // Step 2: Track unknown variables
  const unknownVars: string[] = [];

  // Step 3: Substitute known variables
  result = result.replace(VARIABLE_PATTERN, (match, varName) => {
    if (varName in variables && variables[varName] !== undefined) {
      return String(variables[varName]);
    }
    unknownVars.push(varName);
    return match; // Keep unsubstituted
  });

  // Step 4: Restore escaped braces
  result = result
    .replace(new RegExp(escapeRegExp(ESCAPE_OPEN), 'g'), '{')
    .replace(new RegExp(escapeRegExp(ESCAPE_CLOSE), 'g'), '}');

  if (unknownVars.length > 0) {
    return err({
      type: 'unknown_variables',
      variables: unknownVars,
      message: `Unknown variables: ${unknownVars.join(', ')}`,
    });
  }

  return ok(result);
}

/**
 * Substitute variables without error on unknown.
 * Unknown variables are left as-is.
 */
export function substituteVariablesLenient(
  template: string,
  variables: Partial<TemplateVariables>
): string {
  // Escape double braces
  let result = template
    .replace(/\{\{/g, ESCAPE_OPEN)
    .replace(/\}\}/g, ESCAPE_CLOSE);

  // Substitute known variables only
  result = result.replace(VARIABLE_PATTERN, (match, varName) => {
    if (varName in variables && variables[varName] !== undefined) {
      return String(variables[varName]);
    }
    return match;
  });

  // Restore escaped braces
  return result
    .replace(new RegExp(escapeRegExp(ESCAPE_OPEN), 'g'), '{')
    .replace(new RegExp(escapeRegExp(ESCAPE_CLOSE), 'g'), '}');
}

/**
 * Extract variable names from template string.
 * Ignores escaped braces.
 */
export function extractVariables(template: string): string[] {
  // Remove escaped braces first
  const escaped = template
    .replace(/\{\{/g, '')
    .replace(/\}\}/g, '');

  const matches = escaped.matchAll(VARIABLE_PATTERN);
  const varNames = [...matches].map((m) => m[1]).filter((v): v is string => v !== undefined);
  return [...new Set(varNames)];
}

/**
 * Generate zero-padded number string.
 *
 * @param num - Number to pad
 * @param digits - Number of digits (default: 2)
 */
export function padNumber(num: number, digits: number = 2): string {
  return String(num).padStart(digits, '0');
}

/**
 * Generate URL-friendly slug from title.
 *
 * @example
 * slugify('My Great Proposal!') // 'my-great-proposal'
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Get current date in YYYY-MM-DD format.
 */
export function getCurrentDate(): string {
  const isoString = new Date().toISOString();
  const datePart = isoString.split('T')[0];
  return datePart ?? isoString.slice(0, 10);
}

/**
 * Create default template variables with current date.
 */
export function createDefaultVariables(
  overrides: Partial<TemplateVariables> = {}
): Partial<TemplateVariables> {
  const now = getCurrentDate();
  return {
    date: now,
    created: now,
    updated: now,
    ...overrides,
  };
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
