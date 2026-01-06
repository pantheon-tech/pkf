/**
 * PKF Init Schema Design Stage (Stage 2)
 * Uses agent conversation to design PKF schemas based on the blueprint.
 */
import type { AgentOrchestrator } from '../agents/orchestrator.js';
import type { WorkflowStateManager } from '../state/workflow-state.js';
import type { Interactive } from '../utils/interactive.js';
import { type LoadedConfig } from '../types/index.js';
/**
 * Result of the schema design stage
 */
export interface SchemaDesignResult {
    /** Whether the stage completed successfully */
    success: boolean;
    /** Generated schemas.yaml content */
    schemasYaml?: string;
    /** Number of conversation iterations */
    iterations: number;
    /** Reason for convergence if converged */
    convergenceReason?: string;
    /** Error message if failed */
    error?: string;
}
/**
 * Result of schema validation
 */
export interface ValidationResult {
    /** Whether the schema is valid */
    valid: boolean;
    /** Validation errors */
    errors: string[];
    /** Validation warnings */
    warnings: string[];
}
/**
 * Stage 2: Schema Design
 *
 * Uses agent conversation between documentation-analyst-init and pkf-implementer
 * to design a schemas.yaml file based on the documentation blueprint.
 */
export declare class SchemaDesignStage {
    private orchestrator;
    private stateManager;
    private config;
    private interactive;
    private maxIterations;
    /**
     * Create a new SchemaDesignStage
     *
     * @param orchestrator - Agent orchestrator for running conversations
     * @param stateManager - Workflow state manager for persistence
     * @param config - Loaded configuration
     * @param interactive - Interactive mode handler
     * @param maxIterations - Maximum conversation iterations (default 5)
     */
    constructor(orchestrator: AgentOrchestrator, stateManager: WorkflowStateManager, config: LoadedConfig, interactive: Interactive, maxIterations?: number);
    /**
     * Execute the schema design stage
     *
     * @param blueprint - Documentation blueprint from Stage 1
     * @returns SchemaDesignResult with schemas.yaml content
     */
    execute(blueprint: string): Promise<SchemaDesignResult>;
    /**
     * Log a summary of the agent conversation
     */
    private logConversationSummary;
    /**
     * Extract key discussion points from agent output
     */
    private extractKeyDiscussionPoints;
    /**
     * Build a continuation prompt for additional iterations
     */
    private buildContinuationPrompt;
    /**
     * Build the initial prompt for schema design
     *
     * @param blueprint - Documentation blueprint from Stage 1
     * @returns Initial prompt string
     */
    private buildInitialPrompt;
    /**
     * Extract schemas.yaml content from agent response
     *
     * @param response - Agent response text
     * @returns Extracted YAML content or null
     */
    private extractSchemasYaml;
    /**
     * Check if content looks like valid schemas.yaml
     *
     * @param content - YAML content to check
     * @returns True if content appears to be schemas.yaml
     */
    private looksLikeSchemasYaml;
    /**
     * Validate schemas.yaml structure
     *
     * @param yaml - YAML content to validate
     * @returns Validation result
     */
    private validateSchemasYaml;
    /**
     * Handle interactive approval of schemas
     *
     * @param schemasYaml - Generated schemas.yaml content
     * @param iterations - Number of iterations taken
     * @param blueprint - Optional blueprint for target structure display
     * @returns Approval result
     */
    private handleInteractiveApproval;
    /**
     * Save intermediate checkpoint during design process
     *
     * @param schemasYaml - Current schemas.yaml content
     * @param iterations - Number of iterations so far
     * @param error - Optional error message
     */
    private saveIntermediateCheckpoint;
    /**
     * Save design state with checkpoint
     *
     * @param schemasYaml - Generated schemas.yaml content
     * @param iterations - Number of iterations taken
     * @param convergenceReason - Reason for convergence if any
     */
    private saveState;
}
export default SchemaDesignStage;
//# sourceMappingURL=schema-design.d.ts.map