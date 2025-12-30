/**
 * Status Command
 * Shows PKF status in current project
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';

export async function statusCommand(): Promise<void> {
  const cwd = process.cwd();

  console.log(chalk.bold('\nPKF Status\n'));

  // Check initialization
  const configPath = join(cwd, 'pkf.config.yaml');
  const isInitialized = existsSync(configPath);

  if (!isInitialized) {
    console.log(chalk.yellow('⚠ PKF is not initialized in this project\n'));
    console.log(chalk.gray('  Run `pkf init` to get started.\n'));
    return;
  }

  console.log(chalk.green('✓ PKF initialized\n'));

  // Parse config
  try {
    const configContent = readFileSync(configPath, 'utf8');
    const versionMatch = configContent.match(/version:\s*["']?([^"'\n]+)["']?/);
    const nameMatch = configContent.match(/name:\s*["']?([^"'\n]+)["']?/);

    console.log(chalk.bold('Configuration:'));
    console.log(chalk.gray(`  Project: ${nameMatch?.[1] || 'Unknown'}`));
    console.log(chalk.gray(`  Version: ${versionMatch?.[1] || 'Unknown'}`));
    console.log(chalk.gray(`  Config:  ${configPath}`));
    console.log('');
  } catch {
    console.log(chalk.yellow('  Could not parse configuration\n'));
  }

  // Check build artifacts
  const buildDir = join(cwd, '.pkf/generated');
  const structurePath = join(buildDir, 'structure.json');
  const hasBuildArtifacts = existsSync(structurePath);

  console.log(chalk.bold('Build Status:'));
  if (hasBuildArtifacts) {
    const stats = statSync(structurePath);
    const lastBuild = stats.mtime.toLocaleString();
    console.log(chalk.green(`  ✓ Build artifacts present`));
    console.log(chalk.gray(`    Last build: ${lastBuild}`));
  } else {
    console.log(chalk.yellow(`  ⚠ No build artifacts found`));
    console.log(chalk.gray(`    Run \`pkf build\` to generate`));
  }
  console.log('');

  // Check documentation structure
  const docsDir = join(cwd, 'docs');
  const hasDocsDir = existsSync(docsDir);

  console.log(chalk.bold('Documentation:'));
  if (hasDocsDir) {
    const readmePath = join(docsDir, 'README.md');
    const hasReadme = existsSync(readmePath);

    console.log(chalk.green(`  ✓ docs/ directory exists`));
    console.log(hasReadme
      ? chalk.green(`  ✓ docs/README.md present`)
      : chalk.yellow(`  ⚠ docs/README.md missing`));

    // Check registers
    const registersDir = join(docsDir, 'registers');
    if (existsSync(registersDir)) {
      const todo = existsSync(join(registersDir, 'TODO.md'));
      const issues = existsSync(join(registersDir, 'ISSUES.md'));
      const changelog = existsSync(join(registersDir, 'CHANGELOG.md'));

      console.log(chalk.gray(`  Registers:`));
      console.log(todo
        ? chalk.green(`    ✓ TODO.md`)
        : chalk.gray(`    - TODO.md (missing)`));
      console.log(issues
        ? chalk.green(`    ✓ ISSUES.md`)
        : chalk.gray(`    - ISSUES.md (missing)`));
      console.log(changelog
        ? chalk.green(`    ✓ CHANGELOG.md`)
        : chalk.gray(`    - CHANGELOG.md (missing)`));
    }
  } else {
    console.log(chalk.yellow(`  ⚠ docs/ directory not found`));
  }
  console.log('');

  // Check CLAUDE.md
  const claudePath = join(cwd, 'CLAUDE.md');
  const hasClaudeMd = existsSync(claudePath);

  console.log(chalk.bold('AI Integration:'));
  console.log(hasClaudeMd
    ? chalk.green(`  ✓ CLAUDE.md present`)
    : chalk.gray(`  - CLAUDE.md not found (optional)`));
  console.log('');

  // Summary
  console.log(chalk.bold('─'.repeat(40)));
  console.log(chalk.gray('\nRun `pkf validate` for detailed validation.\n'));
}
