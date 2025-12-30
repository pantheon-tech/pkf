/**
 * PKF Init Migration Worker
 * Migrates individual documents by adding PKF frontmatter
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { AgentOrchestrator } from '../agents/orchestrator.js';
import type { MigrationTask } from '../types/index.js';

/**
 * Result from a migration operation
 */
export interface MigrationResult {
  /** The migration task that was executed */
  task: MigrationTask;
  /** Whether the migration succeeded */
  success: boolean;
  /** Output path where migrated file was written */
  outputPath?: string;
  /** Generated frontmatter content */
  frontmatter?: string;
  /** Tokens used for this migration */
  tokensUsed?: number;
  /** Cost in USD for this migration */
  cost?: number;
  /** Error message if migration failed */
  error?: string;
}

/**
 * Migration Worker
 * Handles the migration of individual documents by adding PKF frontmatter
 */
export class MigrationWorker {
  private orchestrator: AgentOrchestrator;
  private schemasYaml: string;
  private rootDir: string;
  private parsedSchemas: Record<string, unknown> | null = null;

  /**
   * Create a new MigrationWorker
   *
   * @param orchestrator - Agent orchestrator for AI operations
   * @param schemasYaml - YAML string containing schema definitions
   * @param rootDir - Root directory of the project
   */
  constructor(
    orchestrator: AgentOrchestrator,
    schemasYaml: string,
    rootDir: string
  ) {
    this.orchestrator = orchestrator;
    this.schemasYaml = schemasYaml;
    this.rootDir = rootDir;
  }

