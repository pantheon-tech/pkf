/**
 * Build Command
 * Wraps pkf-processor build functionality
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import chalk from 'chalk';

interface BuildOptions {
  config?: string;
  output?: string;
  strict?: boolean;
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  const cwd = process.cwd();
  const configPath = options.config || 'pkf.config.yaml';
  const outputDir = options.output || '.pkf/generated';

  console.log(chalk.bold('\nPKF Build\n'));

  // Check if config exists
  if (!existsSync(join(cwd, configPath))) {
    console.log(chalk.red(`✗ Configuration file not found: ${configPath}`));
    console.log(chalk.gray('  Run `pkf init` to initialize PKF in this project.\n'));
    process.exit(1);
  }

  console.log(chalk.gray(`Config: ${configPath}`));
  console.log(chalk.gray(`Output: ${outputDir}\n`));

  // Find pkf-processor CLI
  const pkfProcessorPaths = [
    join(cwd, 'node_modules/.bin/pkf-processor'),
    join(cwd, 'node_modules/@pantheon-tech/pkf-processor/dist/cli.js'),
    'pkf-processor',
  ];

  let pkfProcessorPath: string | null = null;
  for (const p of pkfProcessorPaths) {
    if (existsSync(p) || p === 'pkf-processor') {
      pkfProcessorPath = p;
      break;
    }
  }

  if (!pkfProcessorPath) {
    console.log(chalk.red('✗ pkf-processor not found'));
    console.log(chalk.gray('  Install with: npm install @pantheon-tech/pkf-processor\n'));
    process.exit(1);
  }

  const args = [
    'build',
    '--config', join(cwd, configPath),
    '--output', join(cwd, outputDir),
  ];

  if (options.strict) {
    args.push('--strict');
  }

  // Use node to run the CLI if it's a .js file
  const isJsFile = pkfProcessorPath.endsWith('.js');
  const command = isJsFile ? 'node' : pkfProcessorPath;
  const cmdArgs = isJsFile ? [pkfProcessorPath, ...args] : args;

  return new Promise((resolve, reject) => {
    const proc = spawn(command, cmdArgs, {
      stdio: 'inherit',
      cwd,
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        process.exit(code || 1);
      }
      resolve();
    });

    proc.on('error', (err) => {
      console.log(chalk.red('✗ Failed to run pkf-processor'));
      console.log(chalk.gray(`  Error: ${err.message}\n`));
      process.exit(1);
    });
  });
}
