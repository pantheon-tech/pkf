/**
 * TemplateManager - Load and process PKF templates
 *
 * Supports loading templates from:
 * 1. Custom template directory (highest priority)
 * 2. Project's templates/ directory
 * 3. Built-in templates (fallback)
 */

import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  TemplateManagerOptions,
  TemplateVariables,
  TemplateInfo,
} from './types.js';
import { processTemplate, extractVariables } from './processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * TemplateManager - Load, cache, and render PKF document templates
 *
 * @example
 * ```typescript
 * const manager = new TemplateManager({ customTemplateDir: './my-templates' });
 * const content = await manager.renderTemplate('readme', { title: 'My Project' });
 * ```
 */
export class TemplateManager {
  private templateDir: string;
  private customTemplateDir: string | null;
  private templates: Map<string, string>;

  /**
   * Create a new TemplateManager
   *
   * @param options - Configuration options
   */
  constructor(options: TemplateManagerOptions = {}) {
    this.templateDir = options.templateDir || join(__dirname, '../../templates');
    this.customTemplateDir = options.customTemplateDir || null;
    this.templates = new Map();
  }

  /**
   * Load a template by name
   *
   * Checks custom template directory first, then falls back to default templates.
   * Templates are cached after first load.
   *
   * @param templateName - Name of template (without .md extension)
   * @returns Template content
   * @throws Error if template not found
   *
   * @example
   * ```typescript
   * const template = await manager.loadTemplate('readme');
   * ```
   */
  async loadTemplate(templateName: string): Promise<string> {
    // Return cached template if available
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName)!;
    }

    // Try loading from custom directory first
    if (this.customTemplateDir) {
      try {
        const customPath = join(this.customTemplateDir, `${templateName}.md`);
        const template = await readFile(customPath, 'utf-8');
        this.templates.set(templateName, template);
        return template;
      } catch (error) {
        // Fall back to default if custom template not found or not accessible
        const errCode = (error as NodeJS.ErrnoException).code;
        if (errCode !== 'ENOENT' && errCode !== 'EACCES') {
          throw error;
        }
      }
    }

    // Load from default template directory
    const defaultPath = join(this.templateDir, `${templateName}.md`);
    try {
      const template = await readFile(defaultPath, 'utf-8');
      this.templates.set(templateName, template);
      return template;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(
          `Template '${templateName}' not found in ${this.templateDir}${this.customTemplateDir ? ` or ${this.customTemplateDir}` : ''}`
        );
      }
      throw error;
    }
  }

  /**
   * Get a list of available templates
   *
   * Scans both default and custom template directories.
   *
   * @returns Array of template information objects
   *
   * @example
   * ```typescript
   * const templates = await manager.getAvailableTemplates();
   * console.log(templates.map(t => t.name)); // ['readme', 'guide', 'adr', ...]
   * ```
   */
  async getAvailableTemplates(): Promise<TemplateInfo[]> {
    const templates: TemplateInfo[] = [];
    const seen = new Set<string>();

    const scanDir = async (dir: string) => {
      try {
        const files = await readdir(dir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const name = file.replace(/\.md$/, '');
            if (!seen.has(name)) {
              const fullPath = join(dir, file);
              try {
                const content = await readFile(fullPath, 'utf-8');
                templates.push({
                  name,
                  path: fullPath,
                  variables: extractVariables(content),
                });
                seen.add(name);
              } catch {
                // Skip files that can't be read
              }
            }
          }
        }
      } catch {
        // Directory doesn't exist or can't be read
      }
    };

    // Scan custom directory first (takes precedence)
    if (this.customTemplateDir) {
      await scanDir(this.customTemplateDir);
    }

    // Scan default directory
    await scanDir(this.templateDir);

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Render a template with variable substitution
   *
   * Replaces {{PLACEHOLDER}} tokens with provided values.
   *
   * @param templateName - Name of template to render
   * @param variables - Object mapping placeholder names to values
   * @returns Rendered template content
   *
   * @example
   * ```typescript
   * const content = await manager.renderTemplate('readme', {
   *   PROJECT_NAME: 'My Project',
   *   DESCRIPTION: 'A great project'
   * });
   * ```
   */
  async renderTemplate(
    templateName: string,
    variables: TemplateVariables
  ): Promise<string> {
    const template = await this.loadTemplate(templateName);

    // Use processor for variable substitution
    const result = processTemplate(template, variables);

    return result.content;
  }

  /**
   * Clear the template cache
   *
   * Forces templates to be reloaded on next access.
   *
   * @example
   * ```typescript
   * manager.clearCache(); // Force reload of templates
   * ```
   */
  clearCache(): void {
    this.templates.clear();
  }

  /**
   * Check if a template exists
   *
   * @param templateName - Name of template to check
   * @returns True if template exists
   *
   * @example
   * ```typescript
   * if (await manager.templateExists('readme')) {
   *   // Use the template
   * }
   * ```
   */
  async templateExists(templateName: string): Promise<boolean> {
    try {
      await this.loadTemplate(templateName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate content for a document type using built-in templates
   *
   * Provides fallback when no external template file exists.
   * Contains hardcoded templates for common document types.
   *
   * @param docType - Document type (readme, guide, adr, etc.)
   * @param title - Document title
   * @returns Generated content
   *
   * @example
   * ```typescript
   * const content = manager.generateBuiltInContent('readme', 'My Project');
   * ```
   */
  generateBuiltInContent(docType: string, title: string): string {
    // Built-in templates extracted from pkf-init migration/worker.ts
    const templates: Record<string, string> = {
      readme: `# ${title}\n\n> TODO: Add project description\n\n## Overview\n\n## Getting Started\n\n## Usage\n`,
      guide: `# ${title}\n\n> TODO: Add guide introduction\n\n## Prerequisites\n\n## Steps\n\n### Step 1\n\n### Step 2\n\n## Summary\n`,
      'guide-user': `# ${title}\n\n> TODO: Add guide introduction\n\n## Prerequisites\n\n## Steps\n\n### Step 1\n\n### Step 2\n\n## Summary\n`,
      'guide-developer': `# ${title}\n\n> TODO: Add guide introduction\n\n## Prerequisites\n\n## Steps\n\n### Step 1\n\n### Step 2\n\n## Summary\n`,
      adr: `# ${title}\n\n## Status\n\nProposed\n\n## Context\n\n> TODO: Describe the context and problem\n\n## Decision\n\n> TODO: Describe the decision\n\n## Consequences\n\n> TODO: Describe the consequences\n`,
      spec: `# ${title}\n\n## Overview\n\n> TODO: Add specification overview\n\n## Requirements\n\n## Specification\n\n## Examples\n`,
      specification: `# ${title}\n\n## Overview\n\n> TODO: Add specification overview\n\n## Requirements\n\n## Specification\n\n## Examples\n`,
      changelog: `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n## [Unreleased]\n\n### Added\n\n### Changed\n\n### Fixed\n`,
      todo: `# TODO\n\nTasks and action items for this project.\n\n## High Priority\n\n## Medium Priority\n\n## Low Priority\n`,
      issues: `# Issues\n\nKnown issues and bugs.\n\n## Open Issues\n\n## Resolved Issues\n`,
      api: `# ${title}\n\n## Overview\n\n> TODO: Add API overview\n\n## Endpoints\n\n## Authentication\n\n## Examples\n`,
      'api-reference': `# ${title}\n\n## Overview\n\n> TODO: Add API overview\n\n## Endpoints\n\n## Authentication\n\n## Examples\n`,
      architecture: `# ${title}\n\n## Overview\n\n> TODO: Add architecture overview\n\n## Components\n\n## Interactions\n\n## Design Decisions\n`,
      'design-doc': `# ${title}\n\n## Overview\n\n> TODO: Add architecture overview\n\n## Components\n\n## Interactions\n\n## Design Decisions\n`,
    };

    return templates[docType] ?? `# ${title}\n\n> TODO: Add content\n`;
  }
}
