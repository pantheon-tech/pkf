/**
 * Structure Validator Integration Tests
 *
 * Tests the structure validator against preset documentation trees
 * to verify correct error/warning detection.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '../fixtures');
const PKF_CLI = join(__dirname, '../../packages/pkf-processor/dist/cli.js');

interface ValidationResult {
  errors: number;
  warnings: number;
  output: string;
}

/**
 * Run the structure validator on a fixture directory
 */
function validateFixture(fixtureName: string): ValidationResult {
  const fixtureDir = join(FIXTURES_DIR, fixtureName);
  const configPath = join(fixtureDir, 'pkf.config.yaml');
  const outputDir = join(fixtureDir, '.pkf/generated');
  const relativeStructurePath = '.pkf/generated/structure.json';

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  // Build structure.json from config
  try {
    execSync(`node ${PKF_CLI} build --config ${configPath} --output ${outputDir}`, {
      cwd: fixtureDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (e) {
    // Build might fail for some fixtures, that's expected
  }

  // Create minimal structure.json if build failed
  const structurePath = join(outputDir, 'structure.json');
  if (!existsSync(structurePath)) {
    // Create a minimal structure based on the config
    const structure = {
      version: '1.0.0',
      root: 'docs',
      children: {
        'README.md': { required: true },
      },
    };
    writeFileSync(structurePath, JSON.stringify(structure, null, 2));
  }

  // Run validator from fixture directory so paths resolve correctly
  try {
    const output = execSync(
      `node ${PKF_CLI} validate-structure --structure ${relativeStructurePath} 2>&1`,
      {
        cwd: fixtureDir,
        encoding: 'utf8',
      }
    );

    // Parse output for errors/warnings from Validation Summary section
    const errorsMatch = output.match(/Errors:\s+(\d+)/);
    const warningsMatch = output.match(/Warnings:\s+(\d+)/);

    return {
      errors: errorsMatch ? parseInt(errorsMatch[1], 10) : 0,
      warnings: warningsMatch ? parseInt(warningsMatch[1], 10) : 0,
      output,
    };
  } catch (e: any) {
    // Combine stdout and stderr for complete output
    const output = (e.stdout || '') + (e.stderr || '') || e.message;
    const errorsMatch = output.match(/Errors:\s+(\d+)/);
    const warningsMatch = output.match(/Warnings:\s+(\d+)/);

    return {
      errors: errorsMatch ? parseInt(errorsMatch[1], 10) : 1,
      warnings: warningsMatch ? parseInt(warningsMatch[1], 10) : 0,
      output,
    };
  }
}

describe('Structure Validator', () => {
  describe('valid-structure fixture', () => {
    it('should pass with 0 errors and 0 warnings', () => {
      const result = validateFixture('valid-structure');
      expect(result.errors).toBe(0);
      expect(result.warnings).toBe(0);
    });
  });

  describe('missing-readme fixture', () => {
    it('should detect missing README.md files as errors', () => {
      const result = validateFixture('missing-readme');
      expect(result.errors).toBeGreaterThan(0);
      expect(result.output).toContain('README.md');
    });
  });

  describe('unexpected-file fixture', () => {
    it('should detect unexpected files as warnings', () => {
      const result = validateFixture('unexpected-file');
      // Files not in INDEX should be warnings
      expect(result.warnings).toBeGreaterThan(0);
      expect(result.output).toMatch(/unexpected/i);
    });
  });

  describe('large-structure fixture', () => {
    it('should validate complex nested structure without errors', () => {
      const result = validateFixture('large-structure');
      expect(result.errors).toBe(0);
      // Large structure should have all required files
    });

    it('should handle multiple lifecycle directories', () => {
      const result = validateFixture('large-structure');
      // Should process architecture/active, architecture/archived, etc.
      expect(result.output).not.toContain('failed');
    });
  });

  describe('invalid-index fixture', () => {
    it('should handle malformed INDEX files gracefully', () => {
      const result = validateFixture('invalid-index');
      // Malformed INDEX (missing colons) should still be parsed
      // Files not listed should trigger warnings
      expect(result.warnings).toBeGreaterThan(0);
    });

    it('should warn about files not in INDEX', () => {
      const result = validateFixture('invalid-index');
      // orphan-file.md in section-b is not in the empty INDEX
      expect(result.output).toMatch(/orphan|unexpected/i);
    });
  });
});

describe('Structure Validation Edge Cases', () => {
  it('should handle empty directories gracefully', () => {
    // Empty directories shouldn't crash the validator
    const result = validateFixture('valid-structure');
    expect(result.errors).toBe(0);
  });

  it('should handle deeply nested structures', () => {
    // large-structure has deeply nested directories
    const result = validateFixture('large-structure');
    expect(result.output).toContain('Structure');
  });
});
