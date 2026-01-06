/**
 * Unit tests for TokenEstimator
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TokenEstimator } from '../../src/utils/token-estimator.js';
import type { AgentMessage } from '../../src/types/index.js';

describe('TokenEstimator', () => {
  beforeEach(() => {
    TokenEstimator.clearCache();
  });

  afterEach(() => {
    TokenEstimator.clearCache();
  });
  describe('estimate', () => {
    it('estimates tokens for simple string', () => {
      // "Hello World" = 11 characters
      // Base tokens: ceil(11 / 4) = 3
      // With buffer: ceil(3 * 1.2) = 4
      const tokens = TokenEstimator.estimate('Hello World');

      expect(tokens).toBe(4);
    });

    it('includes 20% buffer for formatting', () => {
      // 100 characters exactly
      const content = 'a'.repeat(100);
      // Base: ceil(100 / 4) = 25
      // With 20% buffer: ceil(25 * 1.2) = 30
      const tokens = TokenEstimator.estimate(content);

      expect(tokens).toBe(30);
    });

    it('returns 0 for empty string', () => {
      expect(TokenEstimator.estimate('')).toBe(0);
    });
  });

  describe('estimateConversation', () => {
    it('estimates conversation correctly', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Hello' },          // 5 chars -> ceil(5/4)=2 -> ceil(2*1.2)=3
        { role: 'assistant', content: 'Hi there!' }, // 9 chars -> ceil(9/4)=3 -> ceil(3*1.2)=4
        { role: 'user', content: 'How are you?' },   // 12 chars -> ceil(12/4)=3 -> ceil(3*1.2)=4
      ];

      const tokens = TokenEstimator.estimateConversation(messages);

      // Sum: 3 + 4 + 4 = 11
      expect(tokens).toBe(11);
    });

    it('returns 0 for empty array', () => {
      expect(TokenEstimator.estimateConversation([])).toBe(0);
    });
  });

  describe('estimateAgentExecution', () => {
    it('estimates agent execution with default maxOutputTokens', () => {
      const systemPrompt = 'a'.repeat(400); // 400 chars
      // Base: ceil(400/4) = 100
      // With buffer: ceil(100 * 1.2) = 120

      const messages: AgentMessage[] = [
        { role: 'user', content: 'a'.repeat(80) }, // 80 chars -> ceil(ceil(80/4) * 1.2) = 24
      ];

      // Default maxOutputTokens = 4096, estimate 50% = 2048

      const tokens = TokenEstimator.estimateAgentExecution(systemPrompt, messages);

      // 120 (system) + 24 (conversation) + 2048 (estimated output) = 2192
      expect(tokens).toBe(2192);
    });

    it('estimates agent execution with custom maxOutputTokens', () => {
      const systemPrompt = 'a'.repeat(400); // 120 tokens with buffer
      const messages: AgentMessage[] = [
        { role: 'user', content: 'a'.repeat(80) }, // 24 tokens with buffer
      ];

      // Custom maxOutputTokens = 1000, estimate 50% = 500

      const tokens = TokenEstimator.estimateAgentExecution(systemPrompt, messages, 1000);

      // 120 (system) + 24 (conversation) + 500 (estimated output) = 644
      expect(tokens).toBe(644);
    });
  });

  describe('Caching', () => {
    it('should cache token estimates', () => {
      const text = 'This is a test string for caching';

      const firstCall = TokenEstimator.estimate(text);
      const secondCall = TokenEstimator.estimate(text);

      expect(firstCall).toBe(secondCall);

      const stats = TokenEstimator.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should cache multiple different texts', () => {
      const texts = [
        'First text',
        'Second text',
        'Third text',
      ];

      texts.forEach(text => TokenEstimator.estimate(text));

      const stats = TokenEstimator.getCacheStats();
      expect(stats.size).toBe(3);
    });

    it('should clear cache', () => {
      TokenEstimator.estimate('Text 1');
      TokenEstimator.estimate('Text 2');

      expect(TokenEstimator.getCacheStats().size).toBe(2);

      TokenEstimator.clearCache();

      expect(TokenEstimator.getCacheStats().size).toBe(0);
    });

    it('should be faster for cached lookups', () => {
      const longText = 'Lorem ipsum '.repeat(1000);

      // First call (uncached)
      const start1 = performance.now();
      TokenEstimator.estimate(longText);
      const duration1 = performance.now() - start1;

      // Second call (cached)
      const start2 = performance.now();
      TokenEstimator.estimate(longText);
      const duration2 = performance.now() - start2;

      // Cached lookup should be faster
      expect(duration2).toBeLessThan(duration1 + 1); // Allow some margin
    });
  });
});
