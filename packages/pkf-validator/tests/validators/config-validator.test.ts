/**
 * Tests for the Config Validator
 *
 * Tests validation of pkf.config.yaml files including:
 * - Valid config files passing validation
 * - Missing required fields detection
 * - Invalid directory paths warnings/errors
 * - Schema validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { validateConfig, loadConfig } from '../../src/validators/index.js';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'pkf-config-validator-test-' + Date.now());
const schemaDir = join(testDir, 'schemas');

// Read the actual schema from the project
const projectSchemaPath = join(process.cwd(), '..', '..', 'schemas', 'pkf-config.schema.json');

beforeAll(async () => {
  await mkdir(testDir, { recursive: true });
  await mkdir(schemaDir, { recursive: true });
  await mkdir(join(testDir, 'docs'), { recursive: true });
  await mkdir(join(testDir, 'docs', 'registers'), { recursive: true });

  // Copy the schema to the test directory
  try {
    const schemaContent = await readFile(projectSchemaPath, 'utf-8');
    await writeFile(join(schemaDir, 'pkf-config.schema.json'), schemaContent);
  } catch {
    // Schema may not exist in test environment, tests will handle this
  }
});

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('validateConfig', () => {
  describe('File existence checks', () => {
    it('should return error when config file does not exist', async () => {
      const result = await validateConfig({
        rootDir: '/nonexistent/path',
        configPath: '/nonexistent/pkf.config.yaml',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('CONFIG_NOT_FOUND');
    });

    it('should provide suggestion for missing config file', async () => {
      const result = await validateConfig({
        rootDir: testDir,
        configPath: join(testDir, 'missing.yaml'),
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.suggestion).toContain('Create a pkf.config.yaml');
    });
  });

  describe('Valid config files', () => {
    it('should pass validation for a minimal valid config', async () => {
      const configPath = join(testDir, 'minimal-config.yaml');
      const content = `
version: "1.0.0"
project:
  name: "test-project"
`;
      await writeFile(configPath, content);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for a complete valid config', async () => {
      const configPath = join(testDir, 'complete-config.yaml');
      const content = `
version: "1.0.0"
project:
  name: "test-project"
  version: "0.1.0"
  description: "A test project"

structure:
  docsDir: "docs"
  registersDir: "docs/registers"

registers:
  todoFile: "TODO.md"
  issuesFile: "ISSUES.md"
  changelogFile: "CHANGELOG.md"
`;
      await writeFile(configPath, content);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should set itemCount to 1 for valid config', async () => {
      const configPath = join(testDir, 'count-config.yaml');
      await writeFile(configPath, `version: "1.0.0"\nproject:\n  name: "test"`);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.itemCount).toBe(1);
    });
  });

  describe('Missing required fields', () => {
    it('should fail when version field is missing', async () => {
      const configPath = join(testDir, 'no-version.yaml');
      await writeFile(configPath, `project:\n  name: "test"`);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED_FIELD')).toBe(true);
    });

    it('should fail when project field is missing', async () => {
      const configPath = join(testDir, 'no-project.yaml');
      await writeFile(configPath, `version: "1.0.0"`);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED_FIELD')).toBe(true);
    });

    it('should fail when project.name is missing', async () => {
      const configPath = join(testDir, 'no-project-name.yaml');
      await writeFile(configPath, `version: "1.0.0"\nproject:\n  description: "test"`);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED_FIELD')).toBe(true);
    });
  });

  describe('Version format validation', () => {
    it('should fail for invalid version format', async () => {
      const configPath = join(testDir, 'invalid-version.yaml');
      await writeFile(configPath, `version: "not-semver"\nproject:\n  name: "test"`);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.valid).toBe(false);
      // INVALID_VERSION from basic validation, PATTERN_MISMATCH from schema validation
      expect(result.errors.some(e =>
        e.code === 'INVALID_VERSION' || e.code === 'PATTERN_MISMATCH'
      )).toBe(true);
    });

    it('should accept valid semver with prerelease', async () => {
      const configPath = join(testDir, 'prerelease-version.yaml');
      await writeFile(configPath, `version: "1.0.0-alpha.1"\nproject:\n  name: "test"`);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.valid).toBe(true);
    });

    it('should fail for invalid project.version format', async () => {
      const configPath = join(testDir, 'invalid-project-version.yaml');
      const content = `
version: "1.0.0"
project:
  name: "test"
  version: "invalid"
`;
      await writeFile(configPath, content);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.valid).toBe(false);
      // INVALID_VERSION from basic validation, PATTERN_MISMATCH from schema validation
      expect(result.errors.some(e =>
        e.code === 'INVALID_VERSION' || e.code === 'PATTERN_MISMATCH'
      )).toBe(true);
    });
  });

  describe('Directory validation', () => {
    it('should error when required directories do not exist', async () => {
      const configPath = join(testDir, 'missing-dirs.yaml');
      const content = `
version: "1.0.0"
project:
  name: "test"
structure:
  docsDir: "nonexistent-docs"
  registersDir: "nonexistent/registers"
`;
      await writeFile(configPath, content);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: false,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DIRECTORY_NOT_FOUND')).toBe(true);
    });

    it('should warn when optional directories do not exist', async () => {
      const configPath = join(testDir, 'missing-optional-dirs.yaml');
      const content = `
version: "1.0.0"
project:
  name: "test"
structure:
  docsDir: "docs"
  registersDir: "docs/registers"
  templatesDir: "nonexistent/templates"
`;
      await writeFile(configPath, content);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: false,
      });

      // docsDir and registersDir exist, so no errors for those
      // templatesDir is optional so it should be a warning
      expect(result.warnings.some(w => w.code === 'DIRECTORY_MISSING')).toBe(true);
    });

    it('should skip directory checks when option is set', async () => {
      const configPath = join(testDir, 'skip-dir-check.yaml');
      const content = `
version: "1.0.0"
project:
  name: "test"
structure:
  docsDir: "nonexistent"
`;
      await writeFile(configPath, content);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.errors.filter(e => e.code === 'DIRECTORY_NOT_FOUND')).toHaveLength(0);
    });
  });

  describe('YAML parsing errors', () => {
    it('should fail for invalid YAML syntax', async () => {
      const configPath = join(testDir, 'invalid-yaml.yaml');
      await writeFile(configPath, `version: [unclosed`);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'CONFIG_PARSE_ERROR')).toBe(true);
    });

    it('should fail for empty config file', async () => {
      const configPath = join(testDir, 'empty.yaml');
      await writeFile(configPath, '');

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'CONFIG_EMPTY')).toBe(true);
    });
  });

  describe('Proposal ranges validation', () => {
    it('should fail when proposal range min >= max', async () => {
      const configPath = join(testDir, 'invalid-range.yaml');
      const content = `
version: "1.0.0"
project:
  name: "test"
proposals:
  enabled: true
  ranges:
    invalid:
      min: 100
      max: 50
`;
      await writeFile(configPath, content);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_RANGE')).toBe(true);
    });

    it('should fail when proposal ranges overlap', async () => {
      const configPath = join(testDir, 'overlapping-ranges.yaml');
      const content = `
version: "1.0.0"
project:
  name: "test"
proposals:
  enabled: true
  ranges:
    range1:
      min: 1
      max: 100
    range2:
      min: 50
      max: 150
`;
      await writeFile(configPath, content);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'OVERLAPPING_RANGES')).toBe(true);
    });

    it('should fail for negative min value in ranges', async () => {
      const configPath = join(testDir, 'negative-range.yaml');
      const content = `
version: "1.0.0"
project:
  name: "test"
proposals:
  enabled: true
  ranges:
    negative:
      min: -10
      max: 50
`;
      await writeFile(configPath, content);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_RANGE')).toBe(true);
    });
  });

  describe('Register ID prefix validation', () => {
    it('should warn for invalid ID prefix format', async () => {
      const configPath = join(testDir, 'invalid-prefix.yaml');
      const content = `
version: "1.0.0"
project:
  name: "test"
registers:
  idPrefix:
    todo: "lowercase-invalid"
`;
      await writeFile(configPath, content);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.warnings.some(w => w.code === 'INVALID_ID_PREFIX')).toBe(true);
    });

    it('should fail for duplicate ID prefixes', async () => {
      const configPath = join(testDir, 'duplicate-prefix.yaml');
      const content = `
version: "1.0.0"
project:
  name: "test"
registers:
  idPrefix:
    todo: "ITEM"
    issue: "ITEM"
`;
      await writeFile(configPath, content);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_ID_PREFIX')).toBe(true);
    });

    it('should accept valid ID prefixes', async () => {
      const configPath = join(testDir, 'valid-prefix.yaml');
      const content = `
version: "1.0.0"
project:
  name: "test"
registers:
  idPrefix:
    todo: "TODO"
    issue: "ISSUE"
    proposal: "PROP"
    adr: "ADR"
`;
      await writeFile(configPath, content);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.warnings.filter(w => w.code === 'INVALID_ID_PREFIX')).toHaveLength(0);
    });
  });

  describe('Duration tracking', () => {
    it('should track validation duration', async () => {
      const configPath = join(testDir, 'duration-test.yaml');
      await writeFile(configPath, `version: "1.0.0"\nproject:\n  name: "test"`);

      const result = await validateConfig({
        rootDir: testDir,
        configPath,
        skipDirectoryChecks: true,
      });

      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('loadConfig', () => {
  it('should return null config when validation fails', async () => {
    const { config, result } = await loadConfig({
      rootDir: testDir,
      configPath: join(testDir, 'nonexistent.yaml'),
    });

    expect(config).toBeNull();
    expect(result.valid).toBe(false);
  });

  it('should return parsed config when validation passes', async () => {
    const configPath = join(testDir, 'loadable-config.yaml');
    const content = `
version: "1.0.0"
project:
  name: "loadable-project"
  version: "0.1.0"
`;
    await writeFile(configPath, content);

    const { config, result } = await loadConfig({
      rootDir: testDir,
      configPath,
      skipDirectoryChecks: true,
    });

    expect(result.valid).toBe(true);
    expect(config).not.toBeNull();
    expect(config?.project.name).toBe('loadable-project');
    expect(config?.version).toBe('1.0.0');
  });
});
