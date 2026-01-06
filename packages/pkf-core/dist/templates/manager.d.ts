/**
 * TemplateManager - Load and process PKF templates
 *
 * Supports loading templates from:
 * 1. Custom template directory (highest priority)
 * 2. Project's templates/ directory
 * 3. Built-in templates (fallback)
 */
import type { TemplateManagerOptions, TemplateVariables, TemplateInfo } from './types.js';
/**
 * TemplateManager - Load, cache, and render PKF document templates
 *
 * @example
 * ```typescript
 * const manager = new TemplateManager({ customTemplateDir: './my-templates' });
 * const content = await manager.renderTemplate('readme', { title: 'My Project' });
 * ```
 */
export declare class TemplateManager {
    private templateDir;
    private customTemplateDir;
    private templates;
    /**
     * Create a new TemplateManager
     *
     * @param options - Configuration options
     */
    constructor(options?: TemplateManagerOptions);
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
    loadTemplate(templateName: string): Promise<string>;
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
    getAvailableTemplates(): Promise<TemplateInfo[]>;
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
    renderTemplate(templateName: string, variables: TemplateVariables): Promise<string>;
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
    clearCache(): void;
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
    templateExists(templateName: string): Promise<boolean>;
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
    generateBuiltInContent(docType: string, title: string): string;
}
//# sourceMappingURL=manager.d.ts.map