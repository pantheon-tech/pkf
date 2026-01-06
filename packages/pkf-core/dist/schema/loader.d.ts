/**
 * SchemaLoader - Load and parse PKF schema files
 */
import type { SchemasYaml, SchemaLoadOptions } from './types.js';
/**
 * SchemaLoader - Load and parse PKF schemas.yaml files
 *
 * @example
 * ```typescript
 * const loader = new SchemaLoader();
 * const schemas = loader.load(yamlContent);
 * if (schemas) {
 *   console.log(`Loaded ${Object.keys(schemas.schemas).length} schemas`);
 * }
 * ```
 */
export declare class SchemaLoader {
    /**
     * Load schemas from YAML string
     *
     * @param yamlContent - YAML content to parse
     * @param options - Loading options
     * @returns Parsed schemas or null if invalid
     *
     * @example
     * ```typescript
     * const schemas = loader.load(yamlContent, { validate: true });
     * ```
     */
    load(yamlContent: string, _options?: SchemaLoadOptions): SchemasYaml | null;
    /**
     * Load schemas from file path
     *
     * @param filePath - Path to schemas.yaml file
     * @param options - Loading options
     * @returns Parsed schemas or null if invalid
     *
     * @example
     * ```typescript
     * const schemas = await loader.loadFile('./schemas.yaml');
     * ```
     */
    loadFile(filePath: string, options?: SchemaLoadOptions): Promise<SchemasYaml | null>;
    /**
     * Check if content looks like valid schemas.yaml
     *
     * This is a lightweight check that doesn't parse the full YAML.
     * Useful for quickly filtering content before full parsing.
     *
     * @param content - YAML content to check
     * @returns True if content appears to be schemas.yaml
     *
     * @example
     * ```typescript
     * if (loader.looksLikeSchemasYaml(content)) {
     *   const schemas = loader.load(content);
     * }
     * ```
     */
    looksLikeSchemasYaml(content: string): boolean;
    /**
     * Extract schema names from parsed schemas
     *
     * @param schemas - Parsed schemas object
     * @returns Array of schema names
     *
     * @example
     * ```typescript
     * const names = loader.getSchemaNames(schemas);
     * // Returns: ['base-doc', 'guide', 'spec', 'adr']
     * ```
     */
    getSchemaNames(schemas: SchemasYaml): string[];
    /**
     * Extract schemas.yaml content from agent response text
     *
     * Tries multiple extraction strategies to find YAML content in various formats:
     * - Code blocks (with or without language specification)
     * - Indented blocks after headers
     * - Raw YAML with version/schemas keys
     *
     * @param response - Agent response text
     * @returns Extracted YAML content or null
     *
     * @example
     * ```typescript
     * const yamlContent = loader.extractSchemasYaml(agentResponse);
     * if (yamlContent) {
     *   const schemas = loader.load(yamlContent);
     * }
     * ```
     */
    extractSchemasYaml(response: string): string | null;
}
//# sourceMappingURL=loader.d.ts.map