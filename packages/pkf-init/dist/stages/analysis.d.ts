/**
 * PKF Init Analysis Stage
 * Stage 1: Scans repository, analyzes documentation, generates blueprint YAML
 */
import type { AgentOrchestrator } from '../agents/orchestrator.js';
import type { WorkflowStateManager } from '../state/workflow-state.js';
import type { Interactive } from '../utils/interactive.js';
import { type LoadedConfig } from '../types/index.js';
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
export declare class AnalysisStage {
    private orchestrator;
    private stateManager;
    private config;
    private interactive;
    /**
     * Create a new AnalysisStage
     *
     * @param orchestrator - Agent orchestrator for AI interactions
     * @param stateManager - Workflow state manager for persistence
     * @param config - Loaded configuration
     * @param interactive - Interactive mode handler
     */
    constructor(orchestrator: AgentOrchestrator, stateManager: WorkflowStateManager, config: LoadedConfig, interactive: Interactive);
    /**
     * Execute the analysis stage
     *
     * @returns AnalysisResult with blueprint and discovered docs
     */
    execute(): Promise<AnalysisResult>;
    /**
     * Scan repository for documentation files
     *
     * Scans recursively from project root for all markdown files,
     * excluding common non-documentation directories.
     *
     * @returns List of discovered documentation files with metadata
     */
    private scanRepository;
    /**
     * Create a DiscoveredDoc from a file path
     *
     * @param filePath - Absolute path to the file
     * @returns DiscoveredDoc or null if file cannot be read
     */
    private createDiscoveredDoc;
    /**
     * Build prompt context from discovered documentation
     *
     * @param docs - List of discovered documentation files
     * @returns Formatted context string for the agent
     */
    private buildContext;
    /**
     * Extract YAML content from agent response
     *
     * @param response - Full agent response text
     * @returns Extracted YAML string or null if not found
     */
    private extractBlueprint;
    /**
     * Validate blueprint YAML structure
     *
     * @param yamlContent - YAML string to validate
     * @returns true if valid, false otherwise
     */
    private validateBlueprint;
}
export default AnalysisStage;
//# sourceMappingURL=analysis.d.ts.map