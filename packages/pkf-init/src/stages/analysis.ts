/**
 * PKF Init Analysis Stage
 * Stage 1: Scans repository, analyzes documentation, generates blueprint YAML
 *
 * Uses an iterative process:
 * 1. Triage: Main agent identifies files needing closer inspection
 * 2. Inspection: Parallel agents inspect identified files
 * 3. Synthesis: Main agent generates final blueprint with inspection results
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { safeLoad } from '../utils/yaml.js';
import type { AgentOrchestrator } from '../agents/orchestrator.js';
import type { WorkflowStateManager } from '../state/workflow-state.js';
import type { Interactive } from '../utils/interactive.js';
import { WorkflowStage, type LoadedConfig } from '../types/index.js';
import * as logger from '../utils/logger.js';
import {
  extractBlueprintSummary,
  displayBlueprintSummary,
  saveBlueprintToFile,
} from '../utils/blueprint-summary.js';
import { createTerminalUI, createNoOpUI, type TerminalUI, type SimpleProgress } from '../utils/terminal-ui.js';
import type { PKFConfig } from '../config/pkf-config.js';

/**
 * Analysis stage steps for progress tracking
 */
const ANALYSIS_STEPS = [
  { name: 'Scan', description: 'Scanning repository for documentation files' },
  { name: 'Triage', description: 'Analyzing files to identify inspection needs' },
  { name: 'Inspect', description: 'Inspecting documents in parallel' },
  { name: 'Synthesize', description: 'Generating final blueprint' },
  { name: 'Validate', description: 'Validating and saving blueprint' },
];

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
 * Agent name for document inspection
 */
const INSPECTOR_AGENT = 'document-inspector';

/**
 * Maximum characters to sample from key files
 */
const SAMPLE_CHAR_LIMIT = 500;

/**
 * Key files to prioritize for sampling
 */
const KEY_FILES = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'docs/README.md'];

/**
 * File to inspect from triage response
 */
interface FileToInspect {
  path: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Quick classification from triage response
 */
interface QuickClassification {
  path: string;
  type: string;
  confidence: number;
  has_frontmatter?: boolean;
  complexity?: string;
  migration_effort?: string;
}

/**
 * Parsed triage response from analyst agent
 */
interface TriageResponse {
  mode: 'triage';
  files_to_inspect: FileToInspect[];
  quick_classifications: QuickClassification[];
  initial_observations: string[];
}

/**
 * Inspection result from document inspector agent
 */
interface InspectionResult {
  path: string;
  success: boolean;
  analysis?: string;
  error?: string;
}

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
/**
 * Options for AnalysisStage
 */
export interface AnalysisStageOptions {
  /** Debug mode: disable UI, save raw outputs */
  debug?: boolean;
  /** PKF configuration */
  pkfConfig?: PKFConfig;
}

export class AnalysisStage {
  private orchestrator: AgentOrchestrator;
  private stateManager: WorkflowStateManager;
  private config: LoadedConfig;
  private interactive: Interactive;
  private ui: TerminalUI | SimpleProgress;
  private debug: boolean;
  private pkfConfig: PKFConfig;

  /**
   * Create a new AnalysisStage
   *
   * @param orchestrator - Agent orchestrator for AI interactions
   * @param stateManager - Workflow state manager for persistence
   * @param config - Loaded configuration
   * @param interactive - Interactive mode handler
   * @param options - Optional stage options
   */
  constructor(
    orchestrator: AgentOrchestrator,
    stateManager: WorkflowStateManager,
    config: LoadedConfig,
    interactive: Interactive,
    options?: AnalysisStageOptions
  ) {
    this.orchestrator = orchestrator;
    this.stateManager = stateManager;
    this.config = config;
    this.interactive = interactive;
    this.debug = options?.debug ?? false;
    this.pkfConfig = options?.pkfConfig ?? {
      analysis: { maxParallelInspections: 3 },
      orchestration: { maxIterations: 5 },
      planning: { avgOutputTokensPerDoc: 1000 },
      api: { maxRetries: 3, retryDelayMs: 1000, timeout: 1800000 },
    };
    // In debug mode, use no-op UI (no output, no cursor movement)
    this.ui = this.debug
      ? createNoOpUI()
      : createTerminalUI({ steps: ANALYSIS_STEPS });
  }

