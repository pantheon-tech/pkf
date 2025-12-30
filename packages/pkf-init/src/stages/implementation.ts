/**
 * PKF Init Stage 3: Implementation
 * Uses generators to create the PKF directory structure, config, and registers
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { StructureGenerator, GeneratedStructure } from '../generators/structure.js';
import { ConfigGenerator } from '../generators/config.js';
import { RegisterInitializer, InitializedRegisters } from '../generators/registers.js';
import { WorkflowStateManager } from '../state/workflow-state.js';
import { Interactive } from '../utils/interactive.js';
import { WorkflowStage, LoadedConfig } from '../types/index.js';
import logger from '../utils/logger.js';

/**
 * Preview of structure to be created
 */
export interface StructurePreview {
  /** Directories to create */
  dirs: string[];
  /** Files to create */
  files: string[];
}

/**
 * Result from implementation stage execution
 */
export interface ImplementationResult {
  /** Whether implementation succeeded */
  success: boolean;
  /** Generated directory structure */
  structure?: GeneratedStructure;
  /** Path to generated pkf.config.yaml */
  configPath?: string;
  /** Path to generated schemas.yaml */
  schemasPath?: string;
  /** Initialized registers */
  registers?: InitializedRegisters;
  /** Path to backup (null if skipped) */
  backupPath?: string | null;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for implementation stage
 */
export interface ImplementationOptions {
  /** Skip creating backup of existing docs */
  skipBackup?: boolean;
  /** Force overwrite existing files */
  force?: boolean;
}

/**
 * Implementation Stage (Stage 3)
 * Creates the PKF directory structure, configuration, and registers
 */
export class ImplementationStage {
  private stateManager: WorkflowStateManager;
  private config: LoadedConfig;
  private interactive: Interactive;
  private options: ImplementationOptions;

  /**
   * Create implementation stage
   * @param stateManager - Workflow state manager for checkpointing
   * @param config - Loaded configuration
   * @param interactive - Interactive mode handler
   * @param options - Implementation options
   */
  constructor(
    stateManager: WorkflowStateManager,
    config: LoadedConfig,
    interactive: Interactive,
    options: ImplementationOptions = {}
  ) {
    this.stateManager = stateManager;
    this.config = config;
    this.interactive = interactive;
    this.options = options;
  }

