/**
 * Integration tests for PKF Init Phase 3
 * Tests Phase 3 components working together:
 * - Structure generation
 * - Config generation
 * - Register initialization
 * - Implementation stage workflow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { safeLoad } from '../../src/utils/yaml.js';
import { StructureGenerator } from '../../src/generators/structure.js';
import { ConfigGenerator } from '../../src/generators/config.js';
import { RegisterInitializer } from '../../src/generators/registers.js';
import { ImplementationStage } from '../../src/stages/implementation.js';
import { WorkflowStateManager } from '../../src/state/workflow-state.js';
import type { LoadedConfig } from '../../src/types/index.js';

describe('Phase 3 Integration Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkf-phase3-integration-'));
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
   * Helper to extract YAML frontmatter from markdown content
   */
  function extractFrontmatter(content: string): Record<string, unknown> | null {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      return null;
    }
    return safeLoad(match[1]) as Record<string, unknown>;
  }

  /**
   * Helper to format a date value (which may be a Date or string) as YYYY-MM-DD
   */
  function formatDateValue(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    return String(value);
  }

  /**
   * Create a mock LoadedConfig
   */
  function createMockConfig(overrides: Partial<LoadedConfig> = {}): LoadedConfig {
    return {
      apiKey: 'sk-test-key',
      apiTier: 'build1',
      rootDir: tempDir,
      docsDir: path.join(tempDir, 'docs'),
      outputDir: tempDir,
      backupDir: path.join(tempDir, '.pkf-backup'),
      maxCost: 50,
      workers: 3,
      pkfInitialized: false,
      ...overrides,
    };
  }

  describe('INT-017: Structure generation from schemas', () => {
    it('creates directories correctly from schemas.yaml with guide and api types', async () => {
      // Create StructureGenerator with temp directory
      const generator = new StructureGenerator(tempDir, tempDir);

      // Provide schemas.yaml with guide and api types
      const schemasYaml = `
document_types:
  user-guide:
    description: User documentation
    schema: guide.schema.json
  developer-guide:
    description: Developer documentation
  api-reference:
    description: API reference documentation
    schema: api.schema.json
  openapi:
    description: OpenAPI specifications
`;

      // Generate structure
      const result = await generator.generate(schemasYaml);

      // Verify directories created correctly
      expect(result.createdDirs).toContain('docs');
      expect(result.createdDirs).toContain('docs/registers');
      expect(result.createdDirs).toContain('docs/guides');
      expect(result.createdDirs).toContain('docs/api');

      // Verify directories exist on filesystem
      const docsStats = await fs.stat(path.join(tempDir, 'docs'));
      expect(docsStats.isDirectory()).toBe(true);

      const guidesStats = await fs.stat(path.join(tempDir, 'docs', 'guides'));
      expect(guidesStats.isDirectory()).toBe(true);

      const apiStats = await fs.stat(path.join(tempDir, 'docs', 'api'));
      expect(apiStats.isDirectory()).toBe(true);

      const registersStats = await fs.stat(path.join(tempDir, 'docs', 'registers'));
      expect(registersStats.isDirectory()).toBe(true);
    });
  });

  describe('INT-018: Config generation from schemas', () => {
    it('generates valid config with multiple document types', async () => {
      // Create ConfigGenerator
      const generator = new ConfigGenerator(tempDir);

      // Create package.json for project info
      await fs.writeFile(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          description: 'A test project for Phase 3',
          version: '1.0.0',
        }),
        'utf-8'
      );

      // Provide schemas.yaml with multiple types
      const schemasYaml = `
document_types:
  guide:
    description: User guides
    schema: guide.schema.json
  api-reference:
    description: API documentation
    template: api.template.md
  architecture:
    description: Architecture documentation
  proposal:
    description: Feature proposals
`;

      // Mock structure
      const structure = {
        createdDirs: ['docs', 'docs/registers', 'docs/guides', 'docs/api', 'docs/architecture', 'docs/proposals'],
        existingDirs: [],
      };

      // Generate config
      const configYaml = await generator.generate(schemasYaml, structure);

      // Parse output YAML and verify structure
      const config = safeLoad(configYaml) as Record<string, unknown>;

      // Verify version
      expect(config.version).toBe('1.0.0');

      // Verify project info from package.json
      const project = config.project as Record<string, string>;
      expect(project.name).toBe('test-project');
      expect(project.description).toBe('A test project for Phase 3');

      // Verify paths
      const paths = config.paths as Record<string, string>;
      expect(paths.docs).toBe('docs');
      expect(paths.registers).toBe('docs/registers');
      expect(paths.schemas).toBe('schemas');

      // Verify document types
      const docTypes = config.document_types as Record<string, unknown>;
      expect(docTypes.guide).toBeDefined();
      expect(docTypes['api-reference']).toBeDefined();
      expect(docTypes.architecture).toBeDefined();
      expect(docTypes.proposal).toBeDefined();

      // Verify register types are included
      expect(docTypes.todo).toBeDefined();
      expect(docTypes.issues).toBeDefined();
      expect(docTypes.changelog).toBeDefined();
    });
  });

  describe('INT-019: Register initialization', () => {
    it('creates all register files with valid frontmatter', async () => {
      // Create registers directory
      const registersDir = path.join(tempDir, 'docs', 'registers');
      await fs.mkdir(registersDir, { recursive: true });

      // Create RegisterInitializer with temp directory
      const initializer = new RegisterInitializer(registersDir);

      // Initialize registers
      const result = await initializer.initialize();

      // Verify all three register files exist
      expect(result.created).toContain('TODO.md');
      expect(result.created).toContain('ISSUES.md');
      expect(result.created).toContain('CHANGELOG.md');

      // Verify frontmatter is valid YAML for each file
      for (const filename of ['TODO.md', 'ISSUES.md', 'CHANGELOG.md']) {
        const filePath = path.join(registersDir, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        const frontmatter = extractFrontmatter(content);

        expect(frontmatter).not.toBeNull();
        expect(frontmatter?.type).toBe('register');
        // The created field is parsed as Date by js-yaml, convert to string for matching
        expect(formatDateValue(frontmatter?.created)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  describe('INT-020: Full implementation stage flow (mocked)', () => {
    it('executes implementation stage with mocked dependencies', async () => {
      // Create temp directory with structure
      await fs.mkdir(path.join(tempDir, 'docs', 'registers'), { recursive: true });

      // Create mock state manager
      const stateManager = new WorkflowStateManager(tempDir);
      const initialState = stateManager.createInitialState();
      await stateManager.save(initialState);

      // Create mock config
      const config = createMockConfig();

      // Create mock interactive that auto-approves
      const mockInteractive = {
        approveStructure: vi.fn().mockResolvedValue(true),
        confirmResume: vi.fn().mockResolvedValue(true),
        selectStep: vi.fn().mockResolvedValue('analysis'),
      };

      // Create ImplementationStage with mocked dependencies
      const stage = new ImplementationStage(
        stateManager,
        config,
        mockInteractive as unknown as import('../../src/utils/interactive.js').Interactive,
        { skipBackup: true }
      );

      // Sample schemas.yaml
      const schemasYaml = `
document_types:
  guide:
    description: User guides
  api:
    description: API documentation
`;

      // Execute with sample schemas.yaml
      const result = await stage.execute(schemasYaml);

      // Verify all outputs created
      expect(result.success).toBe(true);
      expect(result.structure).toBeDefined();
      expect(result.configPath).toBeDefined();
      expect(result.schemasPath).toBeDefined();
      expect(result.registers).toBeDefined();

      // Verify pkf.config.yaml was created
      const configPath = path.join(tempDir, 'pkf.config.yaml');
      const configStats = await fs.stat(configPath);
      expect(configStats.isFile()).toBe(true);

      // Verify schemas.yaml was created
      const schemasPath = path.join(tempDir, 'schemas', 'schemas.yaml');
      const schemasStats = await fs.stat(schemasPath);
      expect(schemasStats.isFile()).toBe(true);

      // Verify register files were created
      const registersDir = path.join(tempDir, 'docs', 'registers');
      const todoStats = await fs.stat(path.join(registersDir, 'TODO.md'));
      expect(todoStats.isFile()).toBe(true);

      // Verify interactive was called
      expect(mockInteractive.approveStructure).toHaveBeenCalled();
    });
  });

  describe('INT-021: Structure preview generation', () => {
    it('buildPreview returns correct dirs and files', async () => {
      // Create mock state manager and config
      const stateManager = new WorkflowStateManager(tempDir);
      const initialState = stateManager.createInitialState();
      await stateManager.save(initialState);

      const config = createMockConfig();

      // Create mock interactive
      const mockInteractive = {
        approveStructure: vi.fn().mockImplementation((preview) => {
          // Capture the preview for verification
          return Promise.resolve(true);
        }),
        confirmResume: vi.fn().mockResolvedValue(true),
        selectStep: vi.fn().mockResolvedValue('analysis'),
      };

      const stage = new ImplementationStage(
        stateManager,
        config,
        mockInteractive as unknown as import('../../src/utils/interactive.js').Interactive,
        { skipBackup: true }
      );

      const schemasYaml = `
document_types:
  guide:
    description: Guides
  architecture:
    description: Architecture docs
`;

      await stage.execute(schemasYaml);

      // Verify approveStructure was called with a preview
      expect(mockInteractive.approveStructure).toHaveBeenCalled();

      const callArg = mockInteractive.approveStructure.mock.calls[0][0];

      // Verify preview contains correct dirs
      expect(callArg.dirs).toBeDefined();
      expect(Array.isArray(callArg.dirs)).toBe(true);

      // Verify preview contains correct files
      expect(callArg.files).toBeDefined();
      expect(Array.isArray(callArg.files)).toBe(true);

      // Files should include config, schemas, and registers
      expect(callArg.files.some((f: string) => f.includes('pkf.config.yaml'))).toBe(true);
      expect(callArg.files.some((f: string) => f.includes('schemas.yaml'))).toBe(true);
      expect(callArg.files.some((f: string) => f.includes('TODO.md'))).toBe(true);
      expect(callArg.files.some((f: string) => f.includes('ISSUES.md'))).toBe(true);
      expect(callArg.files.some((f: string) => f.includes('CHANGELOG.md'))).toBe(true);
    });
  });

  describe('INT-022: Backup creation', () => {
    it('creates backup directory with contents when docs exist', async () => {
      // Create temp directory with existing docs
      const docsDir = path.join(tempDir, 'docs');
      await fs.mkdir(docsDir, { recursive: true });

      // Create some existing documentation
      await fs.writeFile(
        path.join(docsDir, 'README.md'),
        '# Existing Documentation\n\nThis is existing content.',
        'utf-8'
      );
      await fs.mkdir(path.join(docsDir, 'guides'), { recursive: true });
      await fs.writeFile(
        path.join(docsDir, 'guides', 'getting-started.md'),
        '# Getting Started\n\nExisting guide.',
        'utf-8'
      );

      // Create mock state manager
      const stateManager = new WorkflowStateManager(tempDir);
      const initialState = stateManager.createInitialState();
      await stateManager.save(initialState);

      // Create config with backup enabled
      const config = createMockConfig();

      // Create mock interactive
      const mockInteractive = {
        approveStructure: vi.fn().mockResolvedValue(true),
        confirmResume: vi.fn().mockResolvedValue(true),
        selectStep: vi.fn().mockResolvedValue('analysis'),
      };

      // Execute implementation with backup enabled (not skipped)
      const stage = new ImplementationStage(
        stateManager,
        config,
        mockInteractive as unknown as import('../../src/utils/interactive.js').Interactive,
        { skipBackup: false } // Enable backup
      );

      const schemasYaml = `
document_types:
  guide:
    description: Guides
`;

      const result = await stage.execute(schemasYaml);

      // Verify backup directory was created
      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(result.backupPath).not.toBeNull();

      // Verify backup directory exists
      const backupStats = await fs.stat(result.backupPath!);
      expect(backupStats.isDirectory()).toBe(true);

      // Verify backup contains the original files
      const backupReadme = await fs.readFile(
        path.join(result.backupPath!, 'README.md'),
        'utf-8'
      );
      expect(backupReadme).toContain('Existing Documentation');

      const backupGuide = await fs.readFile(
        path.join(result.backupPath!, 'guides', 'getting-started.md'),
        'utf-8'
      );
      expect(backupGuide).toContain('Getting Started');
    });

    it('skips backup when skipBackup option is true', async () => {
      // Create temp directory with existing docs
      const docsDir = path.join(tempDir, 'docs');
      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(path.join(docsDir, 'README.md'), '# Existing', 'utf-8');

      const stateManager = new WorkflowStateManager(tempDir);
      const initialState = stateManager.createInitialState();
      await stateManager.save(initialState);

      const config = createMockConfig();

      const mockInteractive = {
        approveStructure: vi.fn().mockResolvedValue(true),
        confirmResume: vi.fn().mockResolvedValue(true),
        selectStep: vi.fn().mockResolvedValue('analysis'),
      };

      const stage = new ImplementationStage(
        stateManager,
        config,
        mockInteractive as unknown as import('../../src/utils/interactive.js').Interactive,
        { skipBackup: true }
      );

      const result = await stage.execute('document_types: {}');

      // Verify backup was skipped
      expect(result.backupPath).toBeNull();
    });
  });

  describe('INT-023: Schema file writing', () => {
    it('writes schemas.yaml to correct location with preserved content', async () => {
      const stateManager = new WorkflowStateManager(tempDir);
      const initialState = stateManager.createInitialState();
      await stateManager.save(initialState);

      const config = createMockConfig();

      const mockInteractive = {
        approveStructure: vi.fn().mockResolvedValue(true),
        confirmResume: vi.fn().mockResolvedValue(true),
        selectStep: vi.fn().mockResolvedValue('analysis'),
      };

      const stage = new ImplementationStage(
        stateManager,
        config,
        mockInteractive as unknown as import('../../src/utils/interactive.js').Interactive,
        { skipBackup: true }
      );

      // Schema content with specific structure
      const schemasYaml = `# PKF Schema Design
version: "1.0.0"

document_types:
  guide:
    description: User guides
    fields:
      - title
      - author
  api-reference:
    description: API documentation
    fields:
      - endpoint
      - method

metadata:
  generated_by: pkf-init
  generation_date: 2024-01-15
`;

      const result = await stage.execute(schemasYaml);

      // Verify schemas.yaml was written to correct location
      expect(result.schemasPath).toBe(path.join(tempDir, 'schemas', 'schemas.yaml'));

      // Verify content was preserved correctly
      const writtenContent = await fs.readFile(result.schemasPath!, 'utf-8');
      expect(writtenContent).toBe(schemasYaml);

      // Verify the content is parseable
      const parsed = safeLoad(writtenContent) as Record<string, unknown>;
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.document_types).toBeDefined();
      expect(parsed.metadata).toBeDefined();
    });
  });

  describe('INT-024: Config reads package.json', () => {
    it('uses project name and description from package.json in config', async () => {
      // Create temp directory with package.json
      await fs.writeFile(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: '@myorg/awesome-project',
          description: 'An awesome project with comprehensive documentation',
          version: '2.0.0',
          repository: {
            type: 'git',
            url: 'git+https://github.com/myorg/awesome-project.git',
          },
        }),
        'utf-8'
      );

      const stateManager = new WorkflowStateManager(tempDir);
      const initialState = stateManager.createInitialState();
      await stateManager.save(initialState);

      const config = createMockConfig();

      const mockInteractive = {
        approveStructure: vi.fn().mockResolvedValue(true),
        confirmResume: vi.fn().mockResolvedValue(true),
        selectStep: vi.fn().mockResolvedValue('analysis'),
      };

      const stage = new ImplementationStage(
        stateManager,
        config,
        mockInteractive as unknown as import('../../src/utils/interactive.js').Interactive,
        { skipBackup: true }
      );

      const schemasYaml = `
document_types:
  guide:
    description: Guides
`;

      const result = await stage.execute(schemasYaml);

      // Read and parse the generated config
      const configContent = await fs.readFile(result.configPath!, 'utf-8');
      const pkfConfig = safeLoad(configContent) as Record<string, unknown>;

      // Verify project name and description from package.json
      const project = pkfConfig.project as Record<string, string>;
      expect(project.name).toBe('@myorg/awesome-project');
      expect(project.description).toBe('An awesome project with comprehensive documentation');
      expect(project.version).toBe('2.0.0');
      expect(project.repository).toBe('https://github.com/myorg/awesome-project');
    });

    it('uses defaults when package.json is not present', async () => {
      // No package.json in temp directory

      const stateManager = new WorkflowStateManager(tempDir);
      const initialState = stateManager.createInitialState();
      await stateManager.save(initialState);

      const config = createMockConfig();

      const mockInteractive = {
        approveStructure: vi.fn().mockResolvedValue(true),
        confirmResume: vi.fn().mockResolvedValue(true),
        selectStep: vi.fn().mockResolvedValue('analysis'),
      };

      const stage = new ImplementationStage(
        stateManager,
        config,
        mockInteractive as unknown as import('../../src/utils/interactive.js').Interactive,
        { skipBackup: true }
      );

      const result = await stage.execute('document_types: {}');

      // Read and parse the generated config
      const configContent = await fs.readFile(result.configPath!, 'utf-8');
      const pkfConfig = safeLoad(configContent) as Record<string, unknown>;

      // Verify defaults are used
      const project = pkfConfig.project as Record<string, string>;
      expect(project.name).toBe('my-project');
      expect(project.description).toBe('A PKF-enabled project');
    });
  });
});