  /**
   * Migrate a document by adding PKF frontmatter
   *
   * @param task - Migration task to execute
   * @returns MigrationResult with outcome and statistics
   */
  async migrate(task: MigrationTask): Promise<MigrationResult> {
    try {
      // Read source file content
      const content = await this.readSourceFile(task.sourcePath);

      // Get schema definition for the document type
      const schema = this.getSchemaForType(task.docType);
      if (!schema) {
        return {
          task,
          success: false,
          error: `No schema found for document type: ${task.docType}`,
        };
      }

      // Build migration prompt
      const prompt = this.buildMigrationPrompt(content, task.docType, schema);

      // Execute the documentation-migration-worker agent
      const result = await this.orchestrator.singleAgentTask(
        'documentation-migration-worker',
        prompt
      );

      if (!result.success) {
        return {
          task,
          success: false,
          error: result.error ?? 'Agent execution failed',
          tokensUsed: result.tokensUsed,
          cost: result.cost,
        };
      }

      // Extract frontmatter from agent response
      const frontmatter = this.extractFrontmatter(result.output);
      if (!frontmatter) {
        return {
          task,
          success: false,
          error: 'Failed to extract frontmatter from agent response',
          tokensUsed: result.tokensUsed,
          cost: result.cost,
        };
      }

      // Combine frontmatter with original content
      const migratedContent = this.combineContent(frontmatter, content);

      // Write to target path
      await this.writeTargetFile(task.targetPath, migratedContent);

      return {
        task,
        success: true,
        outputPath: task.targetPath,
        frontmatter,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        task,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Read source file content
   *
   * @param filePath - Path to the source file
   * @returns File content as string
   */
  private async readSourceFile(filePath: string): Promise<string> {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.rootDir, filePath);

    const content = await fs.readFile(absolutePath, 'utf-8');
    return content;
  }

  /**
   * Get schema definition for a document type
   *
   * @param docType - Document type to get schema for
   * @returns Schema object or null if not found
   */
  private getSchemaForType(docType: string): object | null {
    // Parse schemas YAML if not already parsed
    if (!this.parsedSchemas) {
      try {
        this.parsedSchemas = yaml.load(this.schemasYaml) as Record<string, unknown>;
      } catch {
        return null;
      }
    }

    if (!this.parsedSchemas) {
      return null;
    }

    // Look for schema in common locations within the YAML structure
    // Try direct lookup first
    if (
      typeof this.parsedSchemas === 'object' &&
      docType in this.parsedSchemas
    ) {
      return this.parsedSchemas[docType] as object;
    }

    // Try under 'schemas' key
    const schemas = this.parsedSchemas['schemas'] as Record<string, unknown> | undefined;
    if (schemas && typeof schemas === 'object' && docType in schemas) {
      return schemas[docType] as object;
    }

    // Try under 'documentTypes' key
    const documentTypes = this.parsedSchemas['documentTypes'] as Record<string, unknown> | undefined;
    if (documentTypes && typeof documentTypes === 'object' && docType in documentTypes) {
      return documentTypes[docType] as object;
    }

    // Try under 'types' key
    const types = this.parsedSchemas['types'] as Record<string, unknown> | undefined;
    if (types && typeof types === 'object' && docType in types) {
      return types[docType] as object;
    }

    return null;
  }

  /**
   * Build the migration prompt for the agent
   *
   * @param content - Original document content
   * @param docType - Document type
   * @param schema - Schema definition for the document type
   * @returns Formatted prompt string
   */
  private buildMigrationPrompt(
    content: string,
    docType: string,
    schema: object
  ): string {
    const schemaYaml = yaml.dump(schema, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

    return `Migrate the following document to PKF format by generating appropriate YAML frontmatter.

Document Type: ${docType}
Schema Definition:
${schemaYaml}

Original Document Content:
---
${content}
---

Generate YAML frontmatter that:
1. Follows the schema definition exactly
2. Extracts metadata from the content where possible
3. Uses appropriate default values for missing fields

Output ONLY the YAML frontmatter (including --- markers):`;
  }

  /**
   * Extract YAML frontmatter from agent response
   *
   * @param response - Agent response text
   * @returns Extracted frontmatter string or null if not found
   */
  private extractFrontmatter(response: string): string | null {
    // Look for content between --- markers
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*$/m;
    const match = response.match(frontmatterRegex);

    if (match) {
      const frontmatterContent = match[1].trim();

      // Validate that the extracted content is valid YAML
      try {
        yaml.load(frontmatterContent);
        return `---\n${frontmatterContent}\n---`;
      } catch {
        // Invalid YAML, try to find it differently
      }
    }

    // Alternative: look for frontmatter at the start of response
    const lines = response.split('\n');
    let inFrontmatter = false;
    let frontmatterLines: string[] = [];

    for (const line of lines) {
      if (line.trim() === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
          continue;
        } else {
          // End of frontmatter
          const frontmatterContent = frontmatterLines.join('\n').trim();
          try {
            yaml.load(frontmatterContent);
            return `---\n${frontmatterContent}\n---`;
          } catch {
            return null;
          }
        }
      }

      if (inFrontmatter) {
        frontmatterLines.push(line);
      }
    }

    return null;
  }

  /**
   * Combine frontmatter with original content
   *
   * @param frontmatter - YAML frontmatter to add
   * @param originalContent - Original document content
   * @returns Combined content
   */
  private combineContent(frontmatter: string, originalContent: string): string {
    // Check if original content already has frontmatter
    const existingFrontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
    const hasExistingFrontmatter = existingFrontmatterRegex.test(originalContent);

    if (hasExistingFrontmatter) {
      // Replace existing frontmatter
      return originalContent.replace(
        existingFrontmatterRegex,
        frontmatter + '\n\n'
      );
    } else {
      // Prepend new frontmatter
      return frontmatter + '\n\n' + originalContent;
    }
  }

  /**
   * Write migrated content to target file
   *
   * @param filePath - Target file path
   * @param content - Content to write
   */
  private async writeTargetFile(filePath: string, content: string): Promise<void> {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.rootDir, filePath);

    // Create parent directories if needed
    const parentDir = path.dirname(absolutePath);
    await fs.mkdir(parentDir, { recursive: true });

    // Write file
    await fs.writeFile(absolutePath, content, 'utf-8');
  }
}

export default MigrationWorker;
