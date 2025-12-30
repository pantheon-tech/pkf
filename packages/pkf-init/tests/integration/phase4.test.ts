/**
 * Integration tests for PKF Init Phase 4
 * Tests Phase 4 components working together:
 * - Migration planning
 * - Post-migration validation
 * - Rollback functionality
 * - Cost and time estimation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { MigrationPlanner } from '../../src/migration/planner.js';
import { PostMigrationValidator } from '../../src/migration/validation.js';
import { RollbackManager } from '../../src/migration/rollback.js';
import { WorkflowStateManager } from '../../src/state/workflow-state.js';
import type { LoadedConfig } from '../../src/types/index.js';

describe('Phase 4 Integration Tests', () => {
  let tempDir: string;
  let mockConfig: LoadedConfig;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-phase4-integration-'));

    mockConfig = {
      apiKey: 'sk-test-key',
      apiTier: 'build1',
      rootDir: tempDir,
      docsDir: path.join(tempDir, 'docs'),
      outputDir: tempDir,
      backupDir: path.join(tempDir, '.pkf-backup'),
      maxCost: 50,
      workers: 3,
      pkfInitialized: false,
    };

    // Create directory structure
    await fs.mkdir(path.join(tempDir, 'docs'), { recursive: true });
    await fs.mkdir(path.join(tempDir, '.pkf-backup'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Helper to create a test file with given content
   */
  async function createTestFile(relativePath: string, content: string): Promise<string> {
    const filePath = path.join(tempDir, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  describe('INT-021: Migration planning from blueprint', () => {
    it('creates tasks with correct types and priorities from blueprint', async () => {
      const schemasYaml = `
document_types:
  guide:
    description: User guides
  api-reference:
    description: API documentation
  architecture:
    description: Architecture documents
`;

      const planner = new MigrationPlanner(mockConfig, schemasYaml);

      const blueprint = `
migration_plan:
  documents:
    - path: README.md
      type: readme
    - path: docs/guides/getting-started.md
      type: guide
    - path: docs/guides/configuration.md
      type: guide
    - path: docs/api/endpoints.md
      type: api-reference
    - path: docs/architecture/overview.md
      type: architecture
`;

      const plan = await planner.createPlan(blueprint);

      // Verify tasks created
      expect(plan.tasks.length).toBe(5);
      expect(plan.totalFiles).toBe(5);

      // Verify types are correctly assigned
      const readmeTask = plan.tasks.find(t => t.sourcePath === 'README.md');
      const guideTask = plan.tasks.find(t => t.sourcePath === 'docs/guides/getting-started.md');
      const apiTask = plan.tasks.find(t => t.sourcePath === 'docs/api/endpoints.md');
      const archTask = plan.tasks.find(t => t.sourcePath === 'docs/architecture/overview.md');

      expect(readmeTask?.docType).toBe('readme');
      expect(guideTask?.docType).toBe('guide');
      expect(apiTask?.docType).toBe('api-reference');
      expect(archTask?.docType).toBe('architecture');

      // Verify priorities are set correctly
      expect(readmeTask?.priority).toBe(0); // Highest
      expect(guideTask?.priority).toBe(1);
      expect(apiTask?.priority).toBe(2);
      expect(archTask?.priority).toBe(1);

      // Verify byType map is populated
      expect(plan.byType.get('readme')).toBe(1);
      expect(plan.byType.get('guide')).toBe(2);
      expect(plan.byType.get('api-reference')).toBe(1);
      expect(plan.byType.get('architecture')).toBe(1);
    });
  });

  describe('INT-022: Post-migration validation', () => {
    it('correctly identifies valid and invalid files', async () => {
      // Create valid file
      const validContent = `---
title: Valid Document
type: guide
created: 2024-01-15
---

# Valid Document

This document has proper frontmatter.
`;

      // Create invalid file (missing frontmatter)
      const invalidContent1 = `# Invalid Document

This document has no frontmatter.
`;

      // Create invalid file (missing required field)
      const invalidContent2 = `---
type: guide
---

# Missing Title

This document is missing the title field.
`;

      const validPath = await createTestFile('docs/valid.md', validContent);
      const invalidPath1 = await createTestFile('docs/invalid1.md', invalidContent1);
      const invalidPath2 = await createTestFile('docs/invalid2.md', invalidContent2);

      const validator = new PostMigrationValidator(mockConfig);
      const summary = await validator.validate([validPath, invalidPath1, invalidPath2]);

      expect(summary.valid).toBe(false);
      expect(summary.totalFiles).toBe(3);
      expect(summary.validFiles).toBe(1);
      expect(summary.invalidFiles).toBe(2);

      // Check specific errors
      const error1 = summary.errors.find(e => e.filePath === invalidPath1);
      const error2 = summary.errors.find(e => e.filePath === invalidPath2);

      expect(error1?.errors).toContain('Missing YAML frontmatter');
      expect(error2?.errors).toContain('Missing required field: title');
    });
  });

  describe('INT-023: Full rollback flow', () => {
    it('removes generated files and restores backup', async () => {
      // Create backup directory with original files
      const backupPath = path.join(tempDir, '.pkf-backup', 'docs-2024-01-15T10-30-00-000Z');
      await fs.mkdir(backupPath, { recursive: true });
      await fs.writeFile(path.join(backupPath, 'README.md'), '# Original README\n', 'utf-8');
      await fs.mkdir(path.join(backupPath, 'guides'), { recursive: true });
      await fs.writeFile(path.join(backupPath, 'guides', 'guide.md'), '# Original Guide\n', 'utf-8');

      // Create PKF generated files
      await fs.writeFile(path.join(tempDir, 'pkf.config.yaml'), 'version: 1.0.0\n', 'utf-8');
      await fs.mkdir(path.join(tempDir, 'schemas'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'schemas', 'schemas.yaml'), 'document_types: {}\n', 'utf-8');

      // Create modified docs
      await fs.writeFile(path.join(tempDir, 'docs', 'README.md'), '# Modified README\n', 'utf-8');

      // Initialize state manager and save state
      const stateManager = new WorkflowStateManager(tempDir);
      const initialState = stateManager.createInitialState();
      await stateManager.save(initialState);

      // Run rollback
      const rollbackManager = new RollbackManager(mockConfig, stateManager);
      const result = await rollbackManager.rollback(backupPath);

      // Verify rollback succeeded
      expect(result.success).toBe(true);

      // Verify generated files removed
      await expect(fs.access(path.join(tempDir, 'pkf.config.yaml'))).rejects.toThrow();
      await expect(fs.access(path.join(tempDir, 'schemas'))).rejects.toThrow();

      // Verify backup files restored
      const restoredReadme = await fs.readFile(path.join(tempDir, 'docs', 'README.md'), 'utf-8');
      expect(restoredReadme).toBe('# Original README\n');

      const restoredGuide = await fs.readFile(path.join(tempDir, 'docs', 'guides', 'guide.md'), 'utf-8');
      expect(restoredGuide).toBe('# Original Guide\n');

      // Verify state is cleared
      const stateAfter = await stateManager.load();
      expect(stateAfter).toBeNull();
    });
  });

  describe('INT-024: Cost estimation accuracy', () => {
    it('provides reasonable cost and time estimates', async () => {
      const schemasYaml = `
document_types:
  guide:
    description: User guides
`;

      const planner = new MigrationPlanner(mockConfig, schemasYaml);

      // Create blueprint with known file count
      const blueprint = `
documents:
  - path: README.md
  - path: docs/guide1.md
  - path: docs/guide2.md
  - path: docs/guide3.md
  - path: docs/guide4.md
  - path: docs/guide5.md
  - path: docs/guide6.md
  - path: docs/guide7.md
  - path: docs/guide8.md
  - path: docs/guide9.md
`;

      const plan = await planner.createPlan(blueprint);

      // Verify 10 files
      expect(plan.totalFiles).toBe(10);

      // Verify cost is positive and reasonable (should be less than $1 for 10 small docs)
      expect(plan.estimatedCost).toBeGreaterThan(0);
      expect(plan.estimatedCost).toBeLessThan(1);

      // Verify time estimate is reasonable
      // With 3 workers and ~0.5 min per doc: 10 * 0.5 / 3 = ~1.67 minutes
      expect(plan.estimatedTime).toBeGreaterThan(0);
      expect(plan.estimatedTime).toBeLessThan(10); // Should be quick with parallel workers
    });
  });

  describe('INT-025: Priority ordering', () => {
    it('correctly orders tasks by priority', async () => {
      const schemasYaml = `document_types: {}`;

      const planner = new MigrationPlanner(mockConfig, schemasYaml);

      const blueprint = `
documents:
  - path: docs/api/endpoints.md
  - path: docs/guides/getting-started.md
  - path: README.md
  - path: docs/architecture/overview.md
  - path: CONTRIBUTING.md
`;

      const plan = await planner.createPlan(blueprint);

      // Verify README tasks have priority 0
      const readmeTasks = plan.tasks.filter(t =>
        t.sourcePath === 'README.md' || t.sourcePath === 'CONTRIBUTING.md'
      );
      for (const task of readmeTasks) {
        expect(task.priority).toBe(0);
      }

      // Verify guide tasks have priority 1
      const guideTasks = plan.tasks.filter(t => t.docType === 'guide');
      for (const task of guideTasks) {
        expect(task.priority).toBe(1);
      }

      // Verify API tasks have priority 2
      const apiTasks = plan.tasks.filter(t => t.docType === 'api-reference');
      for (const task of apiTasks) {
        expect(task.priority).toBe(2);
      }

      // Verify tasks are sorted by priority (ascending)
      for (let i = 1; i < plan.tasks.length; i++) {
        expect(plan.tasks[i].priority).toBeGreaterThanOrEqual(plan.tasks[i - 1].priority);
      }
    });
  });

  describe('INT-026: Target path generation', () => {
    it('generates correct target paths for various source paths', async () => {
      const schemasYaml = `document_types: {}`;

      const planner = new MigrationPlanner(mockConfig, schemasYaml);

      const blueprint = `
documents:
  - path: README.md
    type: readme
  - path: docs/guides/getting-started.md
    type: guide
  - path: docs/api/rest.md
    type: api-reference
  - path: docs/architecture/system.md
    type: architecture
`;

      const plan = await planner.createPlan(blueprint);

      // README stays in root
      const readmeTask = plan.tasks.find(t => t.sourcePath === 'README.md');
      expect(readmeTask?.targetPath).toContain('README.md');
      expect(readmeTask?.targetPath).not.toContain('docs');

      // Guide goes to docs/guides
      const guideTask = plan.tasks.find(t => t.sourcePath === 'docs/guides/getting-started.md');
      expect(guideTask?.targetPath).toContain('guides');
      expect(guideTask?.targetPath).toContain('getting-started.md');

      // API goes to docs/api
      const apiTask = plan.tasks.find(t => t.sourcePath === 'docs/api/rest.md');
      expect(apiTask?.targetPath).toContain('api');
      expect(apiTask?.targetPath).toContain('rest.md');

      // Architecture goes to docs/architecture
      const archTask = plan.tasks.find(t => t.sourcePath === 'docs/architecture/system.md');
      expect(archTask?.targetPath).toContain('architecture');
      expect(archTask?.targetPath).toContain('system.md');
    });
  });

  describe('INT-027: Document type detection', () => {
    it('detects document types from path patterns', async () => {
      const schemasYaml = `document_types: {}`;

      const planner = new MigrationPlanner(mockConfig, schemasYaml);

      // Blueprint without explicit types - should be inferred from paths
      const blueprint = `
documents:
  - path: README.md
  - path: CHANGELOG.md
  - path: CONTRIBUTING.md
  - path: LICENSE.md
  - path: docs/guides/user-guide.md
  - path: docs/api/endpoints.md
  - path: docs/architecture/design.md
  - path: docs/specifications/spec.md
  - path: docs/registers/TODO.md
  - path: docs/random/unknown.md
`;

      const plan = await planner.createPlan(blueprint);

      // Verify type detection for known patterns
      const readme = plan.tasks.find(t => t.sourcePath === 'README.md');
      const changelog = plan.tasks.find(t => t.sourcePath === 'CHANGELOG.md');
      const contributing = plan.tasks.find(t => t.sourcePath === 'CONTRIBUTING.md');
      const license = plan.tasks.find(t => t.sourcePath === 'LICENSE.md');
      const guide = plan.tasks.find(t => t.sourcePath === 'docs/guides/user-guide.md');
      const api = plan.tasks.find(t => t.sourcePath === 'docs/api/endpoints.md');
      const arch = plan.tasks.find(t => t.sourcePath === 'docs/architecture/design.md');
      const spec = plan.tasks.find(t => t.sourcePath === 'docs/specifications/spec.md');
      const register = plan.tasks.find(t => t.sourcePath === 'docs/registers/TODO.md');
      const unknown = plan.tasks.find(t => t.sourcePath === 'docs/random/unknown.md');

      expect(readme?.docType).toBe('readme');
      expect(changelog?.docType).toBe('changelog');
      expect(contributing?.docType).toBe('contributing');
      expect(license?.docType).toBe('license');
      expect(guide?.docType).toBe('guide');
      expect(api?.docType).toBe('api-reference');
      expect(arch?.docType).toBe('architecture');
      expect(spec?.docType).toBe('specification');
      expect(register?.docType).toBe('register');
      // Unknown paths should fallback to 'generic'
      expect(unknown?.docType).toBe('generic');
    });
  });

  describe('INT-028: Validation summary aggregation', () => {
    it('correctly aggregates validation results', async () => {
      // Create 5 valid files
      for (let i = 0; i < 5; i++) {
        await createTestFile(`docs/valid-${i}.md`, `---
title: Valid ${i}
type: guide
---
Content ${i}`);
      }

      // Create 3 invalid files (no frontmatter)
      for (let i = 0; i < 3; i++) {
        await createTestFile(`docs/invalid-${i}.md`, `# Invalid ${i}\nNo frontmatter here.`);
      }

      // Create 2 invalid files (missing title)
      for (let i = 0; i < 2; i++) {
        await createTestFile(`docs/missing-title-${i}.md`, `---
type: guide
---
# Missing Title ${i}`);
      }

      // Collect all file paths
      const files: string[] = [];
      for (let i = 0; i < 5; i++) {
        files.push(path.join(tempDir, `docs/valid-${i}.md`));
      }
      for (let i = 0; i < 3; i++) {
        files.push(path.join(tempDir, `docs/invalid-${i}.md`));
      }
      for (let i = 0; i < 2; i++) {
        files.push(path.join(tempDir, `docs/missing-title-${i}.md`));
      }

      const validator = new PostMigrationValidator(mockConfig);
      const summary = await validator.validate(files);

      // Verify aggregation
      expect(summary.totalFiles).toBe(10);
      expect(summary.validFiles).toBe(5);
      expect(summary.invalidFiles).toBe(5);
      expect(summary.valid).toBe(false);
      expect(summary.errors.length).toBe(5);

      // Verify error categorization
      const noFrontmatterErrors = summary.errors.filter(e =>
        e.errors.includes('Missing YAML frontmatter')
      );
      const missingTitleErrors = summary.errors.filter(e =>
        e.errors.includes('Missing required field: title')
      );

      expect(noFrontmatterErrors.length).toBe(3);
      expect(missingTitleErrors.length).toBe(2);
    });
  });
});
