/**
 * PKF Init Agent Orchestrator
 * Main orchestration logic for multi-agent conversations
 */

import type { AnthropicClient } from '../api/anthropic-client.js';
import type { RateLimiter } from '../api/rate-limiter.js';
import type { CostTracker } from '../utils/cost-tracker.js';
import { TokenEstimator } from '../utils/token-estimator.js';
import type { AgentMessage, AgentResult, AgentConfig } from '../types/index.js';
import { loadAgentConfig } from './agent-loader.js';
import { detectConvergence } from './convergence.js';

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
}

/**
 * Default maximum iterations for agent conversations
 */
const DEFAULT_MAX_ITERATIONS = 5;

/**
 * AgentOrchestrator handles execution and coordination of AI agents
 *
 * Provides methods for:
 * - Single agent task execution
 * - Multi-turn agent conversations with convergence detection
 * - Token estimation and cost tracking
 * - Streaming output support
 */
export class AgentOrchestrator {
  private client: AnthropicClient;
  private rateLimiter: RateLimiter;
  private costTracker: CostTracker;
  private agentsDir?: string;
  private streaming: boolean;
  private onStream?: StreamCallback;

  /**
   * Create a new AgentOrchestrator
   *
   * @param client - Anthropic API client
   * @param rateLimiter - Rate limiter for API calls
   * @param costTracker - Cost tracker for budget management
   * @param options - Optional configuration
   */
  constructor(
    client: AnthropicClient,
    rateLimiter: RateLimiter,
    costTracker: CostTracker,
    options?: AgentOrchestratorOptions
  ) {
    this.client = client;
    this.rateLimiter = rateLimiter;
    this.costTracker = costTracker;
    this.agentsDir = options?.agentsDir;
    this.streaming = options?.streaming ?? false;
    this.onStream = options?.onStream;
  }

  /**
   * Set the streaming callback
   * @param callback - Function to call with each text chunk
   */
  setStreamCallback(callback: StreamCallback | undefined): void {
    this.onStream = callback;
    this.streaming = callback !== undefined;
  }

