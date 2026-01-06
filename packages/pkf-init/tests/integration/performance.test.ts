/**
 * Integration tests for performance optimizations
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TokenEstimator } from '../../src/utils/token-estimator.js';
import { PerformanceBenchmark } from '../../src/utils/performance-benchmark.js';

describe('Performance Integration Tests', () => {
  describe('Token Estimation Caching', () => {
    it('should cache repeated estimations efficiently', () => {
      TokenEstimator.clearCache();

      const largeText = 'Lorem ipsum dolor sit amet. '.repeat(100);
      const iterations = 100; // Reduced for more stable test

      // Measure without cache
      TokenEstimator.clearCache();
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        TokenEstimator.clearCache();
        TokenEstimator.estimate(largeText);
      }
      const duration1 = performance.now() - start1;

      // Measure with cache
      TokenEstimator.clearCache();
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        TokenEstimator.estimate(largeText); // All cached after first
      }
      const duration2 = performance.now() - start2;

      // Cached should be faster (or at least not slower)
      expect(duration2).toBeLessThan(duration1 * 1.2);

      // Verify cache is working
      expect(TokenEstimator.getCacheStats().size).toBe(1);
    });

    it('should maintain cache efficiency with many different texts', () => {
      TokenEstimator.clearCache();

      const texts = Array.from({ length: 100 }, (_, i) => `Text ${i}: ${'a'.repeat(100)}`);

      // First pass - populate cache
      const start1 = performance.now();
      texts.forEach(text => TokenEstimator.estimate(text));
      const duration1 = performance.now() - start1;

      // Second pass - all cached
      const start2 = performance.now();
      texts.forEach(text => TokenEstimator.estimate(text));
      const duration2 = performance.now() - start2;

      // Cached should be faster
      expect(duration2).toBeLessThan(duration1);

      // Verify all are cached
      const stats = TokenEstimator.getCacheStats();
      expect(stats.size).toBe(100);
    });
  });

  describe('Parallel File Operations', () => {
    it('should handle parallel file reads efficiently', async () => {
      // Create temporary test files
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-perf-test-'));
      const fileCount = 50;
      const files: string[] = [];

      try {
        // Create test files
        for (let i = 0; i < fileCount; i++) {
          const filePath = path.join(tmpDir, `test-${i}.md`);
          await fs.writeFile(filePath, `# Test File ${i}\n\nContent for file ${i}\n`.repeat(10), 'utf-8');
          files.push(filePath);
        }

        const benchmark = new PerformanceBenchmark();

        // Sequential read (baseline)
        const sequentialResults = await benchmark.measure('sequential-read', async () => {
          const contents: string[] = [];
          for (const file of files) {
            const content = await fs.readFile(file, 'utf-8');
            contents.push(content);
          }
          return contents;
        });

        // Parallel read (optimized)
        const parallelResults = await benchmark.measure('parallel-read', async () => {
          return Promise.all(
            files.map(file => fs.readFile(file, 'utf-8'))
          );
        });

        const measurements = benchmark.getMeasurements();
        const seqMeasurement = measurements.find(m => m.operation === 'sequential-read')!;
        const parMeasurement = measurements.find(m => m.operation === 'parallel-read')!;

        // Parallel should be faster (allow small margin for overhead)
        expect(parMeasurement.durationMs).toBeLessThan(seqMeasurement.durationMs * 0.8);

        // Verify results are same length
        expect(sequentialResults).toHaveLength(fileCount);
        expect(parallelResults).toHaveLength(fileCount);
      } finally {
        // Cleanup
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should batch process large file sets efficiently', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-batch-test-'));
      const fileCount = 100;
      const files: string[] = [];

      try {
        // Create test files
        for (let i = 0; i < fileCount; i++) {
          const filePath = path.join(tmpDir, `batch-${i}.md`);
          await fs.writeFile(filePath, `Content ${i}\n`, 'utf-8');
          files.push(filePath);
        }

        const benchmark = new PerformanceBenchmark();
        const batchSize = 20;

        // Process in batches
        const batchResults = await benchmark.measure('batch-processing', async () => {
          const results: string[] = [];
          for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchContents = await Promise.all(
              batch.map(file => fs.readFile(file, 'utf-8'))
            );
            results.push(...batchContents);
          }
          return results;
        });

        expect(batchResults).toHaveLength(fileCount);

        const summary = benchmark.getSummary();
        // Should complete in reasonable time (< 1 second for 100 small files)
        expect(summary.totalDurationMs).toBeLessThan(1000);

        // Memory should stay reasonable (< 50MB delta)
        const measurement = benchmark.getMeasurements()[0];
        expect(measurement.memoryDeltaMb).toBeLessThan(50);
      } finally {
        // Cleanup
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('Memory Usage', () => {
    it('should maintain reasonable memory usage during operations', async () => {
      const benchmark = new PerformanceBenchmark();

      await benchmark.measure('memory-test', async () => {
        // Simulate processing many documents
        const documents = Array.from({ length: 1000 }, (_, i) => ({
          path: `doc-${i}.md`,
          content: `# Document ${i}\n\n${'Lorem ipsum dolor sit amet. '.repeat(50)}`,
        }));

        // Process with token estimation
        const tokenCounts = documents.map(doc =>
          TokenEstimator.estimate(doc.content)
        );

        expect(tokenCounts).toHaveLength(1000);
      });

      const summary = benchmark.getSummary();

      // Peak memory should stay under 500MB as per requirements
      expect(summary.peakMemoryMb).toBeLessThan(500);
    });
  });

  describe('Performance Benchmark Integration', () => {
    it('should track multiple concurrent operations', async () => {
      const benchmark = new PerformanceBenchmark();

      // Simulate concurrent file operations
      await Promise.all([
        benchmark.measure('task-1', async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
        }),
        benchmark.measure('task-2', async () => {
          await new Promise(resolve => setTimeout(resolve, 15));
        }),
        benchmark.measure('task-3', async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        }),
      ]);

      const measurements = benchmark.getMeasurements();
      expect(measurements).toHaveLength(3);

      // All tasks should have measurements
      expect(measurements.every(m => m.durationMs > 0)).toBe(true);
      expect(measurements.every(m => m.peakMemoryMb > 0)).toBe(true);
    });

    it('should provide useful summary statistics', async () => {
      const benchmark = new PerformanceBenchmark();

      await benchmark.measure('op1', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      }, { size: 100 });

      await benchmark.measure('op2', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      }, { size: 200 });

      const summary = benchmark.getSummary();
      const formatted = benchmark.formatSummary();

      expect(summary.measurements).toHaveLength(2);
      expect(summary.totalDurationMs).toBeGreaterThan(15);
      expect(formatted).toContain('Performance Benchmark Summary');
      expect(formatted).toContain('op1:');
      expect(formatted).toContain('op2:');
      expect(formatted).toContain('size');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should efficiently process repository scan simulation', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-repo-test-'));

      try {
        // Create a mock repository structure
        const dirs = ['docs', 'docs/guides', 'docs/api', 'src'];
        for (const dir of dirs) {
          await fs.mkdir(path.join(tmpDir, dir), { recursive: true });
        }

        // Create markdown files
        const mdFiles = [
          'README.md',
          'CONTRIBUTING.md',
          'docs/index.md',
          'docs/guides/getting-started.md',
          'docs/guides/advanced.md',
          'docs/api/reference.md',
        ];

        for (const file of mdFiles) {
          const filePath = path.join(tmpDir, file);
          await fs.writeFile(
            filePath,
            `# ${file}\n\n${'Lorem ipsum dolor sit amet. '.repeat(20)}`,
            'utf-8'
          );
        }

        const benchmark = new PerformanceBenchmark();

        // Simulate parallel scan and processing
        await benchmark.measure('repository-scan', async () => {
          // Read all files in parallel
          const contents = await Promise.all(
            mdFiles.map(file => fs.readFile(path.join(tmpDir, file), 'utf-8'))
          );

          // Estimate tokens for all files (with caching)
          const tokenCounts = contents.map(content =>
            TokenEstimator.estimate(content)
          );

          return { contents, tokenCounts };
        });

        const summary = benchmark.getSummary();

        // Should complete quickly for small repo
        expect(summary.totalDurationMs).toBeLessThan(200);

        // Memory should stay low
        expect(summary.peakMemoryMb).toBeLessThan(100);
      } finally {
        // Cleanup
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
