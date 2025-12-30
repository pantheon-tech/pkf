/**
 * PKF Init Analysis Stage
 * Stage 1: Scans repository, analyzes documentation, generates blueprint YAML
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as yaml from 'js-yaml';
import type { AgentOrchestrator } from '../agents/orchestrator.js';
import type { WorkflowStateManager } from '../state/workflow-state.js';
import type { Interactive } from '../utils/interactive.js';
import { WorkflowStage, type LoadedConfig } from '../types/index.js';
import * as logger from '../utils/logger.js';

/**
 * Discovered documentation file metadata
 */
export interface DiscoveredDoc {
  /** Absolute path to the file */
  path: string;
  /** Path relative to project root */
  relativePath: string;
  /** File size in bytes */
  size: number;
  /** Whether file has YAML frontmatter */
  hasYamlFrontmatter: boolean;
}

/**
 * Result from analysis stage execution
 */
export interface AnalysisResult {
  /** Whether analysis completed successfully */
  success: boolean;
  /** Generated blueprint YAML content */
  blueprint?: string;
  /** List of discovered documentation files */
  discoveredDocs: DiscoveredDoc[];
  /** Error message if failed */
  error?: string;
}

/**
 * Agent name for documentation analysis
 */
const ANALYSIS_AGENT = 'documentation-analyst-init';

/**
 * Maximum characters to sample from key files
 */
const SAMPLE_CHAR_LIMIT = 500;

/**
 * Key files to prioritize for sampling
 */
const KEY_FILES = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'docs/README.md'];

/**
 * AnalysisStage handles Stage 1 of the PKF initialization workflow
 *
 * Responsibilities:
 * - Scan repository for documentation files
 * - Build context about existing documentation
 * - Execute documentation-analyst-init agent
 * - Parse and validate generated blueprint
 * - Interactive approval if enabled
 * - State checkpointing
 */
export class AnalysisStage {
  private orchestrator: AgentOrchestrator;
  private stateManager: WorkflowStateManager;
  private config: LoadedConfig;
  private interactive: Interactive;

  /**
   * Create a new AnalysisStage
   *
   * @param orchestrator - Agent orchestrator for AI interactions
   * @param stateManager - Workflow state manager for persistence
   * @param config - Loaded configuration
   * @param interactive - Interactive mode handler
   */
  constructor(
    orchestrator: AgentOrchestrator,
    stateManager: WorkflowStateManager,
    config: LoadedConfig,
    interactive: Interactive
  ) {
    this.orchestrator = orchestrator;
    this.stateManager = stateManager;
    this.config = config;
    this.interactive = interactive;
  }

