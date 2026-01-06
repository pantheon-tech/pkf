/**
 * PKF Schema Module - Load, parse, and validate PKF schemas
 *
 * This module provides utilities for working with PKF schemas.yaml files:
 * - SchemaLoader: Load and parse schema files
 * - Validation functions: Validate schema structure and data
 * - Type definitions: TypeScript types for schema structures
 *
 * @example
 * ```typescript
 * import { SchemaLoader, validateSchemasYaml } from '@pantheon-tech/pkf-core/schema';
 *
 * // Load schemas
 * const loader = new SchemaLoader();
 * const schemas = await loader.loadFile('./schemas.yaml');
 *
 * // Validate
 * if (schemas) {
 *   const validation = validateSchemasYaml(schemas);
 *   if (validation.valid) {
 *     console.log('Schema is valid!');
 *   }
 * }
 * ```
 *
 * @module schema
 */
// ============================================================================
// Classes
// ============================================================================
export { SchemaLoader } from './loader.js';
// ============================================================================
// Functions
// ============================================================================
export { validateSchemasYaml, validateAgainstSchema } from './validator.js';
// ============================================================================
// Convenience Functions
// ============================================================================
import { SchemaLoader } from './loader.js';
/**
 * Load schema from YAML string (convenience function)
 *
 * This is a shorthand for creating a SchemaLoader instance and calling load().
 *
 * @param yamlContent - YAML content to parse
 * @param validate - Whether to validate after loading (default: true)
 * @returns Parsed schemas or null if invalid
 *
 * @example
 * ```typescript
 * const schemas = loadSchema(yamlContent);
 * if (schemas) {
 *   console.log(`Loaded ${Object.keys(schemas.schemas).length} schemas`);
 * }
 * ```
 */
export function loadSchema(yamlContent, validate = true) {
    const loader = new SchemaLoader();
    return loader.load(yamlContent, { validate });
}
/**
 * Load schema from file (convenience function)
 *
 * This is a shorthand for creating a SchemaLoader instance and calling loadFile().
 *
 * @param filePath - Path to schemas.yaml file
 * @param validate - Whether to validate after loading (default: true)
 * @returns Parsed schemas or null if invalid
 *
 * @example
 * ```typescript
 * const schemas = await loadSchemaFile('./schemas.yaml');
 * if (schemas) {
 *   console.log(`Loaded ${Object.keys(schemas.schemas).length} schemas`);
 * }
 * ```
 */
export async function loadSchemaFile(filePath, validate = true) {
    const loader = new SchemaLoader();
    return loader.loadFile(filePath, { validate });
}
//# sourceMappingURL=index.js.map