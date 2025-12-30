/**
 * PKF CLI - Project Knowledge Framework
 * Unified CLI for documentation management
 */

import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('pkf')
  .description('Project Knowledge Framework - Declarative documentation management')
  .version('1.0.0');

// Init command - scaffolds PKF in a project
program
  .command('init')
  .description('Initialize PKF in the current project')
  .option('-y, --yes', 'Skip prompts and use defaults', false)
  .option('--template <name>', 'Use a specific template (minimal, standard, full)', 'standard')
  .action(async (options) => {
    const { initCommand } = await import('./commands/init.js');
    await initCommand(options);
  });

// Build command - process config and generate artifacts
program
  .command('build')
  .description('Process pkf.config.yaml and generate validation artifacts')
  .option('-c, --config <path>', 'Path to pkf.config.yaml', 'pkf.config.yaml')
  .option('-o, --output <dir>', 'Output directory for generated artifacts', '.pkf/generated')
  .option('--strict', 'Enable strict validation mode', false)
  .action(async (options) => {
    const { buildCommand } = await import('./commands/build.js');
    await buildCommand(options);
  });

// Validate command - run all validations
program
  .command('validate')
  .description('Validate documentation structure and content')
  .option('-c, --config <path>', 'Path to pkf.config.yaml', 'pkf.config.yaml')
  .option('--structure', 'Validate directory structure only', false)
  .option('--content', 'Validate content only (frontmatter, links)', false)
  .option('--fix', 'Attempt to auto-fix issues where possible', false)
  .action(async (options) => {
    const { validateCommand } = await import('./commands/validate.js');
    await validateCommand(options);
  });

// Check command - quick validation check (alias for validate)
program
  .command('check')
  .description('Quick validation check (alias for validate)')
  .action(async () => {
    const { validateCommand } = await import('./commands/validate.js');
    await validateCommand({});
  });

// Status command - show PKF status in current project
program
  .command('status')
  .description('Show PKF status in current project')
  .action(async () => {
    const { statusCommand } = await import('./commands/status.js');
    await statusCommand();
  });

// Add helpful error handling
program.showHelpAfterError('(add --help for additional information)');

// Custom help
program.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.gray('# Initialize PKF in current project')}
  $ pkf init

  ${chalk.gray('# Build validation artifacts')}
  $ pkf build

  ${chalk.gray('# Validate documentation')}
  $ pkf validate

  ${chalk.gray('# Quick status check')}
  $ pkf status

${chalk.bold('Documentation:')}
  https://github.com/pantheon-tech/pkf
`);

program.parse();
