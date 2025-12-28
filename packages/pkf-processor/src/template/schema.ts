/**
 * Template definition Zod schemas.
 *
 * Validates template YAML structure per Architecture Section 8.1.
 *
 * @module template/schema
 */
import { z } from 'zod';

/**
 * Body section definition (heading with placeholder).
 */
export const BodySectionSchema = z.object({
  /** Section heading text */
  heading: z.string().min(1),
  /** Heading level (1-6, default: 2) */
  level: z.number().int().min(1).max(6).default(2),
  /** Whether this section is required */
  required: z.boolean().default(false),
  /** Placeholder text for the section */
  placeholder: z.string().optional(),
});

/**
 * Frontmatter configuration for templates.
 */
export const FrontmatterConfigSchema = z.object({
  /** Required frontmatter fields */
  required: z.array(z.string()).default([]),
  /** Default values for frontmatter fields */
  defaults: z.record(z.unknown()).default({}),
});

/**
 * Document template definition.
 */
export const TemplateDefinitionSchema = z.object({
  /** Schema this template is for */
  forSchema: z.string().min(1),
  /** Output filename */
  filename: z.string().min(1),
  /** Frontmatter configuration */
  frontmatter: FrontmatterConfigSchema.optional(),
  /** Body sections for document format */
  body: z.array(BodySectionSchema).optional(),
  /** Template format: 'document' or 'register' */
  format: z.enum(['document', 'register']).default('document'),
  /** Header for register format */
  header: z.string().optional(),
  /** Item format for register entries */
  itemFormat: z.string().optional(),
});

/**
 * Templates file root structure.
 */
export const TemplatesFileSchema = z.object({
  templates: z.record(z.string(), TemplateDefinitionSchema),
});

// Type exports
export type BodySection = z.infer<typeof BodySectionSchema>;
export type FrontmatterConfig = z.infer<typeof FrontmatterConfigSchema>;
export type TemplateDefinition = z.infer<typeof TemplateDefinitionSchema>;
export type TemplatesFile = z.infer<typeof TemplatesFileSchema>;
