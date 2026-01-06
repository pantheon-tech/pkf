/**
 * PKF Init Token Estimator
 * Static utility class for estimating token counts with caching
 */
import type { AgentMessage } from '../types/index.js';
/**
 * Static utility class for estimating token counts
 */
export declare class TokenEstimator {
    private static cache;
    /**
     * Clear the token estimation cache
     */
    static clearCache(): void;
    /**
     * Get cache statistics
     */
    static getCacheStats(): {
        size: number;
        maxSize: number;
    };
    /**
     * Estimate tokens for a given content string (with caching)
     * @param content - The content to estimate tokens for
     * @returns Estimated token count
     */
    static estimate(content: string): number;
    /**
     * Estimate tokens for an array of agent messages
     * @param messages - Array of agent messages
     * @returns Estimated total token count
     */
    static estimateConversation(messages: AgentMessage[]): number;
    /**
     * Estimate tokens for a full agent execution
     * Includes system prompt, conversation history, and estimated output
     * @param systemPrompt - The system prompt/instructions
     * @param messages - Array of conversation messages
     * @param maxOutputTokens - Maximum output tokens (default 4096)
     * @returns Estimated total token count
     */
    static estimateAgentExecution(systemPrompt: string, messages: AgentMessage[], maxOutputTokens?: number): number;
}
export default TokenEstimator;
//# sourceMappingURL=token-estimator.d.ts.map