  /**
   * Execute the analysis stage with iterative inspection
   *
   * @returns AnalysisResult with blueprint and discovered docs
   */
  async execute(): Promise<AnalysisResult> {
    // Start terminal UI
    this.ui.start();

    // Wire up orchestrator streaming to terminal UI
    this.orchestrator.setStreamCallback((chunk: string) => {
      this.ui.streamContent(chunk);
    });

    try {
      // Step 0: Scan repository for documentation files
      this.ui.setStep(0);
      const discoveredDocs = await this.scanRepository();
      this.ui.log(`Found ${discoveredDocs.length} documentation files`);

      if (discoveredDocs.length === 0) {
        this.ui.log('Warning: No documentation files found');
      }

      // Step 1: Triage phase - identify files needing inspection
      this.ui.nextStep();
      this.ui.startStreaming('Triage Analysis');
      const triageContext = await this.buildTriageContext(discoveredDocs);
      const triageResult = await this.orchestrator.singleAgentTask(
        ANALYSIS_AGENT,
        triageContext
      );
      this.ui.endStreaming();

      if (!triageResult.success) {
        this.orchestrator.setStreamCallback(undefined);
        this.ui.stop();
        const error = `Triage failed: ${triageResult.error}`;
        logger.error(error);
        return { success: false, discoveredDocs, error };
      }

      // Debug mode: save raw output
      if (this.debug) {
        const debugPath = path.join(this.config.rootDir, '.pkf-debug-triage.txt');
        await fs.writeFile(debugPath, triageResult.output, 'utf-8');
        logger.info(`Debug: saved raw triage output to ${debugPath}`);
      }

      // Add actual tokens from API response
      this.ui.addTokens(
        triageResult.inputTokens || 0,
        triageResult.outputTokens || 0,
        triageResult.cacheCreationTokens,
        triageResult.cacheReadTokens
      );

      // Parse triage response
      const triageResponse = this.parseTriageResponse(triageResult.output);
      let inspectionResults: InspectionResult[] = [];
      let blueprintYaml: string | null = null;

      // Check if agent went straight to blueprint or returned triage
      if (triageResponse) {
        const filesToInspect = triageResponse.files_to_inspect || [];
        this.ui.log(
          `Triage: ${filesToInspect.length} files to inspect, ` +
          `${triageResponse.quick_classifications?.length || 0} quick-classified`
        );

        // Step 2: Run parallel inspections if needed
        if (filesToInspect.length > 0) {
          this.ui.nextStep();
          this.ui.setProgress(0, filesToInspect.length);

          inspectionResults = await this.runParallelInspections(
            filesToInspect,
            discoveredDocs
          );

          const successfulInspections = inspectionResults.filter((r) => r.success);
          this.ui.log(`Inspections: ${successfulInspections.length}/${filesToInspect.length} completed`);

          // Step 3: Synthesis phase - generate final blueprint with inspection results
          this.ui.nextStep();
          this.ui.startStreaming('Blueprint Synthesis');
          const synthesisContext = await this.buildSynthesisContext(
            discoveredDocs,
            triageResponse,
            inspectionResults
          );

          const synthesisResult = await this.orchestrator.singleAgentTask(
            ANALYSIS_AGENT,
            synthesisContext
          );
          this.ui.endStreaming();

          if (!synthesisResult.success) {
            this.orchestrator.setStreamCallback(undefined);
            this.ui.stop();
            const error = `Synthesis failed: ${synthesisResult.error}`;
            logger.error(error);
            return { success: false, discoveredDocs, error };
          }

          // Debug mode: save raw synthesis output
          if (this.debug) {
            const debugPath = path.join(this.config.rootDir, '.pkf-debug-synthesis.txt');
            await fs.writeFile(debugPath, synthesisResult.output, 'utf-8');
            logger.info(`Debug: saved raw synthesis output to ${debugPath}`);
          }

          // Add actual tokens from API response
          this.ui.addTokens(
            synthesisResult.inputTokens || 0,
            synthesisResult.outputTokens || 0,
            synthesisResult.cacheCreationTokens,
            synthesisResult.cacheReadTokens
          );
          blueprintYaml = this.extractBlueprint(synthesisResult.output);
        } else {
          // No files to inspect - skip to synthesis
          this.ui.nextStep(); // Skip inspect
          this.ui.nextStep(); // Go to synthesize
          blueprintYaml = this.extractBlueprint(triageResult.output);
        }
      } else {
        // Agent went straight to blueprint mode
        this.ui.nextStep(); // Skip inspect
        this.ui.nextStep(); // Go to synthesize
        blueprintYaml = this.extractBlueprint(triageResult.output);
      }

      // Step 4: Validate blueprint
      this.ui.nextStep();

      if (!blueprintYaml) {
        this.ui.stop();
        const error = 'Failed to extract blueprint YAML from agent response';
        logger.error(error);
        return { success: false, discoveredDocs, error };
      }

      if (!this.validateBlueprint(blueprintYaml)) {
        this.ui.stop();
        // Save failed blueprint for debugging
        try {
          const debugPath = path.join(this.config.rootDir, '.pkf-blueprint-debug.yaml');
          await fs.writeFile(debugPath, blueprintYaml, 'utf-8');
          logger.debug(`Saved failed blueprint to: ${debugPath}`);
        } catch {
          // Ignore save errors
        }
        const error = 'Blueprint validation failed: missing required fields';
        logger.error(error);
        logger.error('Run with -v flag to see debug output, or check .pkf-blueprint-debug.yaml');
        return { success: false, blueprint: blueprintYaml, discoveredDocs, error };
      }

      // Save blueprint
      const blueprintPath = await saveBlueprintToFile(blueprintYaml, this.config.rootDir);

      // Clean up streaming and stop UI before interactive prompts
      this.orchestrator.setStreamCallback(undefined);
      this.ui.stop();

      // Show summary
      const summary = extractBlueprintSummary(blueprintYaml);
      if (summary) {
        displayBlueprintSummary(summary, blueprintPath);
      } else {
        logger.info(`Blueprint saved to: ${blueprintPath}`);
      }

      // Interactive approval
      let finalBlueprint = blueprintYaml;
      const approval = await this.interactive.approveBlueprint(blueprintYaml);

      if (!approval.approved) {
        const error = 'Blueprint rejected by user';
        logger.warn(error);
        return { success: false, blueprint: blueprintYaml, discoveredDocs, error };
      }

      if (approval.edited) {
        logger.info('Using user-edited blueprint');
        finalBlueprint = approval.edited;
        await saveBlueprintToFile(finalBlueprint, this.config.rootDir);
      }

      // Save checkpoint
      await this.stateManager.checkpoint(
        WorkflowStage.ANALYZING,
        'Analysis stage completed',
        {
          blueprint: finalBlueprint,
          discoveredDocs: discoveredDocs.map((d) => d.relativePath),
          docCount: discoveredDocs.length,
          inspectedCount: inspectionResults.filter((r) => r.success).length,
        }
      );

      logger.success('Analysis stage completed');

      return {
        success: true,
        blueprint: finalBlueprint,
        discoveredDocs,
      };
    } catch (err) {
      this.orchestrator.setStreamCallback(undefined);
      this.ui.stop();
      const error = err instanceof Error ? err.message : String(err);
      logger.error(`Analysis stage failed: ${error}`);
      return { success: false, discoveredDocs: [], error };
    }
  }

