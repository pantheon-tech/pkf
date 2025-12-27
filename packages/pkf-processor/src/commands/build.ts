import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import chalk from 'chalk';
import { parseConfigFile } from '../parser/index.js';
import { expandTree } from '../expander/index.js';
import {
  generateStructureJson,
  generatePathSchemaMap,
  generateRemarkConfig,
} from '../generator/index.js';
import { formatErrors } from '../errors/index.js';
import type { ProcessorOutput, ProcessorError } from '../types.js';

export interface BuildOptions {
  config: string;
  output: string;
  strict: boolean;
}

/**
 * Write content to file, creating directories as needed.
 */
function writeOutput(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

/**
 * Execute the build command.
 */
export async function buildCommand(options: BuildOptions): Promise<void> {
  const startTime = Date.now();
  const errors: ProcessorError[] = [];

  console.log(chalk.blue('PKF Processor - Build'));
  console.log(chalk.gray(`Config: ${options.config}`));
  console.log(chalk.gray(`Output: ${options.output}`));
  console.log();

  // 1. Parse configuration
  console.log(chalk.gray('Parsing configuration...'));
  const parseResult = parseConfigFile(options.config);
  if (!parseResult.success) {
    console.error(formatErrors(parseResult.error));
    process.exit(1);
  }

  const config = parseResult.data;
  console.log(chalk.green(`✓ Configuration valid (${config.project.name})`));

  // 2. Expand tree
  console.log(chalk.gray('Expanding compose tree...'));
  const expandResult = expandTree(config.docs);
  if (!expandResult.success) {
    console.error(formatErrors(expandResult.error));
    process.exit(1);
  }

  const tree = expandResult.data;
  console.log(chalk.green(`✓ Tree expanded (${tree.nodes.length} nodes)`));

  // 3. Generate artifacts
  console.log(chalk.gray('Generating artifacts...'));

  // Structure JSON
  const structureJson = generateStructureJson(tree, config);
  const structurePath = join(options.output, 'structure.json');
  writeOutput(structurePath, JSON.stringify(structureJson, null, 2));

  // Path-Schema Map
  const pathSchemaMap = generatePathSchemaMap(tree, config, options.output);
  const pathMapPath = join(options.output, 'path-schema-map.json');
  writeOutput(pathMapPath, JSON.stringify(pathSchemaMap, null, 2));

  // Remark Config
  const remarkConfig = generateRemarkConfig(pathSchemaMap);
  const remarkPath = join(options.output, '.remarkrc.generated.mjs');
  writeOutput(remarkPath, remarkConfig);

  console.log(chalk.green('✓ Artifacts generated'));

  // 4. Output summary
  const duration = Date.now() - startTime;

  console.log();
  console.log(chalk.bold('Generated Artifacts:'));
  console.log(`  ${chalk.cyan(structurePath)}`);
  console.log(`  ${chalk.cyan(pathMapPath)}`);
  console.log(`  ${chalk.cyan(remarkPath)}`);
  console.log();
  console.log(chalk.green(`Build complete in ${duration}ms`));

  // Output JSON result
  const output: ProcessorOutput = {
    success: true,
    artifacts: {
      schemas: [],
      structureJson: structurePath,
      remarkConfig: remarkPath,
      pathSchemaMap: pathMapPath,
    },
    errors,
    duration,
  };

  if (process.env['PKF_JSON_OUTPUT']) {
    console.log(JSON.stringify(output, null, 2));
  }
}
