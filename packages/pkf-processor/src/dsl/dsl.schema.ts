import { z } from 'zod';

/**
 * DSL property definition - simplified schema syntax.
 */
export interface DslProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'date' | 'datetime';
  required?: boolean;
  default?: unknown;
  enum?: string[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  format?: string;
  description?: string;
  items?: DslProperty;
}

export const DslPropertySchema: z.ZodType<DslProperty> = z.object({
  type: z.enum(['string', 'number', 'integer', 'boolean', 'array', 'object', 'date', 'datetime']),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  enum: z.array(z.string()).optional(),
  pattern: z.string().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  format: z.string().optional(),
  description: z.string().optional(),
  items: z.lazy(() => DslPropertySchema).optional(),
});

/**
 * ID configuration for automatic ID generation.
 */
export const IdConfigSchema = z.object({
  prefix: z.string(),
  format: z.enum(['nn', 'nnn', 'nnnn']).optional().default('nnn'),
  pattern: z.string().optional(),
});
export type IdConfig = z.infer<typeof IdConfigSchema>;

/**
 * DSL schema definition - human-friendly YAML syntax.
 */
export const DslSchemaDefinitionSchema = z.object({
  extends: z.string().optional(),
  description: z.string().optional(),
  id: IdConfigSchema.optional(),
  statuses: z.array(z.string()).optional(),
  properties: z.record(z.string(), DslPropertySchema).optional(),
  required: z.array(z.string()).optional(),
});
export type DslSchemaDefinition = z.infer<typeof DslSchemaDefinitionSchema>;

/**
 * Schemas file root structure.
 */
export const SchemasFileSchema = z.object({
  schemas: z.record(z.string(), DslSchemaDefinitionSchema),
});
export type SchemasFile = z.infer<typeof SchemasFileSchema>;

/**
 * JSON Schema draft-07 property (output format).
 */
export interface JsonSchemaProperty {
  type?: string | string[];
  format?: string;
  enum?: string[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  default?: unknown;
  description?: string;
  items?: JsonSchemaProperty;
  $ref?: string;
}

/**
 * JSON Schema draft-07 (output format).
 */
export interface JsonSchema {
  $schema: string;
  $id?: string;
  title?: string;
  description?: string;
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  allOf?: Array<{ $ref: string }>;
  $defs?: Record<string, JsonSchema>;
}
