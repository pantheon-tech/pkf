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
export declare class TemplateManager {
    private templateDir;
    private customTemplateDir;
    private templates;
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
     */
    loadTemplate(templateName: string): Promise<string>;
    /**
     * Get a list of available templates
     *
     * @returns Array of template names (without .md extension)
     */
    getAvailableTemplates(): Promise<string[]>;
    /**
     * Render a template with variable substitution
     *
     * Replaces {{PLACEHOLDER}} tokens with provided values.
     *
     * @param templateName - Name of template to render
     * @param variables - Object mapping placeholder names to values
     * @returns Rendered template content
     */
    renderTemplate(templateName: string, variables: Record<string, string>): Promise<string>;
    /**
     * Clear the template cache
     *
     * Forces templates to be reloaded on next access.
     */
    clearCache(): void;
    /**
     * Check if a template exists
     *
     * @param templateName - Name of template to check
     * @returns True if template exists
     */
    templateExists(templateName: string): Promise<boolean>;
}
//# sourceMappingURL=template-manager.d.ts.map