  /**
   * Execute the analysis stage
   *
   * @returns AnalysisResult with blueprint and discovered docs
   */
  async execute(): Promise<AnalysisResult> {
    logger.stage('Stage 1: Analysis');

    try {
      // Step 1: Scan repository for documentation files
      logger.step('Scanning repository for documentation files...');
      const discoveredDocs = await this.scanRepository();
      logger.info(`Found ${discoveredDocs.length} documentation files`);

      if (discoveredDocs.length === 0) {
        logger.warn('No documentation files found');
      }

      // Step 2: Build context for agent
      logger.step('Building context from discovered documentation...');
      const context = await this.buildContext(discoveredDocs);

      // Step 3: Execute documentation-analyst-init agent
      logger.step('Executing documentation analysis agent...');
      const agentResult = await this.orchestrator.singleAgentTask(
        ANALYSIS_AGENT,
        context
      );

      if (!agentResult.success) {
        const error = `Agent execution failed: ${agentResult.error}`;
        logger.error(error);
        return {
          success: false,
          discoveredDocs,
          error,
        };
      }

      logger.cost(agentResult.cost, 'Analysis agent');
      logger.tokens(agentResult.tokensUsed, 'Analysis agent');

      // Step 4: Extract blueprint from response
      logger.step('Extracting blueprint from agent response...');
      const blueprintYaml = this.extractBlueprint(agentResult.output);

      if (!blueprintYaml) {
        const error = 'Failed to extract blueprint YAML from agent response';
        logger.error(error);
        return {
          success: false,
          discoveredDocs,
          error,
        };
      }

      // Step 5: Validate blueprint structure
      logger.step('Validating blueprint structure...');
      if (!this.validateBlueprint(blueprintYaml)) {
        const error = 'Blueprint validation failed: missing required fields';
        logger.error(error);
        return {
          success: false,
          blueprint: blueprintYaml,
          discoveredDocs,
          error,
        };
      }

      logger.success('Blueprint validated successfully');

      // Step 6: Interactive approval if enabled
      let finalBlueprint = blueprintYaml;
      const approval = await this.interactive.approveBlueprint(blueprintYaml);

      if (!approval.approved) {
        const error = 'Blueprint rejected by user';
        logger.warn(error);
        return {
          success: false,
          blueprint: blueprintYaml,
          discoveredDocs,
          error,
        };
      }

      // Use edited version if provided
      if (approval.edited) {
        logger.info('Using user-edited blueprint');
        finalBlueprint = approval.edited;
      }

      // Step 7: Save state with checkpoint
      logger.step('Saving checkpoint...');
      await this.stateManager.checkpoint(
        WorkflowStage.ANALYZING,
        'Analysis stage completed',
        {
          blueprint: finalBlueprint,
          discoveredDocs: discoveredDocs.map((d) => d.relativePath),
          docCount: discoveredDocs.length,
        }
      );

      logger.success('Analysis stage completed');

      return {
        success: true,
        blueprint: finalBlueprint,
        discoveredDocs,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.error(`Analysis stage failed: ${error}`);
      return {
        success: false,
        discoveredDocs: [],
        error,
      };
    }
  }

  /**
   * Scan repository for documentation files
   *
   * Scans recursively from project root for all markdown files,
   * excluding common non-documentation directories.
   *
   * @returns List of discovered documentation files with metadata
   */
  private async scanRepository(): Promise<DiscoveredDoc[]> {
    const docs: DiscoveredDoc[] = [];
    const seenPaths = new Set<string>();

    // Directories to exclude from scanning
    const excludeDirs = [
      'node_modules',
      '.git',
      '.next',
      '.nuxt',
      'dist',
      'build',
      'coverage',
      '.cache',
      '.turbo',
      'vendor',
      '__pycache__',
      '.venv',
      'venv',
    ];

    // Build ignore patterns for glob
    const ignorePatterns = excludeDirs.map((dir) => `**/${dir}/**`);

    // Scan ALL markdown files in the entire repository
    const allMdGlob = path.join(this.config.rootDir, '**/*.md');
    const allFiles = await glob(allMdGlob, {
      nodir: true,
      ignore: ignorePatterns,
    });

    for (const filePath of allFiles) {
      if (seenPaths.has(filePath)) continue;
      seenPaths.add(filePath);

      const doc = await this.createDiscoveredDoc(filePath);
      if (doc) {
        docs.push(doc);
      }
    }

    // Also check for other documentation formats
    const otherFormats = ['**/*.mdx', '**/*.rst', '**/*.txt'];
    for (const pattern of otherFormats) {
      const formatGlob = path.join(this.config.rootDir, pattern);
      const formatFiles = await glob(formatGlob, {
        nodir: true,
        ignore: ignorePatterns,
      });

      for (const filePath of formatFiles) {
        if (seenPaths.has(filePath)) continue;
        seenPaths.add(filePath);

        const doc = await this.createDiscoveredDoc(filePath);
        if (doc) {
          docs.push(doc);
        }
      }
    }

    // Sort by path for consistent ordering
    docs.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    return docs;
  }

  /**
   * Create a DiscoveredDoc from a file path
   *
   * @param filePath - Absolute path to the file
   * @returns DiscoveredDoc or null if file cannot be read
   */
  private async createDiscoveredDoc(filePath: string): Promise<DiscoveredDoc | null> {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const hasYamlFrontmatter = content.trimStart().startsWith('---');

      return {
        path: filePath,
        relativePath: path.relative(this.config.rootDir, filePath),
        size: stats.size,
        hasYamlFrontmatter,
      };
    } catch {
      logger.debug(`Failed to read file: ${filePath}`);
      return null;
    }
  }

