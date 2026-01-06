/**
 * PKF Init Token Estimator
 * Static utility class for estimating token counts with caching
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
 * LRU Cache for token estimates
 */
class TokenCache {
  private cache: Map<string, { tokens: number; timestamp: number }>;
  private maxSize: number;
  private maxAge: number; // milliseconds

  constructor(maxSize: number = 1000, maxAgeMinutes: number = 30) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxAge = maxAgeMinutes * 60 * 1000;
  }

  /**
   * Generate cache key from content (using hash for memory efficiency)
   */
  private getKey(content: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `${hash}_${content.length}`;
  }

  get(content: string): number | undefined {
    const key = this.getKey(content);
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.tokens;
  }

  set(content: string, tokens: number): void {
    const key = this.getKey(content);

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { tokens, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Static utility class for estimating token counts
 */
export class TokenEstimator {
  private static cache = new TokenCache();

  /**
   * Clear the token estimation cache
   */
  static clearCache(): void {
    TokenEstimator.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; maxSize: number } {
    return {
      size: TokenEstimator.cache.size(),
      maxSize: 1000,
    };
  }

  /**
   * Estimate tokens for a given content string (with caching)
   * @param content - The content to estimate tokens for
   * @returns Estimated token count
   */
  static estimate(content: string): number {
    if (!content) {
      return 0;
    }

    // Check cache first
    const cached = TokenEstimator.cache.get(content);
    if (cached !== undefined) {
      return cached;
    }

    // Calculate and cache
    const baseTokens = Math.ceil(content.length / CHARS_PER_TOKEN);
    const tokens = Math.ceil(baseTokens * FORMATTING_BUFFER);
    TokenEstimator.cache.set(content, tokens);

    return tokens;
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
