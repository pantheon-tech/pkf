/**
 * PKF Init Token Estimator
 * Static utility class for estimating token counts
 */

import type { AgentMessage } from '../types/index.js';

/**
 * Token estimation formula:
 * - 1 token ≈ 4 characters for English text
 * - Add 20% buffer for markdown/formatting
 */
const CHARS_PER_TOKEN = 4;
const FORMATTING_BUFFER = 1.2;

/**
 * Static utility class for estimating token counts
 */
export class TokenEstimator {
  /**
   * Estimate tokens for a given content string
   * @param content - The content to estimate tokens for
   * @returns Estimated token count
   */
  static estimate(content: string): number {
    if (!content) {
      return 0;
    }
    const baseTokens = Math.ceil(content.length / CHARS_PER_TOKEN);
    return Math.ceil(baseTokens * FORMATTING_BUFFER);
  }

  /**
   * Estimate tokens for an array of agent messages
   * @param messages - Array of agent messages
   * @returns Estimated total token count
   */
  static estimateConversation(messages: AgentMessage[]): number {
    if (!messages || messages.length === 0) {
      return 0;
    }
    return messages.reduce((total, message) => {
      return total + TokenEstimator.estimate(message.content);
    }, 0);
  }

  /**
   * Estimate tokens for a full agent execution
   * Includes system prompt, conversation history, and estimated output
   * @param systemPrompt - The system prompt/instructions
   * @param messages - Array of conversation messages
   * @param maxOutputTokens - Maximum output tokens (default 4096)
   * @returns Estimated total token count
   */
  static estimateAgentExecution(
    systemPrompt: string,
    messages: AgentMessage[],
    maxOutputTokens: number = 4096
  ): number {
    const systemTokens = TokenEstimator.estimate(systemPrompt);
    const conversationTokens = TokenEstimator.estimateConversation(messages);
    // Estimate output at 50% of max output tokens
    const estimatedOutputTokens = Math.ceil(maxOutputTokens * 0.5);

    return systemTokens + conversationTokens + estimatedOutputTokens;
  }
}

export default TokenEstimator;