  /**
   * Execute the implementation stage
   * @param schemasYaml - Generated schemas.yaml content from design stage
   * @returns Implementation result
   */
  async execute(schemasYaml: string): Promise<ImplementationResult> {
    logger.stage('Stage 3: Implementation');

    try {
      // Initialize generators
      logger.step('Initializing generators...');
      const structureGenerator = new StructureGenerator(
        this.config.rootDir,
        this.config.outputDir
      );
      const configGenerator = new ConfigGenerator(this.config.rootDir);
      const registersDir = path.join(this.config.outputDir, 'docs', 'registers');
      const registerInitializer = new RegisterInitializer(registersDir);

      // Generate directory structure (this also creates the directories)
      logger.step('Generating directory structure...');
      const structure = await structureGenerator.generate(schemasYaml);

      // Build preview for interactive approval before making changes
      const preview = this.buildPreview(structure, registersDir);

      // If interactive, show preview and get approval first
      if (this.interactive) {
        logger.step('Awaiting approval...');
        const approved = await this.interactive.approveStructure(preview);

        if (!approved) {
          logger.warn('Structure creation cancelled by user');
          return {
            success: false,
            error: 'Cancelled by user',
          };
        }
      }

      // Create backup if not skipped (before making any changes)
      logger.step('Creating backup...');
      const backupPath = await this.createBackup();
      if (backupPath) {
        logger.info(`Backup created at: ${backupPath}`);
      } else {
        logger.debug('Backup skipped');
      }

      // Directories are already created by structureGenerator.generate()
      const totalDirs = structure.createdDirs.length + structure.existingDirs.length;
      logger.info(`Processed ${totalDirs} directories (${structure.createdDirs.length} created, ${structure.existingDirs.length} existing)`);

      // Generate and write pkf.config.yaml
      logger.step('Generating pkf.config.yaml...');
      const configContent = await configGenerator.generate(schemasYaml, structure);
      await configGenerator.write(configContent);
      const configPath = path.join(this.config.rootDir, 'pkf.config.yaml');
      logger.info(`Config written to: ${configPath}`);

      // Write schemas.yaml
      logger.step('Writing schemas.yaml...');
      const schemasPath = await this.writeSchemas(schemasYaml);
      logger.info(`Schemas written to: ${schemasPath}`);

      // Initialize registers
      logger.step('Initializing registers...');
      const registers = await registerInitializer.initialize();
      logger.info(`Registers: ${registers.created.length} created, ${registers.existing.length} existing`);

      // Save state checkpoint
      await this.stateManager.checkpoint(
        WorkflowStage.IMPLEMENTING,
        'Implementation stage completed',
        {
          createdDirs: structure.createdDirs,
          existingDirs: structure.existingDirs,
          createdFiles: [
            configPath,
            schemasPath,
            ...registers.created.map((f) => path.join(registersDir, f)),
          ],
          configPath,
          schemasPath,
          backupPath,
        }
      );

      logger.success('Implementation stage completed successfully');

      return {
        success: true,
        structure,
        configPath,
        schemasPath,
        registers,
        backupPath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Implementation failed: ${errorMessage}`);

      // Save error state
      await this.stateManager.checkpoint(
        WorkflowStage.FAILED,
        `Implementation failed: ${errorMessage}`,
        { error: errorMessage }
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create backup of existing docs directory
   * @returns Backup path or null if skipped
   */
  private async createBackup(): Promise<string | null> {
    if (this.options.skipBackup) {
      return null;
    }

    // Check if docs directory exists
    try {
      await fs.access(this.config.docsDir);
    } catch {
      // No docs directory to backup
      logger.debug('No existing docs directory to backup');
      return null;
    }

    // Create backup directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.config.backupDir, `docs-${timestamp}`);

    // Ensure backup directory exists
    await fs.mkdir(this.config.backupDir, { recursive: true });

    // Copy docs to backup
    await this.copyDirectory(this.config.docsDir, backupPath);

    return backupPath;
  }

  /**
   * Recursively copy a directory
   * @param src - Source directory
   * @param dest - Destination directory
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });

    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Write schemas.yaml to schemas directory
   * @param schemasYaml - Schemas YAML content
   * @returns Path to written schemas file
   */
  private async writeSchemas(schemasYaml: string): Promise<string> {
    const schemasDir = path.join(this.config.outputDir, 'schemas');
    const schemasPath = path.join(schemasDir, 'schemas.yaml');

    // Create schemas directory
    await fs.mkdir(schemasDir, { recursive: true });

    // Write schemas file
    await fs.writeFile(schemasPath, schemasYaml, 'utf-8');

    return schemasPath;
  }

  /**
   * Build preview object for interactive approval
   * @param structure - Generated structure
   * @param registersDir - Registers directory path
   * @returns Structure preview
   */
  private buildPreview(
    structure: GeneratedStructure,
    registersDir: string
  ): StructurePreview {
    // Collect all directories (both created and existing, for preview purposes)
    const allDirs = [...structure.createdDirs, ...structure.existingDirs];

    // Build list of files that will be created
    const files: string[] = [
      path.join(this.config.rootDir, 'pkf.config.yaml'),
      path.join(this.config.outputDir, 'schemas', 'schemas.yaml'),
      path.join(registersDir, 'TODO.md'),
      path.join(registersDir, 'ISSUES.md'),
      path.join(registersDir, 'CHANGELOG.md'),
    ];

    // Make paths relative to output directory for cleaner display
    const relativeDirs = allDirs.map((d) => path.relative(this.config.outputDir, d) || '.');
    const relativeFiles = files.map((f) => path.relative(this.config.outputDir, f));

    return {
      dirs: relativeDirs.filter((d) => d !== '.').sort(),
      files: relativeFiles.sort(),
    };
  }
}

export default ImplementationStage;
