import type { SchemasFile, JsonSchema, JsonSchemaProperty } from './dsl.schema.js';
import { getInheritanceChain } from './dsl-parser.js';
import {
  transformProperties,
  transformStatuses,
  transformIdConfig,
  buildRequiredArray,
} from './keyword-transformer.js';
import { type Result, ok, err, type ProcessorError } from '../types.js';

/**
 * Generated schema output.
 */
export interface GeneratedSchema {
  name: string;
  schema: JsonSchema;
  filePath: string;
}

/**
 * Schema generation options.
 */
export interface GenerationOptions {
  outputDir?: string;
  schemaPrefix?: string;
}

/**
 * Merge properties from parent to child (child overrides parent).
 */
function mergeProperties(
  parent: Record<string, JsonSchemaProperty>,
  child: Record<string, JsonSchemaProperty>
): Record<string, JsonSchemaProperty> {
  return { ...parent, ...child };
}

/**
 * Merge required arrays (union).
 */
function mergeRequired(parent: string[], child: string[]): string[] {
  return Array.from(new Set([...parent, ...child]));
}

/**
 * Generate JSON Schema from a single DSL schema definition.
 */
export function generateSchema(
  schemaName: string,
  schemas: SchemasFile,
  options: GenerationOptions = {}
): Result<JsonSchema, ProcessorError[]> {
  // Get inheritance chain
  const chainResult = getInheritanceChain(schemas, schemaName);
  if (!chainResult.success) {
    return err([chainResult.error]);
  }

  // Reverse chain to process parent first (parent → child)
  const chain = chainResult.data.reverse();

  // Merge all properties from inheritance chain
  let mergedProperties: Record<string, JsonSchemaProperty> = {};
  let mergedRequired: string[] = [];
  let description: string | undefined;

  for (const name of chain) {
    const def = schemas.schemas[name];
    if (!def) continue;

    // Set description from the target schema
    if (name === schemaName && def.description) {
      description = def.description;
    }

    // Transform and merge properties
    if (def.properties) {
      const transformed = transformProperties(def.properties);
      mergedProperties = mergeProperties(mergedProperties, transformed);

      // Build required from this level
      const levelRequired = buildRequiredArray(def.properties, def.required);
      mergedRequired = mergeRequired(mergedRequired, levelRequired);
    }

    // Handle statuses shorthand
    if (def.statuses) {
      mergedProperties['status'] = transformStatuses(def.statuses);
      if (!mergedRequired.includes('status')) {
        mergedRequired.push('status');
      }
    }

    // Handle ID config
    if (def.id) {
      mergedProperties['id'] = transformIdConfig(def.id);
      if (!mergedRequired.includes('id')) {
        mergedRequired.push('id');
      }
    }
  }

  // Build final JSON Schema
  const jsonSchema: JsonSchema = {
    $schema: 'https://json-schema.org/draft-07/schema#',
    $id: options.schemaPrefix ? `${options.schemaPrefix}/${schemaName}.schema.json` : undefined,
    title: schemaName,
    description,
    type: 'object',
    properties: mergedProperties,
    required: mergedRequired.length > 0 ? mergedRequired : undefined,
  };

  return ok(jsonSchema);
}

/**
 * Generate all schemas from a schemas file.
 */
export function generateAllSchemas(
  schemas: SchemasFile,
  options: GenerationOptions = {}
): Map<string, Result<GeneratedSchema, ProcessorError[]>> {
  const results = new Map<string, Result<GeneratedSchema, ProcessorError[]>>();
  const outputDir = options.outputDir ?? '.pkf/generated/schemas';

  for (const schemaName of Object.keys(schemas.schemas)) {
    const schemaResult = generateSchema(schemaName, schemas, options);

    if (schemaResult.success) {
      results.set(schemaName, ok({
        name: schemaName,
        schema: schemaResult.data,
        filePath: `${outputDir}/${schemaName}.schema.json`,
      }));
    } else {
      results.set(schemaName, schemaResult);
    }
  }

  return results;
}

/**
 * Validate that all schema references are resolvable.
 */
export function validateSchemaReferences(
  schemas: SchemasFile
): ProcessorError[] {
  const errors: ProcessorError[] = [];
  const schemaNames = new Set(Object.keys(schemas.schemas));

  for (const [name, def] of Object.entries(schemas.schemas)) {
    if (def.extends && !schemaNames.has(def.extends)) {
      errors.push({
        file: 'schemas.yaml',
        message: `Schema '${name}' extends unknown schema '${def.extends}'`,
        severity: 'error',
        type: 'UNRESOLVED_REFERENCE',
      });
    }
  }

  return errors;
}
