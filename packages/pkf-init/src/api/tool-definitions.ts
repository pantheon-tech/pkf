/**
 * Tool Definitions for Structured Output
 *
 * These tools allow Claude to output structured JSON instead of free-form text,
 * eliminating YAML parsing errors and guaranteeing schema conformance.
 */

import type Anthropic from '@anthropic-ai/sdk';

/**
 * Document classification from triage
 */
export interface QuickClassification {
  path: string;
  type: string;
  confidence: number;
  has_frontmatter?: boolean;
  complexity?: 'simple' | 'medium' | 'complex';
  migration_effort?: 'low' | 'medium' | 'high';
}

/**
 * File to inspect
 */
export interface FileToInspect {
  path: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Triage result from analyst
 */
export interface TriageResult {
  files_to_inspect: FileToInspect[];
  quick_classifications: QuickClassification[];
  initial_observations: string[];
}

/**
 * Discovered document in blueprint
 */
export interface DiscoveredDocument {
  path: string;
  target_path: string;
  type: string;
  title: string;
  has_frontmatter: boolean;
  complexity: 'simple' | 'medium' | 'complex';
  migration_effort: 'low' | 'medium' | 'high';
  sections?: string[];
  notes?: string;
  inspection_confidence?: number;
}

/**
 * Recommended directory structure
 */
export interface RecommendedStructure {
  docs_root: string;
  directories: Array<{
    path: string;
    purpose: string;
  }>;
}

/**
 * Recommended document type
 */
export interface RecommendedType {
  name: string;
  extends?: string;
  description: string;
  fields?: Array<{
    name: string;
    type: string;
    values?: string[];
  }>;
}

/**
 * Migration phase
 */
export interface MigrationPhase {
  description: string;
  priority: 'high' | 'medium' | 'low';
  documents: string[];
}

/**
 * Warning from analysis
 */
export interface AnalysisWarning {
  type: string;
  message: string;
  recommendation: string;
}

/**
 * Complete blueprint result
 */
export interface BlueprintResult {
  version: string;
  generated_at: string;
  repository: {
    name: string;
    root: string;
  };
  analysis_summary: {
    total_documents: number;
    with_frontmatter: number;
    inspected_documents: number;
    migration_complexity: {
      low: number;
      medium: number;
      high: number;
    };
    existing_patterns: string[];
    notable_findings: string[];
  };
  discovered_documents: DiscoveredDocument[];
  recommended_structure: RecommendedStructure;
  recommended_types: RecommendedType[];
  migration_plan: {
    phase_1?: MigrationPhase;
    phase_2?: MigrationPhase;
    phase_3?: MigrationPhase;
  };
  warnings: AnalysisWarning[];
}

/**
 * Migration result for a single document
 */
export interface DocumentMigrationResult {
  path: string;
  success: boolean;
  frontmatter: Record<string, unknown>;
  content_updated: boolean;
  error?: string;
}

/**
 * Tool definition for submitting triage results
 */
export const submitTriageTool: Anthropic.Tool = {
  name: 'submit_triage',
  description: 'Submit the triage analysis results with files to inspect and quick classifications',
  input_schema: {
    type: 'object' as const,
    properties: {
      files_to_inspect: {
        type: 'array',
        description: 'Files that need detailed inspection',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to the file' },
            reason: { type: 'string', description: 'Why this file needs inspection' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['path', 'reason', 'priority'],
        },
      },
      quick_classifications: {
        type: 'array',
        description: 'Files that can be classified without inspection',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            type: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            has_frontmatter: { type: 'boolean' },
            complexity: { type: 'string', enum: ['simple', 'medium', 'complex'] },
            migration_effort: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['path', 'type', 'confidence'],
        },
      },
      initial_observations: {
        type: 'array',
        description: 'Key observations about the project structure',
        items: { type: 'string' },
      },
    },
    required: ['files_to_inspect', 'quick_classifications', 'initial_observations'],
  },
};

/**
 * Tool definition for submitting blueprint results
 */
