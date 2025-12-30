#!/usr/bin/env node

/**
 * PKF Validator CLI
 * Command-line interface for validating PKF configurations and documents
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { validateConfig } from './validators/config-validator.js';
import { validateTodo } from './validators/todo-validator.js';
import { validateIssues } from './validators/issue-validator.js';
import { validateChangelog } from './validators/changelog-validator.js';
import { validateAll } from './index.js';
import type { ValidationResult, ValidationIssue } from './types/index.js';

const program = new Command();

program
  .name('pkf-validator')
  .description('PKF Validation CLI - validates PKF configuration and documentation')
  .version('1.0.0');

/**
 * Format and print validation results
 */
function printResults(result: ValidationResult, verbose: boolean = false): void {
  const { valid, errors, warnings, info, duration, itemCount } = result;

  // Print header
  if (valid) {
    console.log(chalk.green.bold('\n✓ Validation passed'));
  } else {
    console.log(chalk.red.bold('\n✗ Validation failed'));
  }

  // Print statistics
  const stats: string[] = [];
  if (itemCount !== undefined) {
    stats.push(`${itemCount} item(s) checked`);
  }
  if (duration !== undefined) {
    stats.push(`${duration}ms`);
  }
  if (stats.length > 0) {
    console.log(chalk.dim(`  ${stats.join(' • ')}`));
  }

  // Print issues
  if (errors.length > 0) {
    console.log(chalk.red(`\n${errors.length} error(s):`));
    printIssues(errors, 'red');
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow(`\n${warnings.length} warning(s):`));
    printIssues(warnings, 'yellow');
  }

  if (verbose && info.length > 0) {
    console.log(chalk.blue(`\n${info.length} info:`));
    printIssues(info, 'blue');
  }

  console.log('');
}

/**
 * Print a list of validation issues
 */
function printIssues(issues: ValidationIssue[], color: 'red' | 'yellow' | 'blue'): void {
  const colorFn = chalk[color];

  for (const issue of issues) {
    const location = issue.filePath
      ? issue.line
        ? `${issue.filePath}:${issue.line}`
        : issue.filePath
      : '';

    console.log(colorFn(`  • [${issue.code}] ${issue.message}`));
    if (location) {
      console.log(chalk.dim(`    at ${location}`));
    }
    if (issue.suggestion) {
      console.log(chalk.dim(`    → ${issue.suggestion}`));
    }
  }
}

/**
 * Common options for all validate commands
 */
interface ValidateOptions {
  verbose?: boolean;
  json?: boolean;
}

/**
 * Handle validation result output
 */
function handleResult(result: ValidationResult, options: ValidateOptions): void {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printResults(result, options.verbose);
  }

  // Exit with appropriate code
  process.exit(result.valid ? 0 : 1);
}

// Validate all command
program
  .command('validate')
  .description('Run all validators')
  .option('-v, --verbose', 'Show detailed output including info messages')
  .option('--json', 'Output results as JSON')
  .option('-r, --root <path>', 'Root directory (default: current directory)')
  .action(async (options: ValidateOptions & { root?: string }) => {
    try {
      const rootDir = options.root || process.cwd();
      const result = await validateAll({ rootDir });
      handleResult(result, options);
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exit(2);
    }
  });

// Validate config command
program
  .command('validate:config')
  .description('Validate pkf.config.yaml')
  .option('-v, --verbose', 'Show detailed output')
  .option('--json', 'Output results as JSON')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options: ValidateOptions & { config?: string }) => {
    try {
      const result = await validateConfig({ configPath: options.config });
      handleResult(result, options);
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exit(2);
    }
  });

// Validate TODO command
program
  .command('validate:todo')
  .description('Validate TODO.md register')
  .option('-v, --verbose', 'Show detailed output')
  .option('--json', 'Output results as JSON')
  .option('-f, --file <path>', 'Path to TODO.md file')
  .action(async (options: ValidateOptions & { file?: string }) => {
    try {
      const todoPath = options.file ?? 'docs/registers/TODO.md';
      const result = await validateTodo(todoPath);
      handleResult(result, options);
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exit(2);
    }
  });

// Validate issues command
program
  .command('validate:issues')
  .description('Validate ISSUES.md register')
  .option('-v, --verbose', 'Show detailed output')
  .option('--json', 'Output results as JSON')
  .option('-f, --file <path>', 'Path to ISSUES.md file')
  .action(async (options: ValidateOptions & { file?: string }) => {
    try {
      const issuesPath = options.file ?? 'docs/registers/ISSUES.md';
      const result = await validateIssues(issuesPath);
      handleResult(result, options);
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exit(2);
    }
  });

// Validate changelog command
program
  .command('validate:changelog')
  .description('Validate CHANGELOG.md register')
  .option('-v, --verbose', 'Show detailed output')
  .option('--json', 'Output results as JSON')
  .option('-f, --file <path>', 'Path to CHANGELOG.md file')
  .action(async (options: ValidateOptions & { file?: string }) => {
    try {
      const changelogPath = options.file ?? 'docs/registers/CHANGELOG.md';
      const result = await validateChangelog(changelogPath);
      handleResult(result, options);
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exit(2);
    }
  });

// Parse and execute
program.parse();
