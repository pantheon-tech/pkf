/**
 * PKF Init Interactive Mode Utilities
 * Provides interactive prompts and approval gates for workflow stages
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import type {
  LoadedConfig,
  MigrationTask,
  WorkflowStage,
} from '../types/index.js';

/**
 * Interactive mode handler for PKF initialization workflow
 * Provides approval gates and user interaction at each stage
 */
export class Interactive {
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Show configuration summary and confirm initialization start
   */
  async confirmStart(config: LoadedConfig): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    console.log('');
    console.log(chalk.cyan.bold('PKF Initialization Configuration'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  ${chalk.white('API Tier:')}      ${chalk.yellow(config.apiTier)}`);
    console.log(`  ${chalk.white('Max Cost:')}      ${chalk.yellow('$' + config.maxCost.toFixed(2))}`);
    console.log(`  ${chalk.white('Workers:')}       ${chalk.yellow(config.workers.toString())}`);
    console.log(`  ${chalk.white('Docs Path:')}     ${chalk.yellow(config.docsDir)}`);
    console.log(`  ${chalk.white('Output Path:')}   ${chalk.yellow(config.outputDir)}`);
    console.log(`  ${chalk.white('Backup Path:')}   ${chalk.yellow(config.backupDir)}`);
    console.log(chalk.gray('─'.repeat(40)));
    console.log('');

    const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed with PKF initialization?',
        default: true,
      },
    ]);

    return proceed;
  }

  /**
   * Stage 1 approval: Review and approve generated blueprint
   */
  async approveBlueprint(blueprint: string): Promise<{ approved: boolean; edited?: string }> {
    if (!this.enabled) {
      return { approved: true };
    }

    console.log('');
    console.log(chalk.cyan.bold('Stage 1: Blueprint Review'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.gray('Generated blueprint:'));
    console.log('');
    console.log(this.formatYamlPreview(blueprint));
    console.log('');

    const { action } = await inquirer.prompt<{ action: string }>([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Approve blueprint', value: 'approve' },
          { name: 'Edit blueprint', value: 'edit' },
          { name: 'Cancel initialization', value: 'cancel' },
        ],
      },
    ]);

    if (action === 'cancel') {
      return { approved: false };
    }

    if (action === 'edit') {
      const { edited } = await inquirer.prompt<{ edited: string }>([
        {
          type: 'editor',
          name: 'edited',
          message: 'Edit the blueprint:',
          default: blueprint,
        },
      ]);

      return { approved: true, edited };
    }

    return { approved: true };
  }

  /**
   * Stage 2 approval: Review and approve generated schemas
   */
  async approveSchema(
    schemasYaml: string,
    iterations: number
  ): Promise<{ approved: boolean; edited?: string }> {
    if (!this.enabled) {
      return { approved: true };
    }

    console.log('');
    console.log(chalk.cyan.bold('Stage 2: Schema Review'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  ${chalk.white('Iterations:')} ${chalk.yellow(iterations.toString())}`);
    console.log('');
    console.log(chalk.gray('Generated schemas.yaml:'));
    console.log('');
    console.log(this.formatYamlPreview(schemasYaml));
    console.log('');

    const { action } = await inquirer.prompt<{ action: string }>([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Approve schemas', value: 'approve' },
          { name: 'Edit schemas', value: 'edit' },
          { name: 'Request more iterations', value: 'iterate' },
          { name: 'Cancel initialization', value: 'cancel' },
        ],
      },
    ]);

    if (action === 'cancel') {
      return { approved: false };
    }

    if (action === 'iterate') {
      // Return approved: false to signal more iterations needed
      // but with a special marker in edited field
      return { approved: false, edited: '__REQUEST_MORE_ITERATIONS__' };
    }

    if (action === 'edit') {
      const { edited } = await inquirer.prompt<{ edited: string }>([
        {
          type: 'editor',
          name: 'edited',
          message: 'Edit the schemas:',
          default: schemasYaml,
        },
      ]);

      return { approved: true, edited };
    }

    return { approved: true };
  }

  /**
   * Stage 3 approval: Review and approve directory/file structure
   */
  async approveStructure(structure: { dirs: string[]; files: string[] }): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    console.log('');
    console.log(chalk.cyan.bold('Stage 3: Structure Review'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log('');

    console.log(chalk.white('Directories to create:'));
    if (structure.dirs.length === 0) {
      console.log(chalk.gray('  (none)'));
    } else {
      for (const dir of structure.dirs) {
        console.log(chalk.green(`  + ${dir}`));
      }
    }
    console.log('');

    console.log(chalk.white('Files to create:'));
    if (structure.files.length === 0) {
      console.log(chalk.gray('  (none)'));
    } else {
      for (const file of structure.files) {
        console.log(chalk.green(`  + ${file}`));
      }
    }
    console.log('');

    const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Create this structure?',
        default: true,
      },
    ]);

    return proceed;
  }

  /**
   * Stage 4 approval: Review and approve migration tasks
   */
  async approveMigration(tasks: MigrationTask[]): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    console.log('');
    console.log(chalk.cyan.bold('Stage 4: Migration Review'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  ${chalk.white('Files to migrate:')} ${chalk.yellow(tasks.length.toString())}`);
    console.log('');

    if (tasks.length > 0) {
      console.log(chalk.white('Migration tasks:'));
      const displayTasks = tasks.slice(0, 5);

      for (const task of displayTasks) {
        console.log(
          `  ${chalk.gray(task.sourcePath)} ${chalk.white('->')} ${chalk.green(task.targetPath)}`
        );
        console.log(`    ${chalk.gray(`Type: ${task.docType}`)}`);
      }

      if (tasks.length > 5) {
        console.log(chalk.gray(`  ... and ${tasks.length - 5} more files`));
      }
      console.log('');
    }

    const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed with migration?',
        default: true,
      },
    ]);

    return proceed;
  }

  /**
   * Confirm rollback operation
   */
  async confirmRollback(): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    console.log('');
    console.log(chalk.yellow.bold('Rollback Confirmation'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.yellow('Warning: This will restore files from backup.'));
    console.log(chalk.yellow('Any changes made after the backup will be lost.'));
    console.log('');

    const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Are you sure you want to rollback?',
        default: false,
      },
    ]);

    return proceed;
  }

  /**
   * Prompt user to select which workflow step to start from
   */
  async promptStep(): Promise<WorkflowStage | null> {
    if (!this.enabled) {
      return null;
    }

    console.log('');
    console.log(chalk.cyan.bold('Select Starting Step'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log('');

    const { step } = await inquirer.prompt<{ step: string }>([
      {
        type: 'list',
        name: 'step',
        message: 'Which step would you like to start from?',
        choices: [
          { name: 'Analyzing - Scan and analyze existing documentation', value: 'analyzing' },
          { name: 'Designing - Generate PKF schema design', value: 'designing' },
          { name: 'Implementing - Create directory structure and files', value: 'implementing' },
          { name: 'Migrating - Migrate existing documentation', value: 'migrating' },
          { name: 'Cancel', value: 'cancel' },
        ],
      },
    ]);

    if (step === 'cancel') {
      return null;
    }

    return step as WorkflowStage;
  }

  /**
   * Show progress message with optional progress bar
   */
  async showProgress(
    stage: WorkflowStage,
    message: string,
    progress?: { current: number; total: number }
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const stageLabel = this.getStageLabel(stage);
    let progressStr = '';

    if (progress && progress.total > 0) {
      const percentage = Math.round((progress.current / progress.total) * 100);
      const barLength = 20;
      const filled = Math.round((progress.current / progress.total) * barLength);
      const empty = barLength - filled;
      const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
      progressStr = ` ${bar} ${percentage}% (${progress.current}/${progress.total})`;
    }

    console.log(`${chalk.cyan(`[${stageLabel}]`)} ${message}${progressStr}`);
  }

  /**
   * Format YAML preview with optional line limit
   */
  private formatYamlPreview(yaml: string, maxLines: number = 50): string {
    const lines = yaml.split('\n');
    const displayLines = lines.slice(0, maxLines);
    const formatted = displayLines
      .map((line) => {
        // Colorize YAML syntax
        if (line.match(/^\s*#/)) {
          return chalk.gray(line);
        }
        if (line.match(/^\s*-\s/)) {
          return chalk.white(line);
        }
        if (line.match(/^[a-zA-Z_][a-zA-Z0-9_]*:/)) {
          const [key, ...rest] = line.split(':');
          return chalk.cyan(key) + ':' + chalk.white(rest.join(':'));
        }
        if (line.match(/^\s+[a-zA-Z_][a-zA-Z0-9_]*:/)) {
          const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(.*)/);
          if (match) {
            return match[1] + chalk.cyan(match[2]) + ':' + chalk.white(match[3]);
          }
        }
        return chalk.white(line);
      })
      .join('\n');

    if (lines.length > maxLines) {
      return formatted + '\n' + chalk.gray(`... (${lines.length - maxLines} more lines)`);
    }

    return formatted;
  }

  /**
   * Get human-readable label for workflow stage
   */
  private getStageLabel(stage: WorkflowStage): string {
    const labels: Record<WorkflowStage, string> = {
      not_started: 'Not Started',
      analyzing: 'Analyzing',
      designing: 'Designing',
      implementing: 'Implementing',
      migrating: 'Migrating',
      completed: 'Completed',
      failed: 'Failed',
    };

    return labels[stage] || stage;
  }
}

export default Interactive;