  /**
   * Build prompt context from discovered documentation
   *
   * @param docs - List of discovered documentation files
   * @returns Formatted context string for the agent
   */
  private async buildContext(docs: DiscoveredDoc[]): Promise<string> {
    // Build document list
    const docList = docs
      .map((doc) => {
        const sizeKb = (doc.size / 1024).toFixed(1);
        const frontmatter = doc.hasYamlFrontmatter ? ' (has frontmatter)' : '';
        return `- ${doc.relativePath} (${sizeKb} KB)${frontmatter}`;
      })
      .join('\n');

    // Build samples from key files
    const samples: string[] = [];
    for (const keyFile of KEY_FILES) {
      const doc = docs.find(
        (d) => d.relativePath === keyFile || d.relativePath.endsWith(`/${keyFile}`)
      );
      if (doc) {
        try {
          const content = await fs.readFile(doc.path, 'utf-8');
          const sample = content.slice(0, SAMPLE_CHAR_LIMIT);
          const truncated = content.length > SAMPLE_CHAR_LIMIT ? '...' : '';
          samples.push(`### ${doc.relativePath}\n\`\`\`\n${sample}${truncated}\n\`\`\``);
        } catch {
          // Skip if cannot read
        }
      }
    }

    // If no key files found, sample from first few docs
    if (samples.length === 0 && docs.length > 0) {
      const sampleDocs = docs.slice(0, 3);
      for (const doc of sampleDocs) {
        try {
          const content = await fs.readFile(doc.path, 'utf-8');
          const sample = content.slice(0, SAMPLE_CHAR_LIMIT);
          const truncated = content.length > SAMPLE_CHAR_LIMIT ? '...' : '';
          samples.push(`### ${doc.relativePath}\n\`\`\`\n${sample}${truncated}\n\`\`\``);
        } catch {
          // Skip if cannot read
        }
      }
    }

    const samplesText = samples.join('\n\n');

    // Build the full prompt
    return `Analyze the following repository documentation structure and create a PKF blueprint.

## Repository Information
- Root directory: ${this.config.rootDir}
- Docs directory: ${this.config.docsDir}
- Total documentation files: ${docs.length}

## Discovered documentation files:
${docList || '(No documentation files found)'}

## Sample content from key files:
${samplesText || '(No samples available)'}

## Instructions
Generate a blueprint YAML with the following sections:
- analysis: overview of current documentation state
- recommendations: suggested PKF structure improvements
- document_types: identified document types (e.g., guides, references, ADRs)
- migration_plan: files to migrate and their target locations

Format your response with the blueprint YAML in a code block like:
\`\`\`yaml
# PKF Blueprint
analysis:
  ...
\`\`\``;
  }

  /**
   * Extract YAML content from agent response
   *
   * @param response - Full agent response text
   * @returns Extracted YAML string or null if not found
   */
  private extractBlueprint(response: string): string | null {
    // Look for yaml code block
    const yamlBlockRegex = /```yaml\s*\n([\s\S]*?)\n```/;
    const match = response.match(yamlBlockRegex);

    if (match && match[1]) {
      return match[1].trim();
    }

    // Try alternative patterns
    const altPatterns = [
      /```yml\s*\n([\s\S]*?)\n```/, // yml instead of yaml
      /```\s*\n([\s\S]*?)\n```/, // no language specified
    ];

    for (const pattern of altPatterns) {
      const altMatch = response.match(pattern);
      if (altMatch && altMatch[1]) {
        // Check if it looks like YAML (has colons on lines)
        if (altMatch[1].includes(':')) {
          return altMatch[1].trim();
        }
      }
    }

    // If no code block, try to find YAML content directly
    // Look for lines starting with 'analysis:' or '# PKF Blueprint'
    const lines = response.split('\n');
    const startIndex = lines.findIndex(
      (line) =>
        line.trim().startsWith('analysis:') ||
        line.trim().startsWith('# PKF Blueprint')
    );

    if (startIndex >= 0) {
      // Extract from start to end or next markdown section
      const yamlLines: string[] = [];
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        // Stop at markdown headers (unless it's a YAML comment)
        if (line.startsWith('#') && !line.startsWith('# PKF')) {
          break;
        }
        yamlLines.push(line);
      }
      if (yamlLines.length > 0) {
        return yamlLines.join('\n').trim();
      }
    }

    return null;
  }

  /**
   * Validate blueprint YAML structure
   *
   * @param yamlContent - YAML string to validate
   * @returns true if valid, false otherwise
   */
  private validateBlueprint(yamlContent: string): boolean {
    try {
      const parsed = yaml.load(yamlContent) as Record<string, unknown>;

      if (!parsed || typeof parsed !== 'object') {
        logger.debug('Blueprint is not a valid object');
        return false;
      }

      // Check for required top-level fields
      const requiredFields = ['analysis', 'recommendations', 'document_types', 'migration_plan'];
      const missingFields: string[] = [];

      for (const field of requiredFields) {
        if (!(field in parsed)) {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        logger.debug(`Blueprint missing required fields: ${missingFields.join(', ')}`);
        // Allow partial blueprints but log warning
        if (missingFields.length === requiredFields.length) {
          // All fields missing - likely invalid
          return false;
        }
        logger.warn(`Blueprint missing some fields: ${missingFields.join(', ')}`);
      }

      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.debug(`YAML parse error: ${error}`);
      return false;
    }
  }
}

export default AnalysisStage;
