#!/usr/bin/env node

// src/commands/status.ts
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";
import chalk from "chalk";
async function statusCommand() {
  const cwd = process.cwd();
  console.log(chalk.bold("\nPKF Status\n"));
  const configPath = join(cwd, "pkf.config.yaml");
  const isInitialized = existsSync(configPath);
  if (!isInitialized) {
    console.log(chalk.yellow("\u26A0 PKF is not initialized in this project\n"));
    console.log(chalk.gray("  Run `pkf init` to get started.\n"));
    return;
  }
  console.log(chalk.green("\u2713 PKF initialized\n"));
  try {
    const configContent = readFileSync(configPath, "utf8");
    const versionMatch = configContent.match(/version:\s*["']?([^"'\n]+)["']?/);
    const nameMatch = configContent.match(/name:\s*["']?([^"'\n]+)["']?/);
    console.log(chalk.bold("Configuration:"));
    console.log(chalk.gray(`  Project: ${nameMatch?.[1] || "Unknown"}`));
    console.log(chalk.gray(`  Version: ${versionMatch?.[1] || "Unknown"}`));
    console.log(chalk.gray(`  Config:  ${configPath}`));
    console.log("");
  } catch {
    console.log(chalk.yellow("  Could not parse configuration\n"));
  }
  const buildDir = join(cwd, ".pkf/generated");
  const structurePath = join(buildDir, "structure.json");
  const hasBuildArtifacts = existsSync(structurePath);
  console.log(chalk.bold("Build Status:"));
  if (hasBuildArtifacts) {
    const stats = statSync(structurePath);
    const lastBuild = stats.mtime.toLocaleString();
    console.log(chalk.green(`  \u2713 Build artifacts present`));
    console.log(chalk.gray(`    Last build: ${lastBuild}`));
  } else {
    console.log(chalk.yellow(`  \u26A0 No build artifacts found`));
    console.log(chalk.gray(`    Run \`pkf build\` to generate`));
  }
  console.log("");
  const docsDir = join(cwd, "docs");
  const hasDocsDir = existsSync(docsDir);
  console.log(chalk.bold("Documentation:"));
  if (hasDocsDir) {
    const readmePath = join(docsDir, "README.md");
    const hasReadme = existsSync(readmePath);
    console.log(chalk.green(`  \u2713 docs/ directory exists`));
    console.log(hasReadme ? chalk.green(`  \u2713 docs/README.md present`) : chalk.yellow(`  \u26A0 docs/README.md missing`));
    const registersDir = join(docsDir, "registers");
    if (existsSync(registersDir)) {
      const todo = existsSync(join(registersDir, "TODO.md"));
      const issues = existsSync(join(registersDir, "ISSUES.md"));
      const changelog = existsSync(join(registersDir, "CHANGELOG.md"));
      console.log(chalk.gray(`  Registers:`));
      console.log(todo ? chalk.green(`    \u2713 TODO.md`) : chalk.gray(`    - TODO.md (missing)`));
      console.log(issues ? chalk.green(`    \u2713 ISSUES.md`) : chalk.gray(`    - ISSUES.md (missing)`));
      console.log(changelog ? chalk.green(`    \u2713 CHANGELOG.md`) : chalk.gray(`    - CHANGELOG.md (missing)`));
    }
  } else {
    console.log(chalk.yellow(`  \u26A0 docs/ directory not found`));
  }
  console.log("");
  const claudePath = join(cwd, "CLAUDE.md");
  const hasClaudeMd = existsSync(claudePath);
  console.log(chalk.bold("AI Integration:"));
  console.log(hasClaudeMd ? chalk.green(`  \u2713 CLAUDE.md present`) : chalk.gray(`  - CLAUDE.md not found (optional)`));
  console.log("");
  console.log(chalk.bold("\u2500".repeat(40)));
  console.log(chalk.gray("\nRun `pkf validate` for detailed validation.\n"));
}
export {
  statusCommand
};
//# sourceMappingURL=status-ZOXJYKMG.js.map