/**
 * INDEX Parser Integration Tests
 *
 * Tests the INDEX file parser to ensure correct filename extraction
 * from various INDEX file formats.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '../fixtures');

/**
 * Parse an INDEX file and extract filenames
 * (Mirrors the logic in structure-validator.ts)
 */
function parseIndexFile(indexPath: string): Set<string> {
  const filenames = new Set<string>();

  if (!existsSync(indexPath)) {
    return filenames;
  }

  try {
    const content = readFileSync(indexPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const filename = trimmed.slice(0, colonIndex).trim();
        if (filename) {
          filenames.add(filename);
        }
      }
    }
  } catch {
    // Ignore parse errors
  }

  return filenames;
}

describe('INDEX Parser', () => {
  describe('valid INDEX format', () => {
    it('should parse standard INDEX format correctly', () => {
      const indexPath = join(FIXTURES_DIR, 'valid-structure/docs/guides/INDEX');
      const files = parseIndexFile(indexPath);

      expect(files.has('README.md')).toBe(true);
    });

    it('should skip comment lines', () => {
      const indexPath = join(FIXTURES_DIR, 'valid-structure/docs/INDEX');
      const files = parseIndexFile(indexPath);

      // Comments start with #, should not be in filenames
      expect([...files].some((f) => f.startsWith('#'))).toBe(false);
    });

    it('should skip empty lines', () => {
      const indexPath = join(FIXTURES_DIR, 'invalid-index/docs/section-b/INDEX');
      const files = parseIndexFile(indexPath);

      // Empty INDEX should return empty set
      expect(files.size).toBe(0);
    });
  });

  describe('malformed INDEX files', () => {
    it('should handle missing colons gracefully', () => {
      const indexPath = join(FIXTURES_DIR, 'invalid-index/docs/section-a/INDEX');
      const files = parseIndexFile(indexPath);

      // Lines without colons should be skipped
      expect(files.size).toBe(0);
    });

    it('should handle INDEX listing non-existent files', () => {
      const indexPath = join(FIXTURES_DIR, 'invalid-index/docs/section-c/INDEX');
      const files = parseIndexFile(indexPath);

      // Parser should still extract filenames even if files don't exist
      expect(files.has('ghost-file.md')).toBe(true);
      expect(files.has('phantom.md')).toBe(true);
      expect(files.has('actual-file.md')).toBe(true);
      expect(files.size).toBe(3);
    });
  });

  describe('complex INDEX files', () => {
    it('should parse INDEX with multiple files', () => {
      const indexPath = join(FIXTURES_DIR, 'large-structure/docs/guides/INDEX');
      const files = parseIndexFile(indexPath);

      expect(files.has('getting-started.md')).toBe(true);
      expect(files.has('developer-guide.md')).toBe(true);
      expect(files.has('troubleshooting.md')).toBe(true);
      expect(files.size).toBe(3);
    });

    it('should handle INDEX with long descriptions', () => {
      const indexPath = join(
        FIXTURES_DIR,
        'large-structure/docs/architecture/active/INDEX'
      );
      const files = parseIndexFile(indexPath);

      expect(files.has('SYSTEM-ARCHITECTURE.md')).toBe(true);
      expect(files.has('API-DESIGN.md')).toBe(true);
    });

    it('should handle filenames with special characters', () => {
      const indexPath = join(
        FIXTURES_DIR,
        'large-structure/docs/proposals/active/INDEX'
      );
      const files = parseIndexFile(indexPath);

      // PROP-002-api-v2.md has hyphens
      expect(files.has('PROP-002-api-v2.md')).toBe(true);
      expect(files.has('PROP-003-performance.md')).toBe(true);
    });
  });

  describe('INDEX file not found', () => {
    it('should return empty set for non-existent INDEX', () => {
      const files = parseIndexFile('/non/existent/INDEX');
      expect(files.size).toBe(0);
    });
  });
});

describe('INDEX Content Validation', () => {
  it('should extract correct number of files from valid INDEX', () => {
    const indexPath = join(
      FIXTURES_DIR,
      'misformatted-docs/docs/guides/INDEX'
    );
    const files = parseIndexFile(indexPath);

    // Should have 6 files listed
    expect(files.size).toBe(6);
    expect(files.has('broken-links.md')).toBe(true);
    expect(files.has('duplicate-headings.md')).toBe(true);
    expect(files.has('empty-sections.md')).toBe(true);
    expect(files.has('malformed-lists.md')).toBe(true);
    expect(files.has('missing-title.md')).toBe(true);
    expect(files.has('tabs-vs-spaces.md')).toBe(true);
  });
});
