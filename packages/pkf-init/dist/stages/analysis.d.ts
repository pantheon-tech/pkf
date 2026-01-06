/**
 * PKF Init Analysis Stage
 * Stage 1: Scans repository, analyzes documentation, generates blueprint YAML
 *
 * Uses an iterative process:
 * 1. Triage: Main agent identifies files needing closer inspection
 * 2. Inspection: Parallel agents inspect identified files
 * 3. Synthesis: Main agent generates final blueprint with inspection results
 */
import type { AgentOrchestrator } from '../agents/orchestrator.js';
import type { WorkflowStateManager } from '../state/workflow-state.js';
import type { Interactive } from '../utils/interactive.js';
import { type LoadedConfig } from '../types/index.js';
import type { PKFConfig } from '../config/pkf-config.js';
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
/**
 * Options for AnalysisStage
 */
export interface AnalysisStageOptions {
    /** Debug mode: disable UI, save raw outputs */
    debug?: boolean;
    /** PKF configuration */
    pkfConfig?: PKFConfig;
}
export declare class AnalysisStage {
    private orchestrator;
    private stateManager;
    private config;
    private interactive;
    private ui;
    private debug;
    private pkfConfig;
    /**
     * Create a new AnalysisStage
     *
     * @param orchestrator - Agent orchestrator for AI interactions
     * @param stateManager - Workflow state manager for persistence
     * @param config - Loaded configuration
     * @param interactive - Interactive mode handler
     * @param options - Optional stage options
     */
    constructor(orchestrator: AgentOrchestrator, stateManager: WorkflowStateManager, config: LoadedConfig, interactive: Interactive, options?: AnalysisStageOptions);
    /**
     * Execute the analysis stage with iterative inspection
     *
     * @returns AnalysisResult with blueprint and discovered docs
     */
    execute(): Promise<AnalysisResult>;
    /**
     * Build context for triage mode
     */
    private buildTriageContext;
    /**
     * Parse triage response from agent
     */
    private parseTriageResponse;
    /**
     * Run parallel document inspections
     */
    private runParallelInspections;
    /**
     * Build prompt for document inspector
     */
    private buildInspectionPrompt;
    /**
     * Build context for synthesis mode with inspection results
     */
    private buildSynthesisContext;
    /**
     * Scan repository for documentation files
     *
     * Scans recursively from project root for all markdown files,
     * excluding common non-documentation directories.
     * Uses parallel processing for improved performance.
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