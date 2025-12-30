/**
 * PKF Init Migration Planner
 * Analyzes blueprints and creates migration tasks for documents
 */

import * as path from 'path';
import * as yaml from 'js-yaml';
import type { LoadedConfig, MigrationTask } from '../types/index.js';

/**
 * Haiku pricing per million tokens (for cost estimation)
 */
const HAIKU_PRICING = {
  inputPerMillion: 0.80,
  outputPerMillion: 4.00,
};

/**
 * Average output tokens per document migration
 */
const AVG_OUTPUT_TOKENS_PER_DOC = 1000;

/**
 * Minutes per document for time estimation
 */
const MINUTES_PER_DOC = 0.5;

/**
 * Cost estimate for migration
 */
export interface CostEstimate {
  /** Total estimated tokens (input + output) */
  totalTokens: number;
  /** Total estimated cost in USD */
  totalCost: number;
  /** Estimated time in minutes */
  timeMinutes: number;
}

/**
 * Extended migration task with additional fields
 */
export interface ExtendedMigrationTask extends MigrationTask {
  /** Task priority (0 = highest) */
  priority: number;
  /** Estimated tokens for this task */
  estimatedTokens: number;
}

/**
 * Complete migration plan
 */
export interface MigrationPlan {
  /** List of migration tasks */
  tasks: ExtendedMigrationTask[];
  /** Total number of files to migrate */
  totalFiles: number;
  /** Estimated total cost in USD */
  estimatedCost: number;
  /** Estimated total time in minutes */
  estimatedTime: number;
  /** Count of documents by type */
  byType: Map<string, number>;
}

/**
 * Document entry from blueprint
 */
interface BlueprintDocument {
  path?: string;
  source_path?: string;
  target_path?: string;
  type?: string;
  doc_type?: string;
  document_type?: string;
}

/**
 * Blueprint structure
 */
interface Blueprint {
  migration_plan?: {
    documents?: BlueprintDocument[];
    files?: BlueprintDocument[];
  };
  discovered_documents?: BlueprintDocument[];
  documents?: BlueprintDocument[];
  files?: BlueprintDocument[];
}

/**
 * Document type definitions with path patterns
 */
interface DocTypePattern {
  patterns: RegExp[];
  targetDir: string;
}

/**
 * Migration Planner - analyzes blueprints and creates migration tasks
 */
export class MigrationPlanner {
  private config: LoadedConfig;
  private schemasYaml: string;