export const submitBlueprintTool: Anthropic.Tool = {
  name: 'submit_blueprint',
  description: 'Submit the complete PKF documentation blueprint',
  input_schema: {
    type: 'object' as const,
    properties: {
      version: { type: 'string', description: 'Blueprint version (e.g., "1.0")' },
      repository: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          root: { type: 'string' },
        },
        required: ['name', 'root'],
      },
      analysis_summary: {
        type: 'object',
        properties: {
          total_documents: { type: 'number' },
          with_frontmatter: { type: 'number' },
          inspected_documents: { type: 'number' },
          migration_complexity: {
            type: 'object',
            properties: {
              low: { type: 'number' },
              medium: { type: 'number' },
              high: { type: 'number' },
            },
            required: ['low', 'medium', 'high'],
          },
          existing_patterns: { type: 'array', items: { type: 'string' } },
          notable_findings: { type: 'array', items: { type: 'string' } },
        },
        required: ['total_documents', 'with_frontmatter', 'inspected_documents', 'migration_complexity'],
      },
      discovered_documents: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            target_path: { type: 'string' },
            type: { type: 'string' },
            title: { type: 'string' },
            has_frontmatter: { type: 'boolean' },
            complexity: { type: 'string', enum: ['simple', 'medium', 'complex'] },
            migration_effort: { type: 'string', enum: ['low', 'medium', 'high'] },
            sections: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' },
            inspection_confidence: { type: 'number' },
          },
          required: ['path', 'target_path', 'type', 'title', 'has_frontmatter', 'complexity', 'migration_effort'],
        },
      },
      recommended_structure: {
        type: 'object',
        properties: {
          docs_root: { type: 'string' },
          directories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                purpose: { type: 'string' },
              },
              required: ['path', 'purpose'],
            },
          },
        },
        required: ['docs_root', 'directories'],
      },
      recommended_types: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            extends: { type: 'string' },
            description: { type: 'string' },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  values: { type: 'array', items: { type: 'string' } },
                },
                required: ['name', 'type'],
              },
            },
          },
          required: ['name', 'description'],
        },
      },
      migration_plan: {
        type: 'object',
        properties: {
          phase_1: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              documents: { type: 'array', items: { type: 'string' } },
            },
            required: ['description', 'priority', 'documents'],
          },
          phase_2: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              documents: { type: 'array', items: { type: 'string' } },
            },
            required: ['description', 'priority', 'documents'],
          },
          phase_3: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              documents: { type: 'array', items: { type: 'string' } },
            },
            required: ['description', 'priority', 'documents'],
          },
        },
      },
      warnings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            message: { type: 'string' },
            recommendation: { type: 'string' },
          },
          required: ['type', 'message', 'recommendation'],
        },
      },
    },
    required: ['version', 'repository', 'analysis_summary', 'discovered_documents', 'recommended_structure', 'recommended_types', 'migration_plan', 'warnings'],
  },
};

/**
 * Tool definition for submitting document migration result
 */
export const submitMigrationTool: Anthropic.Tool = {
  name: 'submit_migration',
  description: 'Submit the result of migrating a single document',
  input_schema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'Source path of the document' },
      success: { type: 'boolean', description: 'Whether migration succeeded' },
      frontmatter: {
        type: 'object',
        description: 'Generated frontmatter for the document',
        additionalProperties: true,
      },
      content_updated: { type: 'boolean', description: 'Whether content was modified' },
      error: { type: 'string', description: 'Error message if migration failed' },
    },
    required: ['path', 'success', 'frontmatter', 'content_updated'],
  },
};

/**
 * All available tools
 */
export const allTools = {
  submit_triage: submitTriageTool,
  submit_blueprint: submitBlueprintTool,
  submit_migration: submitMigrationTool,
};

/**
 * Extract tool result from Claude's response
 * @param content - Response content blocks
 * @param toolName - Expected tool name
 * @returns Tool input or null if not found
 */
export function extractToolResult<T>(
  content: Array<{ type: string; name?: string; input?: unknown }>,
  toolName: string
): T | null {
  for (const block of content) {
    if (block.type === 'tool_use' && block.name === toolName && block.input) {
      return block.input as T;
    }
  }
  return null;
}
