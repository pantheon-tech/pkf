#!/usr/bin/env node
import {
  validateAll,
  validateChangelog,
  validateConfig,
  validateIssues,
  validateTodo
} from "./chunk-Y7W4M4I3.js";

// src/cli.ts
import { Command } from "commander";
import chalk from "chalk";
var program = new Command();
program.name("pkf-validator").description("PKF Validation CLI - validates PKF configuration and documentation").version("1.0.0");
function printResults(result, verbose = false) {
  const { valid, errors, warnings, info, duration, itemCount } = result;
  if (valid) {
    console.log(chalk.green.bold("\n\u2713 Validation passed"));
  } else {
    console.log(chalk.red.bold("\n\u2717 Validation failed"));
  }
  const stats = [];
  if (itemCount !== void 0) {
    stats.push(`${itemCount} item(s) checked`);
  }
  if (duration !== void 0) {
    stats.push(`${duration}ms`);
  }
  if (stats.length > 0) {
    console.log(chalk.dim(`  ${stats.join(" \u2022 ")}`));
  }
  if (errors.length > 0) {
    console.log(chalk.red(`
${errors.length} error(s):`));
    printIssues(errors, "red");
  }
  if (warnings.length > 0) {
    console.log(chalk.yellow(`
${warnings.length} warning(s):`));
    printIssues(warnings, "yellow");
  }
  if (verbose && info.length > 0) {
    console.log(chalk.blue(`
${info.length} info:`));
    printIssues(info, "blue");
  }
  console.log("");
}
function printIssues(issues, color) {
  const colorFn = chalk[color];
  for (const issue of issues) {
    const location = issue.filePath ? issue.line ? `${issue.filePath}:${issue.line}` : issue.filePath : "";
    console.log(colorFn(`  \u2022 [${issue.code}] ${issue.message}`));
    if (location) {
      console.log(chalk.dim(`    at ${location}`));
    }
    if (issue.suggestion) {
      console.log(chalk.dim(`    \u2192 ${issue.suggestion}`));
    }
  }
}
function handleResult(result, options) {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printResults(result, options.verbose);
  }
  process.exit(result.valid ? 0 : 1);
}
program.command("validate").description("Run all validators").option("-v, --verbose", "Show detailed output including info messages").option("--json", "Output results as JSON").option("-r, --root <path>", "Root directory (default: current directory)").action(async (options) => {
  try {
    const rootDir = options.root || process.cwd();
    const result = await validateAll({ rootDir });
    handleResult(result, options);
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(2);
  }
});
program.command("validate:config").description("Validate pkf.config.yaml").option("-v, --verbose", "Show detailed output").option("--json", "Output results as JSON").option("-c, --config <path>", "Path to config file").action(async (options) => {
  try {
    const result = await validateConfig({ configPath: options.config });
    handleResult(result, options);
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(2);
  }
});
program.command("validate:todo").description("Validate TODO.md register").option("-v, --verbose", "Show detailed output").option("--json", "Output results as JSON").option("-f, --file <path>", "Path to TODO.md file").action(async (options) => {
  try {
    const todoPath = options.file ?? "docs/registers/TODO.md";
    const result = await validateTodo(todoPath);
    handleResult(result, options);
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(2);
  }
});
program.command("validate:issues").description("Validate ISSUES.md register").option("-v, --verbose", "Show detailed output").option("--json", "Output results as JSON").option("-f, --file <path>", "Path to ISSUES.md file").action(async (options) => {
  try {
    const issuesPath = options.file ?? "docs/registers/ISSUES.md";
    const result = await validateIssues(issuesPath);
    handleResult(result, options);
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(2);
  }
});
program.command("validate:changelog").description("Validate CHANGELOG.md register").option("-v, --verbose", "Show detailed output").option("--json", "Output results as JSON").option("-f, --file <path>", "Path to CHANGELOG.md file").action(async (options) => {
  try {
    const changelogPath = options.file ?? "docs/registers/CHANGELOG.md";
    const result = await validateChangelog(changelogPath);
    handleResult(result, options);
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(2);
  }
});
program.parse();
//# sourceMappingURL=cli.js.map