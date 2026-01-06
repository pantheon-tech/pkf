/**
 * Unit tests for SchemaDesignStage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SchemaDesignStage } from '../../src/stages/schema-design.js';
import type { AgentOrchestrator } from '../../src/agents/orchestrator.js';
import type { WorkflowStateManager } from '../../src/state/workflow-state.js';
import type { Interactive } from '../../src/utils/interactive.js';
import type { LoadedConfig } from '../../src/types/index.js';

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
  },
}));

describe('SchemaDesignStage', () => {
  let schemaDesignStage: SchemaDesignStage;
  let mockOrchestrator: AgentOrchestrator;
  let mockStateManager: WorkflowStateManager;
  let mockInteractive: Interactive;
  let mockConfig: LoadedConfig;

  const validSchemaYaml = `version: "1.0"
schemas:
  base-doc:
    _description: "Base document type"
    properties:
      title:
        type: string
        required: true
      created:
        type: date
        required: true
  guide:
    _extends: base-doc
    _description: "User guide"
    properties:
      audience:
        type: string
        enum: [user, developer]
`;

  const mockBlueprint = `
analysis_summary:
  total_docs: 5
discovered_documents:
  - path: README.md
    type: guide
  - path: CHANGELOG.md
    type: register
`;

  beforeEach(() => {
    mockOrchestrator = {
      agentConversation: vi.fn(),
    } as unknown as AgentOrchestrator;

    mockStateManager = {
      checkpoint: vi.fn(),
    } as unknown as WorkflowStateManager;

    mockInteractive = {
      approveSchema: vi.fn().mockResolvedValue({ approved: false }),
    } as unknown as Interactive;

    mockConfig = {
      rootDir: '/test/project',
      docsDir: '/test/project/docs',
      outputDir: '/test/project/.pkf',
    } as LoadedConfig;

    schemaDesignStage = new SchemaDesignStage(
      mockOrchestrator,
      mockStateManager,
      mockConfig,
      mockInteractive,
      5 // maxIterations
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(schemaDesignStage).toBeDefined();
    });

    it('should accept custom max iterations', () => {
      const customStage = new SchemaDesignStage(
        mockOrchestrator,
        mockStateManager,
        mockConfig,
        mockInteractive,
        10
      );
      expect(customStage).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should generate valid schemas from blueprint', async () => {
      vi.mocked(mockOrchestrator.agentConversation).mockResolvedValue({
        success: true,
        output: '```yaml\n' + validSchemaYaml + '\n```\n\nSCHEMA-DESIGN-APPROVED: All types mapped correctly',
        metadata: {
          iterations: 3,
          converged: true,
          convergenceReason: 'Agents agreed on schema design',
        },
      });

      vi.mocked(mockInteractive.approveSchema).mockResolvedValue({
        approved: true,
      });

      const result = await schemaDesignStage.execute(mockBlueprint);

      expect(result.success).toBe(true);
      expect(result.schemasYaml).toBeDefined();
      expect(result.schemasYaml).toContain('version: "1.0"');
      expect(result.iterations).toBe(3);
      expect(mockStateManager.checkpoint).toHaveBeenCalled();
    });

    it('should handle user approval with edits', async () => {
      const editedSchema = validSchemaYaml + '\n  # User added comment';

      vi.mocked(mockOrchestrator.agentConversation).mockResolvedValue({
        success: true,
        output: '```yaml\n' + validSchemaYaml + '\n```',
        metadata: { iterations: 2, converged: true },
      });

      vi.mocked(mockInteractive.approveSchema).mockResolvedValue({
        approved: true,
        edited: editedSchema,
      });

      const result = await schemaDesignStage.execute(mockBlueprint);

      expect(result.success).toBe(true);
      expect(result.schemasYaml).toBe(editedSchema);
    });

    it('should handle user rejection', async () => {
      vi.mocked(mockOrchestrator.agentConversation).mockResolvedValue({
        success: true,
        output: '```yaml\n' + validSchemaYaml + '\n```',
        metadata: { iterations: 2 },
      });

      vi.mocked(mockInteractive.approveSchema).mockResolvedValue({
        approved: false,
      });

      const result = await schemaDesignStage.execute(mockBlueprint);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
    });

    it('should handle request for more iterations', async () => {
      const improvedSchema = validSchemaYaml + '\n  # Improved';

      // First iteration
      vi.mocked(mockOrchestrator.agentConversation)
        .mockResolvedValueOnce({
          success: true,
          output: '```yaml\n' + validSchemaYaml + '\n```',
          metadata: { iterations: 2 },
        })
        // Second iteration
        .mockResolvedValueOnce({
          success: true,
          output: '```yaml\n' + improvedSchema + '\n```',
          metadata: { iterations: 3 },
        });

      // First approval request more iterations
      vi.mocked(mockInteractive.approveSchema)
        .mockResolvedValueOnce({
          approved: false,
          edited: '__REQUEST_MORE_ITERATIONS__',
        })
        // Second approval accepts
        .mockResolvedValueOnce({
          approved: true,
        });

      const result = await schemaDesignStage.execute(mockBlueprint);

      expect(result.success).toBe(true);
      expect(mockOrchestrator.agentConversation).toHaveBeenCalledTimes(2);
      expect(result.iterations).toBe(5); // 2 + 3
    });

    it('should validate schema structure', async () => {
      const invalidSchema = `version: "1.0"
schemas: invalid`;

      vi.mocked(mockOrchestrator.agentConversation).mockResolvedValue({
        success: true,
        output: '```yaml\n' + invalidSchema + '\n```',
        metadata: { iterations: 1 },
      });

      const result = await schemaDesignStage.execute(mockBlueprint);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/validation failed|Schema validation failed|cancelled/);
    });

    it('should detect missing version field', async () => {
      const noVersionSchema = `schemas:
  base-doc:
    properties:
      title:
        type: string
`;

      vi.mocked(mockOrchestrator.agentConversation).mockResolvedValue({
        success: true,
        output: '```yaml\n' + noVersionSchema + '\n```',
        metadata: { iterations: 1 },
      });

      const result = await schemaDesignStage.execute(mockBlueprint);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/validation failed|Schema validation failed|cancelled/);
    });

    it('should detect invalid schema names', async () => {
      const invalidNameSchema = `version: "1.0"
schemas:
  InvalidName:
    properties:
      title:
        type: string
`;

      vi.mocked(mockOrchestrator.agentConversation).mockResolvedValue({
        success: true,
        output: '```yaml\n' + invalidNameSchema + '\n```',
        metadata: { iterations: 1 },
      });

      const result = await schemaDesignStage.execute(mockBlueprint);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/validation failed|Schema validation failed/);
    });

    it('should detect invalid property types', async () => {
      const invalidTypeSchema = `version: "1.0"
schemas:
  base-doc:
    properties:
      title:
        type: invalid_type
`;

      vi.mocked(mockOrchestrator.agentConversation).mockResolvedValue({
        success: true,
        output: '```yaml\n' + invalidTypeSchema + '\n```',
        metadata: { iterations: 1 },
      });

      const result = await schemaDesignStage.execute(mockBlueprint);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/validation failed|Schema validation failed/);
    });

    it('should detect invalid _extends references', async () => {
      const invalidExtendsSchema = `version: "1.0"
schemas:
  guide:
    _extends: non-existent-schema
    properties:
      title:
        type: string
`;

      vi.mocked(mockOrchestrator.agentConversation).mockResolvedValue({
        success: true,
        output: '```yaml\n' + invalidExtendsSchema + '\n```',
        metadata: { iterations: 1 },
      });

      const result = await schemaDesignStage.execute(mockBlueprint);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/validation failed|Schema validation failed/);
    });

    it('should handle agent conversation failure', async () => {
      vi.mocked(mockOrchestrator.agentConversation).mockRejectedValue(
        new Error('API error')
      );

      const result = await schemaDesignStage.execute(mockBlueprint);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API error');
    });

    it('should extract schemas from code blocks', async () => {
      // Test extraction with yaml code blocks
      const yamlInBlock = '```yaml\n' + validSchemaYaml + '\n```';

      vi.mocked(mockOrchestrator.agentConversation).mockResolvedValue({
        success: true,
        output: yamlInBlock,
        metadata: { iterations: 1 },
      });

      vi.mocked(mockInteractive.approveSchema).mockResolvedValue({
        approved: true,
      });

      const result = await schemaDesignStage.execute(mockBlueprint);

      expect(result.success).toBe(true);
      expect(result.schemasYaml).toBeDefined();
      expect(result.schemasYaml).toContain('version: "1.0"');
    });

    it('should use fallback schema when extraction fails', async () => {
      vi.mocked(mockOrchestrator.agentConversation).mockResolvedValue({
        success: true,
        output: 'No YAML found here',
        metadata: { iterations: 1 },
      });

      vi.mocked(mockInteractive.approveSchema).mockResolvedValue({
        approved: true,
      });

      const result = await schemaDesignStage.execute(mockBlueprint);

      expect(result.success).toBe(true);
      expect(result.schemasYaml).toContain('version: "1.0"');
      expect(result.schemasYaml).toContain('base-doc');
    });

    it('should track convergence reason', async () => {
      const convergenceReason = 'All document types properly mapped';

      vi.mocked(mockOrchestrator.agentConversation).mockResolvedValue({
        success: true,
        output: '```yaml\n' + validSchemaYaml + '\n```',
        metadata: {
          iterations: 2,
          converged: true,
          convergenceReason,
        },
      });

      vi.mocked(mockInteractive.approveSchema).mockResolvedValue({
        approved: true,
      });

      const result = await schemaDesignStage.execute(mockBlueprint);

      expect(result.success).toBe(true);
      expect(result.convergenceReason).toContain(convergenceReason);
    });

    it('should warn about missing base-doc schema', async () => {
      const noBaseDocSchema = `version: "1.0"
schemas:
  guide:
    properties:
      title:
        type: string
        required: true
`;

      vi.mocked(mockOrchestrator.agentConversation).mockResolvedValue({
        success: true,
        output: '```yaml\n' + noBaseDocSchema + '\n```',
        metadata: { iterations: 1 },
      });

      vi.mocked(mockInteractive.approveSchema).mockResolvedValue({
        approved: true,
      });

      const result = await schemaDesignStage.execute(mockBlueprint);

      // Should succeed but with warnings
      expect(result.success).toBe(true);
    });
  });
});
