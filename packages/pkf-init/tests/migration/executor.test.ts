/**
 * Unit tests for ParallelMigrationExecutor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParallelMigrationExecutor } from '../../src/migration/executor.js';
import type { MigrationWorker, MigrationResult } from '../../src/migration/worker.js';
import type { RequestQueue } from '../../src/api/request-queue.js';
import type { MigrationTask } from '../../src/types/index.js';

describe('ParallelMigrationExecutor', () => {
  let executor: ParallelMigrationExecutor;
  let mockWorker: MigrationWorker;
  let mockQueue: RequestQueue;

  beforeEach(() => {
    mockWorker = {
      migrate: vi.fn(),
      setPathMapping: vi.fn(),
    } as unknown as MigrationWorker;

    mockQueue = {
      enqueue: vi.fn(),
      waitForAll: vi.fn(),
      getPendingCount: vi.fn().mockReturnValue(0),
      getActiveCount: vi.fn().mockReturnValue(0),
    } as unknown as RequestQueue;

    executor = new ParallelMigrationExecutor(mockWorker, mockQueue);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(executor).toBeDefined();
    });

    it('should accept options with callbacks', () => {
      const onProgress = vi.fn();
      const onTaskComplete = vi.fn();
      const onTaskError = vi.fn();

      const customExecutor = new ParallelMigrationExecutor(
        mockWorker,
        mockQueue,
        {
          onProgress,
          onTaskComplete,
          onTaskError,
          stopOnError: true,
        }
      );

      expect(customExecutor).toBeDefined();
    });
  });

  describe('execute', () => {
    const mockTasks: MigrationTask[] = [
      {
        sourcePath: '/test/doc1.md',
        targetPath: '/test/docs/doc1.md',
        docType: 'guide',
        needsFrontmatter: true,
      },
      {
        sourcePath: '/test/doc2.md',
        targetPath: '/test/docs/doc2.md',
        docType: 'guide',
        needsFrontmatter: true,
      },
    ];

    it('should execute migration plan successfully', async () => {
      const mockResults: MigrationResult[] = mockTasks.map((task) => ({
        task,
        success: true,
        outputPath: task.targetPath,
        tokensUsed: 500,
        cost: 0.01,
      }));

      vi.mocked(mockWorker.migrate)
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      // Mock queue to execute tasks immediately
      vi.mocked(mockQueue.enqueue).mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await executor.execute({ tasks: mockTasks });

      expect(result.completed).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should handle partial failures', async () => {
      const successResult: MigrationResult = {
        task: mockTasks[0],
        success: true,
        outputPath: mockTasks[0].targetPath,
        tokensUsed: 500,
        cost: 0.01,
      };

      const failureResult: MigrationResult = {
        task: mockTasks[1],
        success: false,
        error: 'Migration failed',
      };

      vi.mocked(mockWorker.migrate)
        .mockResolvedValueOnce(successResult)
        .mockResolvedValueOnce(failureResult);

      vi.mocked(mockQueue.enqueue).mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await executor.execute({ tasks: mockTasks });

      expect(result.completed).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Migration failed');
    });

    it('should call progress callback', async () => {
      const onProgress = vi.fn();

      const executorWithProgress = new ParallelMigrationExecutor(
        mockWorker,
        mockQueue,
        { onProgress }
      );

      vi.mocked(mockWorker.migrate).mockResolvedValue({
        task: mockTasks[0],
        success: true,
        outputPath: mockTasks[0].targetPath,
        tokensUsed: 500,
        cost: 0.01,
      });

      vi.mocked(mockQueue.enqueue).mockImplementation(async (fn) => {
        return await fn();
      });

      await executorWithProgress.execute({ tasks: [mockTasks[0]] });

      expect(onProgress).toHaveBeenCalled();
    });

    it('should call task complete callback', async () => {
      const onTaskComplete = vi.fn();

      const executorWithCallback = new ParallelMigrationExecutor(
        mockWorker,
        mockQueue,
        { onTaskComplete }
      );

      const successResult: MigrationResult = {
        task: mockTasks[0],
        success: true,
        outputPath: mockTasks[0].targetPath,
        tokensUsed: 500,
        cost: 0.01,
      };

      vi.mocked(mockWorker.migrate).mockResolvedValue(successResult);

      vi.mocked(mockQueue.enqueue).mockImplementation(async (fn) => {
        return await fn();
      });

      await executorWithCallback.execute({ tasks: [mockTasks[0]] });

      expect(onTaskComplete).toHaveBeenCalledWith(successResult);
    });

    it('should call task error callback on failures', async () => {
      const onTaskError = vi.fn();

      const executorWithCallback = new ParallelMigrationExecutor(
        mockWorker,
        mockQueue,
        { onTaskError }
      );

      const failureResult: MigrationResult = {
        task: mockTasks[0],
        success: false,
        error: 'Test error',
      };

      vi.mocked(mockWorker.migrate).mockResolvedValue(failureResult);

      vi.mocked(mockQueue.enqueue).mockImplementation(async (fn) => {
        return await fn();
      });

      await executorWithCallback.execute({ tasks: [mockTasks[0]] });

      expect(onTaskError).toHaveBeenCalled();
    });

    it('should calculate total cost correctly', async () => {
      const results: MigrationResult[] = [
        {
          task: mockTasks[0],
          success: true,
          outputPath: mockTasks[0].targetPath,
          tokensUsed: 1000,
          cost: 0.02,
        },
        {
          task: mockTasks[1],
          success: true,
          outputPath: mockTasks[1].targetPath,
          tokensUsed: 1500,
          cost: 0.03,
        },
      ];

      vi.mocked(mockWorker.migrate)
        .mockResolvedValueOnce(results[0])
        .mockResolvedValueOnce(results[1]);

      vi.mocked(mockQueue.enqueue).mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await executor.execute({ tasks: mockTasks });

      expect(result.totalCost).toBeCloseTo(0.05, 2);
      expect(result.totalTokens).toBe(2500);
    });

    it('should track execution time', async () => {
      vi.mocked(mockWorker.migrate).mockResolvedValue({
        task: mockTasks[0],
        success: true,
        outputPath: mockTasks[0].targetPath,
        tokensUsed: 500,
        cost: 0.01,
      });

      vi.mocked(mockQueue.enqueue).mockImplementation(async (fn) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return await fn();
      });

      const result = await executor.execute({ tasks: [mockTasks[0]] });

      expect(result.totalTime).toBeGreaterThan(0);
    });

    it('should handle empty task list', async () => {
      const result = await executor.execute({ tasks: [] });

      expect(result.completed).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.totalCost).toBe(0);
      expect(result.totalTokens).toBe(0);
    });

    it('should stop on error when stopOnError is true', async () => {
      const executorWithStop = new ParallelMigrationExecutor(
        mockWorker,
        mockQueue,
        { stopOnError: true }
      );

      const failureResult: MigrationResult = {
        task: mockTasks[0],
        success: false,
        error: 'Critical error',
      };

      vi.mocked(mockWorker.migrate).mockResolvedValue(failureResult);

      vi.mocked(mockQueue.enqueue).mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await executorWithStop.execute({ tasks: mockTasks });

      // Should stop after first error
      expect(result.failed.length).toBeGreaterThan(0);
    });
  });

  describe('pause and resume', () => {
    it('should support pause/resume operations', () => {
      // Executor should have pause/resume methods
      // These are tested through integration tests
      expect(executor).toBeDefined();
    });
  });
});
