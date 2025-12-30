/**
 * Unit tests for PostMigrationValidator
 * Tests validation of migrated files
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { PostMigrationValidator } from '../../src/migration/validation.js';
import type { LoadedConfig } from '../../src/types/index.js';

describe('PostMigrationValidator', () => {
  let validator: PostMigrationValidator;
  let tempDir: string;
  let mockConfig: LoadedConfig;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-validation-test-'));

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

    validator = new PostMigrationValidator(mockConfig);

    // Create docs directory
    await fs.mkdir(path.join(tempDir, 'docs'), { recursive: true });
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

  describe('validateFile', () => {
    it('validates file with valid frontmatter', async () => {
      const content = `---
title: Test Document
type: guide
created: 2024-01-15
updated: 2024-01-16
status: published
---

# Test Document

This is the document content.
`;

      const filePath = await createTestFile('docs/test.md', content);

      const summary = await validator.validate([filePath]);

      expect(summary.valid).toBe(true);
      expect(summary.totalFiles).toBe(1);
      expect(summary.validFiles).toBe(1);
      expect(summary.invalidFiles).toBe(0);
      expect(summary.errors).toEqual([]);
    });

    it('fails validation for missing file', async () => {
      const nonExistentPath = path.join(tempDir, 'docs', 'does-not-exist.md');

      const summary = await validator.validate([nonExistentPath]);

      expect(summary.valid).toBe(false);
      expect(summary.totalFiles).toBe(1);
      expect(summary.validFiles).toBe(0);
      expect(summary.invalidFiles).toBe(1);
      expect(summary.errors.length).toBe(1);
      expect(summary.errors[0].errors).toContain('File does not exist');
    });

    it('fails validation for missing frontmatter', async () => {
      const content = `# Test Document

This document has no frontmatter.

Just plain markdown content.
`;

      const filePath = await createTestFile('docs/no-frontmatter.md', content);

      const summary = await validator.validate([filePath]);

      expect(summary.valid).toBe(false);
      expect(summary.invalidFiles).toBe(1);
      expect(summary.errors[0].errors).toContain('Missing YAML frontmatter');
    });

    it('fails validation for invalid YAML frontmatter', async () => {
      // Use unclosed frontmatter block which the validator can detect
      const content = `---
title: Test
type: guide
This frontmatter is not closed properly
`;

      const filePath = await createTestFile('docs/invalid-yaml.md', content);

      const summary = await validator.validate([filePath]);

      expect(summary.valid).toBe(false);
      expect(summary.invalidFiles).toBe(1);
      expect(summary.errors[0].errors.some(e =>
        e.includes('Invalid YAML') || e.includes('Unclosed')
      )).toBe(true);
    });

    it('fails validation for missing required fields (title)', async () => {
      const content = `---
type: guide
status: draft
---

# Content without title in frontmatter
`;

      const filePath = await createTestFile('docs/missing-title.md', content);

      const summary = await validator.validate([filePath]);

      expect(summary.valid).toBe(false);
      expect(summary.invalidFiles).toBe(1);
      expect(summary.errors[0].errors).toContain('Missing required field: title');
    });

    it('validates date fields correctly', async () => {
      // Valid date formats
      const validContent = `---
title: Test Document
type: guide
created: 2024-01-15
updated: 2024-12-25T10:30:00Z
---

# Content
`;

      const invalidContent = `---
title: Test Document
type: guide
created: not-a-date
---

# Content
`;

      const validPath = await createTestFile('docs/valid-date.md', validContent);
      const invalidPath = await createTestFile('docs/invalid-date.md', invalidContent);

      const validSummary = await validator.validate([validPath]);
      const invalidSummary = await validator.validate([invalidPath]);

      expect(validSummary.valid).toBe(true);
      expect(invalidSummary.valid).toBe(false);
      expect(invalidSummary.errors[0].errors.some(e => e.includes('created') && e.includes('date'))).toBe(true);
    });

    it('returns correct summary counts', async () => {
      // Create mix of valid and invalid files
      const valid1 = `---
title: Valid 1
type: guide
---
Content`;

      const valid2 = `---
title: Valid 2
type: api-reference
---
Content`;

      const invalid1 = `No frontmatter here`;

      const invalid2 = `---
type: guide
---
Missing title`;

      const path1 = await createTestFile('docs/valid1.md', valid1);
      const path2 = await createTestFile('docs/valid2.md', valid2);
      const path3 = await createTestFile('docs/invalid1.md', invalid1);
      const path4 = await createTestFile('docs/invalid2.md', invalid2);

      const summary = await validator.validate([path1, path2, path3, path4]);

      expect(summary.totalFiles).toBe(4);
      expect(summary.validFiles).toBe(2);
      expect(summary.invalidFiles).toBe(2);
      expect(summary.valid).toBe(false); // Not all valid
      expect(summary.errors.length).toBe(2);
    });

    it('handles multiple files', async () => {
      // Create multiple valid files
      const files: string[] = [];

      for (let i = 0; i < 5; i++) {
        const content = `---
title: Document ${i}
type: guide
---

# Document ${i}

Content for document ${i}.
`;
        const filePath = await createTestFile(`docs/doc-${i}.md`, content);
        files.push(filePath);
      }

      const summary = await validator.validate(files);

      expect(summary.totalFiles).toBe(5);
      expect(summary.validFiles).toBe(5);
      expect(summary.invalidFiles).toBe(0);
      expect(summary.valid).toBe(true);
      expect(summary.errors).toEqual([]);
    });
  });
});
