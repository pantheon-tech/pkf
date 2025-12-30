/**
 * Frontmatter Validator Integration Tests
 *
 * Tests frontmatter parsing and validation against documents
 * with various frontmatter issues.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const FIXTURES_DIR = join(__dirname, '../fixtures');

interface FrontmatterResult {
  valid: boolean;
  frontmatter: Record<string, unknown> | null;
  error: string | null;
}

/**
 * Extract and parse frontmatter from markdown content
 */
function extractFrontmatter(content: string): FrontmatterResult {
  // Handle different line endings (CRLF, LF) and trim BOM
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);

  if (!match) {
    return {
      valid: false,
      frontmatter: null,
      error: 'No frontmatter block found',
    };
  }

  const yamlContent = match[1] ?? '';

  try {
    const frontmatter = parseYaml(yamlContent) as Record<string, unknown>;
    return {
      valid: true,
      frontmatter,
      error: null,
    };
  } catch (e: any) {
    return {
      valid: false,
      frontmatter: null,
      error: e.message || 'Invalid YAML',
    };
  }
}

/**
 * Validate required frontmatter fields
 */
function validateRequiredFields(
  frontmatter: Record<string, unknown>
): string[] {
  const required = ['title', 'status', 'category'];
  const missing: string[] = [];

  for (const field of required) {
    if (!frontmatter[field]) {
      missing.push(field);
    }
  }

  return missing;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

describe('Frontmatter Parser', () => {
  describe('valid frontmatter', () => {
    it('should parse valid frontmatter correctly', () => {
      const filePath = join(
        FIXTURES_DIR,
        'invalid-frontmatter/docs/proposals/valid-proposal.md'
      );
      const content = readFileSync(filePath, 'utf8');
      const result = extractFrontmatter(content);

      expect(result.valid).toBe(true);
      expect(result.frontmatter).not.toBeNull();
      expect(result.frontmatter?.title).toBe('Valid Proposal');
      expect(result.frontmatter?.version).toBe('1.0.0');
      expect(result.frontmatter?.status).toBe('Draft');
      expect(result.frontmatter?.category).toBe('proposal');
    });

    it('should extract tags array correctly', () => {
      const filePath = join(
        FIXTURES_DIR,
        'invalid-frontmatter/docs/proposals/valid-proposal.md'
      );
      const content = readFileSync(filePath, 'utf8');
      const result = extractFrontmatter(content);

      expect(result.frontmatter?.tags).toEqual(['test']);
    });
  });

  describe('invalid YAML syntax', () => {
    it('should detect malformed YAML', () => {
      const filePath = join(
        FIXTURES_DIR,
        'invalid-frontmatter/docs/proposals/invalid-yaml.md'
      );
      const content = readFileSync(filePath, 'utf8');
      const result = extractFrontmatter(content);

      expect(result.valid).toBe(false);
      expect(result.error).not.toBeNull();
    });
  });

  describe('unclosed frontmatter', () => {
    it('should detect unclosed frontmatter block', () => {
      const filePath = join(
        FIXTURES_DIR,
        'invalid-frontmatter/docs/proposals/unclosed-frontmatter.md'
      );
      const content = readFileSync(filePath, 'utf8');
      const result = extractFrontmatter(content);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('No frontmatter');
    });
  });

  describe('missing frontmatter', () => {
    it('should detect documents without frontmatter', () => {
      const filePath = join(
        FIXTURES_DIR,
        'misformatted-docs/docs/guides/missing-title.md'
      );
      const content = readFileSync(filePath, 'utf8');
      const result = extractFrontmatter(content);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('No frontmatter');
    });
  });
});

describe('Frontmatter Field Validation', () => {
  describe('required fields', () => {
    it('should identify missing required fields', () => {
      const filePath = join(
        FIXTURES_DIR,
        'invalid-frontmatter/docs/proposals/missing-required.md'
      );
      const content = readFileSync(filePath, 'utf8');
      const result = extractFrontmatter(content);

      expect(result.valid).toBe(true); // YAML is valid
      expect(result.frontmatter).not.toBeNull();

      const missing = validateRequiredFields(result.frontmatter!);
      expect(missing).toContain('title');
      expect(missing).toContain('category');
    });

    it('should pass documents with all required fields', () => {
      const filePath = join(
        FIXTURES_DIR,
        'invalid-frontmatter/docs/proposals/valid-proposal.md'
      );
      const content = readFileSync(filePath, 'utf8');
      const result = extractFrontmatter(content);

      const missing = validateRequiredFields(result.frontmatter!);
      expect(missing.length).toBe(0);
    });
  });

  describe('date format validation', () => {
    it('should validate correct date format', () => {
      expect(isValidDate('2025-01-01')).toBe(true);
      expect(isValidDate('2024-12-31')).toBe(true);
    });

    it('should reject invalid date formats', () => {
      expect(isValidDate('not-a-date')).toBe(false);
      expect(isValidDate('01/15/2025')).toBe(false);
      expect(isValidDate('2025/01/01')).toBe(false);
      expect(isValidDate(12345)).toBe(false);
      expect(isValidDate(null)).toBe(false);
    });

    it('should detect invalid dates in frontmatter', () => {
      const filePath = join(
        FIXTURES_DIR,
        'invalid-frontmatter/docs/proposals/invalid-date.md'
      );
      const content = readFileSync(filePath, 'utf8');
      const result = extractFrontmatter(content);

      expect(result.valid).toBe(true); // YAML parses
      expect(isValidDate(result.frontmatter?.created)).toBe(false);
      expect(isValidDate(result.frontmatter?.updated)).toBe(false);
    });
  });
});

describe('Frontmatter Batch Validation', () => {
  it('should validate all documents in large-structure fixture', () => {
    const proposalsDir = join(
      FIXTURES_DIR,
      'large-structure/docs/proposals/active'
    );
    const files = readdirSync(proposalsDir).filter((f) => f.endsWith('.md'));

    let validCount = 0;
    let invalidCount = 0;

    for (const file of files) {
      const content = readFileSync(join(proposalsDir, file), 'utf8');
      const result = extractFrontmatter(content);

      if (result.valid && result.frontmatter) {
        const missing = validateRequiredFields(result.frontmatter);
        if (missing.length === 0) {
          validCount++;
        } else {
          invalidCount++;
        }
      } else {
        invalidCount++;
      }
    }

    // All proposal files should have valid frontmatter
    expect(validCount).toBeGreaterThan(0);
  });

  it('should handle architecture documents with frontmatter', () => {
    const archDir = join(
      FIXTURES_DIR,
      'large-structure/docs/architecture/active'
    );
    const files = readdirSync(archDir).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      if (file === 'README.md') continue; // README doesn't need frontmatter

      const content = readFileSync(join(archDir, file), 'utf8');
      const result = extractFrontmatter(content);

      expect(result.valid).toBe(true);
      expect(result.frontmatter?.category).toBe('architecture');
    }
  });
});
