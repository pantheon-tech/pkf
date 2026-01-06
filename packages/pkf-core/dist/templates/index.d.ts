/**
 * PKF Template Processing Module
 *
 * Provides utilities for loading, caching, and processing PKF document templates.
 * Supports variable substitution with {{PLACEHOLDER}} syntax.
 *
 * @example
 * ```typescript
 * import { TemplateManager, processTemplate } from '@pantheon-tech/pkf-core/templates';
 *
 * // Create a template manager
 * const manager = new TemplateManager({ customTemplateDir: './my-templates' });
 *
 * // Render a template
 * const content = await manager.renderTemplate('readme', {
 *   PROJECT_NAME: 'My Project',
 *   DESCRIPTION: 'A great project'
 * });
 *
 * // Or process a template string directly
 * const result = processTemplate(
 *   '# {{TITLE}}\n\n{{CONTENT}}',
 *   { TITLE: 'Hello', CONTENT: 'World' }
 * );
 * ```
 *
 * @module templates
 */
export type { TemplateVariables, TemplateProcessorOptions, ProcessedTemplate, TemplateInfo, BuiltInTemplateName, TemplateManagerOptions, } from './types.js';
export { TemplateManager } from './manager.js';
export { processTemplate, extractVariables, createTemplate } from './processor.js';
import { TemplateManager } from './manager.js';
import type { TemplateVariables, TemplateManagerOptions } from './types.js';
/**
 * Create a template manager instance (convenience function)
 *
 * @param options - Template manager configuration
 * @returns New TemplateManager instance
 *
 * @example
 * ```typescript
 * const manager = createTemplateManager({ customTemplateDir: './templates' });
 * const content = await manager.renderTemplate('readme', { title: 'My Project' });
 * ```
 */
export declare function createTemplateManager(options?: TemplateManagerOptions): TemplateManager;
/**
 * Quick template render without creating a manager (convenience function)
 *
 * Creates a temporary manager, renders the template, and discards it.
 * Use `TemplateManager` directly if rendering multiple templates.
 *
 * @param templateName - Name of template to render
 * @param variables - Variable values for substitution
 * @param options - Template manager options
 * @returns Rendered content
 *
 * @example
 * ```typescript
 * const content = await renderTemplate('readme', {
 *   PROJECT_NAME: 'My Project'
 * });
 * ```
 */
export declare function renderTemplate(templateName: string, variables: TemplateVariables, options?: TemplateManagerOptions): Promise<string>;
//# sourceMappingURL=index.d.ts.map