  /**
   * Execute an agent with given messages
   *
   * @param agentName - Name of the agent to execute
   * @param messages - Conversation messages
   * @returns AgentResult with output and usage statistics
   */
  async executeAgent(agentName: string, messages: AgentMessage[]): Promise<AgentResult> {
    try {
      // Load agent configuration
      const agentConfig = await loadAgentConfig(agentName, this.agentsDir);

      // Estimate tokens for rate limiting
      const estimatedTokens = TokenEstimator.estimateAgentExecution(
        agentConfig.instructions,
        messages,
        agentConfig.maxTokens
      );

      // Acquire rate limit
      await this.rateLimiter.acquire(estimatedTokens);

      // Call the Anthropic API (with or without streaming)
      let result;
      if (this.streaming && this.onStream) {
        result = await this.client.createMessageStreaming(
          {
            model: agentConfig.model,
            systemPrompt: agentConfig.instructions,
            messages,
            maxTokens: agentConfig.maxTokens,
            temperature: agentConfig.temperature,
          },
          this.onStream
        );
      } else {
        result = await this.client.createMessage({
          model: agentConfig.model,
          systemPrompt: agentConfig.instructions,
          messages,
          maxTokens: agentConfig.maxTokens,
          temperature: agentConfig.temperature,
        });
      }

      // Record cost
      const cost = this.costTracker.recordUsage(
        agentConfig.model,
        result.inputTokens,
        result.outputTokens
      );

      return {
        success: true,
        output: result.content,
        cost,
        tokensUsed: result.inputTokens + result.outputTokens,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        metadata: {
          agentName,
          model: agentConfig.model,
          stopReason: result.stopReason,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        output: '',
        cost: 0,
        tokensUsed: 0,
        error: errorMessage,
        metadata: {
          agentName,
        },
      };
    }
  }

  /**
   * Run a conversation between two agents until convergence
   *
   * @param agent1Name - Name of the first agent
   * @param agent2Name - Name of the second agent
   * @param initialPrompt - Initial prompt to start the conversation
   * @param maxIterations - Maximum number of conversation rounds (default 5)
   * @returns AgentResult with final output and aggregated statistics
   */
  async agentConversation(
    agent1Name: string,
    agent2Name: string,
    initialPrompt: string,
    maxIterations: number = DEFAULT_MAX_ITERATIONS
  ): Promise<AgentResult> {
    // Load both agent configurations upfront
    let agent1Config: AgentConfig;
    let agent2Config: AgentConfig;

    try {
      agent1Config = await loadAgentConfig(agent1Name, this.agentsDir);
      agent2Config = await loadAgentConfig(agent2Name, this.agentsDir);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        output: '',
        cost: 0,
        tokensUsed: 0,
        error: `Failed to load agent configurations: ${errorMessage}`,
      };
    }

    // Conversation history for both agents
    const agent1Messages: AgentMessage[] = [{ role: 'user', content: initialPrompt }];
    const agent2Messages: AgentMessage[] = [];

    // Track aggregated statistics
    let totalCost = 0;
    let totalTokens = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let iterations = 0;
    let finalOutput = '';

    for (let i = 0; i < maxIterations; i++) {
      iterations = i + 1;

      // Agent 1 responds
      const agent1Result = await this.executeAgentWithConfig(
        agent1Config,
        agent1Messages
      );

      if (!agent1Result.success) {
        return {
          success: false,
          output: finalOutput,
          cost: totalCost,
          tokensUsed: totalTokens,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          error: `Agent ${agent1Name} failed: ${agent1Result.error}`,
          metadata: { iterations },
        };
      }

      totalCost += agent1Result.cost;
      totalTokens += agent1Result.tokensUsed;
      totalInputTokens += agent1Result.inputTokens ?? 0;
      totalOutputTokens += agent1Result.outputTokens ?? 0;
      finalOutput = agent1Result.output;

      // Add agent 1's response to histories
      agent1Messages.push({ role: 'assistant', content: agent1Result.output });
      agent2Messages.push({ role: 'user', content: agent1Result.output });

      // Check for convergence after agent 1
      const convergence1 = detectConvergence([...agent1Messages, ...agent2Messages]);
      if (convergence1.converged) {
        return {
          success: true,
          output: finalOutput,
          cost: totalCost,
          tokensUsed: totalTokens,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          metadata: {
            converged: true,
            convergenceReason: convergence1.reason,
            convergenceSignal: convergence1.signal,
            iterations,
            lastAgent: agent1Name,
          },
        };
      }

      // Agent 2 responds
      const agent2Result = await this.executeAgentWithConfig(
        agent2Config,
        agent2Messages
      );

      if (!agent2Result.success) {
        return {
          success: false,
          output: finalOutput,
          cost: totalCost,
          tokensUsed: totalTokens,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          error: `Agent ${agent2Name} failed: ${agent2Result.error}`,
          metadata: { iterations },
        };
      }

      totalCost += agent2Result.cost;
      totalTokens += agent2Result.tokensUsed;
      totalInputTokens += agent2Result.inputTokens ?? 0;
      totalOutputTokens += agent2Result.outputTokens ?? 0;
      finalOutput = agent2Result.output;

      // Add agent 2's response to histories
      agent2Messages.push({ role: 'assistant', content: agent2Result.output });
      agent1Messages.push({ role: 'user', content: agent2Result.output });

      // Check for convergence after agent 2
      const convergence2 = detectConvergence([...agent1Messages, ...agent2Messages]);
      if (convergence2.converged) {
        return {
          success: true,
          output: finalOutput,
          cost: totalCost,
          tokensUsed: totalTokens,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          metadata: {
            converged: true,
            convergenceReason: convergence2.reason,
            convergenceSignal: convergence2.signal,
            iterations,
            lastAgent: agent2Name,
          },
        };
      }
    }

    // Max iterations reached without convergence
    return {
      success: false,
      output: finalOutput,
      cost: totalCost,
      tokensUsed: totalTokens,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      error: `Max iterations (${maxIterations}) reached without convergence`,
      metadata: {
        converged: false,
        iterations,
      },
    };
  }

  /**
   * Execute a simple single-turn agent task
   *
   * @param agentName - Name of the agent to execute
   * @param prompt - Prompt for the agent
   * @returns AgentResult with output and usage statistics
   */
  async singleAgentTask(agentName: string, prompt: string): Promise<AgentResult> {
    const messages: AgentMessage[] = [{ role: 'user', content: prompt }];
    return this.executeAgent(agentName, messages);
  }

  /**
   * Execute an agent using a pre-loaded configuration
   * Private helper for conversation method to avoid redundant config loading
   */
  private async executeAgentWithConfig(
    agentConfig: AgentConfig,
    messages: AgentMessage[]
  ): Promise<AgentResult> {
    try {
      // Estimate tokens for rate limiting
      const estimatedTokens = TokenEstimator.estimateAgentExecution(
        agentConfig.instructions,
        messages,
        agentConfig.maxTokens
      );

      // Acquire rate limit
      await this.rateLimiter.acquire(estimatedTokens);

      // Call the Anthropic API
      const result = await this.client.createMessage({
        model: agentConfig.model,
        systemPrompt: agentConfig.instructions,
        messages,
        maxTokens: agentConfig.maxTokens,
        temperature: agentConfig.temperature,
      });

      // Record cost
      const cost = this.costTracker.recordUsage(
        agentConfig.model,
        result.inputTokens,
        result.outputTokens
      );

      return {
        success: true,
        output: result.content,
        cost,
        tokensUsed: result.inputTokens + result.outputTokens,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        metadata: {
          agentName: agentConfig.name,
          model: agentConfig.model,
          stopReason: result.stopReason,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        output: '',
        cost: 0,
        tokensUsed: 0,
        error: errorMessage,
        metadata: {
          agentName: agentConfig.name,
        },
      };
    }
  }
}

export default AgentOrchestrator;
