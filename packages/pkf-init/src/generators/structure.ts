/**
 * PKF Init Structure Generator
 * Creates the PKF directory structure based on schemas.yaml and blueprint
 */

import { mkdir, access } from 'fs/promises';
import { join } from 'path';
import { safeLoad } from '../utils/yaml.js';
import {
  PKF_TYPE_TO_DIRECTORY,
  getRequiredDirectories,
  normalizeDocType,
} from '../utils/type-mapping.js';

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
 * Blueprint document entry
 */
interface BlueprintDocument {
  path?: string;
  target_path?: string;
  type?: string;
  doc_type?: string;
}

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
   * @param blueprintYaml - Optional blueprint YAML for target path extraction
   * @returns Information about created and existing directories
   */
  async generate(schemasYaml: string, blueprintYaml?: string): Promise<GeneratedStructure> {
    // Parse schemas.yaml
    const schemas = safeLoad(schemasYaml) as Record<string, unknown>;

    // Get required directories from schemas
    const requiredDirs = this.getRequiredDirs(schemas);

    // If blueprint is provided, also extract directories from target paths
    if (blueprintYaml) {
      const blueprintDirs = this.getDirectoriesFromBlueprint(blueprintYaml);
      for (const dir of blueprintDirs) {
        requiredDirs.add(dir);
      }
    }

    // Create directories
    return await this.createDirectories(Array.from(requiredDirs).sort());
  }

  /**
   * Extract directories from blueprint target paths
   * @param blueprintYaml - Blueprint YAML content
   * @returns Set of required directory paths
   */
  private getDirectoriesFromBlueprint(blueprintYaml: string): Set<string> {
    const dirs = new Set<string>();

    try {
      const blueprint = safeLoad(blueprintYaml) as Record<string, unknown>;

      // Extract documents from various blueprint structures
      const documents: BlueprintDocument[] = [];

      if (blueprint.discovered_documents && Array.isArray(blueprint.discovered_documents)) {
        documents.push(...(blueprint.discovered_documents as BlueprintDocument[]));
      }

      if (blueprint.documents && Array.isArray(blueprint.documents)) {
        documents.push(...(blueprint.documents as BlueprintDocument[]));
      }

      const migrationPlan = blueprint.migration_plan as Record<string, unknown> | undefined;
      if (migrationPlan?.documents && Array.isArray(migrationPlan.documents)) {
        documents.push(...(migrationPlan.documents as BlueprintDocument[]));
      }

      // Extract directories from target paths
      for (const doc of documents) {
        const targetPath = doc.target_path;
        if (targetPath && typeof targetPath === 'string') {
          // Get the directory part of the target path
          const lastSlash = targetPath.lastIndexOf('/');
          if (lastSlash > 0) {
            const dir = targetPath.substring(0, lastSlash);
            dirs.add(dir);

            // Also add parent directories
            const parts = dir.split('/');
            let parentPath = '';
            for (const part of parts) {
              parentPath = parentPath ? `${parentPath}/${part}` : part;
              dirs.add(parentPath);
            }
          }
        }
      }
    } catch {
      // Ignore parse errors
    }

    return dirs;
  }

  /**
   * Analyze document types and determine required directories
   * Uses centralized PKF type mapping
   * @param schemas - Parsed schemas object
   * @returns Set of required directory paths
   */
  private getRequiredDirs(schemas: Record<string, unknown>): Set<string> {
    // Extract document types from schemas first
    const documentTypesArray = this.extractDocumentTypes(schemas);
    const documentTypes = new Set(documentTypesArray);

    // Start with required PKF directories
    const dirs = new Set<string>(getRequiredDirectories(documentTypes));

    // Map each document type to its directory using centralized mapping
    for (const docType of documentTypesArray) {
      const normalizedType = normalizeDocType(docType);

      // Check if we have a direct mapping
      if (PKF_TYPE_TO_DIRECTORY[normalizedType]) {
        const targetDir = PKF_TYPE_TO_DIRECTORY[normalizedType];
        dirs.add(targetDir);

        // Add parent directories
        const parts = targetDir.split('/');
        let parentPath = '';
        for (const part of parts) {
          parentPath = parentPath ? `${parentPath}/${part}` : part;
          dirs.add(parentPath);
        }
        continue;
      }

      // Check for partial matches
      for (const [key, dir] of Object.entries(PKF_TYPE_TO_DIRECTORY)) {
        if (normalizedType.includes(key) || key.includes(normalizedType)) {
          dirs.add(dir);

          // Add parent directories
          const parts = dir.split('/');
          let parentPath = '';
          for (const part of parts) {
            parentPath = parentPath ? `${parentPath}/${part}` : part;
            dirs.add(parentPath);
          }
          break;
        }
      }
    }

    return dirs;
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
   * @param dirs - List of directories to create (sorted)
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

  /**
   * Generate structure from blueprint alone (without schemas)
   * @param blueprintYaml - Blueprint YAML content
   * @returns Information about created and existing directories
   */
  async generateFromBlueprint(blueprintYaml: string): Promise<GeneratedStructure> {
    const dirs = this.getDirectoriesFromBlueprint(blueprintYaml);

    // Add base PKF directories using empty set (gets base dirs)
    for (const dir of getRequiredDirectories(new Set())) {
      dirs.add(dir);
    }

    return await this.createDirectories(Array.from(dirs).sort());
  }
}
