import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import chalk from 'chalk';
import { parseConfigFile } from '../parser/index.js';
import { expandTree } from '../expander/index.js';
import {
  generateStructureJson,
  generatePathSchemaMap,
  generateRemarkConfig,
} from '../generator/index.js';
import { parseSchemasFile, generateAllSchemas } from '../dsl/index.js';
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

  // 4. Generate JSON Schemas from schemas.yaml (if exists)
  const schemaFiles: string[] = [];
  const schemasPath = config.components?.schemas ?? 'schemas.yaml';

  if (existsSync(schemasPath)) {
    console.log(chalk.gray('Generating JSON schemas...'));

    const schemasContent = readFileSync(schemasPath, 'utf8');
    const schemasResult = parseSchemasFile(schemasContent, schemasPath);

    if (!schemasResult.success) {
      console.error(formatErrors(schemasResult.error));
      process.exit(1);
    }

    const generatedSchemas = generateAllSchemas(schemasResult.data, {
      outputDir: join(options.output, 'schemas'),
    });

    let schemaCount = 0;
    for (const [name, result] of generatedSchemas) {
      if (result.success) {
        const schemaPath = join(options.output, 'schemas', `${name}.schema.json`);
        writeOutput(schemaPath, JSON.stringify(result.data.schema, null, 2));
        schemaFiles.push(schemaPath);
        schemaCount++;
      } else {
        errors.push(...result.error);
      }
    }

    if (errors.length > 0) {
      console.error(formatErrors(errors));
      process.exit(1);
    }

    console.log(chalk.green(`✓ Generated ${schemaCount} JSON schemas`));
  }

  // 5. Output summary
  const duration = Date.now() - startTime;

  console.log();
  console.log(chalk.bold('Generated Artifacts:'));
  console.log(`  ${chalk.cyan(structurePath)}`);
  console.log(`  ${chalk.cyan(pathMapPath)}`);
  console.log(`  ${chalk.cyan(remarkPath)}`);
  for (const schemaFile of schemaFiles) {
    console.log(`  ${chalk.cyan(schemaFile)}`);
  }
  console.log();
  console.log(chalk.green(`Build complete in ${duration}ms`));

  // Output JSON result
  const output: ProcessorOutput = {
    success: true,
    artifacts: {
      schemas: schemaFiles,
      structureJson: structurePath,
      remarkConfig: remarkPath,
      pathSchemaMap: pathMapPath,
    },
    errors,
    duration,
  };

  // When PKF_JSON_OUTPUT is set (to any non-empty value), emit the full ProcessorOutput
  // object as pretty-printed JSON to stdout. This is intended for machine-readable
  // consumption (e.g. CI pipelines or tooling) and does not affect the generated files.
  if (process.env['PKF_JSON_OUTPUT']) {
    console.log(JSON.stringify(output, null, 2));
  }
}
