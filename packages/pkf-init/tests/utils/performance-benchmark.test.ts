/**
 * Tests for Performance Benchmark utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceBenchmark } from '../../src/utils/performance-benchmark.js';

describe('PerformanceBenchmark', () => {
  let benchmark: PerformanceBenchmark;

  beforeEach(() => {
    benchmark = new PerformanceBenchmark();
  });

  describe('Basic Measurements', () => {
    it('should measure synchronous operations', () => {
      const result = benchmark.measureSync('test-sync', () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBe(499500);
      const measurements = benchmark.getMeasurements();
      expect(measurements).toHaveLength(1);
      expect(measurements[0].operation).toBe('test-sync');
      expect(measurements[0].durationMs).toBeGreaterThan(0);
    });

    it('should measure asynchronous operations', async () => {
      const result = await benchmark.measure('test-async', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'done';
      });

      expect(result).toBe('done');
      const measurements = benchmark.getMeasurements();
      expect(measurements).toHaveLength(1);
      expect(measurements[0].operation).toBe('test-async');
      expect(measurements[0].durationMs).toBeGreaterThanOrEqual(10);
    });

    it('should track metadata', async () => {
      await benchmark.measure(
        'test-metadata',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
        },
        { files: 10, size: 1000 }
      );

      const measurements = benchmark.getMeasurements();
      expect(measurements[0].metadata).toEqual({ files: 10, size: 1000 });
    });
  });

  describe('Manual Start/End', () => {
    it('should allow manual start and end', async () => {
      benchmark.start('manual-test');
      await new Promise((resolve) => setTimeout(resolve, 10));
      const measurement = benchmark.end('manual-test');

      expect(measurement).not.toBeNull();
      expect(measurement!.operation).toBe('manual-test');
      expect(measurement!.durationMs).toBeGreaterThanOrEqual(10);
    });

    it('should return null for unknown operations', () => {
      const measurement = benchmark.end('unknown');
      expect(measurement).toBeNull();
    });
  });

  describe('Multiple Measurements', () => {
    it('should track multiple operations', async () => {
      await benchmark.measure('op1', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      await benchmark.measure('op2', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      await benchmark.measure('op3', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      const measurements = benchmark.getMeasurements();
      expect(measurements).toHaveLength(3);
      expect(measurements.map((m) => m.operation)).toEqual(['op1', 'op2', 'op3']);
    });
  });

  describe('Memory Tracking', () => {
    it('should track memory usage', async () => {
      await benchmark.measure('memory-test', async () => {
        // Allocate some memory
        const arr = new Array(1000000).fill(0);
        await new Promise((resolve) => setTimeout(resolve, 5));
        return arr.length;
      });

      const measurements = benchmark.getMeasurements();
      expect(measurements[0].peakMemoryMb).toBeGreaterThan(0);
    });

    it('should track peak memory across operations', async () => {
      await benchmark.measure('small-op', async () => {
        const arr = new Array(100).fill(0);
        return arr.length;
      });

      await benchmark.measure('large-op', async () => {
        const arr = new Array(10000000).fill(0);
        return arr.length;
      });

      const summary = benchmark.getSummary();
      const measurements = benchmark.getMeasurements();

      // Peak should be from the larger operation
      expect(summary.peakMemoryMb).toBeGreaterThan(0);
      expect(measurements[1].peakMemoryMb).toBeGreaterThanOrEqual(
        measurements[0].peakMemoryMb
      );
    });
  });

  describe('Summary', () => {
    it('should generate summary', async () => {
      await benchmark.measure('op1', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await benchmark.measure('op2', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const summary = benchmark.getSummary();

      expect(summary.totalDurationMs).toBeGreaterThanOrEqual(15);
      expect(summary.peakMemoryMb).toBeGreaterThan(0);
      expect(summary.avgMemoryMb).toBeGreaterThan(0);
      expect(summary.measurements).toHaveLength(2);
      expect(summary.system.platform).toBeTruthy();
      expect(summary.system.cpus).toBeGreaterThan(0);
      expect(summary.system.totalMemoryMb).toBeGreaterThan(0);
    });

    it('should format summary as text', async () => {
      await benchmark.measure('test-op', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }, { custom: 'data' });

      const formatted = benchmark.formatSummary();

      expect(formatted).toContain('Performance Benchmark Summary');
      expect(formatted).toContain('Total Duration:');
      expect(formatted).toContain('Peak Memory:');
      expect(formatted).toContain('test-op:');
      expect(formatted).toContain('Metadata:');
    });
  });

  describe('Error Handling', () => {
    it('should track errors in async operations', async () => {
      await expect(
        benchmark.measure('error-op', async () => {
          throw new Error('Test error');
        }, { test: true })
      ).rejects.toThrow('Test error');

      const measurements = benchmark.getMeasurements();
      expect(measurements).toHaveLength(1);
      expect(measurements[0].metadata?.error).toBe(true);
    });

    it('should track errors in sync operations', () => {
      expect(() =>
        benchmark.measureSync('error-sync', () => {
          throw new Error('Sync error');
        })
      ).toThrow('Sync error');

      const measurements = benchmark.getMeasurements();
      expect(measurements).toHaveLength(1);
      expect(measurements[0].metadata?.error).toBe(true);
    });
  });

  describe('Clear', () => {
    it('should clear all measurements', async () => {
      await benchmark.measure('op1', async () => {});
      await benchmark.measure('op2', async () => {});

      expect(benchmark.getMeasurements()).toHaveLength(2);

      benchmark.clear();

      expect(benchmark.getMeasurements()).toHaveLength(0);
      const summary = benchmark.getSummary();
      expect(summary.totalDurationMs).toBe(0);
      expect(summary.peakMemoryMb).toBe(0);
    });
  });

  describe('JSON Export', () => {
    it('should export as JSON', async () => {
      await benchmark.measure('test', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      const json = benchmark.toJSON();

      expect(json).toHaveProperty('totalDurationMs');
      expect(json).toHaveProperty('peakMemoryMb');
      expect(json).toHaveProperty('measurements');
      expect(json).toHaveProperty('system');
      expect(json.measurements).toHaveLength(1);
    });
  });
});
