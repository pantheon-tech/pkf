import { Command } from 'commander';
import { buildCommand } from './commands/index.js';

const program = new Command();

program
  .name('pkf-processor')
  .description('PKF Configuration Processor - transforms pkf.config.yaml into validation artifacts')
  .version('1.0.0');

program
  .command('build')
  .description('Process pkf.config.yaml and generate validation artifacts')
  .option('-c, --config <path>', 'Path to pkf.config.yaml', 'pkf.config.yaml')
  .option('-o, --output <dir>', 'Output directory for generated artifacts', '.pkf/generated')
  .option('--strict', 'Enable strict validation mode', false)
  .action(buildCommand);

program
  .command('validate-structure')
  .description('Validate directory structure against generated structure.json')
  .option('-s, --structure <path>', 'Path to structure.json', '.pkf/generated/structure.json')
  .action(() => {
    console.log('Structure validation not yet implemented');
    process.exit(0);
  });

program.parse();
