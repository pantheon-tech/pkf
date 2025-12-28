import { z } from 'zod';

/**
 * Result pattern for error handling without exceptions.
 */
export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Helper to create success result.
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Helper to create error result.
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Processor error severity levels.
 */
export const ErrorSeveritySchema = z.enum(['error', 'warning']);
export type ErrorSeverity = z.infer<typeof ErrorSeveritySchema>;

/**
 * Processor error types per PKF Architecture Section 5.5.4.
 */
export const ErrorTypeSchema = z.enum([
  'YAML_SYNTAX',
  'UNKNOWN_TYPE',
  'MISSING_REQUIRED',
  'UNRESOLVED_REFERENCE',
  'CIRCULAR_REFERENCE',
  'INVALID_DSL',
  'DEPRECATED_PROPERTY',
  'STRUCTURE_VIOLATION',
  'SCHEMA_VALIDATION',
]);
export type ErrorType = z.infer<typeof ErrorTypeSchema>;

/**
 * Structured processor error.
 */
export const ProcessorErrorSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  column: z.number().optional(),
  message: z.string(),
  severity: ErrorSeveritySchema,
  type: ErrorTypeSchema.optional(),
  expected: z.string().optional(),
  rule: z.string().optional(),
});
export type ProcessorError = z.infer<typeof ProcessorErrorSchema>;

/**
 * Processor output artifacts.
 */
export const ProcessorArtifactsSchema = z.object({
  schemas: z.array(z.string()),
  structureJson: z.string(),
  remarkConfig: z.string(),
  pathSchemaMap: z.string(),
});
export type ProcessorArtifacts = z.infer<typeof ProcessorArtifactsSchema>;

/**
 * Processor output per PKF Architecture Section 5.5.
 */
export const ProcessorOutputSchema = z.object({
  success: z.boolean(),
  artifacts: ProcessorArtifactsSchema,
  errors: z.array(ProcessorErrorSchema),
  warnings: z.array(ProcessorErrorSchema).optional(),
  duration: z.number(),
});
export type ProcessorOutput = z.infer<typeof ProcessorOutputSchema>;
