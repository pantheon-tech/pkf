import { parse as parseYaml, YAMLParseError } from 'yaml';
import { readFileSync } from 'node:fs';
import { PkfConfigSchema, type PkfConfig } from '../schema/index.js';
import { type Result, ok, err, type ProcessorError } from '../types.js';

/**
 * Parse result with errors collection.
 */
export interface ParseResult<T> {
  data?: T;
  errors: ProcessorError[];
}

/**
 * Read and parse a YAML file.
 */
export function readYamlFile(filePath: string): Result<unknown, ProcessorError> {
  let content: string;

  try {
    content = readFileSync(filePath, 'utf8');
  } catch (error) {
    return err({
      file: filePath,
      message: `Cannot read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
      type: 'YAML_SYNTAX',
    });
  }

  try {
    const parsed = parseYaml(content);
    return ok(parsed);
  } catch (error) {
    if (error instanceof YAMLParseError) {
      return err({
        file: filePath,
        line: error.linePos?.[0]?.line,
        column: error.linePos?.[0]?.col,
        message: `YAML syntax error: ${error.message}`,
        severity: 'error',
        type: 'YAML_SYNTAX',
      });
    }
    return err({
      file: filePath,
      message: `YAML parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
      type: 'YAML_SYNTAX',
    });
  }
}

/**
 * Parse pkf.config.yaml file.
 */
export function parseConfigFile(configPath: string): Result<PkfConfig, ProcessorError[]> {
  const errors: ProcessorError[] = [];

  // Read and parse YAML
  const yamlResult = readYamlFile(configPath);
  if (!yamlResult.success) {
    return err([yamlResult.error]);
  }

  // Validate against schema
  const validationResult = PkfConfigSchema.safeParse(yamlResult.data);
  if (!validationResult.success) {
    for (const issue of validationResult.error.issues) {
      errors.push({
        file: configPath,
        message: `${issue.path.join('.')}: ${issue.message}`,
        severity: 'error',
        type: 'SCHEMA_VALIDATION',
      });
    }
    return err(errors);
  }

  return ok(validationResult.data);
}

/**
 * Parse a component file (types.yaml, schemas.yaml, templates.yaml).
 */
export function parseComponentFile(
  filePath: string
): Result<unknown, ProcessorError> {
  return readYamlFile(filePath);
}
