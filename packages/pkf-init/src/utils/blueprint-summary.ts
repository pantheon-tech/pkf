/**
 * Blueprint Summary Generator
 * Creates concise summaries of PKF blueprints for terminal display
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import * as yaml from 'js-yaml';

/**
 * Parsed blueprint structure
 */
interface ParsedBlueprint {
  analysis?: {
    total_documents?: number;
    with_frontmatter?: number;
    migration_complexity?: {
      low?: number;
      medium?: number;
      high?: number;
    };
  };
  analysis_summary?: {
    total_documents?: number;
    with_frontmatter?: number;
    migration_complexity?: {
      low?: number;
      medium?: number;
      high?: number;
    };
  };
  discovered_documents?: Array<{
    path: string;
    type: string;
    title?: string;
  }>;
  document_types?: Array<{
    name: string;
    count?: number;
  }> | Record<string, unknown>;
  recommendations?: Array<{
    category?: string;
    suggestion?: string;
    priority?: string;
  }> | Record<string, unknown>;
  recommended_types?: Array<{
    name: string;
    description?: string;
  }>;
  migration_plan?: Record<string, unknown>;
  warnings?: Array<{
    type?: string;
    message?: string;
  }>;
}

/**
 * Blueprint summary for display
 */
export interface BlueprintSummary {
  /** Total documents found */
  totalDocuments: number;
  /** Documents with existing frontmatter */
  withFrontmatter: number;
  /** Document types with counts */
  documentTypes: Map<string, number>;
  /** Top recommendations */
  topRecommendations: string[];
  /** Overall migration complexity */
  migrationComplexity: 'low' | 'medium' | 'high';
  /** Any warnings */
  warnings: string[];
}

/**
 * Extract summary from blueprint YAML
 * @param blueprintYaml - Raw YAML string
 * @returns BlueprintSummary or null if parsing fails
 */
export function extractBlueprintSummary(blueprintYaml: string): BlueprintSummary | null {
  try {
    const parsed = yaml.load(blueprintYaml) as ParsedBlueprint;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    // Extract document count
    const analysis = parsed.analysis || parsed.analysis_summary || {};
    const totalDocuments = analysis.total_documents ??
      parsed.discovered_documents?.length ?? 0;
    const withFrontmatter = analysis.with_frontmatter ?? 0;

    // Extract document types
    const documentTypes = new Map<string, number>();

    if (parsed.discovered_documents) {
      for (const doc of parsed.discovered_documents) {
        const type = doc.type || 'unknown';
        documentTypes.set(type, (documentTypes.get(type) || 0) + 1);
      }
    } else if (parsed.document_types) {
      if (Array.isArray(parsed.document_types)) {
        for (const dt of parsed.document_types) {
          documentTypes.set(dt.name, dt.count ?? 1);
        }
      }
    }

    // Extract recommendations
    const topRecommendations: string[] = [];
    if (parsed.recommendations) {
      if (Array.isArray(parsed.recommendations)) {
        const sorted = [...parsed.recommendations]
          .filter(r => r.suggestion)
          .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            const aP = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
            const bP = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
            return aP - bP;
          });
        for (const rec of sorted.slice(0, 5)) {
          if (rec.suggestion) {
            topRecommendations.push(rec.suggestion);
          }
        }
      }
    }

    // Determine migration complexity
    let migrationComplexity: 'low' | 'medium' | 'high' = 'medium';
    if (analysis.migration_complexity) {
      const mc = analysis.migration_complexity;
      const high = mc.high ?? 0;
      const medium = mc.medium ?? 0;
      const low = mc.low ?? 0;
      if (high > medium && high > low) {
        migrationComplexity = 'high';
      } else if (low > medium && low > high) {
        migrationComplexity = 'low';
      }
    } else if (totalDocuments < 10) {
      migrationComplexity = 'low';
    } else if (totalDocuments > 50) {
      migrationComplexity = 'high';
    }

    // Extract warnings
    const warnings: string[] = [];
    if (parsed.warnings) {
      for (const warn of parsed.warnings) {
        if (warn.message) {
          warnings.push(warn.message);
        }
      }
    }

    return {
      totalDocuments,
      withFrontmatter,
      documentTypes,
      topRecommendations,
      migrationComplexity,
      warnings,
    };
  } catch {
    return null;
  }
}

