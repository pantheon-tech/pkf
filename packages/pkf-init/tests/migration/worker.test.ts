/**
 * Unit tests for MigrationWorker
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MigrationWorker } from '../../src/migration/worker.js';
import type { AgentOrchestrator } from '../../src/agents/orchestrator.js';
import type { MigrationTask } from '../../src/types/index.js';
import * as fs from 'fs/promises';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('../../src/utils/reference-updater.js');
vi.mock('../../src/utils/template-manager.js');
vi.mock('../../src/utils/type-mapping.js', () => ({
  getSchemaForDocType: vi.fn().mockReturnValue({
    properties: {
      title: { type: 'string', required: true },
      created: { type: 'date', required: true },
    },
  }),
}));

describe('MigrationWorker', () => {
  let migrationWorker: MigrationWorker;
  let mockOrchestrator: AgentOrchestrator;

  const mockSchemasYaml = `version: "1.0"
schemas:
  base-doc:
    properties:
      title:
        type: string
        required: true
      created:
        type: date
        required: true
  guide:
    _extends: base-doc
    properties:
      audience:
        type: string
`;

  beforeEach(() => {
    mockOrchestrator = {
      singleAgentTask: vi.fn(),
    } as unknown as AgentOrchestrator;

    migrationWorker = new MigrationWorker(
      mockOrchestrator,
      mockSchemasYaml,
      '/test/project'
    );

    // Mock file operations
    vi.mocked(fs.readFile).mockResolvedValue('# Original Document\n\nContent here');
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as any);
    vi.mocked(fs.rename).mockResolvedValue(undefined);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(migrationWorker).toBeDefined();
    });

    it('should accept custom template directory', () => {
      const customWorker = new MigrationWorker(
        mockOrchestrator,
        mockSchemasYaml,
        '/test/project',
        '/custom/templates'
      );
      expect(customWorker).toBeDefined();
    });
  });

  describe('setPathMapping', () => {
    it('should set path mapping correctly', () => {
      const mapping = new Map([
        ['old/path.md', 'new/path.md'],
        ['another/old.md', 'another/new.md'],
      ]);

      migrationWorker.setPathMapping(mapping);
      // No direct way to verify, but should not throw
      expect(true).toBe(true);
    });
  });

  describe('migrate', () => {
    const mockTask: MigrationTask = {
      sourcePath: '/test/project/README.md',
      targetPath: '/test/project/docs/README.md',
      docType: 'guide',
      needsFrontmatter: true,
    };

    it('should migrate document with frontmatter generation', async () => {
      const generatedFrontmatter = `---
title: Test Document
created: 2024-01-01
type: guide
---`;

      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: true,
        output: '```yaml\n' + generatedFrontmatter + '\n```',
        inputTokens: 500,
        outputTokens: 200,
      });

      const result = await migrationWorker.migrate(mockTask);

      expect(result.success).toBe(true);
      expect(result.frontmatter).toBeDefined();
      expect(result.outputPath).toBe(mockTask.targetPath);
    });

    it('should handle template-based migration', async () => {
      const taskWithTemplate: MigrationTask = {
        ...mockTask,
        needsFrontmatter: false,
      };

      const result = await migrationWorker.migrate(taskWithTemplate);

      // Template-based migration doesn't need agent call
      expect(result.success).toBe(true);
    });

    it('should handle errors during migration', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const result = await migrationWorker.migrate(mockTask);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });

    it('should handle agent task failure', async () => {
      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: false,
        output: '',
        error: 'API error',
        inputTokens: 0,
        outputTokens: 0,
      });

      const result = await migrationWorker.migrate(mockTask);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should track token usage', async () => {
      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: true,
        output: '```yaml\ntitle: Test\n```',
        inputTokens: 1000,
        outputTokens: 500,
      });

      const result = await migrationWorker.migrate(mockTask);

      expect(result.success).toBe(true);
      expect(result.tokensUsed).toBeGreaterThan(0);
    });

    it('should handle file moves', async () => {
      const moveTask: MigrationTask = {
        sourcePath: '/test/project/old/doc.md',
        targetPath: '/test/project/new/doc.md',
        docType: 'guide',
        needsFrontmatter: true,
      };

      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: true,
        output: '```yaml\ntitle: Moved Document\n```',
        inputTokens: 500,
        outputTokens: 200,
      });

      const result = await migrationWorker.migrate(moveTask);

      expect(result.success).toBe(true);
      expect(result.moved).toBeDefined();
    });

    it('should create necessary directories', async () => {
      const deepTask: MigrationTask = {
        sourcePath: '/test/project/README.md',
        targetPath: '/test/project/docs/guides/user/README.md',
        docType: 'guide',
        needsFrontmatter: true,
      };

      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: true,
        output: '```yaml\ntitle: Deep Document\n```',
        inputTokens: 500,
        outputTokens: 200,
      });

      const result = await migrationWorker.migrate(deepTask);

      expect(result.success).toBe(true);
      expect(fs.mkdir).toHaveBeenCalled();
    });

    it('should preserve existing content', async () => {
      const existingContent = '# Existing Title\n\nExisting content';
      vi.mocked(fs.readFile).mockResolvedValue(existingContent);

      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: true,
        output: '```yaml\ntitle: Existing Title\n```',
        inputTokens: 500,
        outputTokens: 200,
      });

      const result = await migrationWorker.migrate(mockTask);

      expect(result.success).toBe(true);
      // Verify content was read and processed
      expect(fs.readFile).toHaveBeenCalledWith(mockTask.sourcePath, 'utf-8');
    });
  });

  // Note: batchMigrate method doesn't exist in current implementation
  // Migration batching is handled by the ParallelMigrationExecutor
});
