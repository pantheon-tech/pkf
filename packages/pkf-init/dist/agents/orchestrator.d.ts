/**
 * PKF Init Agent Orchestrator
 * Main orchestration logic for multi-agent conversations
 */
import type { AnthropicClient } from '../api/anthropic-client.js';
import type { RateLimiter } from '../api/rate-limiter.js';
import type { CostTracker } from '../utils/cost-tracker.js';
import type { AgentMessage, AgentResult } from '../types/index.js';
import type { PKFConfig } from '../config/pkf-config.js';
/**
 * Callback for streaming text output
 */
export type StreamCallback = (text: string) => void;
/**
 * Options for the AgentOrchestrator
 */
export interface AgentOrchestratorOptions {
    /** Directory containing agent markdown files */
    agentsDir?: string;
    /** Enable streaming output */
    streaming?: boolean;
    /** Callback for streaming text chunks */
    onStream?: StreamCallback;
    /** PKF configuration */
    pkfConfig?: PKFConfig;
}
/**
 * AgentOrchestrator handles execution and coordination of AI agents
 *
 * Provides methods for:
 * - Single agent task execution
 * - Multi-turn agent conversations with convergence detection
 * - Token estimation and cost tracking
 * - Streaming output support
 */
export declare class AgentOrchestrator {
    private client;
    private rateLimiter;
    private costTracker;
    private agentsDir?;
    private streaming;
    private onStream?;
    private maxIterations;
    /**
     * Create a new AgentOrchestrator
     *
     * @param client - Anthropic API client
     * @param rateLimiter - Rate limiter for API calls
     * @param costTracker - Cost tracker for budget management
     * @param options - Optional configuration
     */
    constructor(client: AnthropicClient, rateLimiter: RateLimiter, costTracker: CostTracker, options?: AgentOrchestratorOptions);
    /**
     * Set the streaming callback
     * @param callback - Function to call with each text chunk
     */
    setStreamCallback(callback: StreamCallback | undefined): void;
    /**
     * Execute an agent with given messages
     *
     * @param agentName - Name of the agent to execute
     * @param messages - Conversation messages
     * @returns AgentResult with output and usage statistics
     */
    executeAgent(agentName: string, messages: AgentMessage[]): Promise<AgentResult>;
    /**
     * Run a conversation between two agents until convergence
     *
     * @param agent1Name - Name of the first agent
     * @param agent2Name - Name of the second agent
     * @param initialPrompt - Initial prompt to start the conversation
     * @param maxIterations - Maximum number of conversation rounds (uses config value if not specified)
     * @returns AgentResult with final output and aggregated statistics
     */
    agentConversation(agent1Name: string, agent2Name: string, initialPrompt: string, maxIterations?: number): Promise<AgentResult>;
    /**
     * Execute a simple single-turn agent task
     *
     * @param agentName - Name of the agent to execute
     * @param prompt - Prompt for the agent
     * @returns AgentResult with output and usage statistics
     */
    singleAgentTask(agentName: string, prompt: string): Promise<AgentResult>;
    /**
     * Execute multiple agent tasks in parallel with controlled concurrency
     *
     * This method implements graceful degradation - if some tasks fail, the successful
     * results are still returned. Progress tracking reports both successes and failures.
     *
     * @param tasks - Array of tasks with agentName and prompt
     * @param concurrency - Maximum number of concurrent tasks (default: 5)
     * @param onProgress - Optional callback for progress updates
     * @returns Array of AgentResults in the same order as input tasks
     */
    parallelAgentTasks(tasks: Array<{
        agentName: string;
        prompt: string;
        id?: string;
    }>, concurrency?: number, onProgress?: (completed: number, total: number, lastId?: string) => void): Promise<Array<AgentResult & {
        id?: string;
    }>>;
    /**
     * Execute parallel tasks with full error isolation and detailed reporting
     *
     * This is a more explicit version of parallelAgentTasks that separates
     * successful results from errors, useful when you need fine-grained control
     * over partial failure handling.
     *
     * @param tasks - Array of async task functions to execute
     * @returns Object containing successful results and errors with indices
     */
    executeParallelTasks<T>(tasks: Array<() => Promise<T>>): Promise<{
        results: Array<T | undefined>;
        errors: Array<{
            index: number;
            error: Error;
        } | undefined>;
        successCount: number;
        failureCount: number;
    }>;
    /**
     * Execute an agent using a pre-loaded configuration
     * Private helper for conversation method to avoid redundant config loading
     */
    private executeAgentWithConfig;
}
export default AgentOrchestrator;
//# sourceMappingURL=orchestrator.d.ts.map