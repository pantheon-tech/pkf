/**
 * Tests for PKF Init Structure Generator
 * Tests directory structure creation based on schemas.yaml
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { StructureGenerator } from '../../src/generators/structure.js';

describe('StructureGenerator', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-structure-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('creates required base directories', () => {
    it('creates docs and docs/registers directories for empty schemas', async () => {
      // Create generator with temp directory
      const generator = new StructureGenerator(tempDir, tempDir);

      // Generate with minimal schemas
      const schemasYaml = `
version: "1.0.0"
`;

      const result = await generator.generate(schemasYaml);

      // Verify base directories were created
      expect(result.createdDirs).toContain('docs');
      expect(result.createdDirs).toContain('docs/registers');

      // Verify directories exist on filesystem
      const docsStats = await fs.stat(path.join(tempDir, 'docs'));
      expect(docsStats.isDirectory()).toBe(true);

      const registersStats = await fs.stat(path.join(tempDir, 'docs', 'registers'));
      expect(registersStats.isDirectory()).toBe(true);
    });
  });

  describe('maps guide types to docs/guides directory', () => {
    it('creates docs/guides for guide document types', async () => {
      const generator = new StructureGenerator(tempDir, tempDir);

      // Schema with guide types
      const schemasYaml = `
document_types:
  user-guide:
    description: User documentation
  tutorial:
    description: Step by step tutorial
  getting-started:
    description: Getting started guide
`;

      const result = await generator.generate(schemasYaml);

      // Verify guides directory was created
      expect(result.createdDirs).toContain('docs/guides');

      // Verify directory exists on filesystem
      const guidesStats = await fs.stat(path.join(tempDir, 'docs', 'guides'));
      expect(guidesStats.isDirectory()).toBe(true);
    });
  });

  describe('maps architecture types to docs/architecture directory', () => {
    it('creates docs/architecture for architecture document types', async () => {
      const generator = new StructureGenerator(tempDir, tempDir);

      // Schema with architecture types
      const schemasYaml = `
document_types:
  architecture:
    description: System architecture
  design-doc:
    description: Design documents
`;

      const result = await generator.generate(schemasYaml);

      // Verify architecture directory was created
      expect(result.createdDirs).toContain('docs/architecture');

      // Verify directory exists on filesystem
      const archStats = await fs.stat(path.join(tempDir, 'docs', 'architecture'));
      expect(archStats.isDirectory()).toBe(true);
    });

    it('creates docs/architecture/decisions for adr type', async () => {
      const generator = new StructureGenerator(tempDir, tempDir);

      const schemasYaml = `
document_types:
  adr:
    description: Architecture Decision Records
`;

      const result = await generator.generate(schemasYaml);

      // Verify ADR directory was created
      expect(result.createdDirs).toContain('docs/architecture/decisions');

      // Verify directory exists on filesystem
      const adrStats = await fs.stat(path.join(tempDir, 'docs', 'architecture', 'decisions'));
      expect(adrStats.isDirectory()).toBe(true);
    });
  });

  describe('maps api types to docs/api directory', () => {
    it('creates docs/api for api document types', async () => {
      const generator = new StructureGenerator(tempDir, tempDir);

      // Schema with API types
      const schemasYaml = `
document_types:
  api-reference:
    description: API reference documentation
  openapi:
    description: OpenAPI specifications
`;

      const result = await generator.generate(schemasYaml);

      // Verify api directory was created
      expect(result.createdDirs).toContain('docs/api');

      // Verify directory exists on filesystem
      const apiStats = await fs.stat(path.join(tempDir, 'docs', 'api'));
      expect(apiStats.isDirectory()).toBe(true);
    });
  });

  describe('handles existing directories gracefully', () => {
    it('reports existing directories without error', async () => {
      const generator = new StructureGenerator(tempDir, tempDir);

      // Pre-create the docs directory
      await fs.mkdir(path.join(tempDir, 'docs'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'docs', 'guides'), { recursive: true });

      const schemasYaml = `
document_types:
  user-guide:
    description: User guide
`;

      const result = await generator.generate(schemasYaml);

      // Verify existing directories are reported
      expect(result.existingDirs).toContain('docs');
      expect(result.existingDirs).toContain('docs/guides');

      // Created directories should only include registers
      expect(result.createdDirs).toContain('docs/registers');
      expect(result.createdDirs).not.toContain('docs');
      expect(result.createdDirs).not.toContain('docs/guides');
    });
  });

  describe('returns correct createdDirs and existingDirs', () => {
    it('separates newly created and existing directories correctly', async () => {
      const generator = new StructureGenerator(tempDir, tempDir);

      // Pre-create some directories
      await fs.mkdir(path.join(tempDir, 'docs'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'docs', 'api'), { recursive: true });

      const schemasYaml = `
document_types:
  api-reference:
    description: API docs
  guide:
    description: Guides
  architecture:
    description: Architecture docs
`;

      const result = await generator.generate(schemasYaml);

      // Verify separation of created and existing
      expect(result.existingDirs).toContain('docs');
      expect(result.existingDirs).toContain('docs/api');

      expect(result.createdDirs).toContain('docs/registers');
      expect(result.createdDirs).toContain('docs/guides');
      expect(result.createdDirs).toContain('docs/architecture');

      // Verify no overlap
      for (const dir of result.createdDirs) {
        expect(result.existingDirs).not.toContain(dir);
      }
      for (const dir of result.existingDirs) {
        expect(result.createdDirs).not.toContain(dir);
      }
    });
  });

  describe('handles empty schemas.yaml', () => {
    it('creates only base directories for empty YAML', async () => {
      const generator = new StructureGenerator(tempDir, tempDir);

      // YAML with empty document_types object (parsed as valid but empty)
      const schemasYaml = `
version: "1.0.0"
document_types: {}
`;

      const result = await generator.generate(schemasYaml);

      // Should create base directories
      expect(result.createdDirs).toContain('docs');
      expect(result.createdDirs).toContain('docs/registers');

      // Should not create any extra directories
      expect(result.createdDirs.length).toBe(2);
      expect(result.existingDirs.length).toBe(0);
    });
  });

  describe('creates multiple type directories from complex schemas', () => {
    it('creates all required directories for multiple document types', async () => {
      const generator = new StructureGenerator(tempDir, tempDir);

      // Complex schema with multiple types
      const schemasYaml = `
document_types:
  guide:
    description: General guides
  developer-guide:
    description: Developer documentation
  api-reference:
    description: API documentation
  architecture:
    description: Architecture docs
  adr:
    description: Architecture Decision Records
  proposal:
    description: Feature proposals
  reference:
    description: Reference documentation
types:
  tutorial:
    description: Tutorials
`;

      const result = await generator.generate(schemasYaml);

      // Verify all expected directories were created
      expect(result.createdDirs).toContain('docs');
      expect(result.createdDirs).toContain('docs/registers');
      expect(result.createdDirs).toContain('docs/guides');
      expect(result.createdDirs).toContain('docs/api');
      expect(result.createdDirs).toContain('docs/architecture');
      expect(result.createdDirs).toContain('docs/architecture/decisions');
      expect(result.createdDirs).toContain('docs/proposals');
      expect(result.createdDirs).toContain('docs/references');

      // Verify all directories exist on filesystem
      for (const dir of result.createdDirs) {
        const stats = await fs.stat(path.join(tempDir, dir));
        expect(stats.isDirectory()).toBe(true);
      }
    });

    it('handles schemas with documents key', async () => {
      const generator = new StructureGenerator(tempDir, tempDir);

      // Schema using documents key instead of document_types
      const schemasYaml = `
documents:
  api:
    description: API docs
  guide:
    description: Guides
`;

      const result = await generator.generate(schemasYaml);

      expect(result.createdDirs).toContain('docs/api');
      expect(result.createdDirs).toContain('docs/guides');
    });
  });
});
