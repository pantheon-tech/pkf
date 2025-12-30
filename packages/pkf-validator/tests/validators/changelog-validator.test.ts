/**
 * Tests for the Changelog Validator
 *
 * Tests validation of CHANGELOG.md files including:
 * - Valid changelog format
 * - Semver version validation
 * - Date format validation
 * - Reverse chronological order
 * - Change type validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { validateChangelog, changelogValidator } from '../../src/validators/index.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'pkf-changelog-validator-test-' + Date.now());

beforeAll(async () => {
  await mkdir(testDir, { recursive: true });
});

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('validateChangelog', () => {
  describe('File existence checks', () => {
    it('should return error for non-existent file', async () => {
      const result = await validateChangelog('/nonexistent/CHANGELOG.md');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('Empty changelog', () => {
    it('should warn when no version entries found', async () => {
      const changelogPath = join(testDir, 'empty-CHANGELOG.md');
      await writeFile(changelogPath, '# Changelog\n\nNo releases yet.\n');

      const result = await validateChangelog(changelogPath);

      expect(result.warnings.some(w => w.code === 'NO_VERSIONS')).toBe(true);
    });
  });

  describe('Valid changelog format', () => {
    it('should validate a minimal valid changelog', async () => {
      const changelogPath = join(testDir, 'minimal-CHANGELOG.md');
      const content = `# Changelog

## [1.0.0] - 2025-01-15

### Added
- Initial release
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.itemCount).toBe(1);
    });

    it('should validate changelog with unreleased section', async () => {
      const changelogPath = join(testDir, 'unreleased-CHANGELOG.md');
      const content = `# Changelog

## [Unreleased]

### Added
- New feature in development

## [1.0.0] - 2025-01-15

### Added
- Initial release
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(true);
      expect(result.itemCount).toBe(2);
    });

    it('should validate changelog with frontmatter', async () => {
      const changelogPath = join(testDir, 'frontmatter-CHANGELOG.md');
      const content = `# Changelog

## [1.0.0] - 2025-01-15

\`\`\`yaml
version: 1.0.0
type: changelog-entry
status: released
date: 2025-01-15
\`\`\`

### Added
- Initial release
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(true);
    });
  });

  describe('Semver version validation', () => {
    it('should accept valid semver versions', async () => {
      const versions = ['1.0.0', '0.1.0', '10.20.30', '1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-beta.2'];

      for (const version of versions) {
        const changelogPath = join(testDir, `semver-${version.replace(/\./g, '-')}.md`);
        const content = `# Changelog

## [${version}] - 2025-01-15

### Added
- Test
`;
        await writeFile(changelogPath, content);

        const result = await validateChangelog(changelogPath);
        expect(result.errors.filter(e => e.code === 'INVALID_SEMVER')).toHaveLength(0);
      }
    });

    it('should error for invalid semver versions', async () => {
      const changelogPath = join(testDir, 'invalid-semver.md');
      const content = `# Changelog

## [not-a-version] - 2025-01-15

### Added
- Test
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_SEMVER')).toBe(true);
    });

    it('should not require semver for Unreleased section', async () => {
      const changelogPath = join(testDir, 'unreleased-no-semver.md');
      const content = `# Changelog

## [Unreleased]

### Added
- Work in progress
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.errors.filter(e => e.code === 'INVALID_SEMVER')).toHaveLength(0);
    });
  });

  describe('Date format validation', () => {
    it('should accept valid date formats', async () => {
      const changelogPath = join(testDir, 'valid-date.md');
      const content = `# Changelog

## [1.0.0] - 2025-01-15

### Added
- Test
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.errors.filter(e => e.code === 'INVALID_DATE')).toHaveLength(0);
    });

    it('should error for missing date on released version', async () => {
      const changelogPath = join(testDir, 'missing-date.md');
      const content = `# Changelog

## [1.0.0]

### Added
- Test
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_DATE')).toBe(true);
    });

    it('should error for invalid date format', async () => {
      const changelogPath = join(testDir, 'invalid-date-format.md');
      const content = `# Changelog

## [1.0.0] - 2025/01/15

### Added
- Test
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      // The header regex won't match this, so the date won't be captured properly
      // The behavior depends on the implementation
      expect(result.valid).toBe(false);
    });

    it('should error for semantically invalid date', async () => {
      const changelogPath = join(testDir, 'invalid-semantic-date.md');
      const content = `# Changelog

## [1.0.0] - 2025-02-30

### Added
- Test
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_DATE')).toBe(true);
    });

    it('should not require date for Unreleased section', async () => {
      const changelogPath = join(testDir, 'unreleased-no-date.md');
      const content = `# Changelog

## [Unreleased]

### Added
- Work in progress
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.errors.filter(e => e.code === 'MISSING_DATE')).toHaveLength(0);
    });
  });

  describe('Reverse chronological order', () => {
    it('should pass for correctly ordered versions', async () => {
      const changelogPath = join(testDir, 'correct-order.md');
      const content = `# Changelog

## [Unreleased]

### Added
- Upcoming feature

## [2.0.0] - 2025-01-20

### Added
- Major update

## [1.0.0] - 2025-01-15

### Added
- Initial release
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(true);
      expect(result.errors.filter(e => e.code === 'VERSION_ORDER')).toHaveLength(0);
    });

    it('should error when versions are not in reverse order', async () => {
      const changelogPath = join(testDir, 'wrong-order.md');
      const content = `# Changelog

## [1.0.0] - 2025-01-15

### Added
- First

## [2.0.0] - 2025-01-20

### Added
- Second
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'VERSION_ORDER')).toBe(true);
    });

    it('should error when dates are not in reverse order', async () => {
      const changelogPath = join(testDir, 'wrong-date-order.md');
      const content = `# Changelog

## [2.0.0] - 2025-01-10

### Added
- Newer version with older date

## [1.0.0] - 2025-01-15

### Added
- Older version with newer date
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DATE_ORDER')).toBe(true);
    });

    it('should error when Unreleased is not first', async () => {
      const changelogPath = join(testDir, 'unreleased-not-first.md');
      const content = `# Changelog

## [1.0.0] - 2025-01-15

### Added
- First

## [Unreleased]

### Added
- Should be first
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'UNRELEASED_NOT_FIRST')).toBe(true);
    });
  });

  describe('Change type validation', () => {
    it('should accept valid change types', async () => {
      const changeTypes = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

      for (const changeType of changeTypes) {
        const changelogPath = join(testDir, `change-type-${changeType.toLowerCase()}.md`);
        const content = `# Changelog

## [1.0.0] - 2025-01-15

### ${changeType}
- Test entry
`;
        await writeFile(changelogPath, content);

        const result = await validateChangelog(changelogPath);
        expect(result.warnings.filter(w => w.code === 'INVALID_CHANGE_TYPE')).toHaveLength(0);
      }
    });

    it('should warn for invalid change types', async () => {
      const changelogPath = join(testDir, 'invalid-change-type.md');
      const content = `# Changelog

## [1.0.0] - 2025-01-15

### InvalidType
- Test entry
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.warnings.some(w => w.code === 'INVALID_CHANGE_TYPE')).toBe(true);
    });

    it('should accept case-insensitive change types', async () => {
      const changelogPath = join(testDir, 'case-insensitive-types.md');
      const content = `# Changelog

## [1.0.0] - 2025-01-15

### ADDED
- Upper case

### added
- Lower case

### Added
- Title case
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.warnings.filter(w => w.code === 'INVALID_CHANGE_TYPE')).toHaveLength(0);
    });
  });

  describe('Frontmatter validation', () => {
    it('should error when frontmatter version mismatches header', async () => {
      const changelogPath = join(testDir, 'version-mismatch.md');
      const content = `# Changelog

## [1.0.0] - 2025-01-15

\`\`\`yaml
version: 2.0.0
type: changelog-entry
status: released
date: 2025-01-15
\`\`\`

### Added
- Test
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'VERSION_MISMATCH')).toBe(true);
    });

    it('should error when frontmatter date mismatches header', async () => {
      const changelogPath = join(testDir, 'date-mismatch.md');
      const content = `# Changelog

## [1.0.0] - 2025-01-15

\`\`\`yaml
version: 1.0.0
type: changelog-entry
status: released
date: 2025-01-20
\`\`\`

### Added
- Test
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DATE_MISMATCH')).toBe(true);
    });

    it('should error when unreleased section has wrong status', async () => {
      const changelogPath = join(testDir, 'wrong-unreleased-status.md');
      const content = `# Changelog

## [Unreleased]

\`\`\`yaml
version: unreleased
type: changelog-entry
status: released
\`\`\`

### Added
- Test
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'STATUS_MISMATCH')).toBe(true);
    });

    it('should error when released version has unreleased status', async () => {
      const changelogPath = join(testDir, 'wrong-released-status.md');
      const content = `# Changelog

## [1.0.0] - 2025-01-15

\`\`\`yaml
version: 1.0.0
type: changelog-entry
status: unreleased
date: 2025-01-15
\`\`\`

### Added
- Test
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'STATUS_MISMATCH')).toBe(true);
    });

    it('should handle YAML parse errors in frontmatter', async () => {
      const changelogPath = join(testDir, 'yaml-error-frontmatter.md');
      const content = `# Changelog

## [1.0.0] - 2025-01-15

\`\`\`yaml
version: [unterminated
\`\`\`

### Added
- Test
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'YAML_PARSE_ERROR')).toBe(true);
    });
  });

  describe('Empty version warning', () => {
    it('should warn when released version has no changes', async () => {
      const changelogPath = join(testDir, 'empty-version.md');
      const content = `# Changelog

## [1.0.0] - 2025-01-15
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.warnings.some(w => w.code === 'EMPTY_VERSION')).toBe(true);
    });

    it('should not warn for empty Unreleased section', async () => {
      const changelogPath = join(testDir, 'empty-unreleased.md');
      const content = `# Changelog

## [Unreleased]

## [1.0.0] - 2025-01-15

### Added
- Initial release
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      // The Unreleased being empty should not trigger EMPTY_VERSION warning
      const emptyVersionWarnings = result.warnings.filter(w => w.code === 'EMPTY_VERSION');
      expect(emptyVersionWarnings.every(w => !w.message.includes('Unreleased'))).toBe(true);
    });
  });

  describe('Max errors option', () => {
    it('should respect maxErrors option', async () => {
      const changelogPath = join(testDir, 'max-errors-changelog.md');
      const content = `# Changelog

## [bad1] - 2025-01-15

### Added
- Test

## [bad2] - 2025-01-14

### Added
- Test

## [bad3] - 2025-01-13

### Added
- Test
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath, { maxErrors: 2 });

      expect(result.errors.length).toBeLessThanOrEqual(2);
      expect(result.info.some(i => i.code === 'MAX_ERRORS_REACHED')).toBe(true);
    });
  });

  describe('Duration tracking', () => {
    it('should track validation duration', async () => {
      const changelogPath = join(testDir, 'duration-changelog.md');
      const content = `# Changelog

## [1.0.0] - 2025-01-15

### Added
- Test
`;
      await writeFile(changelogPath, content);

      const result = await validateChangelog(changelogPath);

      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Fixture file validation', () => {
    it('should validate the fixture file successfully', async () => {
      const fixturePath = join(process.cwd(), 'tests', 'fixtures', 'valid-changelog.md');

      const result = await validateChangelog(fixturePath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.itemCount).toBe(4); // Unreleased + 3 versions
    });
  });
});

describe('changelogValidator', () => {
  it('should have correct name and description', () => {
    expect(changelogValidator.name).toBe('changelog-validator');
    expect(changelogValidator.description).toBeDefined();
  });

  it('should validate using the validate method', async () => {
    const changelogPath = join(testDir, 'validator-method.md');
    const content = `# Changelog

## [1.0.0] - 2025-01-15

### Added
- Test
`;
    await writeFile(changelogPath, content);

    const result = await changelogValidator.validate(changelogPath);

    expect(result.valid).toBe(true);
  });
});
