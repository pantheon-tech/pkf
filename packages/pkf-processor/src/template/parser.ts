/**
 * Template definition YAML parser.
 *
 * Parses templates.yaml and validates against schema.
 *
 * @module template/parser
 */
import { parse as parseYaml } from 'yaml';
import { TemplatesFileSchema, type TemplatesFile, type TemplateDefinition } from './schema.js';
import type { Result } from '../types.js';
import { ok, err } from '../types.js';

/**
 * Template parse error types.
 */
export interface ParseError {
  type: 'yaml_syntax' | 'validation_failed';
  message: string;
  line?: number;
  details?: unknown;
}

/**
 * Parse templates.yaml file content.
 */
export function parseTemplatesFile(
  yamlContent: string
): Result<TemplatesFile, ParseError> {
  // Step 1: Parse YAML
  let parsed: unknown;
  try {
    parsed = parseYaml(yamlContent);
  } catch (error) {
    const yamlError = error as { mark?: { line?: number }; message?: string };
    return err({
      type: 'yaml_syntax',
      message: yamlError.message ?? 'Invalid YAML syntax',
      line: yamlError.mark?.line,
    });
  }

  // Step 2: Validate against schema
  const result = TemplatesFileSchema.safeParse(parsed);
  if (!result.success) {
    return err({
      type: 'validation_failed',
      message: 'Template definition validation failed',
      details: result.error.issues,
    });
  }

  return ok(result.data);
}

/**
 * Get template by name from parsed templates file.
 */
export function getTemplate(
  templates: TemplatesFile,
  templateName: string
): Result<TemplateDefinition, { type: 'not_found'; name: string }> {
  const template = templates.templates[templateName];
  if (!template) {
    return err({ type: 'not_found', name: templateName });
  }
  return ok(template);
}

/**
 * List all template names.
 */
export function listTemplateNames(templates: TemplatesFile): string[] {
  return Object.keys(templates.templates);
}

/**
 * Get all templates matching a schema name.
 */
export function getTemplatesForSchema(
  templates: TemplatesFile,
  schemaName: string
): TemplateDefinition[] {
  return Object.values(templates.templates).filter(
    (template) => template.forSchema === schemaName
  );
}
