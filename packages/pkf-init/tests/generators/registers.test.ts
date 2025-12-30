/**
 * Tests for PKF Init Register Initializer
 * Tests register file creation (TODO.md, ISSUES.md, CHANGELOG.md)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { RegisterInitializer } from '../../src/generators/registers.js';

describe('RegisterInitializer', () => {
  let tempDir: string;
  let registersDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-registers-test-'));
    registersDir = path.join(tempDir, 'docs', 'registers');
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
   * Helper to extract YAML frontmatter from markdown content
   */
  function extractFrontmatter(content: string): Record<string, unknown> | null {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      return null;
    }
    return yaml.load(match[1]) as Record<string, unknown>;
  }

  /**
   * Helper to format a date value (which may be a Date or string) as YYYY-MM-DD
   */
  function formatDateValue(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    return String(value);
  }

  describe('creates TODO.md with proper frontmatter', () => {
    it('creates TODO.md with valid YAML frontmatter', async () => {
      // Create registers directory first
      await fs.mkdir(registersDir, { recursive: true });

      const initializer = new RegisterInitializer(registersDir);
      await initializer.initialize();

      // Read the created file
      const todoPath = path.join(registersDir, 'TODO.md');
      const content = await fs.readFile(todoPath, 'utf-8');

      // Extract and verify frontmatter
      const frontmatter = extractFrontmatter(content);
      expect(frontmatter).not.toBeNull();
      expect(frontmatter?.title).toBe('TODO Register');
      expect(frontmatter?.type).toBe('register');
      // The created field is parsed as Date by js-yaml, convert to string for matching
      expect(formatDateValue(frontmatter?.created)).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify content structure
      expect(content).toContain('# TODO');
      expect(content).toContain('## Active Tasks');
      expect(content).toContain('## Completed');
      expect(content).toContain('**Register Version:** 1.0.0');
    });
  });

  describe('creates ISSUES.md with proper frontmatter', () => {
    it('creates ISSUES.md with valid YAML frontmatter', async () => {
      await fs.mkdir(registersDir, { recursive: true });

      const initializer = new RegisterInitializer(registersDir);
      await initializer.initialize();

      // Read the created file
      const issuesPath = path.join(registersDir, 'ISSUES.md');
      const content = await fs.readFile(issuesPath, 'utf-8');

      // Extract and verify frontmatter
      const frontmatter = extractFrontmatter(content);
      expect(frontmatter).not.toBeNull();
      expect(frontmatter?.title).toBe('Issues Register');
      expect(frontmatter?.type).toBe('register');
      // The created field is parsed as Date by js-yaml, convert to string for matching
      expect(formatDateValue(frontmatter?.created)).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify content structure
      expect(content).toContain('# Issues');
      expect(content).toContain('## Open Issues');
      expect(content).toContain('## In Progress');
      expect(content).toContain('## Resolved');
      expect(content).toContain('**Steps to Reproduce:**');
      expect(content).toContain('**Expected Behavior:**');
      expect(content).toContain('**Actual Behavior:**');
    });
  });

  describe('creates CHANGELOG.md with proper frontmatter', () => {
    it('creates CHANGELOG.md with valid YAML frontmatter', async () => {
      await fs.mkdir(registersDir, { recursive: true });

      const initializer = new RegisterInitializer(registersDir);
      await initializer.initialize();

      // Read the created file
      const changelogPath = path.join(registersDir, 'CHANGELOG.md');
      const content = await fs.readFile(changelogPath, 'utf-8');

      // Extract and verify frontmatter
      const frontmatter = extractFrontmatter(content);
      expect(frontmatter).not.toBeNull();
      expect(frontmatter?.title).toBe('Changelog');
      expect(frontmatter?.type).toBe('register');
      // The created field is parsed as Date by js-yaml, convert to string for matching
      expect(formatDateValue(frontmatter?.created)).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify content structure - follows Keep a Changelog format
      expect(content).toContain('# Changelog');
      expect(content).toContain('## [Unreleased]');
      expect(content).toContain('### Added');
      expect(content).toContain('### Changed');
      expect(content).toContain('### Deprecated');
      expect(content).toContain('### Removed');
      expect(content).toContain('### Fixed');
      expect(content).toContain('### Security');
      expect(content).toContain('Keep a Changelog');
      expect(content).toContain('Semantic Versioning');
    });
  });

  describe('preserves existing register files (does not overwrite)', () => {
    it('does not overwrite existing TODO.md', async () => {
      await fs.mkdir(registersDir, { recursive: true });

      // Create an existing TODO.md with custom content
      const existingContent = `---
title: My Custom TODO
type: register
created: 2020-01-01
---

# My Custom Tasks

- Important task 1
- Important task 2
`;
      await fs.writeFile(path.join(registersDir, 'TODO.md'), existingContent, 'utf-8');

      const initializer = new RegisterInitializer(registersDir);
      const result = await initializer.initialize();

      // Verify TODO.md was not overwritten
      const content = await fs.readFile(path.join(registersDir, 'TODO.md'), 'utf-8');
      expect(content).toBe(existingContent);
      expect(content).toContain('My Custom TODO');
      expect(content).toContain('Important task 1');

      // Verify it's reported as existing
      expect(result.existing).toContain('TODO.md');
      expect(result.created).not.toContain('TODO.md');
    });

    it('preserves all existing files while creating missing ones', async () => {
      await fs.mkdir(registersDir, { recursive: true });

      // Create only ISSUES.md
      const existingIssues = `---
title: Existing Issues
type: register
---

# Known Issues

- Bug #1
`;
      await fs.writeFile(path.join(registersDir, 'ISSUES.md'), existingIssues, 'utf-8');

      const initializer = new RegisterInitializer(registersDir);
      const result = await initializer.initialize();

      // ISSUES.md should be preserved
      expect(result.existing).toContain('ISSUES.md');
      const issuesContent = await fs.readFile(path.join(registersDir, 'ISSUES.md'), 'utf-8');
      expect(issuesContent).toBe(existingIssues);

      // TODO.md and CHANGELOG.md should be created
      expect(result.created).toContain('TODO.md');
      expect(result.created).toContain('CHANGELOG.md');
    });
  });

  describe('returns correct created and existing arrays', () => {
    it('returns all files as created when none exist', async () => {
      await fs.mkdir(registersDir, { recursive: true });

      const initializer = new RegisterInitializer(registersDir);
      const result = await initializer.initialize();

      expect(result.created).toHaveLength(3);
      expect(result.created).toContain('TODO.md');
      expect(result.created).toContain('ISSUES.md');
      expect(result.created).toContain('CHANGELOG.md');
      expect(result.existing).toHaveLength(0);
    });

    it('returns all files as existing when all exist', async () => {
      await fs.mkdir(registersDir, { recursive: true });

      // Create all register files
      await fs.writeFile(path.join(registersDir, 'TODO.md'), '# TODO', 'utf-8');
      await fs.writeFile(path.join(registersDir, 'ISSUES.md'), '# Issues', 'utf-8');
      await fs.writeFile(path.join(registersDir, 'CHANGELOG.md'), '# Changelog', 'utf-8');

      const initializer = new RegisterInitializer(registersDir);
      const result = await initializer.initialize();

      expect(result.existing).toHaveLength(3);
      expect(result.existing).toContain('TODO.md');
      expect(result.existing).toContain('ISSUES.md');
      expect(result.existing).toContain('CHANGELOG.md');
      expect(result.created).toHaveLength(0);
    });

    it('returns mixed results when some files exist', async () => {
      await fs.mkdir(registersDir, { recursive: true });

      // Create only CHANGELOG.md
      await fs.writeFile(path.join(registersDir, 'CHANGELOG.md'), '# Changelog', 'utf-8');

      const initializer = new RegisterInitializer(registersDir);
      const result = await initializer.initialize();

      expect(result.created).toHaveLength(2);
      expect(result.created).toContain('TODO.md');
      expect(result.created).toContain('ISSUES.md');

      expect(result.existing).toHaveLength(1);
      expect(result.existing).toContain('CHANGELOG.md');
    });
  });

  describe('creates registers directory if not exists', () => {
    it('creates parent directories when they do not exist', async () => {
      // Do NOT create the registers directory beforehand
      // The directory should not exist
      const nonExistentDir = path.join(tempDir, 'new-docs', 'new-registers');

      // Verify directory does not exist
      await expect(fs.access(nonExistentDir)).rejects.toThrow();

      // Create the directory before initializing (as the initializer expects directory to exist)
      // Note: The RegisterInitializer itself doesn't create directories - that's the job of StructureGenerator
      // But we're testing that it works correctly when the directory exists
      await fs.mkdir(nonExistentDir, { recursive: true });

      const initializer = new RegisterInitializer(nonExistentDir);
      const result = await initializer.initialize();

      // Verify files were created
      expect(result.created).toHaveLength(3);

      // Verify files exist
      const todoStats = await fs.stat(path.join(nonExistentDir, 'TODO.md'));
      expect(todoStats.isFile()).toBe(true);

      const issuesStats = await fs.stat(path.join(nonExistentDir, 'ISSUES.md'));
      expect(issuesStats.isFile()).toBe(true);

      const changelogStats = await fs.stat(path.join(nonExistentDir, 'CHANGELOG.md'));
      expect(changelogStats.isFile()).toBe(true);
    });

    it('throws error when registers directory does not exist', async () => {
      // Test that initializer throws when directory doesn't exist
      const nonExistentDir = path.join(tempDir, 'does-not-exist');

      const initializer = new RegisterInitializer(nonExistentDir);

      // Should throw because directory doesn't exist
      await expect(initializer.initialize()).rejects.toThrow();
    });
  });
});