  /**
   * Document type patterns for classification
   */
  private readonly docTypePatterns: Record<string, DocTypePattern> = {
    readme: {
      patterns: [/^readme\.md$/i, /\/readme\.md$/i],
      targetDir: '',
    },
    changelog: {
      patterns: [/^changelog\.md$/i, /\/changelog\.md$/i, /^changes\.md$/i],
      targetDir: '',
    },
    contributing: {
      patterns: [/^contributing\.md$/i, /\/contributing\.md$/i],
      targetDir: '',
    },
    license: {
      patterns: [/^license\.md$/i, /\/license\.md$/i],
      targetDir: '',
    },
    guide: {
      patterns: [/docs\/guides?\//i, /guides?\//i, /tutorials?\//i, /howto\//i],
      targetDir: 'docs/guides',
    },
    'api-reference': {
      patterns: [/docs\/api\//i, /api-docs?\//i, /reference\//i],
      targetDir: 'docs/api',
    },
    architecture: {
      patterns: [/docs\/architecture\//i, /architecture\//i, /design\//i, /adr\//i],
      targetDir: 'docs/architecture',
    },
    specification: {
      patterns: [/docs\/specifications?\//i, /specs?\//i],
      targetDir: 'docs/specifications',
    },
    register: {
      patterns: [/docs\/registers?\//i, /todo\.md$/i, /issues\.md$/i],
      targetDir: 'docs/registers',
    },
  };

  /**
   * Priority mapping by document type
   */
  private readonly typePriorities: Record<string, number> = {
    readme: 0,
    contributing: 0,
    license: 0,
    changelog: 1,
    register: 1,
    guide: 1,
    architecture: 1,
    specification: 2,
    'api-reference': 2,
    generic: 3,
  };

  /**
   * Create a new MigrationPlanner
   * @param config - Loaded configuration
   * @param schemasYaml - Schemas YAML content for type resolution
   */
  constructor(config: LoadedConfig, schemasYaml: string) {
    this.config = config;
    this.schemasYaml = schemasYaml;
  }

  /**
   * Create a migration plan from a blueprint
   * @param blueprint - Blueprint YAML content
   * @returns Complete migration plan
   */
  async createPlan(blueprint: string): Promise<MigrationPlan> {
    // Parse the blueprint YAML
    let parsedBlueprint: Blueprint;
    try {
      parsedBlueprint = yaml.load(blueprint) as Blueprint;
    } catch (error) {
      throw new Error(`Failed to parse blueprint YAML: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Parse schemas for type resolution
    let schemas: object = {};
    if (this.schemasYaml) {
      try {
        schemas = yaml.load(this.schemasYaml) as object;
      } catch {
        // Ignore schema parse errors, use empty object
      }
    }

    // Extract documents from blueprint
    const documents = this.extractDocuments(parsedBlueprint);

    // Create migration tasks
    const tasks: ExtendedMigrationTask[] = [];
    const byType = new Map<string, number>();

    for (const doc of documents) {
      const sourcePath = doc.path || doc.source_path || '';
      if (!sourcePath) {
        continue;
      }

      // Determine document type
      const docType = doc.type || doc.doc_type || doc.document_type ||
                      this.determineDocumentType(sourcePath, schemas);

      // Generate target path
      const targetPath = doc.target_path || this.generateTargetPath(sourcePath, docType);

      // Calculate priority
      const priority = this.calculatePriority(docType, sourcePath);

      // Estimate tokens for this file
      const estimatedTokens = this.estimateFileTokens(sourcePath);

      // Create task
      const task: ExtendedMigrationTask = {
        sourcePath,
        targetPath,
        docType,
        priority,
        status: 'pending',
        estimatedTokens,
      };

      tasks.push(task);

      // Update type counts
      byType.set(docType, (byType.get(docType) || 0) + 1);
    }

    // Sort tasks by priority (lowest first = highest priority)
    tasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Secondary sort by path for consistent ordering
      return a.sourcePath.localeCompare(b.sourcePath);
    });

    // Calculate cost estimates
    const costEstimate = this.estimateCosts(tasks);

    return {
      tasks,
      totalFiles: tasks.length,
      estimatedCost: costEstimate.totalCost,
      estimatedTime: costEstimate.timeMinutes,
      byType,
    };
  }

  /**
   * Extract documents from various blueprint structures
   */
  private extractDocuments(blueprint: Blueprint): BlueprintDocument[] {
    const documents: BlueprintDocument[] = [];

    // Try migration_plan.documents
    if (blueprint.migration_plan?.documents) {
      documents.push(...blueprint.migration_plan.documents);
    }

    // Try migration_plan.files
    if (blueprint.migration_plan?.files) {
      documents.push(...blueprint.migration_plan.files);
    }

    // Try discovered_documents
    if (blueprint.discovered_documents) {
      documents.push(...blueprint.discovered_documents);
    }

    // Try documents at root level
    if (blueprint.documents) {
      documents.push(...blueprint.documents);
    }

    // Try files at root level
    if (blueprint.files) {
      documents.push(...blueprint.files);
    }

    return documents;
  }

  /**
   * Determine document type based on file path and schemas
   * @param filePath - Path to the file
   * @param schemas - Parsed schemas object
   * @returns Document type string
   */
  private determineDocumentType(filePath: string, schemas: object): string {
    const normalizedPath = filePath.toLowerCase();

    // Check against known patterns
    for (const [docType, config] of Object.entries(this.docTypePatterns)) {
      for (const pattern of config.patterns) {
        if (pattern.test(normalizedPath)) {
          return docType;
        }
      }
    }

    // Try to match against schema definitions if available
    if (schemas && typeof schemas === 'object') {
      const schemaTypes = Object.keys(schemas);
      for (const schemaType of schemaTypes) {
        // Check if path contains the schema type name
        const typePattern = new RegExp(schemaType.replace(/-/g, '[/-]?'), 'i');
        if (typePattern.test(normalizedPath)) {
          return schemaType;
        }
      }
    }

    // Default to generic
    return 'generic';
  }

  /**
   * Generate target path based on source path and document type
   * @param sourcePath - Original file path
   * @param docType - Determined document type
   * @returns Target path for migration
   */
  private generateTargetPath(sourcePath: string, docType: string): string {
    const fileName = path.basename(sourcePath);
    const docsDir = this.config.docsDir;

    // Get target directory for this type
    const typeConfig = this.docTypePatterns[docType];

    if (typeConfig && typeConfig.targetDir) {
      // Use the configured target directory
      return path.join(docsDir, typeConfig.targetDir.replace('docs/', ''), fileName);
    }

    // Root-level files stay at root
    if (['readme', 'changelog', 'contributing', 'license'].includes(docType)) {
      return path.join(this.config.rootDir, fileName);
    }

    // Generic files go to docs root
    return path.join(docsDir, fileName);
  }

  /**
   * Calculate priority for a document
   * @param docType - Document type
   * @param sourcePath - Source file path
   * @returns Priority number (0 = highest)
   */
  private calculatePriority(docType: string, sourcePath: string): number {
    // Get base priority from type
    let priority = this.typePriorities[docType] ?? 3;

    // Boost priority for files in root directory
    const depth = sourcePath.split(path.sep).length - 1;
    if (depth === 0) {
      priority = Math.max(0, priority - 1);
    }

    // Boost priority for index files
    const fileName = path.basename(sourcePath).toLowerCase();
    if (fileName === 'index.md' || fileName === 'readme.md') {
      priority = Math.max(0, priority - 1);
    }

    return priority;
  }

  /**
   * Estimate tokens for a single file
   * @param filePath - Path to the file
   * @returns Estimated token count
   */
  private estimateFileTokens(filePath: string): number {
    // Base estimate: average markdown file is ~1000 tokens
    // Adjust based on file path hints
    const fileName = path.basename(filePath).toLowerCase();

    // README files tend to be larger
    if (fileName === 'readme.md') {
      return 1500;
    }

    // API docs tend to be larger
    if (filePath.toLowerCase().includes('api')) {
      return 2000;
    }

    // Architecture docs tend to be larger
    if (filePath.toLowerCase().includes('architecture')) {
      return 1800;
    }

    // Default estimate
    return 1000;
  }

  /**
   * Estimate costs for all migration tasks
   * @param tasks - List of migration tasks
   * @returns Cost estimate
   */
  private estimateCosts(tasks: ExtendedMigrationTask[]): CostEstimate {
    if (tasks.length === 0) {
      return {
        totalTokens: 0,
        totalCost: 0,
        timeMinutes: 0,
      };
    }

    // Sum up estimated input tokens
    const totalInputTokens = tasks.reduce((sum, task) => sum + task.estimatedTokens, 0);

    // Estimate output tokens
    const totalOutputTokens = tasks.length * AVG_OUTPUT_TOKENS_PER_DOC;

    // Total tokens
    const totalTokens = totalInputTokens + totalOutputTokens;

    // Calculate cost using Haiku pricing
    const inputCost = (totalInputTokens / 1_000_000) * HAIKU_PRICING.inputPerMillion;
    const outputCost = (totalOutputTokens / 1_000_000) * HAIKU_PRICING.outputPerMillion;
    const totalCost = inputCost + outputCost;

    // Estimate time based on number of documents
    // Consider parallel workers
    const workers = this.config.workers || 1;
    const timeMinutes = (tasks.length * MINUTES_PER_DOC) / workers;

    return {
      totalTokens,
      totalCost,
      timeMinutes,
    };
  }
}

export default MigrationPlanner;
