import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Options for configuring the TemplateManager
 */
export interface TemplateManagerOptions {
  /** Default template directory (defaults to built-in templates) */
  templateDir?: string;
  /** Custom template directory for user overrides */
  customTemplateDir?: string | null;
}

/**
 * Manages loading and caching of document templates
 *
 * Supports both default templates and custom template overrides.
 * Templates use {{PLACEHOLDER}} syntax for variable substitution.
 */
export class TemplateManager {
  private templateDir: string;
  private customTemplateDir: string | null;
  private templates: Map<string, string>;

  constructor(options: TemplateManagerOptions = {}) {
    this.templateDir =
      options.templateDir || path.join(__dirname, '../templates');
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
   */
  async loadTemplate(templateName: string): Promise<string> {
    // Return cached template if available
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName)!;
    }

    // Try loading from custom directory first
    if (this.customTemplateDir) {
      try {
        const customPath = path.join(
          this.customTemplateDir,
          `${templateName}.md`,
        );
        const template = await fs.readFile(customPath, 'utf-8');
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
    const defaultPath = path.join(this.templateDir, `${templateName}.md`);
    try {
      const template = await fs.readFile(defaultPath, 'utf-8');
      this.templates.set(templateName, template);
      return template;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(
          `Template '${templateName}' not found in ${this.templateDir}${this.customTemplateDir ? ` or ${this.customTemplateDir}` : ''}`,
        );
      }
      throw error;
    }
  }

  /**
   * Get a list of available templates
   *
   * @returns Array of template names (without .md extension)
   */
  async getAvailableTemplates(): Promise<string[]> {
    const templates = new Set<string>();

    // Add default templates
    try {
      const files = await fs.readdir(this.templateDir);
      files
        .filter((file) => file.endsWith('.md'))
        .forEach((file) => templates.add(file.replace(/\.md$/, '')));
    } catch (error) {
      // Ignore errors reading default directory
    }

    // Add custom templates
    if (this.customTemplateDir) {
      try {
        const files = await fs.readdir(this.customTemplateDir);
        files
          .filter((file) => file.endsWith('.md'))
          .forEach((file) => templates.add(file.replace(/\.md$/, '')));
      } catch (error) {
        // Ignore errors reading custom directory
      }
    }

    return Array.from(templates).sort();
  }

  /**
   * Render a template with variable substitution
   *
   * Replaces {{PLACEHOLDER}} tokens with provided values.
   *
   * @param templateName - Name of template to render
   * @param variables - Object mapping placeholder names to values
   * @returns Rendered template content
   */
  async renderTemplate(
    templateName: string,
    variables: Record<string, string>,
  ): Promise<string> {
    let template = await this.loadTemplate(templateName);

    // Replace all {{PLACEHOLDER}} tokens
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key.toUpperCase()}}}`;
      template = template.replace(new RegExp(placeholder, 'g'), value);
    }

    return template;
  }

  /**
   * Clear the template cache
   *
   * Forces templates to be reloaded on next access.
   */
  clearCache(): void {
    this.templates.clear();
  }

  /**
   * Check if a template exists
   *
   * @param templateName - Name of template to check
   * @returns True if template exists
   */
  async templateExists(templateName: string): Promise<boolean> {
    try {
      await this.loadTemplate(templateName);
      return true;
    } catch (error) {
      return false;
    }
  }
}
