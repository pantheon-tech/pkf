/**
 * PKF Init Migration Planner
 * Analyzes blueprints and creates migration tasks for documents
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { safeLoad } from '../utils/yaml.js';
import type { LoadedConfig, MigrationTask } from '../types/index.js';
import {
  detectDocumentType,
  resolveTargetPath,
  normalizeDocType,
  ROOT_LEVEL_FILES,
} from '../utils/type-mapping.js';
import type { PKFConfig } from '../config/pkf-config.js';

/**
 * Haiku pricing per million tokens (for cost estimation)
 */
const HAIKU_PRICING = {
  inputPerMillion: 0.80,
  outputPerMillion: 4.00,
};

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
  /** Whether file needs to be moved (source !== target) */
  needsMove: boolean;
  /** Whether file needs frontmatter added */
  needsFrontmatter: boolean;
  /** Whether file needs to be created (doesn't exist yet) */
  needsCreation: boolean;
  /** Title for the document (used when creating new files) */
  title?: string;
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
  has_frontmatter?: boolean;
  hasFrontmatter?: boolean;
  complexity?: string;
  migration_effort?: string;
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
 * Migration Planner - analyzes blueprints and creates migration tasks
 */
export class MigrationPlanner {
  private config: LoadedConfig;
  private schemasYaml: string;
  private pkfConfig: PKFConfig;

  /**
   * Priority mapping by document type
   * Lower number = higher priority
   */
  private readonly typePriorities: Record<string, number> = {
    readme: 0,
    contributing: 0,
    license: 0,
    'code-of-conduct': 0,
    changelog: 1,
    register: 1,
    todo: 1,
    issues: 1,
    guide: 2,
    'guide-user': 2,
    'guide-developer': 2,
    tutorial: 2,
    howto: 2,
    architecture: 2,
    'design-doc': 2,
    adr: 2,
    specification: 3,
    spec: 3,
    'api-reference': 3,
    api: 3,
    proposal: 3,
    rfc: 3,
    example: 4,
    template: 4,
    generic: 5,
    other: 5,
  };

  /**
   * Create a new MigrationPlanner
   * @param config - Loaded configuration
   * @param schemasYaml - Schemas YAML content for type resolution
   * @param pkfConfig - Optional PKF configuration
   */
  constructor(config: LoadedConfig, schemasYaml: string, pkfConfig?: PKFConfig) {
    this.config = config;
    this.schemasYaml = schemasYaml;
    this.pkfConfig = pkfConfig ?? {
      analysis: { maxParallelInspections: 3 },
      orchestration: { maxIterations: 5 },
      planning: { avgOutputTokensPerDoc: 1000 },
      api: { maxRetries: 3, retryDelayMs: 1000, timeout: 1800000 },
    };
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
      parsedBlueprint = safeLoad(blueprint) as Blueprint;
    } catch (error) {
      throw new Error(`Failed to parse blueprint YAML: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Extract documents from blueprint
    const documents = this.extractDocuments(parsedBlueprint);

    // Prepare all source paths for parallel existence checks
    const sourcePaths = documents
      .map((doc) => doc.path || doc.source_path || '')
      .filter((path) => path !== '')
      .map((sourcePath) =>
        path.isAbsolute(sourcePath)
          ? sourcePath
          : path.join(this.config.rootDir, sourcePath)
      );

    // Check all file existence in parallel
    const existenceChecks = await Promise.all(
      sourcePaths.map((filePath) => this.fileExists(filePath))
    );
    const existenceMap = new Map<string, boolean>();
    sourcePaths.forEach((filePath, index) => {
      existenceMap.set(filePath, existenceChecks[index]);
    });

    // Create migration tasks
    const tasks: ExtendedMigrationTask[] = [];
    const byType = new Map<string, number>();

    for (const doc of documents) {
      const sourcePath = doc.path || doc.source_path || '';
      if (!sourcePath) {
        continue;
      }

      // Determine document type - prefer blueprint, fallback to detection
      const rawDocType = doc.type || doc.doc_type || doc.document_type ||
                      detectDocumentType(sourcePath);
      const docType = normalizeDocType(rawDocType);

      // Use target_path from blueprint if available, otherwise generate
      const targetPath = doc.target_path ||
                        resolveTargetPath(sourcePath, docType, this.config.rootDir, this.config.docsDir);

      // Check if source file exists (from cached parallel check)
      const absoluteSourcePath = path.isAbsolute(sourcePath)
        ? sourcePath
        : path.join(this.config.rootDir, sourcePath);
      const needsCreation = !existenceMap.get(absoluteSourcePath);

      // Determine if file needs to be moved (only if it exists)
      const normalizedSource = path.normalize(sourcePath).replace(/\\/g, '/');
      const normalizedTarget = path.normalize(targetPath).replace(/\\/g, '/');
      const needsMove = !needsCreation && normalizedSource !== normalizedTarget;

      // Determine if file needs frontmatter
      // New files always need frontmatter, existing files check the flag
      const hasFrontmatter = doc.has_frontmatter || doc.hasFrontmatter || false;
      const needsFrontmatter = needsCreation || !hasFrontmatter;

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
        needsMove,
        needsFrontmatter,
        needsCreation,
        title: doc.path ? path.basename(doc.path, '.md') : undefined,
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
   * Calculate priority for a document
   * @param docType - Document type (already normalized)
   * @param sourcePath - Source file path
   * @returns Priority number (0 = highest)
   */
  private calculatePriority(docType: string, sourcePath: string): number {
    // Get base priority from type
    let priority = this.typePriorities[docType] ?? this.typePriorities['generic'];

    // Boost priority for files in root directory
    const depth = sourcePath.split('/').length - 1;
    if (depth === 0) {
      priority = Math.max(0, priority - 1);
    }

    // Boost priority for root-level files
    const fileName = path.basename(sourcePath);
    if (ROOT_LEVEL_FILES.has(fileName)) {
      priority = Math.max(0, priority - 1);
    }

    // Boost priority for index files
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName === 'index.md' || lowerFileName === 'readme.md') {
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
   * Check if a file exists
   * @param filePath - Path to the file
   * @returns Whether the file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
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
    const totalOutputTokens = tasks.length * this.pkfConfig.planning.avgOutputTokensPerDoc;

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