  /**
   * Build context for triage mode
   */
  private async buildTriageContext(docs: DiscoveredDoc[]): Promise<string> {
    const docList = docs
      .map((doc) => {
        const sizeKb = (doc.size / 1024).toFixed(1);
        const lines = Math.round(doc.size / 50); // Rough line estimate
        const frontmatter = doc.hasYamlFrontmatter ? ' [FM]' : '';
        return `- ${doc.relativePath} (${sizeKb} KB, ~${lines} lines)${frontmatter}`;
      })
      .join('\n');

    // Build samples from key files in parallel
    const keyDocs = KEY_FILES.map((keyFile) =>
      docs.find((d) => d.relativePath === keyFile || d.relativePath.endsWith(`/${keyFile}`))
    ).filter((doc): doc is DiscoveredDoc => doc !== undefined);

    const sampleResults = await Promise.allSettled(
      keyDocs.map(async (doc) => {
        const content = await fs.readFile(doc.path, 'utf-8');
        const sample = content.slice(0, SAMPLE_CHAR_LIMIT);
        const truncated = content.length > SAMPLE_CHAR_LIMIT ? '...' : '';
        return `### ${doc.relativePath}\n\`\`\`\n${sample}${truncated}\n\`\`\``;
      })
    );

    const samples = sampleResults
      .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
      .map((result) => result.value);

    return `You are in TRIAGE MODE. Review the documentation files and identify which ones need detailed inspection.

## Repository Information
- Root directory: ${this.config.rootDir}
- Docs directory: ${this.config.docsDir}
- Total documentation files: ${docs.length}

## Discovered documentation files:
${docList || '(No documentation files found)'}

## Sample content from key files:
${samples.join('\n\n') || '(No samples available)'}

## Instructions
1. Review all discovered files
2. Identify files that need DETAILED INSPECTION (complex, unclear, important)
3. Quick-classify files that are obvious (CHANGELOG, simple configs, etc.)
4. Output a triage YAML with files_to_inspect, quick_classifications, and initial_observations

Files needing inspection: README files, API docs, architecture docs, guides, anything large or unclear.
Quick-classify: CHANGELOG, LICENSE, simple templates, obvious single-purpose files.

Output your response in a \`\`\`yaml code block with mode: triage`;
  }

