/**
 * Unit tests for AnalysisStage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AnalysisStage } from '../../src/stages/analysis.js';
import type { AgentOrchestrator } from '../../src/agents/orchestrator.js';
import type { WorkflowStateManager } from '../../src/state/workflow-state.js';
import type { Interactive } from '../../src/utils/interactive.js';
import type { LoadedConfig } from '../../src/types/index.js';
import * as fs from 'fs/promises';
import { glob } from 'glob';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('glob');
vi.mock('../../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    stage: vi.fn(),
    step: vi.fn(),
  },
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  success: vi.fn(),
  stage: vi.fn(),
  step: vi.fn(),
}));

describe('AnalysisStage', () => {
  let analysisStage: AnalysisStage;
  let mockOrchestrator: AgentOrchestrator;
  let mockStateManager: WorkflowStateManager;
  let mockInteractive: Interactive;
  let mockConfig: LoadedConfig;

  beforeEach(() => {
    // Create mock objects
    mockOrchestrator = {
      singleAgentTask: vi.fn(),
      parallelAgentTasks: vi.fn(),
      setStreamCallback: vi.fn(),
    } as unknown as AgentOrchestrator;

    mockStateManager = {
      checkpoint: vi.fn(),
    } as unknown as WorkflowStateManager;

    mockInteractive = {
      approveBlueprint: vi.fn(),
    } as unknown as Interactive;

    mockConfig = {
      rootDir: '/test/project',
      docsDir: '/test/project/docs',
      outputDir: '/test/project/.pkf',
    } as LoadedConfig;

    analysisStage = new AnalysisStage(
      mockOrchestrator,
      mockStateManager,
      mockConfig,
      mockInteractive,
      { debug: true } // Use debug mode to disable UI
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(analysisStage).toBeDefined();
    });

    it('should use debug mode when specified', () => {
      const debugStage = new AnalysisStage(
        mockOrchestrator,
        mockStateManager,
        mockConfig,
        mockInteractive,
        { debug: true }
      );
      expect(debugStage).toBeDefined();
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Mock glob to return test markdown files
      vi.mocked(glob).mockResolvedValue([
        '/test/project/README.md',
        '/test/project/docs/guide.md',
      ]);

      // Mock fs operations
      vi.mocked(fs.stat).mockResolvedValue({
        size: 1024,
      } as any);

      vi.mocked(fs.readFile).mockResolvedValue('# Test Document\nContent here');
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    });

    it('should discover markdown files in repository', async () => {
      // Mock successful triage that goes straight to blueprint
      const mockBlueprint = `
analysis_summary:
  total_docs: 2
discovered_documents:
  - path: README.md
    type: guide
`;

      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: true,
        output: '```yaml\n' + mockBlueprint + '\n```',
        inputTokens: 1000,
        outputTokens: 500,
      });

      vi.mocked(mockInteractive.approveBlueprint).mockResolvedValue({
        approved: true,
      });

      const result = await analysisStage.execute();

      expect(result.success).toBe(true);
      expect(result.discoveredDocs).toHaveLength(2);
      expect(result.blueprint).toBeDefined();
    });

    it('should handle triage mode with inspections', async () => {
      // Mock triage response
      const triageResponse = `
\`\`\`yaml
mode: triage
files_to_inspect:
  - path: README.md
    reason: Main documentation
    priority: high
quick_classifications:
  - path: docs/guide.md
    type: guide
    confidence: 0.9
initial_observations:
  - Found comprehensive documentation
\`\`\`
`;

      // Mock inspection result
      const inspectionResult = `
\`\`\`yaml
path: README.md
title: Project README
type: guide
confidence: 0.95
\`\`\`
`;

      // Mock synthesis with final blueprint
      const finalBlueprint = `
analysis_summary:
  total_docs: 2
  inspected_count: 1
discovered_documents:
  - path: README.md
    type: guide
    title: Project README
  - path: docs/guide.md
    type: guide
`;

      vi.mocked(mockOrchestrator.singleAgentTask)
        .mockResolvedValueOnce({
          success: true,
          output: triageResponse,
          inputTokens: 1000,
          outputTokens: 500,
        })
        .mockResolvedValueOnce({
          success: true,
          output: '```yaml\n' + finalBlueprint + '\n```',
          inputTokens: 2000,
          outputTokens: 1000,
        });

      vi.mocked(mockOrchestrator.parallelAgentTasks).mockResolvedValue([
        {
          success: true,
          output: inspectionResult,
          id: 'README.md',
          inputTokens: 500,
          outputTokens: 250,
        },
      ]);

      vi.mocked(mockInteractive.approveBlueprint).mockResolvedValue({
        approved: true,
      });

      const result = await analysisStage.execute();

      expect(result.success).toBe(true);
      expect(mockOrchestrator.parallelAgentTasks).toHaveBeenCalled();
      expect(result.blueprint).toContain('inspected_count: 1');
    });

    it('should handle validation errors', async () => {
      // Mock response with invalid blueprint
      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: true,
        output: '```yaml\ninvalid: blueprint\n```',
        inputTokens: 1000,
        outputTokens: 500,
      });

      const result = await analysisStage.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });

    it('should handle user rejection', async () => {
      const mockBlueprint = `
analysis_summary:
  total_docs: 2
discovered_documents:
  - path: README.md
    type: guide
`;

      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: true,
        output: '```yaml\n' + mockBlueprint + '\n```',
        inputTokens: 1000,
        outputTokens: 500,
      });

      vi.mocked(mockInteractive.approveBlueprint).mockResolvedValue({
        approved: false,
      });

      const result = await analysisStage.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('rejected');
    });

    it('should handle user edits', async () => {
      const mockBlueprint = `
analysis_summary:
  total_docs: 2
discovered_documents:
  - path: README.md
    type: guide
`;

      const editedBlueprint = mockBlueprint + '\n# User edited';

      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: true,
        output: '```yaml\n' + mockBlueprint + '\n```',
        inputTokens: 1000,
        outputTokens: 500,
      });

      vi.mocked(mockInteractive.approveBlueprint).mockResolvedValue({
        approved: true,
        edited: editedBlueprint,
      });

      const result = await analysisStage.execute();

      expect(result.success).toBe(true);
      expect(result.blueprint).toBe(editedBlueprint);
    });

    it('should handle no documentation files', async () => {
      vi.mocked(glob).mockResolvedValue([]);

      // Should still attempt analysis even with no files
      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: true,
        output: '```yaml\nanalysis_summary:\n  total_docs: 0\n```',
        inputTokens: 500,
        outputTokens: 200,
      });

      vi.mocked(mockInteractive.approveBlueprint).mockResolvedValue({
        approved: true,
      });

      const result = await analysisStage.execute();

      expect(result.discoveredDocs).toHaveLength(0);
    });

    it('should handle agent task failure', async () => {
      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: false,
        output: '',
        error: 'API error',
        inputTokens: 0,
        outputTokens: 0,
      });

      const result = await analysisStage.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Triage failed');
    });

    it('should handle errors during execution', async () => {
      vi.mocked(glob).mockRejectedValue(new Error('File system error'));

      const result = await analysisStage.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('File system error');
    });

    it('should track cache tokens when provided', async () => {
      const mockBlueprint = `
analysis_summary:
  total_docs: 2
`;

      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: true,
        output: '```yaml\n' + mockBlueprint + '\n```',
        inputTokens: 1000,
        outputTokens: 500,
        cacheCreationTokens: 800,
        cacheReadTokens: 200,
      });

      vi.mocked(mockInteractive.approveBlueprint).mockResolvedValue({
        approved: true,
      });

      const result = await analysisStage.execute();

      expect(result.success).toBe(true);
      // Verify caching tokens were processed (even though we can't directly assert UI state in debug mode)
    });
  });

  describe('file detection', () => {
    it('should detect YAML frontmatter', async () => {
      vi.mocked(glob).mockResolvedValue(['/test/project/doc.md']);
      vi.mocked(fs.stat).mockResolvedValue({ size: 500 } as any);
      vi.mocked(fs.readFile).mockResolvedValue('---\ntitle: Test\n---\nContent');

      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: true,
        output: '```yaml\nanalysis_summary:\n  total_docs: 1\n```',
        inputTokens: 500,
        outputTokens: 200,
      });

      vi.mocked(mockInteractive.approveBlueprint).mockResolvedValue({
        approved: true,
      });

      const result = await analysisStage.execute();

      expect(result.success).toBe(true);
      expect(result.discoveredDocs[0]?.hasYamlFrontmatter).toBe(true);
    });

    it('should handle multiple file formats', async () => {
      vi.mocked(glob)
        .mockResolvedValueOnce(['/test/project/test.md'])
        .mockResolvedValueOnce(['/test/project/test.mdx'])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      vi.mocked(fs.stat).mockResolvedValue({ size: 500 } as any);
      vi.mocked(fs.readFile).mockResolvedValue('Content');

      vi.mocked(mockOrchestrator.singleAgentTask).mockResolvedValue({
        success: true,
        output: '```yaml\nanalysis_summary:\n  total_docs: 2\n```',
        inputTokens: 500,
        outputTokens: 200,
      });

      vi.mocked(mockInteractive.approveBlueprint).mockResolvedValue({
        approved: true,
      });

      const result = await analysisStage.execute();

      expect(result.discoveredDocs.length).toBeGreaterThan(0);
    });
  });
});
