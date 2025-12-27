import { z } from 'zod';

/**
 * Component references in pkf.config.yaml.
 */
export const ComponentsConfigSchema = z.object({
  types: z.string().optional(),
  schemas: z.string().optional(),
  templates: z.string().optional(),
});
export type ComponentsConfig = z.infer<typeof ComponentsConfigSchema>;

/**
 * Project metadata.
 */
export const ProjectConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  docsRoot: z.string().optional().default('docs'),
});
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/**
 * Output configuration.
 */
export const OutputConfigSchema = z.object({
  dir: z.string().optional().default('.pkf/generated'),
  schemas: z.string().optional().default('schemas'),
});
export type OutputConfig = z.infer<typeof OutputConfigSchema>;

/**
 * Main pkf.config.yaml schema.
 */
export const PkfConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version must be semver format'),
  project: ProjectConfigSchema,
  components: ComponentsConfigSchema.optional(),
  output: OutputConfigSchema.optional(),
  docs: z.record(z.string(), z.unknown()),
});
export type PkfConfig = z.infer<typeof PkfConfigSchema>;

/**
 * Validated config with typed docs tree.
 */
export interface ValidatedConfig {
  version: string;
  project: ProjectConfig;
  components?: ComponentsConfig;
  output: OutputConfig;
  docs: Record<string, unknown>;
}
