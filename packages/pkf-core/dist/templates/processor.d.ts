/**
 * Template processing utilities for variable substitution
 */
import type { TemplateVariables, TemplateProcessorOptions, ProcessedTemplate } from './types.js';
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
export declare function processTemplate(template: string, variables: TemplateVariables, options?: TemplateProcessorOptions): ProcessedTemplate;
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
export declare function extractVariables(template: string, delimiters?: [string, string]): string[];
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
export declare function createTemplate(content: string, replacements: Record<string, string>, delimiters?: [string, string]): string;
//# sourceMappingURL=processor.d.ts.map