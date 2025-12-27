/**
 * YAML frontmatter generator.
 *
 * Generates YAML frontmatter from template config and variables.
 *
 * @module template/frontmatter
 */
import { stringify as stringifyYaml } from 'yaml';
import type { FrontmatterConfig, TemplateDefinition } from './schema.js';
import type { TemplateVariables } from './variables.js';
import type { Result } from '../types.js';
import { ok, err } from '../types.js';

/**
 * Frontmatter generation error.
 */
export interface FrontmatterError {
  type: 'missing_required' | 'substitution_failed';
  message: string;
  fields?: string[];
}

/**
 * Generate YAML frontmatter block.
 *
 * @param template - Template definition with frontmatter config
 * @param variables - Variables to substitute (optional for template mode)
 * @param mode - 'template' keeps placeholders, 'document' requires all values
 */
export function generateFrontmatter(
  template: TemplateDefinition,
  variables: Partial<TemplateVariables> = {},
  mode: 'template' | 'document' = 'template'
): Result<string, FrontmatterError> {
  const config = template.frontmatter ?? { required: [], defaults: {} };
  const frontmatter: Record<string, unknown> = {};

  // Apply defaults first
  for (const [key, value] of Object.entries(config.defaults)) {
    frontmatter[key] = value;
  }

  // Add required fields
  for (const field of config.required) {
    if (mode === 'template') {
      // Template mode: use placeholder if no value
      frontmatter[field] = variables[field] ?? `{${field}}`;
    } else {
      // Document mode: require actual value
      if (!(field in variables) || variables[field] === undefined) {
        return err({
          type: 'missing_required',
          message: `Missing required field: ${field}`,
          fields: [field],
        });
      }
      frontmatter[field] = variables[field];
    }
  }

  // Override with provided variables
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      frontmatter[key] = value;
    }
  }

  // Generate YAML block
  const yamlContent = stringifyYaml(frontmatter, {
    indent: 2,
    lineWidth: 0, // No line wrapping
  });

  return ok(`---\n${yamlContent}---\n`);
}

/**
 * Validate frontmatter against required fields.
 */
export function validateFrontmatter(
  frontmatter: Record<string, unknown>,
  config: FrontmatterConfig
): Result<void, FrontmatterError> {
  const missing: string[] = [];

  for (const field of config.required) {
    if (!(field in frontmatter) || frontmatter[field] === undefined) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return err({
      type: 'missing_required',
      message: `Missing required fields: ${missing.join(', ')}`,
      fields: missing,
    });
  }

  return ok(undefined);
}

/**
 * Extract frontmatter from markdown content.
 */
export function extractFrontmatter(
  content: string
): Result<{ frontmatter: Record<string, unknown>; body: string }, { type: 'no_frontmatter' | 'invalid_yaml'; message: string }> {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return err({
      type: 'no_frontmatter',
      message: 'No frontmatter block found',
    });
  }

  const yamlContent = match[1] ?? '';
  const body = match[2] ?? '';

  try {
    const { parse } = require('yaml');
    const frontmatter = parse(yamlContent) as Record<string, unknown>;
    return ok({ frontmatter, body });
  } catch {
    return err({
      type: 'invalid_yaml',
      message: 'Invalid YAML in frontmatter',
    });
  }
}
