/**
 * PKF Init Time Estimator and Dry Run Report
 * Utilities for estimating workflow time and generating dry-run reports
 */

import { glob } from 'glob';
import { readFile } from 'node:fs/promises';
import chalk from 'chalk';
import path from 'node:path';
import type { DryRunEstimate, LoadedConfig } from '../types/index.js';
import { AnthropicClient } from '../api/anthropic-client.js';

/**
 * Base estimates per stage (in minutes)
 */
const STAGE_BASE_ESTIMATES = {
  analysis: 3, // Base time for analysis
  design: 8, // Base time for schema design (multi-turn conversation)
  implementation: 2, // Base time for structure generation
  migration: 0.5, // Base time per document for migration
};

/**
 * Model pricing per million tokens (matches cost-tracker.ts)
 */
const MODEL_PRICING = {
  sonnet: { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  haiku: { inputPerMillion: 0.8, outputPerMillion: 4.0 },
};

/**
 * Token estimates per stage
 */
const TOKEN_ESTIMATES = {
  analysis: { input: 2000, output: 4000, model: 'sonnet' as const },
  design: { input: 3000, output: 5000, iterations: 3, model: 'sonnet' as const },
  implementation: { input: 1000, output: 3000, model: 'haiku' as const },
  migration: { inputBase: 500, output: 1000, model: 'haiku' as const },
};

/**
 * Static utility class for estimating workflow time
 */
export class TimeEstimator {
  /**
   * Estimate analysis time in minutes
   * Formula: base + (fileCount * 0.1) - more files take longer to scan
   * @param fileCount - Number of files to analyze
   * @returns Estimated time in minutes
   */
  static estimateAnalysis(fileCount: number): number {
    return STAGE_BASE_ESTIMATES.analysis + fileCount * 0.1;
  }

  /**
   * Estimate schema design time
   * @param complexity - Project complexity level
   * @returns Estimated time in minutes
   */
  static estimateDesign(complexity: 'low' | 'medium' | 'high'): number {
    const multipliers = {
      low: 0.7,
      medium: 1.0,
      high: 1.5,
    };
    return STAGE_BASE_ESTIMATES.design * multipliers[complexity];
  }

  /**
   * Estimate migration time
   * Formula: (docCount * basePerDoc) / workers
   * @param docCount - Number of documents to migrate
   * @param workers - Number of parallel workers
   * @returns Estimated time in minutes
   */
  static estimateMigration(docCount: number, workers: number): number {
    if (docCount === 0 || workers === 0) {
      return 0;
    }
    return (docCount * STAGE_BASE_ESTIMATES.migration) / workers;
  }

  /**
   * Estimate total time breakdown by stage
   * @param options - Estimation options
   * @returns Time breakdown by stage in minutes
   */
  static estimateTotal(options: {
    fileCount: number;
    docCount: number;
    complexity: 'low' | 'medium' | 'high';
    workers: number;
  }): DryRunEstimate['timeBreakdown'] {
    return {
      analysis: TimeEstimator.estimateAnalysis(options.fileCount),
      design: TimeEstimator.estimateDesign(options.complexity),
      implementation: STAGE_BASE_ESTIMATES.implementation,
      migration: TimeEstimator.estimateMigration(options.docCount, options.workers),
    };
  }
}

/**
 * Generates and displays dry-run reports
 */
export class DryRunReport {
  private config: LoadedConfig;
  private client: AnthropicClient | null = null;

  /**
   * Create a new DryRunReport
   * @param config - Loaded configuration
   * @param apiKey - Optional API key for accurate token counting
   */
  constructor(config: LoadedConfig, apiKey?: string) {
    this.config = config;
    if (apiKey) {
      this.client = new AnthropicClient(apiKey, { useOAuth: config.useOAuth });
    }
  }

  /**
   * Count tokens using the API (more accurate than heuristics)
   * Falls back to heuristic if API unavailable
   * @param content - Content to count tokens for
   * @param model - Model to count for
   * @returns Token count
   */
  private async countTokens(content: string, model: string = 'claude-sonnet-4-5-20250929'): Promise<number> {
    if (!this.client) {
      // Heuristic: ~4 characters per token for English text
      return Math.ceil(content.length / 4);
    }

    try {
      const result = await this.client.countTokens({
        model,
        systemPrompt: '',
        messages: [{ role: 'user', content }],
      });
      return result.inputTokens;
    } catch {
      // Fall back to heuristic
      return Math.ceil(content.length / 4);
    }
  }

  /**
   * Count tokens for a file
   * @param filePath - Path to file
   * @returns Token count
   */
  private async countFileTokens(filePath: string): Promise<number> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return this.countTokens(content);
    } catch {
      // Assume average document size
      return 1000;
    }
  }

  /**
   * Calculate cost for given token usage
   */
  private calculateCost(
    model: 'sonnet' | 'haiku',
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing = MODEL_PRICING[model];
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
    return inputCost + outputCost;
  }

  /**
   * Estimate average document size in tokens (heuristic fallback)
   */
  private estimateDocSize(): number {
    // Average markdown document is about 500-2000 tokens
    // Use 1000 as a middle estimate
    return 1000;
  }

  /**
   * Calculate actual document tokens if API is available
   * @param markdownFiles - List of markdown file paths
   * @returns Total tokens across all documents
   */
  private async calculateActualDocTokens(markdownFiles: string[]): Promise<number> {
    if (!this.client || markdownFiles.length === 0) {
      return markdownFiles.length * this.estimateDocSize();
    }

    // Sample up to 10 files for accurate estimate
    const sampleSize = Math.min(10, markdownFiles.length);
    const sample = markdownFiles.slice(0, sampleSize);

    let totalSampleTokens = 0;
    for (const file of sample) {
      totalSampleTokens += await this.countFileTokens(file);
    }

    // Extrapolate to all files
    const avgTokensPerFile = totalSampleTokens / sampleSize;
    return Math.round(avgTokensPerFile * markdownFiles.length);
  }

  /**
   * Determine project complexity based on file count and structure
   */
  private determineComplexity(fileCount: number, docTypes: string[]): 'low' | 'medium' | 'high' {
    if (fileCount > 50 || docTypes.length > 10) {
      return 'high';
    }
    if (fileCount > 20 || docTypes.length > 5) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Extract document type from file path (use parent directory name)
   */
  private getDocType(filePath: string): string {
    const dir = path.dirname(filePath);
    const dirName = path.basename(dir);
    // If it's directly in docs folder, use filename without extension
    if (dirName === 'docs' || dirName === '.') {
      return path.basename(filePath, path.extname(filePath)).toLowerCase();
    }
    return dirName.toLowerCase();
  }

  /**
   * Analyze project and generate estimate
   * @param rootDir - Root directory to analyze
   * @returns Dry run estimate
   */
  async analyze(rootDir: string): Promise<DryRunEstimate> {
    // Directories to exclude from scanning
    const excludeDirs = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.next/**',
      '**/.nuxt/**',
      '**/.cache/**',
      '**/.turbo/**',
      '**/vendor/**',
      '**/__pycache__/**',
      '**/.venv/**',
      '**/venv/**',
    ];

    // Scan for ALL markdown files in entire repository
    const pattern = path.join(rootDir, '**/*.md');

    let markdownFiles: string[] = [];
    try {
      markdownFiles = await glob(pattern, {
        nodir: true,
        ignore: excludeDirs,
      });
    } catch {
      // If glob fails, assume empty
      markdownFiles = [];
    }

    const docCount = markdownFiles.length;

    // Count total files (including non-markdown for analysis scope)
    let allFiles: string[] = [];
    try {
      const allPattern = path.join(rootDir, '**/*');
      allFiles = await glob(allPattern, {
        nodir: true,
        ignore: excludeDirs,
      });
    } catch {
      allFiles = [];
    }
    const fileCount = allFiles.length;

    // Determine document types by directory
    const docTypeSet = new Set<string>();
    for (const file of markdownFiles) {
      const docType = this.getDocType(file);
      docTypeSet.add(docType);
    }
    const documentTypes = Array.from(docTypeSet).sort();

    // Determine complexity
    const complexity = this.determineComplexity(fileCount, documentTypes);

    // Calculate cost estimates
    const analysisCost = this.calculateCost(
      TOKEN_ESTIMATES.analysis.model,
      TOKEN_ESTIMATES.analysis.input,
      TOKEN_ESTIMATES.analysis.output
    );

    const designCost = this.calculateCost(
      TOKEN_ESTIMATES.design.model,
      TOKEN_ESTIMATES.design.input * TOKEN_ESTIMATES.design.iterations,
      TOKEN_ESTIMATES.design.output * TOKEN_ESTIMATES.design.iterations
    );

    const implementationCost = this.calculateCost(
      TOKEN_ESTIMATES.implementation.model,
      TOKEN_ESTIMATES.implementation.input,
      TOKEN_ESTIMATES.implementation.output
    );

    const docSize = this.estimateDocSize();
    const migrationCost =
      docCount > 0
        ? this.calculateCost(
            TOKEN_ESTIMATES.migration.model,
            (TOKEN_ESTIMATES.migration.inputBase + docSize) * docCount,
            TOKEN_ESTIMATES.migration.output * docCount
          )
        : 0;

    // Calculate token estimates
    const analysisTokens = TOKEN_ESTIMATES.analysis.input + TOKEN_ESTIMATES.analysis.output;
    const designTokens =
      (TOKEN_ESTIMATES.design.input + TOKEN_ESTIMATES.design.output) *
      TOKEN_ESTIMATES.design.iterations;
    const implementationTokens =
      TOKEN_ESTIMATES.implementation.input + TOKEN_ESTIMATES.implementation.output;
    const migrationTokens =
      docCount > 0
        ? (TOKEN_ESTIMATES.migration.inputBase + docSize + TOKEN_ESTIMATES.migration.output) *
          docCount
        : 0;

    const estimatedTokens =
      analysisTokens + designTokens + implementationTokens + migrationTokens;

    // Calculate time estimates
    const timeBreakdown = TimeEstimator.estimateTotal({
      fileCount,
      docCount,
      complexity,
      workers: this.config.workers,
    });

    const estimatedTimeMinutes =
      timeBreakdown.analysis +
      timeBreakdown.design +
      timeBreakdown.implementation +
      timeBreakdown.migration;

    return {
      estimatedCost: analysisCost + designCost + implementationCost + migrationCost,
      costBreakdown: {
        analysis: analysisCost,
        design: designCost,
        implementation: implementationCost,
        migration: migrationCost,
      },
      estimatedTimeMinutes,
      timeBreakdown,
      estimatedTokens,
      documentsToMigrate: docCount,
      documentTypes,
    };
  }

  /**
   * Format cost as USD string
   */
  private formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
  }

  /**
   * Format time in minutes/seconds
   */
  private formatTime(minutes: number): string {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    }
    if (minutes < 60) {
      return `${minutes.toFixed(1)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  }

  /**
   * Display formatted report to console
   * @param estimate - The dry run estimate to display
   */
  displayReport(estimate: DryRunEstimate): void {
    console.log();
    console.log(chalk.bold.cyan('===================================='));
    console.log(chalk.bold.cyan('       PKF Init Dry Run Report      '));
    console.log(chalk.bold.cyan('===================================='));
    console.log();

    // Summary section
    console.log(chalk.bold.white('Summary'));
    console.log(chalk.gray('─'.repeat(36)));
    console.log(`  Documents to migrate: ${chalk.yellow(estimate.documentsToMigrate)}`);
    console.log(`  Document types found: ${chalk.yellow(estimate.documentTypes.length)}`);
    console.log(`  Estimated tokens:     ${chalk.yellow(estimate.estimatedTokens.toLocaleString())}`);
    console.log();

    // Cost breakdown section
    console.log(chalk.bold.white('Cost Breakdown'));
    console.log(chalk.gray('─'.repeat(36)));
    console.log(
      `  Analysis:       ${chalk.green(this.formatCost(estimate.costBreakdown.analysis).padStart(10))}`
    );
    console.log(
      `  Design:         ${chalk.green(this.formatCost(estimate.costBreakdown.design).padStart(10))}`
    );
    console.log(
      `  Implementation: ${chalk.green(this.formatCost(estimate.costBreakdown.implementation).padStart(10))}`
    );
    console.log(
      `  Migration:      ${chalk.green(this.formatCost(estimate.costBreakdown.migration).padStart(10))}`
    );
    console.log(chalk.gray('─'.repeat(36)));
    console.log(
      `  ${chalk.bold('Total:')}          ${chalk.bold.green(this.formatCost(estimate.estimatedCost).padStart(10))}`
    );
    console.log();

    // Time breakdown section
    console.log(chalk.bold.white('Time Breakdown'));
    console.log(chalk.gray('─'.repeat(36)));
    console.log(
      `  Analysis:       ${chalk.blue(this.formatTime(estimate.timeBreakdown.analysis).padStart(10))}`
    );
    console.log(
      `  Design:         ${chalk.blue(this.formatTime(estimate.timeBreakdown.design).padStart(10))}`
    );
    console.log(
      `  Implementation: ${chalk.blue(this.formatTime(estimate.timeBreakdown.implementation).padStart(10))}`
    );
    console.log(
      `  Migration:      ${chalk.blue(this.formatTime(estimate.timeBreakdown.migration).padStart(10))}`
    );
    console.log(chalk.gray('─'.repeat(36)));
    console.log(
      `  ${chalk.bold('Total:')}          ${chalk.bold.blue(this.formatTime(estimate.estimatedTimeMinutes).padStart(10))}`
    );
    console.log();

    // Document types section
    if (estimate.documentTypes.length > 0) {
      console.log(chalk.bold.white('Document Types Found'));
      console.log(chalk.gray('─'.repeat(36)));
      for (const docType of estimate.documentTypes) {
        console.log(`  ${chalk.magenta('•')} ${docType}`);
      }
      console.log();
    }

    // Footer
    console.log(chalk.gray('─'.repeat(36)));
    console.log(chalk.gray('Note: Estimates based on typical usage patterns.'));
    console.log(chalk.gray('Actual costs may vary based on content complexity.'));
    console.log();
  }
}

export default TimeEstimator;
