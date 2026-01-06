/**
 * Schema validation utilities
 */
import type { SchemasYaml, SchemaDefinition, SchemaValidationResult } from './types.js';
/**
 * Validate schemas.yaml structure
 *
 * Performs comprehensive validation of PKF schema structure including:
 * - Version format validation
 * - Schema name format validation
 * - Property type validation
 * - Inheritance reference validation
 *
 * @param schemas - Parsed schemas object to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const validation = validateSchemasYaml(schemas);
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors);
 * }
 * if (validation.warnings.length > 0) {
 *   console.warn('Warnings:', validation.warnings);
 * }
 * ```
 */
export declare function validateSchemasYaml(schemas: SchemasYaml): SchemaValidationResult;
/**
 * Validate data against a schema definition (lightweight validation)
 *
 * Performs basic validation of data against a schema:
 * - Required field checks
 * - Type validation
 * - Enum value validation
 *
 * NOTE: This is a lightweight validator. For comprehensive JSON Schema validation,
 * use the pkf-validator package's validateWithSchema() function.
 *
 * @param data - Data object to validate
 * @param schema - Schema definition to validate against
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const data = { title: 'My Doc', status: 'draft' };
 * const validation = validateAgainstSchema(data, schemas.schemas['base-doc']);
 * if (!validation.valid) {
 *   console.error('Data validation failed:', validation.errors);
 * }
 * ```
 */
export declare function validateAgainstSchema(data: Record<string, unknown>, schema: SchemaDefinition): SchemaValidationResult;
//# sourceMappingURL=validator.d.ts.map