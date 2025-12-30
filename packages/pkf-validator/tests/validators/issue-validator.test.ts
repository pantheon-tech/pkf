/**
 * Tests for the Issue Validator
 *
 * Tests validation of ISSUES.md files including:
 * - Parsing issues from markdown
 * - ID format validation (ISSUE-XXX)
 * - Status/severity validation
 * - Related issues validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { validateIssues, parseIssues } from '../../src/validators/index.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'pkf-issue-validator-test-' + Date.now());

beforeAll(async () => {
  await mkdir(testDir, { recursive: true });
});

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('validateIssues', () => {
  describe('File existence checks', () => {
    it('should return error for non-existent file', async () => {
      const result = await validateIssues('/nonexistent/ISSUES.md');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('FILE_NOT_FOUND');
    });

    it('should provide suggestion for missing file', async () => {
      const result = await validateIssues(join(testDir, 'missing-ISSUES.md'));

      expect(result.errors[0]?.suggestion).toContain('Create an ISSUES.md');
    });
  });

  describe('Empty ISSUES file', () => {
    it('should return info when no issues found', async () => {
      const issuesPath = join(testDir, 'empty-ISSUES.md');
      await writeFile(issuesPath, '# ISSUES Register\n\nNo issues yet.\n');

      const result = await validateIssues(issuesPath);

      expect(result.valid).toBe(true);
      expect(result.info.some(i => i.code === 'NO_ISSUES_FOUND')).toBe(true);
      expect(result.itemCount).toBe(0);
    });
  });

  describe('Valid issue items', () => {
    it('should validate a valid issue item', async () => {
      const issuesPath = join(testDir, 'valid-ISSUES.md');
      const content = `# ISSUES Register

### ISSUE-001: Test Issue

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: medium
created: 2025-01-15
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.itemCount).toBe(1);
    });

    it('should validate multiple valid issues', async () => {
      const issuesPath = join(testDir, 'multi-ISSUES.md');
      const content = `# ISSUES Register

### ISSUE-001: First Issue

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: high
created: 2025-01-10
\`\`\`

### ISSUE-002: Second Issue

\`\`\`yaml
id: ISSUE-002
type: issue-item
status: investigating
severity: medium
created: 2025-01-12
\`\`\`

### ISSUE-003: Third Issue

\`\`\`yaml
id: ISSUE-003
type: issue-item
status: resolved
severity: low
created: 2025-01-14
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);

      expect(result.valid).toBe(true);
      expect(result.itemCount).toBe(3);
    });

    it('should accept all valid status values', async () => {
      const statuses = ['open', 'investigating', 'in-progress', 'resolved', 'wontfix', 'duplicate'];

      for (const status of statuses) {
        const issuesPath = join(testDir, `status-${status}-issue.md`);
        const content = `# ISSUES

### ISSUE-001: Status Test

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: ${status}
severity: medium
created: 2025-01-15
\`\`\`
`;
        await writeFile(issuesPath, content);

        const result = await validateIssues(issuesPath);
        // No warnings about invalid status
        expect(result.warnings.filter(w => w.code === 'INVALID_STATUS')).toHaveLength(0);
      }
    });

    it('should accept all valid severity values', async () => {
      const severities = ['critical', 'high', 'medium', 'low'];

      for (const severity of severities) {
        const issuesPath = join(testDir, `severity-${severity}-issue.md`);
        const content = `# ISSUES

### ISSUE-001: Severity Test

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: ${severity}
created: 2025-01-15
\`\`\`
`;
        await writeFile(issuesPath, content);

        const result = await validateIssues(issuesPath);
        // No warnings about invalid severity
        expect(result.warnings.filter(w => w.code === 'INVALID_SEVERITY')).toHaveLength(0);
      }
    });
  });

  describe('ID format validation', () => {
    it('should accept valid ID formats', async () => {
      const issuesPath = join(testDir, 'valid-ids-issues.md');
      const content = `# ISSUES

### ISSUE-001: Three digit

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: medium
created: 2025-01-15
\`\`\`

### ISSUE-0001: Four digit

\`\`\`yaml
id: ISSUE-0001
type: issue-item
status: open
severity: medium
created: 2025-01-15
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);
      expect(result.errors.filter(e => e.code === 'INVALID_ID_FORMAT')).toHaveLength(0);
    });

    it('should error when frontmatter ID does not match heading ID', async () => {
      const issuesPath = join(testDir, 'id-mismatch.md');
      const content = `# ISSUES

### ISSUE-001: Mismatch Test

\`\`\`yaml
id: ISSUE-002
type: issue-item
status: open
severity: medium
created: 2025-01-15
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'ID_MISMATCH')).toBe(true);
    });
  });

  describe('ID uniqueness validation', () => {
    it('should detect duplicate IDs', async () => {
      const issuesPath = join(testDir, 'duplicate-ISSUES.md');
      const content = `# ISSUES Register

### ISSUE-001: First Issue

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: medium
created: 2025-01-15
\`\`\`

### ISSUE-001: Duplicate Issue

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: high
created: 2025-01-16
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_ID')).toBe(true);
    });

    it('should include first occurrence line number in duplicate error', async () => {
      const issuesPath = join(testDir, 'dup-line-issues.md');
      const content = `# ISSUES

### ISSUE-001: First

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: medium
created: 2025-01-15
\`\`\`

### ISSUE-001: Second

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: medium
created: 2025-01-15
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);
      const dupError = result.errors.find(e => e.code === 'DUPLICATE_ID');

      expect(dupError).toBeDefined();
      expect(dupError?.message).toContain('first occurrence at line');
    });
  });

  describe('Status and severity validation', () => {
    it('should warn for invalid status values', async () => {
      const issuesPath = join(testDir, 'invalid-status-issues.md');
      const content = `# ISSUES

### ISSUE-001: Invalid Status

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: invalid-status
severity: medium
created: 2025-01-15
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);

      expect(result.warnings.some(w => w.code === 'INVALID_STATUS')).toBe(true);
    });

    it('should warn for invalid severity values', async () => {
      const issuesPath = join(testDir, 'invalid-severity-issues.md');
      const content = `# ISSUES

### ISSUE-001: Invalid Severity

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: extreme
created: 2025-01-15
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);

      expect(result.warnings.some(w => w.code === 'INVALID_SEVERITY')).toBe(true);
    });

    it('should not warn when includeWarnings is false', async () => {
      const issuesPath = join(testDir, 'no-warnings-issues.md');
      const content = `# ISSUES

### ISSUE-001: Invalid Status

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: invalid
severity: extreme
created: 2025-01-15
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath, { includeWarnings: false });

      expect(result.warnings.filter(w =>
        w.code === 'INVALID_STATUS' || w.code === 'INVALID_SEVERITY'
      )).toHaveLength(0);
    });
  });

  describe('Related issues validation', () => {
    it('should warn for invalid related issue ID format', async () => {
      const issuesPath = join(testDir, 'invalid-related-format.md');
      const content = `# ISSUES

### ISSUE-001: Has Invalid Related

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: medium
created: 2025-01-15
related_issues:
  - NOT-AN-ISSUE-ID
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);

      expect(result.warnings.some(w => w.code === 'INVALID_RELATED_ID_FORMAT')).toBe(true);
    });

    it('should warn for self-reference in related issues', async () => {
      const issuesPath = join(testDir, 'self-ref-issues.md');
      const content = `# ISSUES

### ISSUE-001: Self Reference

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: medium
created: 2025-01-15
related_issues:
  - ISSUE-001
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);

      expect(result.warnings.some(w => w.code === 'SELF_REFERENCE')).toBe(true);
    });

    it('should accept valid related issue references', async () => {
      const issuesPath = join(testDir, 'valid-related.md');
      const content = `# ISSUES

### ISSUE-001: First Issue

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: medium
created: 2025-01-15
\`\`\`

### ISSUE-002: Second Issue

\`\`\`yaml
id: ISSUE-002
type: issue-item
status: open
severity: medium
created: 2025-01-15
related_issues:
  - ISSUE-001
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);

      expect(result.warnings.filter(w =>
        w.code === 'INVALID_RELATED_ID_FORMAT' || w.code === 'SELF_REFERENCE'
      )).toHaveLength(0);
    });
  });

  describe('Missing frontmatter', () => {
    it('should warn when issue has no frontmatter', async () => {
      const issuesPath = join(testDir, 'no-frontmatter.md');
      const content = `# ISSUES

### ISSUE-001: No Frontmatter

This issue has no YAML block.
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);

      expect(result.warnings.some(w => w.code === 'MISSING_FRONTMATTER')).toBe(true);
    });
  });

  describe('YAML parsing errors', () => {
    it('should handle YAML parse errors gracefully', async () => {
      const issuesPath = join(testDir, 'yaml-error-issues.md');
      const content = `# ISSUES

### ISSUE-001: YAML Error

\`\`\`yaml
id: [unterminated
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'YAML_PARSE_ERROR')).toBe(true);
    });
  });

  describe('Max errors option', () => {
    it('should respect maxErrors option', async () => {
      const issuesPath = join(testDir, 'max-errors-issues.md');
      const content = `# ISSUES

### ISSUE-001: Error 1

\`\`\`yaml
id: ISSUE-002
type: issue-item
status: open
severity: medium
created: 2025-01-15
\`\`\`

### ISSUE-003: Error 2

\`\`\`yaml
id: ISSUE-004
type: issue-item
status: open
severity: medium
created: 2025-01-15
\`\`\`

### ISSUE-005: Error 3

\`\`\`yaml
id: ISSUE-006
type: issue-item
status: open
severity: medium
created: 2025-01-15
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath, { maxErrors: 2 });

      expect(result.errors.length).toBeLessThanOrEqual(2);
      expect(result.warnings.some(w => w.code === 'MAX_ERRORS_REACHED')).toBe(true);
    });
  });

  describe('Duration tracking', () => {
    it('should track validation duration', async () => {
      const issuesPath = join(testDir, 'duration-issues.md');
      const content = `# ISSUES

### ISSUE-001: Test

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: medium
created: 2025-01-15
\`\`\`
`;
      await writeFile(issuesPath, content);

      const result = await validateIssues(issuesPath);

      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Fixture file validation', () => {
    it('should validate the fixture file successfully', async () => {
      const fixturePath = join(process.cwd(), 'tests', 'fixtures', 'valid-issues.md');

      const result = await validateIssues(fixturePath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.itemCount).toBe(3);
    });
  });
});

describe('parseIssues', () => {
  it('should return empty array for non-existent file', async () => {
    const issues = await parseIssues('/nonexistent/ISSUES.md');

    expect(issues).toEqual([]);
  });

  it('should parse issues from file', async () => {
    const issuesPath = join(testDir, 'parse-test.md');
    const content = `# ISSUES

### ISSUE-001: First Issue

\`\`\`yaml
id: ISSUE-001
type: issue-item
status: open
severity: high
created: 2025-01-15
\`\`\`

### ISSUE-002: Second Issue

\`\`\`yaml
id: ISSUE-002
type: issue-item
status: resolved
severity: low
created: 2025-01-16
\`\`\`
`;
    await writeFile(issuesPath, content);

    const issues = await parseIssues(issuesPath);

    expect(issues).toHaveLength(2);
    expect(issues[0]?.id).toBe('ISSUE-001');
    expect(issues[0]?.title).toBe('First Issue');
    expect(issues[1]?.id).toBe('ISSUE-002');
    expect(issues[1]?.frontmatter.severity).toBe('low');
  });
});
