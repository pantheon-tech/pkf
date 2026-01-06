/**
 * Unit tests for MigrationPlanner
 * Tests migration planning from blueprints
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MigrationPlanner } from '../../src/migration/planner.js';
import type { LoadedConfig } from '../../src/types/index.js';

describe('MigrationPlanner', () => {
  let planner: MigrationPlanner;
  let mockConfig: LoadedConfig;
  const schemasYaml = `
document_types:
  guide:
    description: User guides
    schema: guide.schema.json
  api-reference:
    description: API documentation
    schema: api.schema.json
  architecture:
    description: Architecture documents
    schema: architecture.schema.json
`;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'sk-test-key',
      apiTier: 'build1',
      rootDir: '/project',
      docsDir: '/project/docs',
      outputDir: '/project',
      backupDir: '/project/.pkf-backup',
      maxCost: 50,
      workers: 3,
      pkfInitialized: false,
    };
    planner = new MigrationPlanner(mockConfig, schemasYaml);
  });

  describe('createPlan', () => {
    it('creates plan from valid blueprint', async () => {
      const blueprint = `
migration_plan:
  documents:
    - path: README.md
      type: readme
    - path: docs/guides/getting-started.md
      type: guide
    - path: docs/api/endpoints.md
      type: api-reference
`;

      const plan = await planner.createPlan(blueprint);

      expect(plan).toBeDefined();
      expect(plan.tasks).toBeInstanceOf(Array);
      expect(plan.totalFiles).toBe(3);
      expect(plan.tasks.length).toBe(3);
      expect(plan.byType).toBeInstanceOf(Map);
    });

    it('determines correct document types from paths', async () => {
      const blueprint = `
documents:
  - path: docs/guides/user-guide.md
  - path: docs/api/rest-api.md
  - path: docs/architecture/system-design.md
`;

      const plan = await planner.createPlan(blueprint);

      // Find tasks by source path
      const guideTask = plan.tasks.find(t => t.sourcePath === 'docs/guides/user-guide.md');
      const apiTask = plan.tasks.find(t => t.sourcePath === 'docs/api/rest-api.md');
      const archTask = plan.tasks.find(t => t.sourcePath === 'docs/architecture/system-design.md');

      expect(guideTask?.docType).toBe('guide');
      expect(apiTask?.docType).toBe('api-reference');
      expect(archTask?.docType).toBe('architecture');
    });

    it('maps README.md to readme type', async () => {
      const blueprint = `
documents:
  - path: README.md
  - path: docs/README.md
`;

      const plan = await planner.createPlan(blueprint);

      const rootReadme = plan.tasks.find(t => t.sourcePath === 'README.md');
      const docsReadme = plan.tasks.find(t => t.sourcePath === 'docs/README.md');

      expect(rootReadme?.docType).toBe('readme');
      expect(docsReadme?.docType).toBe('readme');
    });

    it('maps docs/guides/* to guide type', async () => {
      const blueprint = `
documents:
  - path: docs/guides/installation.md
  - path: docs/guide/configuration.md
  - path: guides/troubleshooting.md
`;

      const plan = await planner.createPlan(blueprint);

      for (const task of plan.tasks) {
        expect(task.docType).toBe('guide');
      }
    });

    it('maps docs/api/* to api-reference type', async () => {
      const blueprint = `
documents:
  - path: docs/api/authentication.md
  - path: api/endpoints.md
`;

      const plan = await planner.createPlan(blueprint);

      for (const task of plan.tasks) {
        expect(task.docType).toBe('api-reference');
      }
    });

    it('maps docs/architecture/* to architecture type', async () => {
      const blueprint = `
documents:
  - path: docs/architecture/overview.md
  - path: architecture/components.md
  - path: design/database.md
`;

      const plan = await planner.createPlan(blueprint);

      for (const task of plan.tasks) {
        expect(task.docType).toBe('architecture');
      }
    });

    it('maps adr/* to adr type', async () => {
      const blueprint = `
documents:
  - path: adr/001-use-postgres.md
  - path: decisions/002-use-react.md
`;

      const plan = await planner.createPlan(blueprint);

      for (const task of plan.tasks) {
        expect(task.docType).toBe('adr');
      }
    });

    it('generates correct target paths', async () => {
      const blueprint = `
documents:
  - path: docs/guides/getting-started.md
    type: guide
  - path: README.md
    type: readme
`;

      const plan = await planner.createPlan(blueprint);

      const guideTask = plan.tasks.find(t => t.sourcePath === 'docs/guides/getting-started.md');
      const readmeTask = plan.tasks.find(t => t.sourcePath === 'README.md');

      // Guide should be in docs/guides/
      expect(guideTask?.targetPath).toContain('guides');
      expect(guideTask?.targetPath).toContain('getting-started.md');

      // README stays in root
      expect(readmeTask?.targetPath).toContain('README.md');
    });

    it('calculates correct priorities (README = 0, guides = 2, api = 3)', async () => {
      const blueprint = `
documents:
  - path: README.md
  - path: docs/guides/user-guide.md
  - path: docs/api/endpoints.md
  - path: docs/architecture/overview.md
  - path: docs/specs/spec.md
`;

      const plan = await planner.createPlan(blueprint);

      const readmeTask = plan.tasks.find(t => t.sourcePath === 'README.md');
      const guideTask = plan.tasks.find(t => t.sourcePath === 'docs/guides/user-guide.md');
      const apiTask = plan.tasks.find(t => t.sourcePath === 'docs/api/endpoints.md');
      const archTask = plan.tasks.find(t => t.sourcePath === 'docs/architecture/overview.md');

      // README files get priority 0 (highest, boosted for root)
      expect(readmeTask?.priority).toBe(0);
      // Guide files get priority 2
      expect(guideTask?.priority).toBe(2);
      // API reference files get priority 3
      expect(apiTask?.priority).toBe(3);
      // Architecture files get priority 2
      expect(archTask?.priority).toBe(2);

      // Verify tasks are sorted by priority
      for (let i = 1; i < plan.tasks.length; i++) {
        expect(plan.tasks[i].priority).toBeGreaterThanOrEqual(plan.tasks[i - 1].priority);
      }
    });

    it('estimates costs correctly', async () => {
      const blueprint = `
documents:
  - path: README.md
  - path: docs/guides/guide1.md
  - path: docs/guides/guide2.md
  - path: docs/api/api.md
  - path: docs/architecture/arch.md
`;

      const plan = await planner.createPlan(blueprint);

      // Verify cost estimates exist and are reasonable
      expect(plan.estimatedCost).toBeGreaterThan(0);
      expect(plan.estimatedTime).toBeGreaterThan(0);

      // Cost should be proportional to number of files
      // With 5 files and default token estimates, cost should be small but not zero
      expect(plan.estimatedCost).toBeLessThan(1); // Should be cents, not dollars
    });

    it('handles empty blueprint gracefully', async () => {
      const emptyBlueprint = `
migration_plan:
  documents: []
`;

      const plan = await planner.createPlan(emptyBlueprint);

      expect(plan.tasks).toEqual([]);
      expect(plan.totalFiles).toBe(0);
      expect(plan.estimatedCost).toBe(0);
      expect(plan.estimatedTime).toBe(0);
      expect(plan.byType.size).toBe(0);
    });
  });
});
