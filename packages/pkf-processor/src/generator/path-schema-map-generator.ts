import type { ExpandedTree } from '../expander/index.js';
import type { PkfConfig } from '../schema/index.js';

/**
 * Path to schema map output format.
 */
export interface PathSchemaMap {
  $schema: string;
  version: string;
  generated: string;
  mappings: Record<string, string>;
}

/**
 * Generate path-schema-map.json from expanded tree.
 */
export function generatePathSchemaMap(
  tree: ExpandedTree,
  config: PkfConfig,
  outputDir: string = '.pkf/generated'
): PathSchemaMap {
  const mappings: Record<string, string> = {};

  for (const [glob, schemaName] of tree.pathSchemaMap) {
    const schemaPath = `${outputDir}/schemas/${schemaName}.schema.json`;
    mappings[glob] = schemaPath;
  }

  return {
    $schema: 'https://pkf.dev/schemas/path-schema-map.schema.json',
    version: config.version,
    generated: new Date().toISOString(),
    mappings,
  };
}
