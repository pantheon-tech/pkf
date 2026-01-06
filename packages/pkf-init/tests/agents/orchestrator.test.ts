/**
 * Unit tests for AgentOrchestrator parallel operations error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentOrchestrator } from '../../src/agents/orchestrator.js';
import type { AnthropicClient } from '../../src/api/anthropic-client.js';
import type { RateLimiter } from '../../src/api/rate-limiter.js';
import type { CostTracker } from '../../src/utils/cost-tracker.js';
import type { AgentResult } from '../../src/types/index.js';

describe('AgentOrchestrator - Parallel Operations Error Handling', () => {
  let orchestrator: AgentOrchestrator;
  let mockClient: AnthropicClient;
  let mockRateLimiter: RateLimiter;
  let mockCostTracker: CostTracker;

  beforeEach(() => {
    // Create mock objects
    mockClient = {
      createMessage: vi.fn(),
      createMessageStreaming: vi.fn(),
    } as unknown as AnthropicClient;

    mockRateLimiter = {
      acquire: vi.fn().mockResolvedValue(undefined),
    } as unknown as RateLimiter;

    mockCostTracker = {
      recordUsage: vi.fn().mockReturnValue(0.01),
      getTotalCost: vi.fn().mockReturnValue(0),
    } as unknown as CostTracker;

    orchestrator = new AgentOrchestrator(
      mockClient,
      mockRateLimiter,
      mockCostTracker
    );
  });

  describe('executeParallelTasks', () => {
    it('collects all results when all tasks succeed', async () => {
      const tasks = [
        async () => 'result1',
        async () => 'result2',
        async () => 'result3',
      ];

      const { results, errors, successCount, failureCount } =
        await orchestrator.executeParallelTasks(tasks);

      expect(successCount).toBe(3);
      expect(failureCount).toBe(0);
      expect(results[0]).toBe('result1');
      expect(results[1]).toBe('result2');
      expect(results[2]).toBe('result3');
      expect(errors.every((e) => e === undefined)).toBe(true);
    });

    it('collects partial results when some tasks fail', async () => {
      const tasks = [
        async () => 'success1',
        async () => {
          throw new Error('Task 2 failed');
        },
        async () => 'success3',
        async () => {
          throw new Error('Task 4 failed');
        },
      ];

      const { results, errors, successCount, failureCount } =
        await orchestrator.executeParallelTasks(tasks);

      expect(successCount).toBe(2);
      expect(failureCount).toBe(2);
      expect(results[0]).toBe('success1');
      expect(results[1]).toBeUndefined();
      expect(results[2]).toBe('success3');
      expect(results[3]).toBeUndefined();
      expect(errors[0]).toBeUndefined();
      expect(errors[1]?.error.message).toBe('Task 2 failed');
      expect(errors[2]).toBeUndefined();
      expect(errors[3]?.error.message).toBe('Task 4 failed');
    });

    it('continues execution after failures', async () => {
      let executionOrder: number[] = [];

      const tasks = [
        async () => {
          executionOrder.push(1);
          return 'task1';
        },
        async () => {
          executionOrder.push(2);
          throw new Error('Task 2 failed');
        },
        async () => {
          executionOrder.push(3);
          return 'task3';
        },
      ];

      await orchestrator.executeParallelTasks(tasks);

      // All tasks should have executed despite failure
      expect(executionOrder).toContain(1);
      expect(executionOrder).toContain(2);
      expect(executionOrder).toContain(3);
    });

    it('handles all tasks failing', async () => {
      const tasks = [
        async () => {
          throw new Error('Failure 1');
        },
        async () => {
          throw new Error('Failure 2');
        },
        async () => {
          throw new Error('Failure 3');
        },
      ];

      const { results, errors, successCount, failureCount } =
        await orchestrator.executeParallelTasks(tasks);

      expect(successCount).toBe(0);
      expect(failureCount).toBe(3);
      expect(results.every((r) => r === undefined)).toBe(true);
      expect(errors[0]?.error.message).toBe('Failure 1');
      expect(errors[1]?.error.message).toBe('Failure 2');
      expect(errors[2]?.error.message).toBe('Failure 3');
    });

    it('handles non-Error exceptions', async () => {
      const tasks = [
        async () => 'success',
        async () => {
          throw 'string error';
        },
        async () => {
          throw { custom: 'object' };
        },
      ];

      const { results, errors, successCount, failureCount } =
        await orchestrator.executeParallelTasks(tasks);

      expect(successCount).toBe(1);
      expect(failureCount).toBe(2);
      expect(results[0]).toBe('success');
      expect(errors[1]?.error).toBeInstanceOf(Error);
      expect(errors[2]?.error).toBeInstanceOf(Error);
    });

    it('maintains result order regardless of completion order', async () => {
      const tasks = [
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return 'slow';
        },
        async () => 'fast',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'medium';
        },
      ];

      const { results } = await orchestrator.executeParallelTasks(tasks);

      expect(results[0]).toBe('slow');
      expect(results[1]).toBe('fast');
      expect(results[2]).toBe('medium');
    });

    it('provides error indices correctly', async () => {
      const tasks = [
        async () => 'ok',
        async () => {
          throw new Error('Error at 1');
        },
        async () => 'ok',
        async () => {
          throw new Error('Error at 3');
        },
      ];

      const { errors } = await orchestrator.executeParallelTasks(tasks);

      expect(errors[1]?.index).toBe(1);
      expect(errors[3]?.index).toBe(3);
    });
  });

  describe('parallelAgentTasks - Enhanced Error Handling', () => {
    it('reports partial success correctly', async () => {
      // Mock singleAgentTask to simulate partial failures
      const originalSingleAgentTask = orchestrator.singleAgentTask.bind(orchestrator);
      vi.spyOn(orchestrator, 'singleAgentTask').mockImplementation(
        async (agentName: string, prompt: string): Promise<AgentResult> => {
          if (prompt.includes('fail')) {
            return {
              success: false,
              output: '',
              cost: 0,
              tokensUsed: 0,
              error: 'Simulated failure',
              metadata: { agentName },
            };
          }
          return {
            success: true,
            output: `Response from ${agentName}`,
            cost: 0.01,
            tokensUsed: 100,
            metadata: { agentName },
          };
        }
      );

      const tasks = [
        { agentName: 'agent1', prompt: 'succeed', id: 'task1' },
        { agentName: 'agent2', prompt: 'fail this', id: 'task2' },
        { agentName: 'agent3', prompt: 'succeed', id: 'task3' },
      ];

      const results = await orchestrator.parallelAgentTasks(tasks);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
      expect(results[0].id).toBe('task1');
      expect(results[1].id).toBe('task2');
      expect(results[2].id).toBe('task3');
    });

    it('catches unexpected errors in parallel tasks', async () => {
      vi.spyOn(orchestrator, 'singleAgentTask').mockImplementation(
        async (agentName: string, prompt: string) => {
          if (prompt.includes('throw')) {
            throw new Error('Unexpected catastrophic failure');
          }
          return {
            success: true,
            output: 'Success',
            cost: 0.01,
            tokensUsed: 100,
            metadata: { agentName },
          };
        }
      );

      const tasks = [
        { agentName: 'agent1', prompt: 'normal' },
        { agentName: 'agent2', prompt: 'throw error' },
        { agentName: 'agent3', prompt: 'normal' },
      ];

      const results = await orchestrator.parallelAgentTasks(tasks);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Unexpected error');
      expect(results[2].success).toBe(true);
    });

    it('calls progress callback with correct counts', async () => {
      vi.spyOn(orchestrator, 'singleAgentTask').mockResolvedValue({
        success: true,
        output: 'Success',
        cost: 0.01,
        tokensUsed: 100,
        metadata: { agentName: 'test' },
      });

      const progressCalls: Array<{ completed: number; total: number; id?: string }> = [];
      const onProgress = (completed: number, total: number, id?: string) => {
        progressCalls.push({ completed, total, id });
      };

      const tasks = [
        { agentName: 'agent1', prompt: 'task1', id: 'id1' },
        { agentName: 'agent2', prompt: 'task2', id: 'id2' },
        { agentName: 'agent3', prompt: 'task3', id: 'id3' },
      ];

      await orchestrator.parallelAgentTasks(tasks, 5, onProgress);

      expect(progressCalls).toHaveLength(3);
      expect(progressCalls[0]).toMatchObject({ completed: 1, total: 3, id: 'id1' });
      expect(progressCalls[1]).toMatchObject({ completed: 2, total: 3, id: 'id2' });
      expect(progressCalls[2]).toMatchObject({ completed: 3, total: 3, id: 'id3' });
    });

    it('maintains task order with concurrency control', async () => {
      vi.spyOn(orchestrator, 'singleAgentTask').mockImplementation(
        async (agentName: string) => ({
          success: true,
          output: `Output from ${agentName}`,
          cost: 0.01,
          tokensUsed: 100,
          metadata: { agentName },
        })
      );

      const tasks = [
        { agentName: 'agent1', prompt: 'p1', id: 'id1' },
        { agentName: 'agent2', prompt: 'p2', id: 'id2' },
        { agentName: 'agent3', prompt: 'p3', id: 'id3' },
        { agentName: 'agent4', prompt: 'p4', id: 'id4' },
        { agentName: 'agent5', prompt: 'p5', id: 'id5' },
      ];

      const results = await orchestrator.parallelAgentTasks(tasks, 2);

      expect(results).toHaveLength(5);
      expect(results[0].id).toBe('id1');
      expect(results[1].id).toBe('id2');
      expect(results[2].id).toBe('id3');
      expect(results[3].id).toBe('id4');
      expect(results[4].id).toBe('id5');
    });

    it('handles mixed success and failure with concurrency', async () => {
      vi.spyOn(orchestrator, 'singleAgentTask').mockImplementation(
        async (agentName: string, prompt: string) => {
          const shouldFail = prompt.includes('fail');
          if (shouldFail) {
            return {
              success: false,
              output: '',
              cost: 0,
              tokensUsed: 0,
              error: `${agentName} failed`,
              metadata: { agentName },
            };
          }
          return {
            success: true,
            output: `${agentName} succeeded`,
            cost: 0.01,
            tokensUsed: 100,
            metadata: { agentName },
          };
        }
      );

      const tasks = [
        { agentName: 'agent1', prompt: 'ok' },
        { agentName: 'agent2', prompt: 'fail' },
        { agentName: 'agent3', prompt: 'ok' },
        { agentName: 'agent4', prompt: 'fail' },
        { agentName: 'agent5', prompt: 'ok' },
      ];

      const results = await orchestrator.parallelAgentTasks(tasks, 2);

      expect(results.filter((r) => r.success)).toHaveLength(3);
      expect(results.filter((r) => !r.success)).toHaveLength(2);
    });
  });

  describe('Graceful Degradation', () => {
    it('returns partial results when some agents are unavailable', async () => {
      vi.spyOn(orchestrator, 'singleAgentTask').mockImplementation(
        async (agentName: string) => {
          if (agentName === 'unavailable-agent') {
            return {
              success: false,
              output: '',
              cost: 0,
              tokensUsed: 0,
              error: 'Agent configuration not found',
              metadata: { agentName },
            };
          }
          return {
            success: true,
            output: `Response from ${agentName}`,
            cost: 0.01,
            tokensUsed: 100,
            metadata: { agentName },
          };
        }
      );

      const tasks = [
        { agentName: 'working-agent-1', prompt: 'task1' },
        { agentName: 'unavailable-agent', prompt: 'task2' },
        { agentName: 'working-agent-2', prompt: 'task3' },
      ];

      const results = await orchestrator.parallelAgentTasks(tasks);

      // Should still get results array with all positions filled
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Agent configuration not found');
      expect(results[2].success).toBe(true);
    });
  });
});
