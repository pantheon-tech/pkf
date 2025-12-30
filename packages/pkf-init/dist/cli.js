#!/usr/bin/env node
/**
 * PKF Init CLI
 * AI-assisted PKF initialization for existing projects
 */
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
const program = new Command();
program
    .name('pkf-init')
    .description('AI-assisted PKF initialization for existing projects')
    .version('1.0.0');
// Register the init command as the default command
program.addCommand(initCommand, { isDefault: true });
program.parse();
//# sourceMappingURL=cli.js.map