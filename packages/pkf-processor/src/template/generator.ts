/**
 * Complete template file generator.
 *
 * Orchestrates frontmatter and body generation into complete template files.
 *
 * @module template/generator
 */
import type { TemplateDefinition, TemplatesFile } from './schema.js';
import { generateFrontmatter } from './frontmatter.js';
import { generateBody, getRequiredSections } from './body.js';
import type { TemplateVariables } from './variables.js';
import { getCurrentDate } from './variables.js';
import type { Result } from '../types.js';
import { ok, err } from '../types.js';

/**
 * Generated template output.
 */
export interface GeneratedTemplate {
  /** Output filename */
  filename: string;
  /** Complete template content */
  content: string;
  /** Schema this template is for */
  forSchema: string;
  /** List of required section headings */
  requiredSections: string[];
}

/**
 * Template generation error.
 */
export interface GenerateError {
  type: 'frontmatter_failed' | 'body_failed' | 'template_not_found';
  message: string;
  templateName?: string;
  details?: unknown;
}

/**
 * Generation options.
 */
export interface GenerateOptions {
  /** Variables to substitute */
  variables?: Partial<TemplateVariables>;
  /** Generation mode: 'template' keeps placeholders, 'document' requires values */
  mode?: 'template' | 'document';
  /** Include metadata footer */
  includeMetadata?: boolean;
}

/**
 * Generate a complete template file from definition.
 */
export function generateTemplate(
  template: TemplateDefinition,
  options: GenerateOptions = {}
): Result<GeneratedTemplate, GenerateError> {
  const {
    variables = {},
    mode = 'template',
    includeMetadata = false,
  } = options;

  const parts: string[] = [];

  // Generate frontmatter
  const frontmatterResult = generateFrontmatter(template, variables, mode);
  if (!frontmatterResult.success) {
    return err({
      type: 'frontmatter_failed',
      message: frontmatterResult.error.message,
      details: frontmatterResult.error,
    });
  }
  parts.push(frontmatterResult.data);

  // Generate body
  const bodyResult = generateBody(template, variables);
  if (!bodyResult.success) {
    return err({
      type: 'body_failed',
      message: bodyResult.error.message,
      details: bodyResult.error,
    });
  }
  parts.push(bodyResult.data);

  // Add metadata footer
  if (includeMetadata) {
    parts.push('---\n');
    parts.push(`**Template:** ${template.filename}\n`);
    parts.push(`**Schema:** ${template.forSchema}\n`);
    parts.push(`**Generated:** ${getCurrentDate()}\n`);
  }

  return ok({
    filename: template.filename,
    content: parts.join('\n'),
    forSchema: template.forSchema,
    requiredSections: getRequiredSections(template),
  });
}

/**
 * Generate all templates from templates file.
 */
export function generateAllTemplates(
  templatesFile: TemplatesFile,
  options: GenerateOptions = {}
): Map<string, Result<GeneratedTemplate, GenerateError>> {
  const results = new Map<string, Result<GeneratedTemplate, GenerateError>>();

  for (const [name, template] of Object.entries(templatesFile.templates)) {
    results.set(name, generateTemplate(template, options));
  }

  return results;
}

/**
 * Generate template by name from templates file.
 */
export function generateTemplateByName(
  templatesFile: TemplatesFile,
  templateName: string,
  options: GenerateOptions = {}
): Result<GeneratedTemplate, GenerateError> {
  const template = templatesFile.templates[templateName];
  if (!template) {
    return err({
      type: 'template_not_found',
      message: `Template not found: ${templateName}`,
      templateName,
    });
  }

  return generateTemplate(template, options);
}

/**
 * Generate templates for a specific schema.
 */
export function generateTemplatesForSchema(
  templatesFile: TemplatesFile,
  schemaName: string,
  options: GenerateOptions = {}
): Map<string, Result<GeneratedTemplate, GenerateError>> {
  const results = new Map<string, Result<GeneratedTemplate, GenerateError>>();

  for (const [name, template] of Object.entries(templatesFile.templates)) {
    if (template.forSchema === schemaName) {
      results.set(name, generateTemplate(template, options));
    }
  }

  return results;
}
