/**
 * PKF Configuration Validator
 *
 * Validates pkf.config.yaml files against the PKF config schema
 * and verifies that referenced directories exist.
 */

import { join, dirname } from 'path';
import {
  type ValidationResult,
  type ValidationOptions,
  type ValidationIssue,
  createEmptyResult,
  createIssue,
} from '../types/index.js';
import {
  fileExists,
  isDirectory,
  readYamlFile,
  readJsonFile,
  getConfigPath,
} from '../utils/file-utils.js';
import { validateWithSchema } from '../utils/schema-utils.js';

/**
 * Default config file name
 */
const DEFAULT_CONFIG_FILE = 'pkf.config.yaml';

/**
 * Default schema file path (relative to package root)
 */
const DEFAULT_SCHEMA_PATH = 'schemas/pkf-config.schema.json';

/**
 * PKF Configuration structure as defined in the schema
 */
export interface PkfConfigSchema {
  $schema?: string;
  version: string;
  project: {
    name: string;
    version?: string;
    description?: string;
    repository?: string;
  };
  structure?: {
    docsDir?: string;
    archiveDir?: string;
    registersDir?: string;
    templatesDir?: string;
    schemasDir?: string;
    agentsDir?: string;
  };
  registers?: {
    todoFile?: string;
    issuesFile?: string;
    changelogFile?: string;
    idPrefix?: {
      todo?: string;
      issue?: string;
      proposal?: string;
      adr?: string;
    };
    idPadding?: number;
  };
  ai?: {
    enabled?: boolean;
    guidanceFile?: string;
    systemPromptFile?: string;
    customAgents?: boolean;
  };
  packages?: {
    enabled?: boolean;
    directory?: string;
    inheritRules?: boolean;
  };
  validation?: {
    validateSchemas?: boolean;
    validateLinks?: boolean;
    requireNavHubs?: boolean;
  };
  proposals?: {
    enabled?: boolean;
    ranges?: Record<
      string,
      {
        min: number;
        max: number;
        description?: string;
      }
    >;
  };
}

/**
 * Options for config validation
 */
export interface ConfigValidationOptions extends ValidationOptions {
  /** Path to the config file (defaults to pkf.config.yaml in rootDir) */
  configPath?: string;
  /** Path to the schema file (defaults to schemas/pkf-config.schema.json) */
  schemaPath?: string;
  /** Whether to skip directory existence checks */
  skipDirectoryChecks?: boolean;
  /** Whether to check optional directories (only checks configured ones if false) */
  checkOptionalDirectories?: boolean;
}

/**
 * Directory fields in the structure configuration with their defaults
 */
const STRUCTURE_DIRECTORIES = {
  docsDir: 'docs',
  archiveDir: 'docs_archive',
  registersDir: 'docs/registers',
  templatesDir: 'docs/framework/templates',
  schemasDir: 'docs/framework/schemas',
  agentsDir: '.claude/agents',
} as const;

/**
 * Validate a PKF configuration file
 *
 * @param options - Validation options
 * @returns Validation result with errors, warnings, and info messages
 */
