/**
 * Tests for PKF Init Configuration Generator
 * Tests pkf.config.yaml generation from schemas.yaml and project information
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { ConfigGenerator } from '../../src/generators/config.js';
import type { GeneratedStructure } from '../../src/generators/structure.js';

describe('ConfigGenerator', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-config-test-'));
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
   * Helper to create a mock GeneratedStructure
   */
  function createMockStructure(dirs: string[]): GeneratedStructure {
    return {
      createdDirs: dirs,
      existingDirs: [],
    };
  }

  describe('generates valid YAML config', () => {
    it('produces parseable YAML output', async () => {
      const generator = new ConfigGenerator(tempDir);

      const schemasYaml = `
document_types:
  guide:
    description: User guides
`;

      const structure = createMockStructure(['docs', 'docs/registers', 'docs/guides']);
      const configYaml = await generator.generate(schemasYaml, structure);

      // Verify the output is valid YAML
      const parsed = yaml.load(configYaml) as Record<string, unknown>;
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');
    });
  });

  describe('includes version field', () => {
    it('includes version 1.0.0 in generated config', async () => {
      const generator = new ConfigGenerator(tempDir);

      const schemasYaml = `
version: "1.0.0"
`;

      const structure = createMockStructure(['docs', 'docs/registers']);
      const configYaml = await generator.generate(schemasYaml, structure);

      const parsed = yaml.load(configYaml) as Record<string, unknown>;
      expect(parsed.version).toBe('1.0.0');
    });
  });

  describe('includes paths configuration', () => {
    it('includes docs, registers, and schemas paths', async () => {
      const generator = new ConfigGenerator(tempDir);

      const schemasYaml = `
document_types:
  api:
    description: API docs
`;

      const structure = createMockStructure(['docs', 'docs/registers', 'docs/api']);
      const configYaml = await generator.generate(schemasYaml, structure);

      const parsed = yaml.load(configYaml) as Record<string, unknown>;
      const paths = parsed.paths as Record<string, string>;

      expect(paths).toBeDefined();
      expect(paths.docs).toBe('docs');
      expect(paths.registers).toBe('docs/registers');
      expect(paths.schemas).toBe('schemas');
    });

    it('includes templates path when templates directory exists', async () => {
      const generator = new ConfigGenerator(tempDir);

      const schemasYaml = `
document_types:
  guide:
    description: Guides
`;

      // Include templates in the structure
      const structure = createMockStructure(['docs', 'docs/registers', 'templates']);
      const configYaml = await generator.generate(schemasYaml, structure);

      const parsed = yaml.load(configYaml) as Record<string, unknown>;
      const paths = parsed.paths as Record<string, string>;

      expect(paths.templates).toBe('templates');
    });
  });

  describe('generates document_types from schemas', () => {
    it('extracts document types from document_types key', async () => {
      const generator = new ConfigGenerator(tempDir);

      const schemasYaml = `
document_types:
  guide:
    description: User guides
    schema: guide.schema.json
  api-reference:
    description: API documentation
    template: api.template.md
`;

      const structure = createMockStructure(['docs', 'docs/registers', 'docs/guides', 'docs/api']);
      const configYaml = await generator.generate(schemasYaml, structure);

      const parsed = yaml.load(configYaml) as Record<string, unknown>;
      const docTypes = parsed.document_types as Record<string, unknown>;

      expect(docTypes).toBeDefined();
      expect(docTypes.guide).toBeDefined();
      expect(docTypes['api-reference']).toBeDefined();

      // Verify schema and template are preserved
      const guideType = docTypes.guide as Record<string, unknown>;
      expect(guideType.schema).toBe('guide.schema.json');

      const apiType = docTypes['api-reference'] as Record<string, unknown>;
      expect(apiType.template).toBe('api.template.md');
    });

    it('extracts document types from types key', async () => {
      const generator = new ConfigGenerator(tempDir);

      const schemasYaml = `
types:
  tutorial:
    description: Tutorials
  architecture:
    description: Architecture docs
`;

      const structure = createMockStructure(['docs', 'docs/registers', 'docs/guides', 'docs/architecture']);
      const configYaml = await generator.generate(schemasYaml, structure);

      const parsed = yaml.load(configYaml) as Record<string, unknown>;
      const docTypes = parsed.document_types as Record<string, unknown>;

      expect(docTypes.tutorial).toBeDefined();
      expect(docTypes.architecture).toBeDefined();
    });
  });

  describe('reads project info from package.json when available', () => {
    it('uses project name and description from package.json', async () => {
      const generator = new ConfigGenerator(tempDir);

      // Create package.json in temp directory
      const packageJson = {
        name: 'my-awesome-project',
        description: 'An awesome project with great docs',
        version: '2.5.0',
        repository: 'https://github.com/example/my-project',
      };
      await fs.writeFile(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2),
        'utf-8'
      );

      const schemasYaml = `
document_types:
  guide:
    description: Guides
`;

      const structure = createMockStructure(['docs', 'docs/registers']);
      const configYaml = await generator.generate(schemasYaml, structure);

      const parsed = yaml.load(configYaml) as Record<string, unknown>;
      const project = parsed.project as Record<string, string>;

      expect(project.name).toBe('my-awesome-project');
      expect(project.description).toBe('An awesome project with great docs');
      expect(project.version).toBe('2.5.0');
      expect(project.repository).toBe('https://github.com/example/my-project');
    });

    it('handles repository as object with url', async () => {
      const generator = new ConfigGenerator(tempDir);

      // Create package.json with repository as object
      const packageJson = {
        name: 'repo-object-project',
        description: 'Project with repo object',
        repository: {
          type: 'git',
          url: 'git+https://github.com/example/repo.git',
        },
      };
      await fs.writeFile(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2),
        'utf-8'
      );

      const schemasYaml = `
document_types:
  guide:
    description: Guides
`;

      const structure = createMockStructure(['docs', 'docs/registers']);
      const configYaml = await generator.generate(schemasYaml, structure);

      const parsed = yaml.load(configYaml) as Record<string, unknown>;
      const project = parsed.project as Record<string, string>;

      // Should strip git+ prefix and .git suffix
      expect(project.repository).toBe('https://github.com/example/repo');
    });
  });

  describe('handles missing package.json gracefully', () => {
    it('uses default values when package.json does not exist', async () => {
      const generator = new ConfigGenerator(tempDir);

      // No package.json in temp directory

      const schemasYaml = `
document_types:
  api:
    description: API docs
`;

      const structure = createMockStructure(['docs', 'docs/registers', 'docs/api']);
      const configYaml = await generator.generate(schemasYaml, structure);

      const parsed = yaml.load(configYaml) as Record<string, unknown>;
      const project = parsed.project as Record<string, string>;

      expect(project.name).toBe('my-project');
      expect(project.description).toBe('A PKF-enabled project');
      expect(project.version).toBeUndefined();
      expect(project.repository).toBeUndefined();
    });

    it('handles malformed package.json gracefully', async () => {
      const generator = new ConfigGenerator(tempDir);

      // Create invalid JSON file
      await fs.writeFile(
        path.join(tempDir, 'package.json'),
        'not valid json {{{',
        'utf-8'
      );

      const schemasYaml = `
document_types:
  guide:
    description: Guides
`;

      const structure = createMockStructure(['docs', 'docs/registers']);

      // Should not throw, should use defaults
      const configYaml = await generator.generate(schemasYaml, structure);

      const parsed = yaml.load(configYaml) as Record<string, unknown>;
      const project = parsed.project as Record<string, string>;

      expect(project.name).toBe('my-project');
      expect(project.description).toBe('A PKF-enabled project');
    });
  });

  describe('writes config file to correct location', () => {
    it('writes pkf.config.yaml to root directory', async () => {
      const generator = new ConfigGenerator(tempDir);

      const schemasYaml = `
document_types:
  guide:
    description: Guides
`;

      const structure = createMockStructure(['docs', 'docs/registers']);
      const configYaml = await generator.generate(schemasYaml, structure);

      // Write the config
      await generator.write(configYaml);

      // Verify file was created at correct location
      const configPath = path.join(tempDir, 'pkf.config.yaml');
      const stats = await fs.stat(configPath);
      expect(stats.isFile()).toBe(true);

      // Verify content matches
      const content = await fs.readFile(configPath, 'utf-8');
      expect(content).toBe(configYaml);
    });
  });

  describe('includes register types (todo, issues, changelog)', () => {
    it('always includes todo, issues, and changelog in document_types', async () => {
      const generator = new ConfigGenerator(tempDir);

      // Schema without any explicit register types
      const schemasYaml = `
document_types:
  guide:
    description: User guides
`;

      const structure = createMockStructure(['docs', 'docs/registers', 'docs/guides']);
      const configYaml = await generator.generate(schemasYaml, structure);

      const parsed = yaml.load(configYaml) as Record<string, unknown>;
      const docTypes = parsed.document_types as Record<string, unknown>;

      // Verify register types are included
      expect(docTypes.todo).toBeDefined();
      expect(docTypes.issues).toBeDefined();
      expect(docTypes.changelog).toBeDefined();

      // Verify register type configuration
      const todo = docTypes.todo as Record<string, unknown>;
      expect(todo.path).toBe('docs/registers/TODO.md');
      expect(todo.schema).toBe('todo-item.schema.json');
      expect(todo.required).toBe(true);

      const issues = docTypes.issues as Record<string, unknown>;
      expect(issues.path).toBe('docs/registers/ISSUES.md');
      expect(issues.schema).toBe('issue-item.schema.json');
      expect(issues.required).toBe(true);

      const changelog = docTypes.changelog as Record<string, unknown>;
      expect(changelog.path).toBe('docs/registers/CHANGELOG.md');
      expect(changelog.schema).toBe('changelog-entry.schema.json');
      expect(changelog.required).toBe(true);
    });

    it('does not duplicate register types from schema', async () => {
      const generator = new ConfigGenerator(tempDir);

      // Schema that includes register types (should not be duplicated)
      const schemasYaml = `
document_types:
  todo:
    description: Custom todo definition
  changelog:
    description: Custom changelog definition
`;

      const structure = createMockStructure(['docs', 'docs/registers']);
      const configYaml = await generator.generate(schemasYaml, structure);

      const parsed = yaml.load(configYaml) as Record<string, unknown>;
      const docTypes = parsed.document_types as Record<string, unknown>;

      // Should have exactly the three register types (built-in takes precedence)
      expect(docTypes.todo).toBeDefined();
      expect(docTypes.issues).toBeDefined();
      expect(docTypes.changelog).toBeDefined();

      // The built-in definitions should be used
      const todo = docTypes.todo as Record<string, unknown>;
      expect(todo.required).toBe(true);
    });
  });
});
