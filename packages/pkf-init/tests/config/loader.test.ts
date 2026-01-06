/**
 * Unit tests for ConfigLoader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ConfigLoader } from '../../src/config/loader.js';
import type { InitOptions } from '../../src/types/index.js';

describe('ConfigLoader', () => {
  let tempDir: string;
  const originalEnv = process.env;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-init-config-test-'));

    // Reset environment
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    // Restore environment
    process.env = originalEnv;

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('API key loading', () => {
    it('loads API key from options', async () => {
      const options: InitOptions = {
        apiKey: 'sk-ant-test-key-from-options',
      };

      const loader = new ConfigLoader(options, tempDir);
      const config = await loader.load();

      expect(config.apiKey).toBe('sk-ant-test-key-from-options');
    });

    it('loads API key from environment', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-from-env';

      const options: InitOptions = {};
      const loader = new ConfigLoader(options, tempDir);
      const config = await loader.load();

      expect(config.apiKey).toBe('sk-ant-test-key-from-env');
    });

    it('throws error when no API key provided', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const savedOAuthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
      delete process.env.CLAUDE_CODE_OAUTH_TOKEN;

      try {
        const options: InitOptions = {};
        const loader = new ConfigLoader(options, tempDir);

        await expect(loader.load()).rejects.toThrow('Anthropic API key required');
      } finally {
        // Restore OAuth token if it was set
        if (savedOAuthToken) {
          process.env.CLAUDE_CODE_OAUTH_TOKEN = savedOAuthToken;
        }
      }
    });
  });

  describe('API key validation', () => {
    it('validates API key format starting with sk-ant-', async () => {
      const options: InitOptions = {
        apiKey: 'sk-ant-valid-format-123456',
      };

      const loader = new ConfigLoader(options, tempDir);
      const config = await loader.load();

      expect(config.apiKey).toBe('sk-ant-valid-format-123456');
    });

    it('throws error for invalid API key format', async () => {
      const options: InitOptions = {
        apiKey: 'invalid-key-format',
      };

      const loader = new ConfigLoader(options, tempDir);

      await expect(loader.load()).rejects.toThrow(
        "Invalid API key format. Key should start with 'sk-ant-'"
      );
    });
  });

  describe('PKF installation detection', () => {
    it('detects existing PKF installation when pkf.config.yaml exists', async () => {
      // Create pkf.config.yaml
      await fs.writeFile(path.join(tempDir, 'pkf.config.yaml'), 'version: 1.0.0');

      const options: InitOptions = {
        apiKey: 'sk-ant-test-key',
      };

      const loader = new ConfigLoader(options, tempDir);
      const config = await loader.load();

      expect(config.pkfInitialized).toBe(true);
    });

    it('returns false when no pkf.config.yaml exists', async () => {
      const options: InitOptions = {
        apiKey: 'sk-ant-test-key',
      };

      const loader = new ConfigLoader(options, tempDir);
      const config = await loader.load();

      expect(config.pkfInitialized).toBe(false);
    });
  });

  describe('default values', () => {
    it('uses default values correctly', async () => {
      const options: InitOptions = {
        apiKey: 'sk-ant-test-key',
      };

      const loader = new ConfigLoader(options, tempDir);
      const config = await loader.load();

      expect(config.apiTier).toBe('build1');
      expect(config.maxCost).toBe(50);
      expect(config.workers).toBe(3);
    });

    it('overrides defaults with options', async () => {
      const options: InitOptions = {
        apiKey: 'sk-ant-test-key',
        apiTier: 'build2',
        maxCost: 100,
        workers: 5,
        docsPath: 'documentation',
        output: 'output',
        backupDir: 'backups',
      };

      const loader = new ConfigLoader(options, tempDir);
      const config = await loader.load();

      expect(config.apiTier).toBe('build2');
      expect(config.maxCost).toBe(100);
      expect(config.workers).toBe(5);
    });
  });

  describe('path resolution', () => {
    it('resolves paths correctly', async () => {
      const options: InitOptions = {
        apiKey: 'sk-ant-test-key',
        docsPath: 'my-docs',
        output: 'my-output',
        backupDir: 'my-backup',
      };

      const loader = new ConfigLoader(options, tempDir);
      const config = await loader.load();

      expect(config.rootDir).toBe(path.resolve(tempDir));
      expect(config.docsDir).toBe(path.resolve(tempDir, 'my-docs'));
      expect(config.outputDir).toBe(path.resolve(tempDir, 'my-output'));
      expect(config.backupDir).toBe(path.resolve(tempDir, 'my-backup'));
    });

    it('uses default paths when options not provided', async () => {
      const options: InitOptions = {
        apiKey: 'sk-ant-test-key',
      };

      const loader = new ConfigLoader(options, tempDir);
      const config = await loader.load();

      expect(config.docsDir).toBe(path.resolve(tempDir, 'docs'));
      expect(config.outputDir).toBe(path.resolve(tempDir, '.'));
      expect(config.backupDir).toBe(path.resolve(tempDir, '.pkf-backup'));
    });
  });

  describe('missing options handling', () => {
    it('handles missing options gracefully', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-from-env';

      // Empty options object
      const options: InitOptions = {};

      const loader = new ConfigLoader(options, tempDir);
      const config = await loader.load();

      // Should use defaults and env var
      expect(config.apiKey).toBe('sk-ant-test-key-from-env');
      expect(config.apiTier).toBe('build1');
      expect(config.maxCost).toBe(50);
      expect(config.workers).toBe(3);
      expect(config.pkfInitialized).toBe(false);
    });
  });
});
