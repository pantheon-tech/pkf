/**
 * Tests for PKF configuration loading
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { loadPKFConfig, getDefaultConfig } from '../../src/config/pkf-config.js';

describe('PKF Configuration', () => {
  const testConfigDir = path.join(process.cwd(), '.test-config');
  const testConfigPath = path.join(testConfigDir, 'pkf-config.yaml');

  beforeEach(async () => {
    // Create test config directory
    await fs.mkdir(testConfigDir, { recursive: true });

    // Clear environment variables
    delete process.env.PKF_MAX_PARALLEL_INSPECTIONS;
    delete process.env.PKF_MAX_ITERATIONS;
    delete process.env.PKF_AVG_OUTPUT_TOKENS_PER_DOC;
    delete process.env.PKF_MAX_RETRIES;
    delete process.env.PKF_RETRY_DELAY_MS;
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration values', () => {
      const config = getDefaultConfig();

      expect(config).toEqual({
        analysis: {
          maxParallelInspections: 3,
        },
        orchestration: {
          maxIterations: 5,
        },
        planning: {
          avgOutputTokensPerDoc: 1000,
        },
        api: {
          maxRetries: 3,
          retryDelayMs: 1000,
        },
      });
    });
  });

  describe('loadPKFConfig without file', () => {
    it('should return default values when no config file provided', async () => {
      const config = await loadPKFConfig();

      expect(config.analysis.maxParallelInspections).toBe(3);
      expect(config.orchestration.maxIterations).toBe(5);
      expect(config.planning.avgOutputTokensPerDoc).toBe(1000);
      expect(config.api.maxRetries).toBe(3);
      expect(config.api.retryDelayMs).toBe(1000);
    });

    it('should return default values when config file does not exist', async () => {
      const config = await loadPKFConfig('/nonexistent/path/config.yaml');

      expect(config.analysis.maxParallelInspections).toBe(3);
      expect(config.orchestration.maxIterations).toBe(5);
    });
  });

  describe('loadPKFConfig with YAML file', () => {
    it('should load and merge configuration from YAML file', async () => {
      // Create test config file
      const yamlContent = `
analysis:
  maxParallelInspections: 5
orchestration:
  maxIterations: 10
planning:
  avgOutputTokensPerDoc: 1500
api:
  maxRetries: 5
  retryDelayMs: 2000
`;
      await fs.writeFile(testConfigPath, yamlContent, 'utf-8');

      const config = await loadPKFConfig(testConfigPath);

      expect(config.analysis.maxParallelInspections).toBe(5);
      expect(config.orchestration.maxIterations).toBe(10);
      expect(config.planning.avgOutputTokensPerDoc).toBe(1500);
      expect(config.api.maxRetries).toBe(5);
      expect(config.api.retryDelayMs).toBe(2000);
    });

    it('should merge partial configuration with defaults', async () => {
      // Create test config file with only some values
      const yamlContent = `
analysis:
  maxParallelInspections: 7
orchestration:
  maxIterations: 8
`;
      await fs.writeFile(testConfigPath, yamlContent, 'utf-8');

      const config = await loadPKFConfig(testConfigPath);

      // Check overridden values
      expect(config.analysis.maxParallelInspections).toBe(7);
      expect(config.orchestration.maxIterations).toBe(8);

      // Check default values still present
      expect(config.planning.avgOutputTokensPerDoc).toBe(1000);
      expect(config.api.maxRetries).toBe(3);
      expect(config.api.retryDelayMs).toBe(1000);
    });

    it('should handle empty config file', async () => {
      await fs.writeFile(testConfigPath, '', 'utf-8');

      const config = await loadPKFConfig(testConfigPath);

      // Should use defaults
      expect(config.analysis.maxParallelInspections).toBe(3);
      expect(config.orchestration.maxIterations).toBe(5);
    });
  });

  describe('environment variable overrides', () => {
    it('should override config values with environment variables', async () => {
      process.env.PKF_MAX_PARALLEL_INSPECTIONS = '10';
      process.env.PKF_MAX_ITERATIONS = '15';
      process.env.PKF_AVG_OUTPUT_TOKENS_PER_DOC = '2000';
      process.env.PKF_MAX_RETRIES = '7';
      process.env.PKF_RETRY_DELAY_MS = '3000';

      const config = await loadPKFConfig();

      expect(config.analysis.maxParallelInspections).toBe(10);
      expect(config.orchestration.maxIterations).toBe(15);
      expect(config.planning.avgOutputTokensPerDoc).toBe(2000);
      expect(config.api.maxRetries).toBe(7);
      expect(config.api.retryDelayMs).toBe(3000);
    });

    it('should override file config with environment variables', async () => {
      // Create test config file
      const yamlContent = `
analysis:
  maxParallelInspections: 5
orchestration:
  maxIterations: 10
`;
      await fs.writeFile(testConfigPath, yamlContent, 'utf-8');

      // Set environment variable
      process.env.PKF_MAX_PARALLEL_INSPECTIONS = '20';

      const config = await loadPKFConfig(testConfigPath);

      // Environment variable should override file value
      expect(config.analysis.maxParallelInspections).toBe(20);
      // File value should still be used
      expect(config.orchestration.maxIterations).toBe(10);
    });

    it('should ignore invalid environment variable values', async () => {
      process.env.PKF_MAX_PARALLEL_INSPECTIONS = 'invalid';
      process.env.PKF_MAX_ITERATIONS = '-5'; // Still parseable but invalid (negative)

      const config = await loadPKFConfig();

      // Should use defaults for invalid value
      expect(config.analysis.maxParallelInspections).toBe(3);
      // Negative value should be ignored (fails validation)
      expect(config.orchestration.maxIterations).toBe(5);
    });

    it('should accept zero for maxRetries', async () => {
      process.env.PKF_MAX_RETRIES = '0';

      const config = await loadPKFConfig();

      // Zero is valid for maxRetries (no retries)
      expect(config.api.maxRetries).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid YAML syntax', async () => {
      // Create invalid YAML
      const invalidYaml = `
analysis:
  maxParallelInspections: [unclosed array
`;
      await fs.writeFile(testConfigPath, invalidYaml, 'utf-8');

      await expect(loadPKFConfig(testConfigPath)).rejects.toThrow();
    });
  });

  describe('configuration immutability', () => {
    it('should return independent config objects', async () => {
      const config1 = await loadPKFConfig();
      const config2 = await loadPKFConfig();

      // Modify first config
      config1.analysis.maxParallelInspections = 999;

      // Second config should be unchanged
      expect(config2.analysis.maxParallelInspections).toBe(3);
    });
  });
});