  /**
   * Parse triage response from agent
   */
  private parseTriageResponse(response: string): TriageResponse | null {
    const yamlContent = this.extractBlueprint(response);
    if (!yamlContent) return null;

    try {
      const parsed = safeLoad(yamlContent) as Record<string, unknown>;
      if (parsed?.mode === 'triage') {
        return parsed as unknown as TriageResponse;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Run parallel document inspections
   */
  private async runParallelInspections(
    filesToInspect: FileToInspect[],
    discoveredDocs: DiscoveredDoc[]
  ): Promise<InspectionResult[]> {
    const results: InspectionResult[] = [];

    // Build inspection tasks
    const tasks: Array<{ agentName: string; prompt: string; id: string }> = [];

    for (const file of filesToInspect) {
      const doc = discoveredDocs.find((d) => d.relativePath === file.path);
      if (!doc) {
        results.push({
          path: file.path,
          success: false,
          error: 'File not found in discovered docs',
        });
        continue;
      }

      try {
        const content = await fs.readFile(doc.path, 'utf-8');
        const prompt = this.buildInspectionPrompt(file.path, content, file.reason);
        tasks.push({
          agentName: INSPECTOR_AGENT,
          prompt,
          id: file.path,
        });
      } catch (err) {
        results.push({
          path: file.path,
          success: false,
          error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    if (tasks.length === 0) {
      return results;
    }

    // Run parallel inspections with progress reporting via UI
    const taskResults = await this.orchestrator.parallelAgentTasks(
      tasks,
      this.pkfConfig.analysis.maxParallelInspections,
      (completed, total, lastId) => {
        this.ui.setProgress(completed, total);
        if (lastId) {
          this.ui.setCurrentFile(lastId);
        }
      }
    );

    // Process results and track tokens
    for (const taskResult of taskResults) {
      // Track tokens from each inspection (including cache tokens)
      this.ui.addTokens(
        taskResult.inputTokens || 0,
        taskResult.outputTokens || 0,
        taskResult.cacheCreationTokens,
        taskResult.cacheReadTokens
      );

      if (taskResult.success) {
        results.push({
          path: taskResult.id || '',
          success: true,
          analysis: taskResult.output,
        });
      } else {
        results.push({
          path: taskResult.id || '',
          success: false,
          error: taskResult.error,
        });
      }
    }

    return results;
  }

  /**
   * Build prompt for document inspector
   */
  private buildInspectionPrompt(filePath: string, content: string, reason: string): string {
    return `Inspect this document and provide detailed analysis.

## File Information
- Path: ${filePath}
- Inspection reason: ${reason}

## Document Content
\`\`\`
${content}
\`\`\`

## Instructions
Analyze this document and output a YAML block with:
- path, title, type, confidence
- structure (sections, code_blocks, links)
- frontmatter analysis
- complexity and migration_effort
- quality_issues
- notes

Output ONLY the YAML block in a \`\`\`yaml code block.`;
  }

  /**
   * Build context for synthesis mode with inspection results
   */
  private async buildSynthesisContext(
    docs: DiscoveredDoc[],
    triage: TriageResponse,
    inspections: InspectionResult[]
  ): Promise<string> {
    // Build quick classifications section
    const quickClassifications = (triage.quick_classifications || [])
      .map((c) => `- ${c.path}: ${c.type} (confidence: ${c.confidence})`)
      .join('\n');

    // Build inspection results section
    const inspectionDetails = inspections
      .filter((i) => i.success && i.analysis)
      .map((i) => `### ${i.path}\n${i.analysis}`)
      .join('\n\n');

    const failedInspections = inspections
      .filter((i) => !i.success)
      .map((i) => `- ${i.path}: ${i.error}`)
      .join('\n');

    return `You are in SYNTHESIS MODE. Generate the final PKF blueprint using the inspection results.

## Repository Information
- Root directory: ${this.config.rootDir}
- Total documentation files: ${docs.length}

## Quick Classifications (from triage)
${quickClassifications || '(none)'}

## Initial Observations
${(triage.initial_observations || []).map((o) => `- ${o}`).join('\n') || '(none)'}

## Detailed Inspection Results
${inspectionDetails || '(no successful inspections)'}

${failedInspections ? `## Failed Inspections\n${failedInspections}` : ''}

## Instructions
Using the inspection results and quick classifications, generate the FINAL PKF blueprint.

Include:
- analysis_summary: total docs, inspected count, frontmatter count, migration complexity
- discovered_documents: ALL documents with type, title, complexity, migration_effort
- recommended_structure: docs_root and directory structure
- recommended_types: PKF document type schemas based on discovered types
- migration_plan: phased approach based on complexity
- warnings: missing docs, quality issues found

IMPORTANT:
- This is SYNTHESIS MODE - generate the complete blueprint
- Use inspection results for accurate classification
- Include ALL documents (inspected + quick-classified)
- Wrap output in a \`\`\`yaml code block`;
  }

  /**
   * Scan repository for documentation files
   *
   * Scans recursively from project root for all markdown files,
   * excluding common non-documentation directories.
   * Uses parallel processing for improved performance.
   *
   * @returns List of discovered documentation files with metadata
   */
  private async scanRepository(): Promise<DiscoveredDoc[]> {
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

    // Scan all documentation formats in parallel
    const patterns = ['**/*.md', '**/*.mdx', '**/*.rst', '**/*.txt'];
    const globResults = await Promise.all(
      patterns.map((pattern) =>
        glob(path.join(this.config.rootDir, pattern), {
          nodir: true,
          ignore: ignorePatterns,
        })
      )
    );

    // Flatten all file paths and deduplicate
    const allFiles = globResults.flat();
    const uniqueFiles = allFiles.filter((filePath) => {
      if (seenPaths.has(filePath)) return false;
      seenPaths.add(filePath);
      return true;
    });

    // Process all files in parallel (batch to avoid overwhelming the system)
    const batchSize = 50; // Process 50 files at a time
    const docs: DiscoveredDoc[] = [];

    for (let i = 0; i < uniqueFiles.length; i += batchSize) {
      const batch = uniqueFiles.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((filePath) => this.createDiscoveredDoc(filePath))
      );
      docs.push(...batchResults.filter((doc): doc is DiscoveredDoc => doc !== null));
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
    // Look for common blueprint top-level keys
    const lines = response.split('\n');
    const yamlStartPatterns = [
      /^analysis:/,
      /^# PKF Blueprint/,
      /^recommendations:/,
      /^document_types:/,
      /^discovered_documents:/,
      /^migration_plan:/,
      /^analysis_summary:/,
    ];

    const startIndex = lines.findIndex((line) =>
      yamlStartPatterns.some((pattern) => pattern.test(line.trim()))
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

    // Last resort: try to parse the entire response as YAML if it looks like YAML
    // Check if the response has multiple lines with key: value patterns
    const yamlLikeLines = lines.filter((line) => /^\s*[\w_-]+:/.test(line));
    if (yamlLikeLines.length >= 3) {
      // Find first YAML-like line and extract from there
      const firstYamlLine = lines.findIndex((line) => /^[\w_-]+:/.test(line.trim()));
      if (firstYamlLine >= 0) {
        const yamlContent = lines.slice(firstYamlLine).join('\n').trim();
        if (yamlContent.length > 50) {
          logger.debug('Extracted YAML using fallback pattern matching');
          return yamlContent;
        }
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
      const parsed = safeLoad(yamlContent) as Record<string, unknown>;

      if (!parsed || typeof parsed !== 'object') {
        logger.debug('Blueprint is not a valid object');
        return false;
      }

      // Accept any of these field sets - agent may use different naming
      const validFieldSets = [
        // Original expected format
        ['analysis', 'recommendations', 'document_types', 'migration_plan'],
        // Agent output format
        ['analysis_summary', 'discovered_documents', 'recommended_structure', 'migration_plan'],
        // Minimal valid format
        ['discovered_documents'],
        ['analysis_summary'],
        ['analysis'],
      ];

      const presentFields = Object.keys(parsed);

      // Check if any valid field set is satisfied (at least one field present)
      const hasValidStructure = validFieldSets.some((fieldSet) =>
        fieldSet.some((field) => field in parsed)
      );

      if (!hasValidStructure) {
        logger.debug(`Blueprint has no recognized fields. Found: ${presentFields.join(', ')}`);
        logger.debug(`Expected one of: discovered_documents, analysis_summary, analysis, recommendations, document_types, migration_plan`);
        logger.debug(`Blueprint preview (first 500 chars): ${yamlContent.substring(0, 500)}`);
        return false;
      }

      // Log what we found for debugging
      logger.debug(`Blueprint contains fields: ${presentFields.join(', ')}`);

      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.debug(`YAML parse error: ${error}`);
      logger.debug(`Raw content preview (first 500 chars): ${yamlContent.substring(0, 500)}`);
      return false;
    }
  }
}

export default AnalysisStage;
