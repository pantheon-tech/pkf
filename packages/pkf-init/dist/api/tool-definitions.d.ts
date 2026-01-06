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
export declare const submitTriageTool: Anthropic.Tool;
/**
 * Tool definition for submitting blueprint results
 */
export declare const submitBlueprintTool: Anthropic.Tool;
/**
 * Tool definition for submitting document migration result
 */
export declare const submitMigrationTool: Anthropic.Tool;
/**
 * All available tools
 */
export declare const allTools: {
    submit_triage: Anthropic.Messages.Tool;
    submit_blueprint: Anthropic.Messages.Tool;
    submit_migration: Anthropic.Messages.Tool;
};
/**
 * Extract tool result from Claude's response
 * @param content - Response content blocks
 * @param toolName - Expected tool name
 * @returns Tool input or null if not found
 */
export declare function extractToolResult<T>(content: Array<{
    type: string;
    name?: string;
    input?: unknown;
}>, toolName: string): T | null;
//# sourceMappingURL=tool-definitions.d.ts.map