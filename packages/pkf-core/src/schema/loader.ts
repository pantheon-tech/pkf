/**
 * SchemaLoader - Load and parse PKF schema files
 */

import { readFile } from 'fs/promises';
import * as yaml from 'js-yaml';
import type {  SchemasYaml,
  SchemaLoadOptions,
} from './types.js';

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
export class SchemaLoader {
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
  load(yamlContent: string, _options?: SchemaLoadOptions): SchemasYaml | null {
    if (!yamlContent || !yamlContent.trim()) {
      return null;
    }

    try {
      // Parse YAML safely (using JSON schema to prevent code execution)
      const parsed = yaml.load(yamlContent, { schema: yaml.JSON_SCHEMA }) as unknown;

      // Basic structure validation
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const obj = parsed as Record<string, unknown>;

      // Must have version and schemas
      if (!obj.version || !obj.schemas) {
        return null;
      }

      // Type check
      if (typeof obj.version !== 'string' && typeof obj.version !== 'number') {
        return null;
      }

      if (typeof obj.schemas !== 'object' || obj.schemas === null) {
        return null;
      }

      const result: SchemasYaml = {
        version: String(obj.version),
        schemas: obj.schemas as Record<string, any>,
      };

      // Note: Validation should be done separately by calling validateSchemasYaml()
      // to avoid circular dependencies and keep the load method synchronous

      return result;
    } catch {
      // YAML parse error
      return null;
    }
  }

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
  async loadFile(filePath: string, options?: SchemaLoadOptions): Promise<SchemasYaml | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return this.load(content, options);
    } catch {
      return null;
    }
  }

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
  looksLikeSchemasYaml(content: string): boolean {
    if (!content || !content.trim()) {
      return false;
    }

    // Must have version key (flexible format)
    const hasVersion = /^version:\s*["']?\d+\.\d+/m.test(content);

    // Must have schemas key
    const hasSchemas = /^schemas:\s*$/m.test(content) || /^schemas:\s*\n/m.test(content);

    return hasVersion && hasSchemas;
  }

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
  getSchemaNames(schemas: SchemasYaml): string[] {
    if (!schemas.schemas) {
      return [];
    }
    return Object.keys(schemas.schemas);
  }

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
  extractSchemasYaml(response: string): string | null {
    if (!response) {
      return null;
    }

    // Try to find YAML code blocks (with various fence formats)
    const yamlBlockPatterns = [
      /```ya?ml\n([\s\S]*?)```/gi,
      /```\n(version:[\s\S]*?)```/gi, // Code block without language spec
      /~~~ya?ml\n([\s\S]*?)~~~/gi, // Tilde fences
    ];

    for (const regex of yamlBlockPatterns) {
      let match: RegExpExecArray | null;
      regex.lastIndex = 0; // Reset regex state

      while ((match = regex.exec(response)) !== null) {
        if (!match[1]) continue;
        const content = match[1].trim();

        // Check if this block has the schemas.yaml structure
        if (this.looksLikeSchemasYaml(content)) {
          return content;
        }
      }
    }

    // Try to find indented YAML block (after "schemas.yaml:" or similar header)
    const indentedMatch = response.match(
      /(?:schemas\.yaml|Schema|schemas):\s*\n((?:[ ]{2,}|\t)[\s\S]*?)(?=\n[^\s]|\n\n[A-Z]|$)/i
    );
    if (indentedMatch && indentedMatch[1]) {
      // Remove common indentation
      const lines = indentedMatch[1].split('\n');
      const minIndent = Math.min(
        ...lines.filter((l) => l.trim()).map((l) => {
          const match = l.match(/^(\s*)/);
          return match && match[1] ? match[1].length : 0;
        })
      );
      const dedented = lines
        .map((l) => l.slice(minIndent))
        .join('\n')
        .trim();
      if (this.looksLikeSchemasYaml(dedented)) {
        return dedented;
      }
    }

    // If no code blocks found, try to find raw YAML with version/schemas keys
    const schemasMatch = response.match(
      /^(version:\s*["']?\d+\.\d+["']?\s*\nschemas:[\s\S]*?)(?=\n\n[A-Z]|\n##|SCHEMA-DESIGN-|$)/m
    );
    if (schemasMatch && schemasMatch[1]) {
      const content = schemasMatch[1].trim();
      if (this.looksLikeSchemasYaml(content)) {
        return content;
      }
    }

    // Last resort: look for any content starting with "version:" followed by "schemas:"
    const lines = response.split('\n');
    let yamlContent: string[] = [];
    let inYaml = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue; // Skip undefined lines

      if (!inYaml && line.match(/^version:\s*["']?\d+\.\d+/)) {
        inYaml = true;
        yamlContent = [line];
        continue;
      }

      if (inYaml) {
        // Stop if we hit a markdown header
        if (line.match(/^#{1,6}\s/) || line.match(/^---\s*$/)) {
          break;
        }

        // Stop if we hit a line that's clearly not YAML (uppercase header without indent)
        if (line.match(/^[A-Z][A-Z\s-]+:$/) && !line.startsWith('  ')) {
          // Keep going if it looks like a YAML key (has content after colon)
          if (
            !line.includes('-DESIGN-') &&
            !line.includes('_') &&
            !line.match(/^[A-Z][a-z]+:/)
          ) {
            break;
          }
        }

        // Stop at empty line followed by clearly non-YAML content
        if (line === '' && yamlContent.length > 0) {
          const nextLine = lines[i + 1];
          if (
            nextLine &&
            nextLine.match(/^[A-Z]/) &&
            !nextLine.startsWith('  ') &&
            !nextLine.match(/^[a-z_-]+:/)
          ) {
            break;
          }
        }

        yamlContent.push(line);
      }
    }

    if (yamlContent.length > 0) {
      const content = yamlContent.join('\n').trim();
      if (this.looksLikeSchemasYaml(content)) {
        return content;
      }
    }

    return null;
  }
}
