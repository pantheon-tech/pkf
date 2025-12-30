import { existsSync, readFileSync } from 'node:fs';
import chalk from 'chalk';
import { validateStructure } from '../validator/structure-validator.js';
import { formatErrors } from '../errors/index.js';

export interface ValidateStructureOptions {
  structure: string;
}

/**
 * Execute the validate-structure command.
 */
export async function validateStructureCommand(
  options: ValidateStructureOptions
): Promise<void> {
  const startTime = Date.now();

  console.log(chalk.blue('PKF Processor - Structure Validation'));
  console.log(chalk.gray(`Structure: ${options.structure}`));
  console.log();

  // Check if structure.json exists
  if (!existsSync(options.structure)) {
    console.error(
      chalk.red(`Error: Structure file not found: ${options.structure}`)
    );
    console.error(
      chalk.gray('Run `npm run pkf:build` to generate structure.json first')
    );
    process.exit(1);
  }

  // Load structure.json
  console.log(chalk.gray('Loading structure definition...'));
  let structureJson;
  try {
    const content = readFileSync(options.structure, 'utf8');
    structureJson = JSON.parse(content);
  } catch (error) {
    console.error(chalk.red(`Error: Failed to parse structure.json`));
    console.error(chalk.gray((error as Error).message));
    process.exit(1);
  }

  console.log(chalk.green(`✓ Structure loaded (version ${structureJson.version})`));

  // Validate structure
  console.log(chalk.gray('Validating directory structure...'));
  const result = validateStructure(structureJson);

  const duration = Date.now() - startTime;

  // Display results
  console.log();

  if (result.errors.length > 0) {
    console.error(chalk.red('Structure Validation Failed:'));
    console.error();
    console.error(formatErrors(result.errors));
    console.error();
  }

  if (result.warnings.length > 0) {
    console.warn(chalk.yellow('Warnings:'));
    console.warn();
    console.warn(formatErrors(result.warnings));
    console.warn();
  }

  // Summary
  console.log(chalk.bold('Validation Summary:'));
  console.log(`  Errors:   ${result.errors.length > 0 ? chalk.red(result.errors.length) : chalk.green('0')}`);
  console.log(`  Warnings: ${result.warnings.length > 0 ? chalk.yellow(result.warnings.length) : chalk.gray('0')}`);
  console.log(`  Duration: ${duration}ms`);
  console.log();

  if (result.valid) {
    console.log(chalk.green('✓ Structure validation passed'));
    process.exit(0);
  } else {
    console.log(chalk.red('✗ Structure validation failed'));
    process.exit(1);
  }
}
