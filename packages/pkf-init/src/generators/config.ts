/**
 * PKF Init Configuration Generator
 * Generates pkf.config.yaml from schemas.yaml and project information
 */

import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import * as yaml from 'js-yaml';
import type { GeneratedStructure } from './structure.js';

/**
 * Package.json structure (partial)
 */
interface PackageJson {
  name?: string;
  description?: string;
  version?: string;
  repository?: string | { url?: string };
}

/**
 * PKF config structure
 */
interface PkfConfig {
  version: string;
  project: {
    name: string;
    description: string;
    version?: string;
    repository?: string;
  };
  paths: {
    docs: string;
    registers: string;
    schemas: string;
    templates?: string;
  };
  document_types: Record<string, DocumentTypeConfig>;
  validation?: {
    strict: boolean;
    required_frontmatter: string[];
  };
}

/**
 * Document type configuration
 */
interface DocumentTypeConfig {
  path: string;
  schema?: string;
  required?: boolean;
  template?: string;
}

/**
 * ConfigGenerator - Generates pkf.config.yaml
 */
export class ConfigGenerator {
  private rootDir: string;

  /**
   * Create a new ConfigGenerator
   * @param rootDir - Root directory of the project
   */
  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  /**
   * Generate pkf.config.yaml content
   * @param schemasYaml - The schemas.yaml content
   * @param structure - Generated structure information
   * @returns The YAML configuration string
   */
  async generate(
    schemasYaml: string,
    structure: GeneratedStructure
  ): Promise<string> {
    // Parse schemas.yaml
    const schemas = yaml.load(schemasYaml) as Record<string, unknown>;

    // Get all created directories
    const allDirs = [...structure.createdDirs, ...structure.existingDirs];

    // Build configuration
    const config = await this.buildConfig(schemas, allDirs);

    // Convert to YAML with nice formatting
    return yaml.dump(config, {
      indent: 2,
      lineWidth: 100,
      noRefs: true,
      sortKeys: false,
      quotingType: '"',
      forceQuotes: false,
    });
  }

  /**
   * Write configuration to file
   * @param configContent - The YAML configuration content
   */
  async write(configContent: string): Promise<void> {
    const configPath = join(this.rootDir, 'pkf.config.yaml');
    await writeFile(configPath, configContent, 'utf-8');
  }

  /**
   * Build the configuration object
   * @param schemas - Parsed schemas object
   * @param dirs - List of created/existing directories
   * @returns PKF configuration object
   */
  private async buildConfig(
    schemas: Record<string, unknown>,
    dirs: string[]
  ): Promise<PkfConfig> {
    // Try to load project info from package.json
    const projectInfo = await this.loadProjectInfo();

    // Build document types from schemas
    const documentTypes = this.buildDocumentTypes(schemas, dirs);

    return {
      version: '1.0.0',
      project: {
        name: projectInfo.name || 'my-project',
        description: projectInfo.description || 'A PKF-enabled project',
        ...(projectInfo.version && { version: projectInfo.version }),
        ...(projectInfo.repository && { repository: projectInfo.repository }),
      },
      paths: {
        docs: 'docs',
        registers: 'docs/registers',
        schemas: 'schemas',
        ...(dirs.includes('templates') && { templates: 'templates' }),
      },
      document_types: documentTypes,
      validation: {
        strict: false,
        required_frontmatter: ['title', 'type'],
      },
    };
  }

