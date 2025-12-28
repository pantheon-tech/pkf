/**
 * Markdown body structure generator.
 *
 * Generates markdown body with headings and placeholders.
 *
 * @module template/body
 */
import type { TemplateDefinition } from './schema.js';
import { substituteVariablesLenient, type TemplateVariables } from './variables.js';
import type { Result } from '../types.js';
import { ok, err } from '../types.js';

/**
 * Body generation error.
 */
export interface BodyError {
  type: 'invalid_template';
  message: string;
}

/**
 * Generate markdown body from template body sections.
 */
export function generateBody(
  template: TemplateDefinition,
  variables: Partial<TemplateVariables> = {}
): Result<string, BodyError> {
  // Handle register format
  if (template.format === 'register') {
    return generateRegisterBody(template, variables);
  }

  // Handle document format
  return generateDocumentBody(template, variables);
}

/**
 * Generate document-style body with heading sections.
 */
function generateDocumentBody(
  template: TemplateDefinition,
  variables: Partial<TemplateVariables>
): Result<string, BodyError> {
  const sections = template.body ?? [];
  const lines: string[] = [];

  for (const section of sections) {
    // Generate heading
    const headingPrefix = '#'.repeat(section.level);
    lines.push(`${headingPrefix} ${section.heading}`);
    lines.push('');

    // Generate placeholder or content
    if (section.placeholder) {
      const substituted = substituteVariablesLenient(section.placeholder, variables);
      lines.push(`> ${substituted}`);
    } else {
      lines.push('<!-- Content here -->');
    }

    // Add required indicator
    if (section.required) {
      lines.push('');
      lines.push('<!-- REQUIRED SECTION -->');
    }

    lines.push('');
  }

  return ok(lines.join('\n'));
}

/**
 * Generate register-style body with header and item format.
 */
function generateRegisterBody(
  template: TemplateDefinition,
  variables: Partial<TemplateVariables>
): Result<string, BodyError> {
  if (!template.header) {
    return err({
      type: 'invalid_template',
      message: 'Register format requires header field',
    });
  }

  const lines: string[] = [];

  // Add header
  const header = substituteVariablesLenient(template.header, variables);
  lines.push(header);
  lines.push('');

  // Add item format as example
  if (template.itemFormat) {
    lines.push('<!-- Item Format Template -->');
    lines.push('<!--');
    lines.push(template.itemFormat);
    lines.push('-->');
    lines.push('');
  }

  return ok(lines.join('\n'));
}

/**
 * Get required sections from template.
 */
export function getRequiredSections(template: TemplateDefinition): string[] {
  return (template.body ?? [])
    .filter((section) => section.required)
    .map((section) => section.heading);
}

/**
 * Validate that markdown content has all required sections.
 */
export function validateSections(
  content: string,
  template: TemplateDefinition
): Result<void, { type: 'missing_sections'; sections: string[] }> {
  const required = getRequiredSections(template);
  const missing: string[] = [];

  for (const heading of required) {
    // Look for heading in content (any level)
    const headingPattern = new RegExp(`^#+\\s+${escapeRegExp(heading)}\\s*$`, 'm');
    if (!headingPattern.test(content)) {
      missing.push(heading);
    }
  }

  if (missing.length > 0) {
    return err({
      type: 'missing_sections',
      sections: missing,
    });
  }

  return ok(undefined);
}

/**
 * Escape special regex characters.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
