/**
 * PKF Init Agent Orchestrator
 * Main orchestration logic for multi-agent conversations
 */
import type { AnthropicClient } from '../api/anthropic-client.js';
import type { RateLimiter } from '../api/rate-limiter.js';
import type { CostTracker } from '../utils/cost-tracker.js';
import type { AgentMessage, AgentResult } from '../types/index.js';
/**
 * Options for the AgentOrchestrator
 */
export interface AgentOrchestratorOptions {
    /** Directory containing agent markdown files */
    agentsDir?: string;
}
/**
 * AgentOrchestrator handles execution and coordination of AI agents
 *
 * Provides methods for:
 * - Single agent task execution
 * - Multi-turn agent conversations with convergence detection
 * - Token estimation and cost tracking
 */
export declare class AgentOrchestrator {
    private client;
    private rateLimiter;
    private costTracker;
    private agentsDir?;
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
     * @param maxIterations - Maximum number of conversation rounds (default 5)
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
     * Execute an agent using a pre-loaded configuration
     * Private helper for conversation method to avoid redundant config loading
     */
    private executeAgentWithConfig;
}
export default AgentOrchestrator;
//# sourceMappingURL=orchestrator.d.ts.map