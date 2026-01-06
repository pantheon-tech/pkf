/**
 * Template processing interfaces (deprecated - use @pantheon-tech/pkf-core/templates instead)
 *
 * This file is kept for backwards compatibility only.
 * All template-related types are now exported from the templates module.
 *
 * @deprecated Import from '@pantheon-tech/pkf-core/templates' instead
 * @packageDocumentation
 */

// Re-export from the templates module to maintain backwards compatibility
export type {
  TemplateVariables,
  TemplateProcessorOptions,
  ProcessedTemplate,
} from '../templates/types.js';

/**
 * Template processor interface (deprecated)
 * @deprecated Use TemplateManager from '@pantheon-tech/pkf-core/templates' instead
 */
export interface ITemplateProcessor {
  /** Load a template by name */
  loadTemplate(templateName: string): Promise<string>;
  /** Render a template with variables */
  renderTemplate(
    templateName: string,
    variables: Record<string, string | number | boolean | undefined>
  ): Promise<{
    content: string;
    usedVariables: string[];
    missingVariables: string[];
  }>;
  /** Check if a template exists */
  templateExists(templateName: string): Promise<boolean>;
  /** Get list of available templates */
  getAvailableTemplates(): Promise<string[]>;
}
