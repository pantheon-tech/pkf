/**
 * PKF Init Agent Orchestrator
 * Main orchestration logic for multi-agent conversations
 */
import { TokenEstimator } from '../utils/token-estimator.js';
import { loadAgentConfig } from './agent-loader.js';
import { detectConvergence } from './convergence.js';
import * as logger from '../utils/logger.js';
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
    client;
    rateLimiter;
    costTracker;
    agentsDir;
    streaming;
    onStream;
    maxIterations;
    /**
     * Create a new AgentOrchestrator
     *
     * @param client - Anthropic API client
     * @param rateLimiter - Rate limiter for API calls
     * @param costTracker - Cost tracker for budget management
     * @param options - Optional configuration
     */
    constructor(client, rateLimiter, costTracker, options) {
        this.client = client;
        this.rateLimiter = rateLimiter;
        this.costTracker = costTracker;
        this.agentsDir = options?.agentsDir;
        this.streaming = options?.streaming ?? false;
        this.onStream = options?.onStream;
        this.maxIterations = options?.pkfConfig?.orchestration.maxIterations ?? 5;
    }
    /**
     * Set the streaming callback
     * @param callback - Function to call with each text chunk
     */
    setStreamCallback(callback) {
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
    async executeAgent(agentName, messages) {
        try {
            // Load agent configuration
            const agentConfig = await loadAgentConfig(agentName, this.agentsDir);
            // Estimate tokens for rate limiting
            const estimatedTokens = TokenEstimator.estimateAgentExecution(agentConfig.instructions, messages, agentConfig.maxTokens);
            // Acquire rate limit
            await this.rateLimiter.acquire(estimatedTokens);
            // Call the Anthropic API (with or without streaming)
            let result;
            if (this.streaming && this.onStream) {
                result = await this.client.createMessageStreaming({
                    model: agentConfig.model,
                    systemPrompt: agentConfig.instructions,
                    messages,
                    maxTokens: agentConfig.maxTokens,
                    temperature: agentConfig.temperature,
                    enableCaching: agentConfig.enableCaching,
                }, this.onStream);
            }
            else {
                result = await this.client.createMessage({
                    model: agentConfig.model,
                    systemPrompt: agentConfig.instructions,
                    messages,
                    maxTokens: agentConfig.maxTokens,
                    temperature: agentConfig.temperature,
                    enableCaching: agentConfig.enableCaching,
                });
            }
            // Record cost (with cache-aware pricing)
            const cost = this.costTracker.recordUsage(agentConfig.model, result.inputTokens, result.outputTokens, result.cacheCreationInputTokens, result.cacheReadInputTokens);
            return {
                success: true,
                output: result.content,
                cost,
                tokensUsed: result.inputTokens + result.outputTokens,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                cacheCreationTokens: result.cacheCreationInputTokens,
                cacheReadTokens: result.cacheReadInputTokens,
                metadata: {
                    agentName,
                    model: agentConfig.model,
                    stopReason: result.stopReason,
                },
            };
        }
        catch (error) {
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
     * @param maxIterations - Maximum number of conversation rounds (uses config value if not specified)
     * @returns AgentResult with final output and aggregated statistics
     */
    async agentConversation(agent1Name, agent2Name, initialPrompt, maxIterations) {
        const effectiveMaxIterations = maxIterations ?? this.maxIterations;
        // Load both agent configurations upfront
        let agent1Config;
        let agent2Config;
        try {
            agent1Config = await loadAgentConfig(agent1Name, this.agentsDir);
            agent2Config = await loadAgentConfig(agent2Name, this.agentsDir);
        }
        catch (error) {
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
        const agent1Messages = [{ role: 'user', content: initialPrompt }];
        const agent2Messages = [];
        // Track aggregated statistics
        let totalCost = 0;
        let totalTokens = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let iterations = 0;
        let finalOutput = '';
        // Log conversation start
        logger.debug(`Starting agent conversation: maxIterations=${effectiveMaxIterations}`);
        for (let i = 0; i < effectiveMaxIterations; i++) {
            iterations = i + 1;
            logger.debug(`Iteration ${iterations}/${effectiveMaxIterations} starting`);
            // Agent 1 responds
            logger.debug(`Agent 1 (${agent1Name}) responding...`);
            logger.info(`\n┌─ Agent: ${agent1Name} (Iteration ${iterations}) ────────`);
            const agent1Result = await this.executeAgentWithConfig(agent1Config, agent1Messages);
            logger.debug(`Agent 1 result: success=${agent1Result.success}, output length=${agent1Result.output?.length || 0}`);
            if (!agent1Result.success) {
                logger.error(`Agent ${agent1Name} failed: ${agent1Result.error}`);
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
            logger.debug(`Convergence check after agent 1: converged=${convergence1.converged}, reason=${convergence1.reason}`);
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
            logger.debug(`Agent 2 (${agent2Name}) responding...`);
            logger.info(`\n┌─ Agent: ${agent2Name} (Iteration ${iterations}) ────────`);
            const agent2Result = await this.executeAgentWithConfig(agent2Config, agent2Messages);
            logger.debug(`Agent 2 result: success=${agent2Result.success}, output length=${agent2Result.output?.length || 0}`);
            if (!agent2Result.success) {
                logger.error(`Agent ${agent2Name} failed: ${agent2Result.error}`);
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
            logger.debug(`Convergence check after agent 2: converged=${convergence2.converged}, reason=${convergence2.reason}`);
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
        logger.debug(`Max iterations reached: iterations=${iterations}, maxIterations=${effectiveMaxIterations}`);
        return {
            success: false,
            output: finalOutput,
            cost: totalCost,
            tokensUsed: totalTokens,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            error: `Max iterations (${effectiveMaxIterations}) reached without convergence`,
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
    async singleAgentTask(agentName, prompt) {
        const messages = [{ role: 'user', content: prompt }];
        return this.executeAgent(agentName, messages);
    }
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
    async parallelAgentTasks(tasks, concurrency = 5, onProgress) {
        const results = new Array(tasks.length);
        let completedCount = 0;
        let failedCount = 0;
        // Process tasks in chunks to control concurrency
        for (let i = 0; i < tasks.length; i += concurrency) {
            const chunk = tasks.slice(i, i + concurrency);
            const chunkPromises = chunk.map(async (task, chunkIndex) => {
                try {
                    const result = await this.singleAgentTask(task.agentName, task.prompt);
                    completedCount++;
                    if (!result.success) {
                        failedCount++;
                        logger.warn(`Task ${task.id || i + chunkIndex} failed: ${result.error || 'Unknown error'}`);
                    }
                    if (onProgress) {
                        onProgress(completedCount, tasks.length, task.id);
                    }
                    return { result, index: i + chunkIndex, id: task.id };
                }
                catch (error) {
                    // Catch unexpected errors that bypass singleAgentTask error handling
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    failedCount++;
                    completedCount++;
                    logger.error(`Task ${task.id || i + chunkIndex} encountered unexpected error: ${errorMessage}`);
                    if (onProgress) {
                        onProgress(completedCount, tasks.length, task.id);
                    }
                    return {
                        result: {
                            success: false,
                            output: '',
                            cost: 0,
                            tokensUsed: 0,
                            error: `Unexpected error: ${errorMessage}`,
                            metadata: { agentName: task.agentName },
                        },
                        index: i + chunkIndex,
                        id: task.id,
                    };
                }
            });
            const chunkResults = await Promise.all(chunkPromises);
            for (const { result, index, id } of chunkResults) {
                results[index] = { ...result, id };
            }
        }
        // Log summary of parallel execution
        const successCount = completedCount - failedCount;
        if (failedCount > 0) {
            logger.warn(`Parallel execution completed: ${successCount}/${tasks.length} succeeded, ${failedCount} failed`);
        }
        else {
            logger.debug(`Parallel execution completed: ${successCount}/${tasks.length} succeeded`);
        }
        return results;
    }
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
    async executeParallelTasks(tasks) {
        const results = new Array(tasks.length);
        const errors = new Array(tasks.length);
        let successCount = 0;
        let failureCount = 0;
        await Promise.all(tasks.map(async (task, index) => {
            try {
                const result = await task();
                results[index] = result;
                successCount++;
            }
            catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                errors[index] = { index, error: err };
                failureCount++;
                logger.error(`Task at index ${index} failed: ${err.message}`);
            }
        }));
        logger.debug(`Parallel task execution: ${successCount} succeeded, ${failureCount} failed out of ${tasks.length} total`);
        return { results, errors, successCount, failureCount };
    }
    /**
     * Execute an agent using a pre-loaded configuration
     * Private helper for conversation method to avoid redundant config loading
     */
    async executeAgentWithConfig(agentConfig, messages) {
        try {
            // Estimate tokens for rate limiting
            const estimatedTokens = TokenEstimator.estimateAgentExecution(agentConfig.instructions, messages, agentConfig.maxTokens);
            // Acquire rate limit
            await this.rateLimiter.acquire(estimatedTokens);
            // Call the Anthropic API (with or without streaming)
            let result;
            if (this.streaming) {
                result = await this.client.createMessageStreaming({
                    model: agentConfig.model,
                    systemPrompt: agentConfig.instructions,
                    messages,
                    maxTokens: agentConfig.maxTokens,
                    temperature: agentConfig.temperature,
                    enableCaching: agentConfig.enableCaching,
                }, this.onStream // Can be undefined - that's fine for silent streaming
                );
            }
            else {
                result = await this.client.createMessage({
                    model: agentConfig.model,
                    systemPrompt: agentConfig.instructions,
                    messages,
                    maxTokens: agentConfig.maxTokens,
                    temperature: agentConfig.temperature,
                    enableCaching: agentConfig.enableCaching,
                });
            }
            // Record cost (with cache-aware pricing)
            const cost = this.costTracker.recordUsage(agentConfig.model, result.inputTokens, result.outputTokens, result.cacheCreationInputTokens, result.cacheReadInputTokens);
            return {
                success: true,
                output: result.content,
                cost,
                tokensUsed: result.inputTokens + result.outputTokens,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                cacheCreationTokens: result.cacheCreationInputTokens,
                cacheReadTokens: result.cacheReadInputTokens,
                metadata: {
                    agentName: agentConfig.name,
                    model: agentConfig.model,
                    stopReason: result.stopReason,
                },
            };
        }
        catch (error) {
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
//# sourceMappingURL=orchestrator.js.map