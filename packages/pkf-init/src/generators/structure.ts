/**
 * PKF Init Structure Generator
 * Creates the PKF directory structure based on schemas.yaml
 */

import { mkdir, access } from 'fs/promises';
import { join } from 'path';
import * as yaml from 'js-yaml';

/**
 * Result of structure generation
 */
export interface GeneratedStructure {
  /** Directories that were created */
  createdDirs: string[];
  /** Directories that already existed */
  existingDirs: string[];
}

/**
 * Document type to directory mapping
 */
const TYPE_TO_DIR_MAP: Record<string, string> = {
  // Guide types
  guide: 'docs/guides',
  'user-guide': 'docs/guides',
  'developer-guide': 'docs/guides',
  'installation-guide': 'docs/guides',
  'getting-started': 'docs/guides',
  tutorial: 'docs/guides',
  howto: 'docs/guides',

  // Architecture types
  architecture: 'docs/architecture',
  adr: 'docs/architecture/decisions',
  'design-doc': 'docs/architecture',
  'system-design': 'docs/architecture',

  // API types
  api: 'docs/api',
  'api-reference': 'docs/api',
  'api-doc': 'docs/api',
  openapi: 'docs/api',

  // Reference types
  reference: 'docs/references',
  specification: 'docs/references',

  // Proposal types
  proposal: 'docs/proposals',
  rfc: 'docs/proposals',

  // Register types (always created)
  register: 'docs/registers',
  todo: 'docs/registers',
  issue: 'docs/registers',
  changelog: 'docs/registers',
};

/**
 * Base directories that are always created
 */
const BASE_DIRS = ['docs', 'docs/registers'];

/**
 * StructureGenerator - Creates PKF directory structure
 */
export class StructureGenerator {
  private rootDir: string;
  private outputDir: string;

  /**
   * Create a new StructureGenerator
   * @param rootDir - Root directory of the project
   * @param outputDir - Output directory for generated structure
   */
  constructor(rootDir: string, outputDir: string) {
    this.rootDir = rootDir;
    this.outputDir = outputDir;
  }

  /**
   * Generate the directory structure based on schemas.yaml
   * @param schemasYaml - The schemas.yaml content
   * @returns Information about created and existing directories
   */
  async generate(schemasYaml: string): Promise<GeneratedStructure> {
    // Parse schemas.yaml
    const schemas = yaml.load(schemasYaml) as Record<string, unknown>;

    // Get required directories
    const requiredDirs = this.getRequiredDirs(schemas);

    // Create directories
    return await this.createDirectories(requiredDirs);
  }

  /**
   * Analyze document types and determine required directories
   * @param schemas - Parsed schemas object
   * @returns List of required directory paths
   */
  private getRequiredDirs(schemas: Record<string, unknown>): string[] {
    const dirs = new Set<string>(BASE_DIRS);

    // Extract document types from schemas
    const documentTypes = this.extractDocumentTypes(schemas);

    // Map each document type to its directory
    for (const docType of documentTypes) {
      const normalizedType = docType.toLowerCase().replace(/[_\s]+/g, '-');

      // Check if we have a direct mapping
      if (TYPE_TO_DIR_MAP[normalizedType]) {
        dirs.add(TYPE_TO_DIR_MAP[normalizedType]);
        continue;
      }

      // Check for partial matches
      for (const [key, dir] of Object.entries(TYPE_TO_DIR_MAP)) {
        if (normalizedType.includes(key) || key.includes(normalizedType)) {
          dirs.add(dir);
          break;
        }
      }
    }

    // Sort directories to ensure parent dirs are created first
    return Array.from(dirs).sort();
  }

  /**
   * Extract document types from schemas object
   * @param schemas - Parsed schemas object
   * @returns Array of document type names
   */
  private extractDocumentTypes(schemas: Record<string, unknown>): string[] {
    const types: string[] = [];

    // Look for document_types key
    if (schemas.document_types && typeof schemas.document_types === 'object') {
      const docTypes = schemas.document_types as Record<string, unknown>;
      types.push(...Object.keys(docTypes));
    }

    // Look for types key
    if (schemas.types && typeof schemas.types === 'object') {
      const schemaTypes = schemas.types as Record<string, unknown>;
      types.push(...Object.keys(schemaTypes));
    }

    // Look for documents key
    if (schemas.documents && typeof schemas.documents === 'object') {
      const documents = schemas.documents as Record<string, unknown>;
      types.push(...Object.keys(documents));
    }

    // Look for schema definitions
    if (schemas.schemas && typeof schemas.schemas === 'object') {
      const schemaDefinitions = schemas.schemas as Record<string, unknown>;
      for (const [, schema] of Object.entries(schemaDefinitions)) {
        if (typeof schema === 'object' && schema !== null) {
          const schemaObj = schema as Record<string, unknown>;
          if (schemaObj.type && typeof schemaObj.type === 'string') {
            types.push(schemaObj.type);
          }
        }
      }
    }

    return types;
  }

  /**
   * Create directories recursively
   * @param dirs - List of directories to create
   * @returns Information about created and existing directories
   */
  async createDirectories(dirs: string[]): Promise<GeneratedStructure> {
    const createdDirs: string[] = [];
    const existingDirs: string[] = [];

    for (const dir of dirs) {
      const fullPath = join(this.outputDir, dir);

      try {
        // Check if directory exists
        await access(fullPath);
        existingDirs.push(dir);
      } catch {
        // Directory doesn't exist, create it
        await mkdir(fullPath, { recursive: true });
        createdDirs.push(dir);
      }
    }

    return { createdDirs, existingDirs };
  }
}
