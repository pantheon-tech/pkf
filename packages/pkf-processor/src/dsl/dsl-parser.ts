import { parse as parseYaml, YAMLParseError } from 'yaml';
import { SchemasFileSchema, type SchemasFile, type DslSchemaDefinition } from './dsl.schema.js';
import { type Result, ok, err, type ProcessorError } from '../types.js';

/**
 * Parse schemas.yaml file content.
 */
export function parseSchemasFile(
  yamlContent: string,
  filePath: string = 'schemas.yaml'
): Result<SchemasFile, ProcessorError[]> {
  const errors: ProcessorError[] = [];

  // Parse YAML
  let parsed: unknown;
  try {
    parsed = parseYaml(yamlContent);
  } catch (error) {
    if (error instanceof YAMLParseError) {
      return err([{
        file: filePath,
        line: error.linePos?.[0]?.line,
        column: error.linePos?.[0]?.col,
        message: `YAML syntax error: ${error.message}`,
        severity: 'error',
        type: 'YAML_SYNTAX',
      }]);
    }
    return err([{
      file: filePath,
      message: `YAML parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
      type: 'YAML_SYNTAX',
    }]);
  }

  // Validate against schema
  const result = SchemasFileSchema.safeParse(parsed);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        file: filePath,
        message: `${issue.path.join('.')}: ${issue.message}`,
        severity: 'error',
        type: 'SCHEMA_VALIDATION',
      });
    }
    return err(errors);
  }

  return ok(result.data);
}

/**
 * Get schema definition by name.
 */
export function getSchemaDefinition(
  schemas: SchemasFile,
  schemaName: string
): Result<DslSchemaDefinition, ProcessorError> {
  const schema = schemas.schemas[schemaName];
  if (!schema) {
    return err({
      file: 'schemas.yaml',
      message: `Schema not found: ${schemaName}`,
      severity: 'error',
      type: 'UNRESOLVED_REFERENCE',
    });
  }
  return ok(schema);
}

/**
 * Get all schema names.
 */
export function getSchemaNames(schemas: SchemasFile): string[] {
  return Object.keys(schemas.schemas);
}

/**
 * Check if a schema extends another.
 */
export function getSchemaParent(
  schemas: SchemasFile,
  schemaName: string
): string | undefined {
  return schemas.schemas[schemaName]?.extends;
}

/**
 * Get inheritance chain for a schema (child → parent → grandparent).
 */
export function getInheritanceChain(
  schemas: SchemasFile,
  schemaName: string,
  visited: Set<string> = new Set()
): Result<string[], ProcessorError> {
  const chain: string[] = [schemaName];

  if (visited.has(schemaName)) {
    return err({
      file: 'schemas.yaml',
      message: `Circular inheritance detected: ${schemaName}`,
      severity: 'error',
      type: 'CIRCULAR_REFERENCE',
    });
  }

  visited.add(schemaName);
  const parent = getSchemaParent(schemas, schemaName);

  if (parent) {
    if (!schemas.schemas[parent]) {
      return err({
        file: 'schemas.yaml',
        message: `Parent schema not found: ${parent} (referenced by ${schemaName})`,
        severity: 'error',
        type: 'UNRESOLVED_REFERENCE',
      });
    }

    const parentChain = getInheritanceChain(schemas, parent, visited);
    if (!parentChain.success) {
      return parentChain;
    }
    chain.push(...parentChain.data);
  }

  return ok(chain);
}
