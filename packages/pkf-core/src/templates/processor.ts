/**
 * Template processing utilities for variable substitution
 */

import type {
  TemplateVariables,
  TemplateProcessorOptions,
  ProcessedTemplate,
} from './types.js';

/**
 * Process a template string with variable substitution
 *
 * Replaces {{VAR_NAME}} placeholders with provided values.
 * Tracks which variables were used and which were missing.
 *
 * @param template - Template content with {{VAR}} placeholders
 * @param variables - Key-value pairs for substitution
 * @param options - Processing options
 * @returns ProcessedTemplate with content and variable tracking
 *
 * @example
 * ```typescript
 * const result = processTemplate(
 *   '# {{PROJECT_NAME}}\n\n{{DESCRIPTION}}',
 *   { PROJECT_NAME: 'My Project', DESCRIPTION: 'A great project' }
 * );
 * // result.content = '# My Project\n\nA great project'
 * // result.usedVariables = ['PROJECT_NAME', 'DESCRIPTION']
 * // result.missingVariables = []
 * ```
 */
export function processTemplate(
  template: string,
  variables: TemplateVariables,
  options?: TemplateProcessorOptions
): ProcessedTemplate {
  const [openDelim, closeDelim] = options?.delimiters ?? ['{{', '}}'];
  const strict = options?.strict ?? false;
  const defaults = options?.defaults ?? {};

  // Merge defaults with provided variables
  const mergedVars = { ...defaults, ...variables };

  const usedVariables: string[] = [];
  const missingVariables: string[] = [];

  // Build regex to match placeholders
  const escapedOpen = escapeRegex(openDelim);
  const escapedClose = escapeRegex(closeDelim);
  const regex = new RegExp(`${escapedOpen}([A-Z_][A-Z0-9_]*)${escapedClose}`, 'g');

  const content = template.replace(regex, (match, varName: string) => {
    if (varName in mergedVars && mergedVars[varName] !== undefined) {
      usedVariables.push(varName);
      return String(mergedVars[varName]);
    } else {
      missingVariables.push(varName);
      if (strict) {
        throw new Error(`Missing template variable: ${varName}`);
      }
      return match; // Leave placeholder intact
    }
  });

  return {
    content,
    usedVariables: Array.from(new Set(usedVariables)), // Deduplicate
    missingVariables: Array.from(new Set(missingVariables)), // Deduplicate
  };
}

/**
 * Extract all variable names from a template
 *
 * @param template - Template content to analyze
 * @param delimiters - Placeholder delimiters (defaults to ['{{', '}}'])
 * @returns Array of unique variable names found in template
 *
 * @example
 * ```typescript
 * const vars = extractVariables('# {{TITLE}}\n\n{{DESCRIPTION}}\n\n{{TITLE}}');
 * // vars = ['TITLE', 'DESCRIPTION']
 * ```
 */
export function extractVariables(
  template: string,
  delimiters?: [string, string]
): string[] {
  const [openDelim, closeDelim] = delimiters ?? ['{{', '}}'];
  const escapedOpen = escapeRegex(openDelim);
  const escapedClose = escapeRegex(closeDelim);
  const regex = new RegExp(`${escapedOpen}([A-Z_][A-Z0-9_]*)${escapedClose}`, 'g');

  const variables = new Set<string>();
  let match;
  while ((match = regex.exec(template)) !== null) {
    if (match[1]) {
      variables.add(match[1]);
    }
  }

  return Array.from(variables);
}

/**
 * Create a template from content by replacing values with placeholders
 *
 * Useful for converting existing content into reusable templates.
 *
 * @param content - Content to templatize
 * @param replacements - Map of values to replace with placeholder names
 * @param delimiters - Placeholder delimiters (defaults to ['{{', '}}'])
 * @returns Template content with placeholders
 *
 * @example
 * ```typescript
 * const template = createTemplate(
 *   '# My Project\n\nA great project',
 *   { 'My Project': 'PROJECT_NAME', 'A great project': 'DESCRIPTION' }
 * );
 * // template = '# {{PROJECT_NAME}}\n\n{{DESCRIPTION}}'
 * ```
 */
export function createTemplate(
  content: string,
  replacements: Record<string, string>,
  delimiters?: [string, string]
): string {
  const [openDelim, closeDelim] = delimiters ?? ['{{', '}}'];
  let template = content;

  for (const [value, varName] of Object.entries(replacements)) {
    template = template.replace(
      new RegExp(escapeRegex(value), 'g'),
      `${openDelim}${varName}${closeDelim}`
    );
  }

  return template;
}

/**
 * Escape special regex characters in a string
 *
 * @param str - String to escape
 * @returns Escaped string safe for use in regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
