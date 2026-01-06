/**
 * Integration tests for PKF Init Phase 2
 * Tests Phase 2 components working together:
 * - Rate limiter
 * - Request queue
 * - Convergence detection
 * - Agent loader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import { RateLimiter } from '../../src/api/rate-limiter.js';
import { RequestQueue } from '../../src/api/request-queue.js';
import { detectConvergence } from '../../src/agents/convergence.js';
import { loadAgentConfig } from '../../src/agents/agent-loader.js';
import type { AgentMessage } from '../../src/types/index.js';

describe('Phase 2 Integration Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('INT-011: Rate limiter with multiple requests', () => {
    it('allows multiple requests and depletes bucket appropriately', async () => {
      // Create RateLimiter with build1 tier (50 rpm, 40000 tpm)
      const rateLimiter = new RateLimiter('build1');

      // Verify initial bucket state
      expect(rateLimiter.requestsPerMinute).toBe(50);
      expect(rateLimiter.tokensPerMinute).toBe(40000);
      expect(rateLimiter.requestBucket).toBe(50);
      expect(rateLimiter.tokenBucket).toBe(40000);

      // Make 5 requests rapidly with small estimated tokens
      const estimatedTokensPerRequest = 1000;
      const requestPromises: Promise<void>[] = [];

      for (let i = 0; i < 5; i++) {
        requestPromises.push(rateLimiter.acquire(estimatedTokensPerRequest));
      }

      // All requests should complete without waiting (bucket has capacity)
      await Promise.all(requestPromises);

      // Verify bucket has been depleted appropriately
      // Request bucket: 50 - 5 = 45
      expect(rateLimiter.requestBucket).toBe(45);

      // Token bucket: 40000 - (5 * 1000) = 35000
      expect(rateLimiter.tokenBucket).toBe(35000);
    });
  });

  describe('INT-012: Rate limiter throttling', () => {
    it('throttles when request bucket is exhausted', async () => {
      // Create RateLimiter with free tier (5 rpm, 20000 tpm)
      const rateLimiter = new RateLimiter('free');

      // Verify initial bucket state
      expect(rateLimiter.requestsPerMinute).toBe(5);
      expect(rateLimiter.tokensPerMinute).toBe(20000);
      expect(rateLimiter.requestBucket).toBe(5);

      // Exhaust the request bucket (make 5 rapid requests)
      const estimatedTokensPerRequest = 100; // Small tokens to avoid token limit
      for (let i = 0; i < 5; i++) {
        await rateLimiter.acquire(estimatedTokensPerRequest);
      }

      // Verify request bucket is empty
      expect(rateLimiter.requestBucket).toBe(0);

      // Verify token bucket still has capacity (20000 - 500 = 19500)
      expect(rateLimiter.tokenBucket).toBe(19500);

      // Start 6th request - should need to wait
      let sixthRequestCompleted = false;
      const sixthRequestPromise = rateLimiter.acquire(estimatedTokensPerRequest).then(() => {
        sixthRequestCompleted = true;
      });

      // Request should not complete immediately
      expect(sixthRequestCompleted).toBe(false);

      // Advance time by enough to refill 1 request (1/5 of a minute = 12 seconds)
      // Actually need to advance by exactly the wait time the rate limiter calculates
      // For 1 request shortfall with 5 rpm: (1/5) * 60000ms = 12000ms
      await vi.advanceTimersByTimeAsync(12000);

      // Now the request should complete
      await sixthRequestPromise;
      expect(sixthRequestCompleted).toBe(true);
    });

    it('verifies bucket is empty before 6th request without waiting', async () => {
      // Alternative test: verify bucket state without triggering wait
      const rateLimiter = new RateLimiter('free');

      // Exhaust the request bucket
      for (let i = 0; i < 5; i++) {
        await rateLimiter.acquire(100);
      }

      // Verify bucket is empty
      expect(rateLimiter.requestBucket).toBe(0);
      expect(rateLimiter.getAvailableRequests()).toBe(0);

      // Verify we have tokens available but no requests
      expect(rateLimiter.getAvailableTokens()).toBe(19500);
    });
  });

  describe('INT-014: Convergence detection explicit', () => {
    it('detects SCHEMA-DESIGN-APPROVED signal', () => {
      // Create mock conversation with SCHEMA-DESIGN-APPROVED signal
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: 'Please review the schema design for our documentation types.',
        },
        {
          role: 'assistant',
          content: 'I have analyzed the blueprint and propose the following schema structure...',
        },
        {
          role: 'user',
          content: 'The schema looks comprehensive. Can you finalize it?',
        },
        {
          role: 'assistant',
          content: `SCHEMA-DESIGN-APPROVED: All document types covered with proper inheritance hierarchy.

Summary:
- Document types: 5
- Base types: 2
- Register types: 3
- Total fields defined: 42

Ready for implementation.`,
        },
      ];

      // Call detectConvergence
      const result = detectConvergence(messages);

      // Verify converged: true
      expect(result.converged).toBe(true);

      // Verify signal extracted correctly
      expect(result.signal).toContain('SCHEMA-DESIGN-APPROVED');
      expect(result.reason).toBe('Explicit convergence signal detected');
    });

    it('detects IMPLEMENTATION-COMPLETE signal with 4+ messages', () => {
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: 'Please implement the PKF structure.',
        },
        {
          role: 'assistant',
          content: 'Starting implementation...',
        },
        {
          role: 'user',
          content: 'Status update?',
        },
        {
          role: 'assistant',
          content: 'IMPLEMENTATION-COMPLETE: All files created successfully.',
        },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.signal).toContain('IMPLEMENTATION-COMPLETE');
    });

    it('detects SCHEMA-DESIGN-CONVERGED signal with 4+ messages', () => {
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: 'Schema design round 1.',
        },
        {
          role: 'assistant',
          content: 'Proposing schema changes...',
        },
        {
          role: 'user',
          content: 'Schema design round 5.',
        },
        {
          role: 'assistant',
          content: 'SCHEMA-DESIGN-CONVERGED: Consensus reached after 5 iterations.',
        },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.signal).toContain('SCHEMA-DESIGN-CONVERGED');
    });

    it('requires 4+ messages for convergence even with explicit signal', () => {
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: 'Please implement the PKF structure.',
        },
        {
          role: 'assistant',
          content: 'IMPLEMENTATION-COMPLETE: All files created successfully.',
        },
      ];

      // With fewer than 4 messages, convergence should not be detected
      const result = detectConvergence(messages);

      expect(result.converged).toBe(false);
      expect(result.reason).toContain('Minimum 4 messages required');
    });
  });

  describe('INT-015: Convergence detection implicit', () => {
    it('detects implicit convergence with explicit "fully approved" phrases', () => {
      // Create mock conversation with 4+ messages containing STRONG agreement patterns
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: 'Here is the revised schema. I fully agree with your suggestions.',
        },
        {
          role: 'assistant',
          content: 'The changes are fully approved. No changes needed.',
        },
        {
          role: 'user',
          content: 'Final approval granted. Schema is complete.',
        },
        {
          role: 'assistant',
          content: 'I fully agree. Design is final.',
        },
      ];

      // Call detectConvergence
      const result = detectConvergence(messages);

      // Verify converged: true
      expect(result.converged).toBe(true);

      // Verify reason mentions implicit
      expect(result.reason?.toLowerCase()).toContain('implicit');
    });

    it('does NOT converge with casual agreement like "looks good" or "I agree"', () => {
      // These casual phrases should NOT trigger convergence
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: 'I agree with this design. It looks good!',
        },
        {
          role: 'assistant',
          content: 'Looks good. Ready to proceed with implementation.',
        },
        {
          role: 'user',
          content: 'I agree, this is ready.',
        },
        {
          role: 'assistant',
          content: 'Approved! Ready to proceed.',
        },
      ];

      // Casual agreement should NOT converge
      const result = detectConvergence(messages);

      expect(result.converged).toBe(false);
      expect(result.reason).toBe('No convergence detected');
    });

    it('requires 4+ messages for implicit convergence', () => {
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: 'I fully agree with this design. Schema is complete!',
        },
        {
          role: 'assistant',
          content: 'Fully approved! Design is final.',
        },
      ];

      // With fewer than 4 messages, convergence should not be detected
      const result = detectConvergence(messages);

      expect(result.converged).toBe(false);
      expect(result.reason).toContain('Minimum 4 messages required');
    });

    it('does not converge without agreement patterns', () => {
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: 'Please review this schema.',
        },
        {
          role: 'assistant',
          content: 'I have some concerns about the inheritance structure.',
        },
        {
          role: 'user',
          content: 'What changes would you suggest?',
        },
        {
          role: 'assistant',
          content: 'Consider using a base type for shared fields.',
        },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(false);
      expect(result.reason).toBe('No convergence detected');
    });
  });

  describe('INT-016: Request queue with rate limiter integration', () => {
    it('executes tasks in priority order with rate limiting', async () => {
      // Use real timers for this test to avoid timing complexity
      vi.useRealTimers();

      // Create RateLimiter with build1 tier (plenty of capacity)
      const rateLimiter = new RateLimiter('build1');

      // Create RequestQueue with concurrency of 1 to ensure sequential processing
      // This allows us to verify priority ordering
      const queue = new RequestQueue(rateLimiter, 1);

      // Track execution order
      const executionOrder: number[] = [];

      // Pause the queue to enqueue all tasks before processing
      queue.pause();

      // Enqueue 5 tasks with different priorities
      // Lower priority number = higher priority (executed first)
      const tasks = [
        { id: 1, priority: 3 }, // Low priority
        { id: 2, priority: 1 }, // High priority
        { id: 3, priority: 2 }, // Medium priority
        { id: 4, priority: 1 }, // High priority (same as id:2, FIFO within priority)
        { id: 5, priority: 0 }, // Highest priority
      ];

      const taskPromises = tasks.map(({ id, priority }) =>
        queue.enqueue(
          async () => {
            executionOrder.push(id);
            return id;
          },
          100, // Small token estimate
          priority
        )
      );

      // Resume the queue to start processing
      queue.resume();

      // Wait for all tasks to complete
      const results = await Promise.all(taskPromises);

      // Verify all tasks completed
      expect(results).toHaveLength(5);
      expect(results.sort()).toEqual([1, 2, 3, 4, 5]);

      // Verify execution order matches priority
      // Priority 0: id=5 (first)
      // Priority 1: id=2, id=4 (FIFO order - 2 was added before 4)
      // Priority 2: id=3
      // Priority 3: id=1 (last)
      expect(executionOrder[0]).toBe(5); // Highest priority (0) first
      expect(executionOrder[1]).toBe(2); // Priority 1, first added
      expect(executionOrder[2]).toBe(4); // Priority 1, second added
      expect(executionOrder[3]).toBe(3); // Priority 2
      expect(executionOrder[4]).toBe(1); // Priority 3 (lowest) last
    });

    it('respects rate limiter during queue processing', async () => {
      vi.useRealTimers();

      // Create RateLimiter with build1 tier
      const rateLimiter = new RateLimiter('build1');
      const initialTokens = rateLimiter.tokenBucket;

      // Create RequestQueue
      const queue = new RequestQueue(rateLimiter, 3);

      // Enqueue tasks that will deplete tokens
      const tokensPerTask = 2000;
      const taskCount = 5;

      const taskPromises = Array.from({ length: taskCount }, (_, i) =>
        queue.enqueue(
          async () => `task-${i}`,
          tokensPerTask,
          0
        )
      );

      await Promise.all(taskPromises);

      // Verify token bucket was depleted (use larger tolerance due to refill during execution)
      // Initial: 40000, consumed: 5 * 2000 = 10000, remaining: ~30000
      // Tolerance of -1 allows for up to 5 units of difference
      expect(rateLimiter.tokenBucket).toBeCloseTo(initialTokens - tokensPerTask * taskCount, -1);
      expect(rateLimiter.tokenBucket).toBeCloseTo(30000, -1);

      // Verify request bucket was depleted
      // Initial: 50, consumed: 5, remaining: ~45
      expect(rateLimiter.requestBucket).toBeCloseTo(45, 0);
    });
  });

  describe('INT-017: Agent loader integration', () => {
    // Use real timers for file system operations
    beforeEach(() => {
      vi.useRealTimers();
    });

    it('loads documentation-analyst-init agent correctly', async () => {
      // Use the actual agent definition files in agents/pkf-init/
      const agentsDir = path.resolve(
        __dirname,
        '../../../../agents/pkf-init'
      );

      // Load the documentation-analyst-init agent
      const config = await loadAgentConfig('documentation-analyst-init', agentsDir);

      // Verify it has correct model (Sonnet)
      expect(config.model).toBe('claude-sonnet-4-5-20250929');

      // Verify temperature
      expect(config.temperature).toBe(0.3);

      // Verify maxTokens (increased for large projects)
      expect(config.maxTokens).toBe(32768);

      // Verify name
      expect(config.name).toBe('documentation-analyst-init');

      // Verify system instructions are loaded
      expect(config.instructions).toBeDefined();
      expect(config.instructions.length).toBeGreaterThan(100);
      expect(config.instructions).toContain('Documentation Analyst Init');
      expect(config.instructions).toContain('Documentation Discovery');
      expect(config.instructions).toContain('PKF Documentation Blueprint');
    });

    it('loads pkf-implementer agent correctly', async () => {
      const agentsDir = path.resolve(
        __dirname,
        '../../../../agents/pkf-init'
      );

      // Load the pkf-implementer agent
      const config = await loadAgentConfig('pkf-implementer', agentsDir);

      // Verify its configuration (Sonnet)
      expect(config.model).toBe('claude-sonnet-4-5-20250929');
      expect(config.temperature).toBe(0.2);
      expect(config.maxTokens).toBe(8192);
      expect(config.name).toBe('pkf-implementer');

      // Verify system instructions
      expect(config.instructions).toBeDefined();
      expect(config.instructions.length).toBeGreaterThan(100);
      expect(config.instructions).toContain('PKF Implementer');
      expect(config.instructions).toContain('Schema Design');
      expect(config.instructions).toContain('SCHEMA-DESIGN-APPROVED');
    });

    it('throws error for non-existent agent', async () => {
      const agentsDir = path.resolve(
        __dirname,
        '../../../../agents/pkf-init'
      );

      // Attempt to load non-existent agent
      await expect(
        loadAgentConfig('non-existent-agent', agentsDir)
      ).rejects.toThrow(/Failed to load agent config for "non-existent-agent"/);
    });

    it('loads agent with default values when frontmatter is minimal', async () => {
      // This test verifies that defaults are applied correctly
      // We'll use the existing agents which have complete frontmatter,
      // but verify the loader can handle the structure
      const agentsDir = path.resolve(
        __dirname,
        '../../../../agents/pkf-init'
      );

      const config = await loadAgentConfig('documentation-analyst-init', agentsDir);

      // Verify all required fields are present (either from frontmatter or defaults)
      expect(config.name).toBeDefined();
      expect(config.model).toBeDefined();
      expect(config.temperature).toBeDefined();
      expect(config.maxTokens).toBeDefined();
      expect(config.instructions).toBeDefined();

      // Verify types are correct
      expect(typeof config.name).toBe('string');
      expect(typeof config.temperature).toBe('number');
      expect(typeof config.maxTokens).toBe('number');
      expect(typeof config.instructions).toBe('string');
    });

    it('correctly parses agent frontmatter fields', async () => {
      const agentsDir = path.resolve(
        __dirname,
        '../../../../agents/pkf-init'
      );

      // Load both agents and verify different configurations
      const analyst = await loadAgentConfig('documentation-analyst-init', agentsDir);
      const implementer = await loadAgentConfig('pkf-implementer', agentsDir);

      // Verify they have different temperatures (analyst: 0.3, implementer: 0.2)
      expect(analyst.temperature).not.toBe(implementer.temperature);
      expect(analyst.temperature).toBe(0.3);
      expect(implementer.temperature).toBe(0.2);

      // Both use the same model
      expect(analyst.model).toBe(implementer.model);

      // Analyst has higher maxTokens for large blueprint generation
      expect(analyst.maxTokens).toBe(32768);
      expect(implementer.maxTokens).toBe(8192);
    });
  });
});
