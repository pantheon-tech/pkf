/**
 * Template Validator Integration Tests
 *
 * Tests template validation to ensure:
 * 1. Templates have valid placeholder format
 * 2. No unreplaced placeholders in documentation
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const FIXTURES_DIR = join(__dirname, '../fixtures');
const TEMPLATES_DIR = join(__dirname, '../../templates');

// Placeholder regex pattern
const PLACEHOLDER_PATTERN = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;

/**
 * Walk directory recursively
 */
function* walkDir(dir: string, exclude: string[] = []): Generator<string> {
  if (!existsSync(dir)) return;

  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);

    if (exclude.some((ex) => filePath.includes(ex))) {
      continue;
    }

    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      yield* walkDir(filePath, exclude);
    } else {
      yield filePath;
    }
  }
}

/**
 * Extract placeholders from content
 */
function extractPlaceholders(content: string): string[] {
  const matches = [...content.matchAll(PLACEHOLDER_PATTERN)];
  return [...new Set(matches.map((m) => m[1]))];
}

/**
 * Validate placeholder naming convention
 */
function isValidPlaceholderName(name: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(name);
}

describe('Template Placeholder Format', () => {
  describe('real templates', () => {
    it('should have valid placeholder format in all templates', () => {
      if (!existsSync(TEMPLATES_DIR)) {
        // Skip if templates dir doesn't exist
        return;
      }

      for (const filePath of walkDir(TEMPLATES_DIR)) {
        if (!filePath.endsWith('.template.md')) continue;

        const content = readFileSync(filePath, 'utf8');
        const placeholders = extractPlaceholders(content);

        for (const placeholder of placeholders) {
          expect(
            isValidPlaceholderName(placeholder),
            `Invalid placeholder {{${placeholder}}} in ${filePath}`
          ).toBe(true);
        }
      }
    });

    it('should have at least one placeholder in each template', () => {
      if (!existsSync(TEMPLATES_DIR)) return;

      for (const filePath of walkDir(TEMPLATES_DIR)) {
        if (!filePath.endsWith('.template.md')) continue;

        const content = readFileSync(filePath, 'utf8');
        const placeholders = extractPlaceholders(content);

        expect(
          placeholders.length,
          `Template ${filePath} has no placeholders`
        ).toBeGreaterThan(0);
      }
    });
  });
});

describe('Placeholder Naming Convention', () => {
  it('should accept valid placeholder names', () => {
    expect(isValidPlaceholderName('PROJECT_NAME')).toBe(true);
    expect(isValidPlaceholderName('VERSION')).toBe(true);
    expect(isValidPlaceholderName('API_V2_ENDPOINT')).toBe(true);
    expect(isValidPlaceholderName('SECTION_1_TITLE')).toBe(true);
  });

  it('should reject invalid placeholder names', () => {
    expect(isValidPlaceholderName('project_name')).toBe(false); // lowercase
    expect(isValidPlaceholderName('_STARTS_WITH_UNDERSCORE')).toBe(false);
    expect(isValidPlaceholderName('123_STARTS_WITH_NUMBER')).toBe(false);
    expect(isValidPlaceholderName('HAS-HYPHEN')).toBe(false);
    expect(isValidPlaceholderName('HAS SPACE')).toBe(false);
    expect(isValidPlaceholderName('')).toBe(false);
  });
});

describe('Unreplaced Placeholders Detection', () => {
  describe('valid-structure fixture', () => {
    it('should have no unreplaced placeholders', () => {
      const docsDir = join(FIXTURES_DIR, 'valid-structure/docs');

      for (const filePath of walkDir(docsDir)) {
        if (extname(filePath) !== '.md') continue;

        const content = readFileSync(filePath, 'utf8');
        const placeholders = extractPlaceholders(content);

        expect(
          placeholders.length,
          `Found unreplaced placeholders in ${filePath}: ${placeholders.join(', ')}`
        ).toBe(0);
      }
    });
  });

  describe('large-structure fixture', () => {
    it('should have no unreplaced placeholders in docs', () => {
      const docsDir = join(FIXTURES_DIR, 'large-structure/docs');

      for (const filePath of walkDir(docsDir)) {
        if (extname(filePath) !== '.md') continue;

        const content = readFileSync(filePath, 'utf8');
        const placeholders = extractPlaceholders(content);

        expect(
          placeholders.length,
          `Found unreplaced placeholders in ${filePath}: ${placeholders.join(', ')}`
        ).toBe(0);
      }
    });
  });
});

describe('Template Coverage', () => {
  it('should count placeholders in templates', () => {
    if (!existsSync(TEMPLATES_DIR)) return;

    const templateStats: { path: string; placeholders: number }[] = [];

    for (const filePath of walkDir(TEMPLATES_DIR)) {
      if (!filePath.endsWith('.template.md')) continue;

      const content = readFileSync(filePath, 'utf8');
      const placeholders = extractPlaceholders(content);

      templateStats.push({
        path: filePath.replace(TEMPLATES_DIR + '/', ''),
        placeholders: placeholders.length,
      });
    }

    // Should have multiple templates
    expect(templateStats.length).toBeGreaterThan(0);

    // Each template should have placeholders
    for (const stat of templateStats) {
      expect(
        stat.placeholders,
        `Template ${stat.path} has no placeholders`
      ).toBeGreaterThan(0);
    }
  });
});

describe('Placeholder Pattern Detection', () => {
  it('should detect single placeholder', () => {
    const content = 'Hello {{PROJECT_NAME}}!';
    expect(extractPlaceholders(content)).toEqual(['PROJECT_NAME']);
  });

  it('should detect multiple placeholders', () => {
    const content = '{{TITLE}} by {{AUTHOR}} - v{{VERSION}}';
    const placeholders = extractPlaceholders(content);

    expect(placeholders).toContain('TITLE');
    expect(placeholders).toContain('AUTHOR');
    expect(placeholders).toContain('VERSION');
    expect(placeholders.length).toBe(3);
  });

  it('should deduplicate repeated placeholders', () => {
    const content = '{{NAME}} and {{NAME}} again {{NAME}}';
    expect(extractPlaceholders(content)).toEqual(['NAME']);
  });

  it('should not match invalid patterns', () => {
    const content = '{{lowercase}} {{123}} {{ SPACES }} {SINGLE_BRACE}';
    expect(extractPlaceholders(content)).toEqual([]);
  });
});
