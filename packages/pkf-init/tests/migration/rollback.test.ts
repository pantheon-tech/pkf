/**
 * Unit tests for RollbackManager
 * Tests rollback functionality for PKF initialization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { RollbackManager } from '../../src/migration/rollback.js';
import { WorkflowStateManager } from '../../src/state/workflow-state.js';
import type { LoadedConfig } from '../../src/types/index.js';

describe('RollbackManager', () => {
  let rollbackManager: RollbackManager;
  let stateManager: WorkflowStateManager;
  let tempDir: string;
  let mockConfig: LoadedConfig;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-rollback-test-'));

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

    stateManager = new WorkflowStateManager(tempDir);
    rollbackManager = new RollbackManager(mockConfig, stateManager);

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

  describe('rollback', () => {
    it('removes pkf.config.yaml', async () => {
      // Create pkf.config.yaml
      const configPath = path.join(tempDir, 'pkf.config.yaml');
      await fs.writeFile(configPath, 'version: 1.0.0\n', 'utf-8');

      // Create a valid backup directory
      const backupPath = path.join(tempDir, '.pkf-backup', 'docs-2024-01-15');
      await fs.mkdir(backupPath, { recursive: true });

      // Initialize state
      const initialState = stateManager.createInitialState();
      await stateManager.save(initialState);

      // Run rollback
      const result = await rollbackManager.rollback(backupPath);

      expect(result.success).toBe(true);
      expect(result.removedFiles).toContain(configPath);

      // Verify file is removed
      await expect(fs.access(configPath)).rejects.toThrow();
    });

    it('removes schemas directory', async () => {
      // Create schemas directory with files
      const schemasDir = path.join(tempDir, 'schemas');
      await fs.mkdir(schemasDir, { recursive: true });
      await fs.writeFile(path.join(schemasDir, 'schemas.yaml'), 'document_types: {}\n', 'utf-8');
      await fs.writeFile(path.join(schemasDir, 'guide.schema.json'), '{}', 'utf-8');

      // Create a valid backup directory
      const backupPath = path.join(tempDir, '.pkf-backup', 'docs-2024-01-15');
      await fs.mkdir(backupPath, { recursive: true });

      // Initialize state
      const initialState = stateManager.createInitialState();
      await stateManager.save(initialState);

      // Run rollback
      const result = await rollbackManager.rollback(backupPath);

      expect(result.success).toBe(true);
      expect(result.removedFiles).toContain(schemasDir);

      // Verify directory is removed
      await expect(fs.access(schemasDir)).rejects.toThrow();
    });

    it('restores files from backup', async () => {
      // Create backup with original docs
      const backupPath = path.join(tempDir, '.pkf-backup', 'docs-2024-01-15');
      await fs.mkdir(backupPath, { recursive: true });
      await fs.writeFile(path.join(backupPath, 'README.md'), '# Original README\n', 'utf-8');
      await fs.mkdir(path.join(backupPath, 'guides'), { recursive: true });
      await fs.writeFile(path.join(backupPath, 'guides', 'guide.md'), '# Original Guide\n', 'utf-8');

      // Create current docs (to be replaced)
      await fs.writeFile(path.join(tempDir, 'docs', 'README.md'), '# Modified README\n', 'utf-8');

      // Initialize state
      const initialState = stateManager.createInitialState();
      await stateManager.save(initialState);

      // Run rollback
      const result = await rollbackManager.rollback(backupPath);

      expect(result.success).toBe(true);
      expect(result.restoredFiles.length).toBeGreaterThan(0);

      // Verify files are restored to docs directory
      const restoredReadme = await fs.readFile(path.join(tempDir, 'docs', 'README.md'), 'utf-8');
      expect(restoredReadme).toBe('# Original README\n');

      const restoredGuide = await fs.readFile(path.join(tempDir, 'docs', 'guides', 'guide.md'), 'utf-8');
      expect(restoredGuide).toBe('# Original Guide\n');
    });

    it('clears workflow state', async () => {
      // Create backup directory
      const backupPath = path.join(tempDir, '.pkf-backup', 'docs-2024-01-15');
      await fs.mkdir(backupPath, { recursive: true });

      // Initialize and save state
      const initialState = stateManager.createInitialState();
      await stateManager.save(initialState);

      // Verify state exists before rollback
      const stateBefore = await stateManager.load();
      expect(stateBefore).not.toBeNull();

      // Run rollback
      const result = await rollbackManager.rollback(backupPath);

      expect(result.success).toBe(true);

      // Verify state is cleared
      const stateAfter = await stateManager.load();
      expect(stateAfter).toBeNull();
    });

    it('handles missing backup gracefully', async () => {
      const nonExistentBackup = path.join(tempDir, '.pkf-backup', 'does-not-exist');

      // Initialize state
      const initialState = stateManager.createInitialState();
      await stateManager.save(initialState);

      // Run rollback
      const result = await rollbackManager.rollback(nonExistentBackup);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Backup not found');
      expect(result.removedFiles).toEqual([]);
      expect(result.restoredFiles).toEqual([]);
    });
  });

  describe('listBackups', () => {
    it('lists available backups correctly', async () => {
      // Create multiple backup directories with timestamp names
      const backup1 = 'docs-2024-01-15T10-30-00-000Z';
      const backup2 = 'docs-2024-01-16T14-45-00-000Z';
      const backup3 = 'docs-2024-01-17T09-00-00-000Z';

      await fs.mkdir(path.join(tempDir, '.pkf-backup', backup1), { recursive: true });
      await fs.mkdir(path.join(tempDir, '.pkf-backup', backup2), { recursive: true });
      await fs.mkdir(path.join(tempDir, '.pkf-backup', backup3), { recursive: true });

      // Also create a non-backup directory (should be ignored)
      await fs.mkdir(path.join(tempDir, '.pkf-backup', 'not-a-backup'), { recursive: true });

      const backups = await rollbackManager.listBackups();

      // Should only list docs-* directories
      expect(backups.length).toBe(3);

      // Should be sorted by timestamp descending (newest first)
      expect(backups[0].path).toContain(backup3);
      expect(backups[1].path).toContain(backup2);
      expect(backups[2].path).toContain(backup1);

      // Each backup should have a path and timestamp
      for (const backup of backups) {
        expect(backup.path).toBeDefined();
        expect(backup.timestamp).toBeDefined();
      }
    });

    it('returns empty array when no backups exist', async () => {
      // Don't create any backup directories

      const backups = await rollbackManager.listBackups();

      expect(backups).toEqual([]);
    });

    it('returns empty array when backup directory does not exist', async () => {
      // Remove the backup directory
      await fs.rm(path.join(tempDir, '.pkf-backup'), { recursive: true, force: true });

      const backups = await rollbackManager.listBackups();

      expect(backups).toEqual([]);
    });
  });
});