/**
 * Display blueprint summary to console
 * @param summary - BlueprintSummary to display
 * @param blueprintPath - Path where full blueprint was saved
 */
export function displayBlueprintSummary(
  summary: BlueprintSummary,
  blueprintPath: string
): void {
  console.log();
  console.log(chalk.bold.cyan('═══ Blueprint Summary ═══'));
  console.log();

  // Document stats
  console.log(chalk.bold.white('Documents'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`  Found:          ${chalk.yellow(summary.totalDocuments)}`);
  console.log(`  With frontmatter: ${chalk.yellow(summary.withFrontmatter)}`);
  console.log(`  Need migration:   ${chalk.yellow(summary.totalDocuments - summary.withFrontmatter)}`);
  console.log();

  // Document types
  if (summary.documentTypes.size > 0) {
    console.log(chalk.bold.white('Document Types'));
    console.log(chalk.gray('─'.repeat(40)));

    // Sort by count descending
    const sortedTypes = [...summary.documentTypes.entries()]
      .sort((a, b) => b[1] - a[1]);

    for (const [type, count] of sortedTypes.slice(0, 8)) {
      const bar = '█'.repeat(Math.min(count, 20));
      console.log(`  ${chalk.magenta(type.padEnd(15))} ${chalk.dim(bar)} ${count}`);
    }
    if (sortedTypes.length > 8) {
      console.log(chalk.dim(`  ... and ${sortedTypes.length - 8} more types`));
    }
    console.log();
  }

  // Recommendations
  if (summary.topRecommendations.length > 0) {
    console.log(chalk.bold.white('Top Recommendations'));
    console.log(chalk.gray('─'.repeat(40)));
    for (const rec of summary.topRecommendations.slice(0, 5)) {
      console.log(`  ${chalk.green('•')} ${rec}`);
    }
    console.log();
  }

  // Warnings
  if (summary.warnings.length > 0) {
    console.log(chalk.bold.yellow('Warnings'));
    console.log(chalk.gray('─'.repeat(40)));
    for (const warn of summary.warnings.slice(0, 3)) {
      console.log(`  ${chalk.yellow('⚠')} ${warn}`);
    }
    console.log();
  }

  // Migration complexity
  const complexityColors = {
    low: chalk.green,
    medium: chalk.yellow,
    high: chalk.red,
  };
  console.log(chalk.bold.white('Migration Complexity'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`  ${complexityColors[summary.migrationComplexity](summary.migrationComplexity.toUpperCase())}`);
  console.log();

  // File path
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`Full blueprint saved to: ${chalk.cyan(blueprintPath)}`);
  console.log();
}

/**
 * Save blueprint to file and return the path
 * @param blueprintYaml - Raw YAML content
 * @param rootDir - Project root directory
 * @returns Path where blueprint was saved
 */
export async function saveBlueprintToFile(
  blueprintYaml: string,
  rootDir: string
): Promise<string> {
  const blueprintPath = path.join(rootDir, '.pkf-init-blueprint.yaml');

  // Add header comment
  const content = `# PKF Initialization Blueprint
# Generated by pkf-init
# This file contains the full analysis of your documentation structure
# Review and edit as needed before proceeding with schema design

${blueprintYaml}
`;

  await fs.writeFile(blueprintPath, content, 'utf-8');
  return blueprintPath;
}

export default {
  extractBlueprintSummary,
  displayBlueprintSummary,
  saveBlueprintToFile,
};