  /**
   * Load project information from package.json
   * @returns Project information
   */
  private async loadProjectInfo(): Promise<{
    name?: string;
    description?: string;
    version?: string;
    repository?: string;
  }> {
    const packageJsonPath = join(this.rootDir, 'package.json');

    try {
      await access(packageJsonPath);
      const content = await readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content) as PackageJson;

      let repository: string | undefined;
      if (typeof pkg.repository === 'string') {
        repository = pkg.repository;
      } else if (pkg.repository?.url) {
        repository = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
      }

      return {
        name: pkg.name,
        description: pkg.description,
        version: pkg.version,
        repository,
      };
    } catch {
      // No package.json or couldn't read it
      return {};
    }
  }

  /**
   * Build document types configuration from schemas
   * @param schemas - Parsed schemas object
   * @param dirs - Available directories
   * @returns Document types configuration
   */
  private buildDocumentTypes(
    schemas: Record<string, unknown>,
    dirs: string[]
  ): Record<string, DocumentTypeConfig> {
    const docTypes: Record<string, DocumentTypeConfig> = {};

    // Always include register types
    docTypes['todo'] = {
      path: 'docs/registers/TODO.md',
      schema: 'todo-item.schema.json',
      required: true,
    };
    docTypes['issues'] = {
      path: 'docs/registers/ISSUES.md',
      schema: 'issue-item.schema.json',
      required: true,
    };
    docTypes['changelog'] = {
      path: 'docs/registers/CHANGELOG.md',
      schema: 'changelog-entry.schema.json',
      required: true,
    };

    // Extract document types from schemas
    const schemaDocTypes = this.extractDocumentTypes(schemas);

    for (const [typeName, typeInfo] of Object.entries(schemaDocTypes)) {
      const normalizedName = typeName.toLowerCase().replace(/[_\s]+/g, '-');

      // Skip register types (already added)
      if (['todo', 'issues', 'changelog', 'register'].includes(normalizedName)) {
        continue;
      }

      // Determine the path for this document type
      const path = this.getPathForType(normalizedName, dirs);

      docTypes[normalizedName] = {
        path,
        ...(typeInfo.schema && { schema: typeInfo.schema }),
        ...(typeInfo.template && { template: typeInfo.template }),
      };
    }

    return docTypes;
  }

  /**
   * Extract document types from schemas object
   * @param schemas - Parsed schemas object
   * @returns Map of document type names to their info
   */
  private extractDocumentTypes(
    schemas: Record<string, unknown>
  ): Record<string, { schema?: string; template?: string }> {
    const types: Record<string, { schema?: string; template?: string }> = {};

    // Look for document_types key
    if (schemas.document_types && typeof schemas.document_types === 'object') {
      const docTypes = schemas.document_types as Record<string, unknown>;
      for (const [name, info] of Object.entries(docTypes)) {
        types[name] = this.parseTypeInfo(info);
      }
    }

    // Look for types key
    if (schemas.types && typeof schemas.types === 'object') {
      const schemaTypes = schemas.types as Record<string, unknown>;
      for (const [name, info] of Object.entries(schemaTypes)) {
        if (!types[name]) {
          types[name] = this.parseTypeInfo(info);
        }
      }
    }

    // Look for documents key
    if (schemas.documents && typeof schemas.documents === 'object') {
      const documents = schemas.documents as Record<string, unknown>;
      for (const [name, info] of Object.entries(documents)) {
        if (!types[name]) {
          types[name] = this.parseTypeInfo(info);
        }
      }
    }

    return types;
  }

  /**
   * Parse type information from schema entry
   * @param info - Type information object
   * @returns Parsed type info
   */
  private parseTypeInfo(info: unknown): { schema?: string; template?: string } {
    if (typeof info !== 'object' || info === null) {
      return {};
    }

    const infoObj = info as Record<string, unknown>;
    return {
      schema: typeof infoObj.schema === 'string' ? infoObj.schema : undefined,
      template: typeof infoObj.template === 'string' ? infoObj.template : undefined,
    };
  }

  /**
   * Get the appropriate path for a document type
   * @param typeName - Normalized type name
   * @param dirs - Available directories
   * @returns Path for the document type
   */
  private getPathForType(typeName: string, dirs: string[]): string {
    // Type to directory mapping
    const typePatterns: [string[], string][] = [
      [['guide', 'tutorial', 'howto', 'getting-started'], 'docs/guides'],
      [['architecture', 'adr', 'design'], 'docs/architecture'],
      [['api', 'openapi', 'swagger'], 'docs/api'],
      [['reference', 'specification', 'spec'], 'docs/references'],
      [['proposal', 'rfc'], 'docs/proposals'],
    ];

    for (const [patterns, dir] of typePatterns) {
      for (const pattern of patterns) {
        if (typeName.includes(pattern) || pattern.includes(typeName)) {
          // Check if the directory exists
          if (dirs.includes(dir) || dirs.includes(dir.replace('docs/', ''))) {
            return dir;
          }
        }
      }
    }

    // Default to docs directory
    return 'docs';
  }
}