export async function validateConfig(
  options: ConfigValidationOptions = {}
): Promise<ValidationResult> {
  const startTime = Date.now();
  const result = createEmptyResult();
  const rootDir = options.rootDir ?? process.cwd();

  // Determine config file path
  const configPath = options.configPath ?? getConfigPath(rootDir);

  // Check if config file exists
  if (!(await fileExists(configPath))) {
    result.errors.push(
      createIssue(
        'CONFIG_NOT_FOUND',
        `PKF configuration file not found: ${configPath}`,
        'error',
        {
          filePath: configPath,
          suggestion: `Create a pkf.config.yaml file in your project root. You can use the template from templates/pkf-config.template.yaml`,
        }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Load the config file
  let config: PkfConfigSchema;
  try {
    config = await readYamlFile<PkfConfigSchema>(configPath);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    result.errors.push(
      createIssue(
        'CONFIG_PARSE_ERROR',
        `Failed to parse PKF configuration: ${errorMessage}`,
        'error',
        {
          filePath: configPath,
          suggestion: 'Ensure the file contains valid YAML syntax',
        }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Validate config is not null/undefined
  if (!config || typeof config !== 'object') {
    result.errors.push(
      createIssue(
        'CONFIG_EMPTY',
        'PKF configuration file is empty or invalid',
        'error',
        {
          filePath: configPath,
          suggestion:
            'Add required configuration fields: version and project.name',
        }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Load and validate against JSON schema
  const schemaPath = options.schemaPath ?? findSchemaPath(rootDir);
  if (schemaPath && (await fileExists(schemaPath))) {
    try {
      const schema = await readJsonFile<object>(schemaPath);
      const schemaResult = validateWithSchema<PkfConfigSchema>(
        config,
        schema,
        configPath
      );

      if (!schemaResult.valid) {
        result.errors.push(...schemaResult.issues);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.warnings.push(
        createIssue(
          'SCHEMA_LOAD_ERROR',
          `Could not load schema for validation: ${errorMessage}`,
          'warning',
          {
            filePath: schemaPath,
            suggestion: 'Ensure the schema file exists and contains valid JSON',
          }
        )
      );
    }
  } else {
    result.info.push(
      createIssue(
        'SCHEMA_NOT_FOUND',
        `Schema file not found at ${schemaPath ?? 'default location'}, performing basic validation only`,
        'info',
        {
          suggestion:
            'Add schemas/pkf-config.schema.json for full schema validation',
        }
      )
    );

    // Perform basic validation without schema
    const basicErrors = validateBasicConfig(config, configPath);
    result.errors.push(...basicErrors);
  }

  // Check directory references if schema validation passed
  if (!options.skipDirectoryChecks) {
    const dirIssues = await validateDirectoryReferences(
      config,
      rootDir,
      configPath,
      options.checkOptionalDirectories ?? false
    );
    categorizeIssues(dirIssues, result);
  }

  // Validate document type definitions if present
  if (config.proposals?.enabled && config.proposals?.ranges) {
    const proposalIssues = validateProposalRanges(
      config.proposals.ranges,
      configPath
    );
    categorizeIssues(proposalIssues, result);
  }

  // Validate register ID configuration
  if (config.registers?.idPrefix) {
    const registerIssues = validateRegisterConfig(config.registers, configPath);
    categorizeIssues(registerIssues, result);
  }

  // Set final validity
  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;
  result.itemCount = 1;

  return result;
}

/**
 * Find the schema path by checking common locations
 */
function findSchemaPath(rootDir: string): string {
  // Return the primary schema location - actual existence check happens in validateConfig
  return join(rootDir, 'schemas', 'pkf-config.schema.json');
}

/**
 * Perform basic validation when schema is not available
 */
function validateBasicConfig(
  config: PkfConfigSchema,
  filePath: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check required fields
  if (!config.version) {
    issues.push(
      createIssue(
        'REQUIRED_FIELD',
        'Missing required field: version',
        'error',
        {
          filePath,
          suggestion: 'Add a version field (e.g., version: "1.0.0")',
        }
      )
    );
  } else if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(config.version)) {
    issues.push(
      createIssue(
        'INVALID_VERSION',
        `Invalid version format: ${config.version}`,
        'error',
        {
          filePath,
          value: config.version,
          expected: 'SemVer format (e.g., 1.0.0 or 1.0.0-alpha.1)',
          suggestion:
            'Use SemVer format: MAJOR.MINOR.PATCH (e.g., "1.0.0")',
        }
      )
    );
  }

  if (!config.project) {
    issues.push(
      createIssue(
        'REQUIRED_FIELD',
        'Missing required field: project',
        'error',
        {
          filePath,
          suggestion: 'Add a project section with at least a name field',
        }
      )
    );
  } else if (!config.project.name) {
    issues.push(
      createIssue(
        'REQUIRED_FIELD',
        'Missing required field: project.name',
        'error',
        {
          filePath,
          suggestion: 'Add a name field to the project section',
        }
      )
    );
  }

  // Validate project version if present
  if (
    config.project?.version &&
    !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(config.project.version)
  ) {
    issues.push(
      createIssue(
        'INVALID_VERSION',
        `Invalid project version format: ${config.project.version}`,
        'error',
        {
          filePath,
          value: config.project.version,
          expected: 'SemVer format (e.g., 1.0.0)',
          suggestion: 'Use SemVer format: MAJOR.MINOR.PATCH',
        }
      )
    );
  }

  return issues;
}

/**
 * Validate that directories referenced in the config exist
 */
async function validateDirectoryReferences(
  config: PkfConfigSchema,
  rootDir: string,
  configPath: string,
  checkOptional: boolean
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const structure = config.structure ?? {};

  // Define which directories to check
  const directoriesToCheck: Array<{
    key: string;
    path: string;
    required: boolean;
    description: string;
  }> = [];

  // docsDir is typically required
  const docsDir: string = structure.docsDir ?? STRUCTURE_DIRECTORIES.docsDir;
  directoriesToCheck.push({
    key: 'docsDir',
    path: docsDir,
    required: true,
    description: 'main documentation directory',
  });

  // registersDir is important for PKF functionality
  const registersDir: string =
    structure.registersDir ?? STRUCTURE_DIRECTORIES.registersDir;
  directoriesToCheck.push({
    key: 'registersDir',
    path: registersDir,
    required: true,
    description: 'registers directory (TODO, ISSUES, CHANGELOG)',
  });

  // Optional directories - only check if explicitly configured or checkOptional is true
  if (structure.templatesDir || checkOptional) {
    const templatesPath: string = structure.templatesDir ?? STRUCTURE_DIRECTORIES.templatesDir;
    directoriesToCheck.push({
      key: 'templatesDir',
      path: templatesPath,
      required: false,
      description: 'templates directory',
    });
  }

  if (structure.schemasDir || checkOptional) {
    const schemasPath: string = structure.schemasDir ?? STRUCTURE_DIRECTORIES.schemasDir;
    directoriesToCheck.push({
      key: 'schemasDir',
      path: schemasPath,
      required: false,
      description: 'schemas directory',
    });
  }

  if (structure.agentsDir || checkOptional) {
    const agentsPath: string = structure.agentsDir ?? STRUCTURE_DIRECTORIES.agentsDir;
    directoriesToCheck.push({
      key: 'agentsDir',
      path: agentsPath,
      required: false,
      description: 'AI agents directory',
    });
  }

  if (structure.archiveDir) {
    directoriesToCheck.push({
      key: 'archiveDir',
      path: structure.archiveDir,
      required: false,
      description: 'documentation archive directory',
    });
  }

  // Check packages directory if enabled
  if (config.packages?.enabled) {
    const packagesDir: string = config.packages.directory ?? 'packages';
    directoriesToCheck.push({
      key: 'packages.directory',
      path: packagesDir,
      required: true,
      description: 'packages directory (multi-package mode enabled)',
    });
  }

  // Validate each directory
  for (const dir of directoriesToCheck) {
    const fullPath = join(rootDir, dir.path);
    const exists = await isDirectory(fullPath);

    if (!exists) {
      if (dir.required) {
        issues.push(
          createIssue(
            'DIRECTORY_NOT_FOUND',
            `Required directory not found: ${dir.path} (${dir.description})`,
            'error',
            {
              filePath: configPath,
              value: dir.path,
              suggestion: `Create the directory: mkdir -p ${dir.path}`,
            }
          )
        );
      } else {
        issues.push(
          createIssue(
            'DIRECTORY_MISSING',
            `Configured directory not found: ${dir.path} (${dir.description})`,
            'warning',
            {
              filePath: configPath,
              value: dir.path,
              suggestion: `Create the directory or remove the '${dir.key}' configuration`,
            }
          )
        );
      }
    }
  }

  // Check register files if registersDir exists
  const fullRegistersDir = join(rootDir, registersDir);
  if (await isDirectory(fullRegistersDir)) {
    const registerFiles = await validateRegisterFiles(
      config,
      rootDir,
      registersDir,
      configPath
    );
    issues.push(...registerFiles);
  }

  return issues;
}

/**
 * Validate that register files exist
 */
async function validateRegisterFiles(
  config: PkfConfigSchema,
  rootDir: string,
  registersDir: string,
  configPath: string
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const registers = config.registers ?? {};

  const registerFilesToCheck = [
    {
      key: 'todoFile',
      file: registers.todoFile ?? 'TODO.md',
      description: 'TODO register',
    },
    {
      key: 'issuesFile',
      file: registers.issuesFile ?? 'ISSUES.md',
      description: 'Issues register',
    },
    {
      key: 'changelogFile',
      file: registers.changelogFile ?? 'CHANGELOG.md',
      description: 'Changelog register',
    },
  ];

  for (const register of registerFilesToCheck) {
    const fullPath = join(rootDir, registersDir, register.file);
    const exists = await fileExists(fullPath);

    if (!exists) {
      issues.push(
        createIssue(
          'REGISTER_FILE_MISSING',
          `Register file not found: ${register.file} (${register.description})`,
          'warning',
          {
            filePath: configPath,
            value: join(registersDir, register.file),
            suggestion: `Create the register file from template or run: touch ${join(registersDir, register.file)}`,
          }
        )
      );
    }
  }

  return issues;
}

/**
 * Validate proposal range configurations
 */
function validateProposalRanges(
  ranges: NonNullable<PkfConfigSchema['proposals']>['ranges'],
  configPath: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!ranges) return issues;

  // Check for overlapping ranges
  const rangeEntries = Object.entries(ranges);

  for (let i = 0; i < rangeEntries.length; i++) {
    const entry = rangeEntries[i];
    if (!entry) continue;
    const [name1, range1] = entry;

    // Validate individual range
    if (range1.min >= range1.max) {
      issues.push(
        createIssue(
          'INVALID_RANGE',
          `Proposal range '${name1}' has min >= max (${range1.min} >= ${range1.max})`,
          'error',
          {
            filePath: configPath,
            value: range1,
            suggestion: 'Ensure min is less than max',
          }
        )
      );
    }

    if (range1.min < 0) {
      issues.push(
        createIssue(
          'INVALID_RANGE',
          `Proposal range '${name1}' has negative min value: ${range1.min}`,
          'error',
          {
            filePath: configPath,
            value: range1.min,
            suggestion: 'Use a non-negative minimum value',
          }
        )
      );
    }

    // Check for overlaps with other ranges
    for (let j = i + 1; j < rangeEntries.length; j++) {
      const entry2 = rangeEntries[j];
      if (!entry2) continue;
      const [name2, range2] = entry2;

      const overlaps =
        (range1.min >= range2.min && range1.min <= range2.max) ||
        (range1.max >= range2.min && range1.max <= range2.max) ||
        (range2.min >= range1.min && range2.min <= range1.max);

      if (overlaps) {
        issues.push(
          createIssue(
            'OVERLAPPING_RANGES',
            `Proposal ranges '${name1}' (${range1.min}-${range1.max}) and '${name2}' (${range2.min}-${range2.max}) overlap`,
            'error',
            {
              filePath: configPath,
              suggestion:
                'Adjust ranges so they do not overlap',
            }
          )
        );
      }
    }
  }

  return issues;
}

/**
 * Validate register ID configuration
 */
function validateRegisterConfig(
  registers: NonNullable<PkfConfigSchema['registers']>,
  configPath: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Validate ID prefixes are valid identifiers
  if (registers.idPrefix) {
    const prefixPattern = /^[A-Z][A-Z0-9_-]*$/;

    for (const [key, prefix] of Object.entries(registers.idPrefix)) {
      if (prefix && !prefixPattern.test(prefix)) {
        issues.push(
          createIssue(
            'INVALID_ID_PREFIX',
            `Invalid ID prefix for '${key}': ${prefix}`,
            'warning',
            {
              filePath: configPath,
              value: prefix,
              expected: 'Uppercase letters, numbers, underscores, or hyphens',
              suggestion:
                'Use uppercase letters starting with a letter (e.g., "TODO", "ISSUE-1")',
            }
          )
        );
      }
    }
  }

  // Check for duplicate prefixes
  if (registers.idPrefix) {
    const prefixes = Object.entries(registers.idPrefix).filter(
      ([_, v]) => v !== undefined
    );
    const prefixValues = prefixes.map(([_, v]) => v);
    const duplicates = prefixValues.filter(
      (v, i) => prefixValues.indexOf(v) !== i
    );

    if (duplicates.length > 0) {
      const uniqueDuplicates = Array.from(new Set(duplicates));
      issues.push(
        createIssue(
          'DUPLICATE_ID_PREFIX',
          `Duplicate ID prefixes found: ${uniqueDuplicates.join(', ')}`,
          'error',
          {
            filePath: configPath,
            suggestion: 'Each register type should have a unique ID prefix',
          }
        )
      );
    }
  }

  return issues;
}

/**
 * Categorize issues into the result object
 */
function categorizeIssues(
  issues: ValidationIssue[],
  result: ValidationResult
): void {
  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        result.errors.push(issue);
        break;
      case 'warning':
        result.warnings.push(issue);
        break;
      case 'info':
        result.info.push(issue);
        break;
    }
  }
}

/**
 * Load and return the parsed PKF config
 *
 * @param options - Options for loading the config
 * @returns The parsed config or null if invalid
 */
export async function loadConfig(
  options: ConfigValidationOptions = {}
): Promise<{ config: PkfConfigSchema | null; result: ValidationResult }> {
  const result = await validateConfig(options);

  if (!result.valid) {
    return { config: null, result };
  }

  const rootDir = options.rootDir ?? process.cwd();
  const configPath = options.configPath ?? getConfigPath(rootDir);

  try {
    const config = await readYamlFile<PkfConfigSchema>(configPath);
    return { config, result };
  } catch {
    return { config: null, result };
  }
}

export default validateConfig;
