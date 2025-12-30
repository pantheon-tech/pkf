/**
 * Validate Command
 * Runs all PKF validations
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn, execSync } from 'node:child_process';
import chalk from 'chalk';

interface ValidateOptions {
  config?: string;
  structure?: boolean;
  content?: boolean;
  fix?: boolean;
}

interface ValidationResult {
  category: string;
  errors: number;
  warnings: number;
  messages: string[];
}

export async function validateCommand(options: ValidateOptions): Promise<void> {
  const cwd = process.cwd();
  const configPath = options.config || 'pkf.config.yaml';
  const structurePath = join(cwd, '.pkf/generated/structure.json');

  console.log(chalk.bold('\nPKF Validate\n'));

  // Check if PKF is initialized
  if (!existsSync(join(cwd, configPath))) {
    console.log(chalk.red(`✗ PKF not initialized in this project`));
    console.log(chalk.gray('  Run `pkf init` to initialize PKF.\n'));
    process.exit(1);
  }

  // Check if build artifacts exist
  if (!existsSync(structurePath)) {
    console.log(chalk.yellow('⚠ Build artifacts not found. Running build first...\n'));
    const { buildCommand } = await import('./build.js');
    await buildCommand({ config: configPath });
    console.log('');
  }

  const results: ValidationResult[] = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  // Run structure validation
  if (!options.content) {
    console.log(chalk.cyan('Validating structure...'));
    const structureResult = await validateStructure(cwd, structurePath);
    results.push(structureResult);
    totalErrors += structureResult.errors;
    totalWarnings += structureResult.warnings;
  }

  // Run content validation
  if (!options.structure) {
    console.log(chalk.cyan('Validating content...'));
    const contentResult = await validateContent(cwd);
    results.push(contentResult);
    totalErrors += contentResult.errors;
    totalWarnings += contentResult.warnings;
  }

  // Print results
  console.log(chalk.bold('\nValidation Summary:\n'));

  for (const result of results) {
    const status = result.errors > 0
      ? chalk.red('✗')
      : result.warnings > 0
        ? chalk.yellow('⚠')
        : chalk.green('✓');

    console.log(`${status} ${chalk.bold(result.category)}`);
    console.log(chalk.gray(`  Errors: ${result.errors}, Warnings: ${result.warnings}`));

    for (const msg of result.messages.slice(0, 5)) {
      console.log(chalk.gray(`  - ${msg}`));
    }

    if (result.messages.length > 5) {
      console.log(chalk.gray(`  ... and ${result.messages.length - 5} more`));
    }
    console.log('');
  }

  // Final status
  console.log(chalk.bold('─'.repeat(40)));
  if (totalErrors > 0) {
    console.log(chalk.red.bold(`\n✗ Validation failed`));
    console.log(chalk.gray(`  ${totalErrors} error(s), ${totalWarnings} warning(s)\n`));
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(chalk.yellow.bold(`\n⚠ Validation passed with warnings`));
    console.log(chalk.gray(`  ${totalWarnings} warning(s)\n`));
  } else {
    console.log(chalk.green.bold(`\n✓ All validations passed\n`));
  }
}

async function validateStructure(cwd: string, structurePath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    category: 'Structure',
    errors: 0,
    warnings: 0,
    messages: [],
  };

  // Find pkf-processor CLI
  const pkfProcessorPaths = [
    join(cwd, 'node_modules/.bin/pkf-processor'),
    join(cwd, 'node_modules/@pantheon-tech/pkf-processor/dist/cli.js'),
  ];

  let pkfProcessorPath: string | null = null;
  for (const p of pkfProcessorPaths) {
    if (existsSync(p)) {
      pkfProcessorPath = p;
      break;
    }
  }

  if (pkfProcessorPath) {
    try {
      const isJsFile = pkfProcessorPath.endsWith('.js');
      const command = isJsFile ? `node ${pkfProcessorPath}` : pkfProcessorPath;

      const output = execSync(`${command} validate-structure --structure ${structurePath} 2>&1`, {
        cwd,
        encoding: 'utf8',
      });

      // Parse output
      const errorsMatch = output.match(/Errors:\s+(\d+)/);
      const warningsMatch = output.match(/Warnings:\s+(\d+)/);

      result.errors = errorsMatch ? parseInt(errorsMatch[1], 10) : 0;
      result.warnings = warningsMatch ? parseInt(warningsMatch[1], 10) : 0;

      // Extract messages
      const errorLines = output.match(/ERROR \[.*?\] (.*)/g);
      const warningLines = output.match(/WARNING \[.*?\] (.*)/g);

      if (errorLines) {
        result.messages.push(...errorLines.map(l => l.replace(/ERROR \[.*?\] /, '')));
      }
      if (warningLines) {
        result.messages.push(...warningLines.map(l => l.replace(/WARNING \[.*?\] /, '')));
      }
    } catch (error: any) {
      const output = error.stdout || error.stderr || '';
      const errorsMatch = output.match(/Errors:\s+(\d+)/);
      const warningsMatch = output.match(/Warnings:\s+(\d+)/);

      result.errors = errorsMatch ? parseInt(errorsMatch[1], 10) : 1;
      result.warnings = warningsMatch ? parseInt(warningsMatch[1], 10) : 0;

      const errorLines = output.match(/ERROR \[.*?\] (.*)/g);
      if (errorLines) {
        result.messages.push(...errorLines.map((l: string) => l.replace(/ERROR \[.*?\] /, '')));
      }
    }
  } else {
    // Fallback: basic structure check
    const docsDir = join(cwd, 'docs');
    if (!existsSync(docsDir)) {
      result.errors++;
      result.messages.push('docs/ directory not found');
    }

    const readmeFile = join(docsDir, 'README.md');
    if (existsSync(docsDir) && !existsSync(readmeFile)) {
      result.errors++;
      result.messages.push('docs/README.md not found');
    }
  }

  return result;
}

async function validateContent(cwd: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    category: 'Content',
    errors: 0,
    warnings: 0,
    messages: [],
  };

  const docsDir = join(cwd, 'docs');
  if (!existsSync(docsDir)) {
    return result;
  }

  // Check markdown files for basic issues
  const checkDir = (dir: string) => {
    try {
      const files = readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = join(dir, file.name);
        if (file.isDirectory()) {
          checkDir(filePath);
        } else if (extname(file.name) === '.md') {
          const content = readFileSync(filePath, 'utf8');
          const relativePath = filePath.replace(cwd + '/', '');

          // Check for title
          if (!content.match(/^#\s+/m)) {
            result.warnings++;
            result.messages.push(`${relativePath}: Missing title heading`);
          }

          // Check for empty file
          if (content.trim().length === 0) {
            result.errors++;
            result.messages.push(`${relativePath}: Empty file`);
          }

          // Check for broken internal links
          const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
          let match;
          while ((match = linkPattern.exec(content)) !== null) {
            const linkPath = match[2];
            if (!linkPath.startsWith('http') && !linkPath.startsWith('#')) {
              const resolvedPath = join(dir, linkPath);
              if (!existsSync(resolvedPath)) {
                result.warnings++;
                result.messages.push(`${relativePath}: Broken link to ${linkPath}`);
              }
            }
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  };

  checkDir(docsDir);

  return result;
}
