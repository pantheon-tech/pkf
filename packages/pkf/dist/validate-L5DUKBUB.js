#!/usr/bin/env node

// src/commands/validate.ts
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, extname } from "path";
import { execSync } from "child_process";
import chalk from "chalk";
async function validateCommand(options) {
  const cwd = process.cwd();
  const configPath = options.config || "pkf.config.yaml";
  const structurePath = join(cwd, ".pkf/generated/structure.json");
  console.log(chalk.bold("\nPKF Validate\n"));
  if (!existsSync(join(cwd, configPath))) {
    console.log(chalk.red(`\u2717 PKF not initialized in this project`));
    console.log(chalk.gray("  Run `pkf init` to initialize PKF.\n"));
    process.exit(1);
  }
  if (!existsSync(structurePath)) {
    console.log(chalk.yellow("\u26A0 Build artifacts not found. Running build first...\n"));
    const { buildCommand } = await import("./build-65ZDO6PO.js");
    await buildCommand({ config: configPath });
    console.log("");
  }
  const results = [];
  let totalErrors = 0;
  let totalWarnings = 0;
  if (!options.content) {
    console.log(chalk.cyan("Validating structure..."));
    const structureResult = await validateStructure(cwd, structurePath);
    results.push(structureResult);
    totalErrors += structureResult.errors;
    totalWarnings += structureResult.warnings;
  }
  if (!options.structure) {
    console.log(chalk.cyan("Validating content..."));
    const contentResult = await validateContent(cwd);
    results.push(contentResult);
    totalErrors += contentResult.errors;
    totalWarnings += contentResult.warnings;
  }
  console.log(chalk.bold("\nValidation Summary:\n"));
  for (const result of results) {
    const status = result.errors > 0 ? chalk.red("\u2717") : result.warnings > 0 ? chalk.yellow("\u26A0") : chalk.green("\u2713");
    console.log(`${status} ${chalk.bold(result.category)}`);
    console.log(chalk.gray(`  Errors: ${result.errors}, Warnings: ${result.warnings}`));
    for (const msg of result.messages.slice(0, 5)) {
      console.log(chalk.gray(`  - ${msg}`));
    }
    if (result.messages.length > 5) {
      console.log(chalk.gray(`  ... and ${result.messages.length - 5} more`));
    }
    console.log("");
  }
  console.log(chalk.bold("\u2500".repeat(40)));
  if (totalErrors > 0) {
    console.log(chalk.red.bold(`
\u2717 Validation failed`));
    console.log(chalk.gray(`  ${totalErrors} error(s), ${totalWarnings} warning(s)
`));
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(chalk.yellow.bold(`
\u26A0 Validation passed with warnings`));
    console.log(chalk.gray(`  ${totalWarnings} warning(s)
`));
  } else {
    console.log(chalk.green.bold(`
\u2713 All validations passed
`));
  }
}
async function validateStructure(cwd, structurePath) {
  const result = {
    category: "Structure",
    errors: 0,
    warnings: 0,
    messages: []
  };
  const pkfProcessorPaths = [
    join(cwd, "node_modules/.bin/pkf-processor"),
    join(cwd, "node_modules/@pantheon-tech/pkf-processor/dist/cli.js")
  ];
  let pkfProcessorPath = null;
  for (const p of pkfProcessorPaths) {
    if (existsSync(p)) {
      pkfProcessorPath = p;
      break;
    }
  }
  if (pkfProcessorPath) {
    try {
      const isJsFile = pkfProcessorPath.endsWith(".js");
      const command = isJsFile ? `node ${pkfProcessorPath}` : pkfProcessorPath;
      const output = execSync(`${command} validate-structure --structure ${structurePath} 2>&1`, {
        cwd,
        encoding: "utf8"
      });
      const errorsMatch = output.match(/Errors:\s+(\d+)/);
      const warningsMatch = output.match(/Warnings:\s+(\d+)/);
      result.errors = errorsMatch ? parseInt(errorsMatch[1], 10) : 0;
      result.warnings = warningsMatch ? parseInt(warningsMatch[1], 10) : 0;
      const errorLines = output.match(/ERROR \[.*?\] (.*)/g);
      const warningLines = output.match(/WARNING \[.*?\] (.*)/g);
      if (errorLines) {
        result.messages.push(...errorLines.map((l) => l.replace(/ERROR \[.*?\] /, "")));
      }
      if (warningLines) {
        result.messages.push(...warningLines.map((l) => l.replace(/WARNING \[.*?\] /, "")));
      }
    } catch (error) {
      const output = error.stdout || error.stderr || "";
      const errorsMatch = output.match(/Errors:\s+(\d+)/);
      const warningsMatch = output.match(/Warnings:\s+(\d+)/);
      result.errors = errorsMatch ? parseInt(errorsMatch[1], 10) : 1;
      result.warnings = warningsMatch ? parseInt(warningsMatch[1], 10) : 0;
      const errorLines = output.match(/ERROR \[.*?\] (.*)/g);
      if (errorLines) {
        result.messages.push(...errorLines.map((l) => l.replace(/ERROR \[.*?\] /, "")));
      }
    }
  } else {
    const docsDir = join(cwd, "docs");
    if (!existsSync(docsDir)) {
      result.errors++;
      result.messages.push("docs/ directory not found");
    }
    const readmeFile = join(docsDir, "README.md");
    if (existsSync(docsDir) && !existsSync(readmeFile)) {
      result.errors++;
      result.messages.push("docs/README.md not found");
    }
  }
  return result;
}
async function validateContent(cwd) {
  const result = {
    category: "Content",
    errors: 0,
    warnings: 0,
    messages: []
  };
  const docsDir = join(cwd, "docs");
  if (!existsSync(docsDir)) {
    return result;
  }
  const checkDir = (dir) => {
    try {
      const files = readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = join(dir, file.name);
        if (file.isDirectory()) {
          checkDir(filePath);
        } else if (extname(file.name) === ".md") {
          const content = readFileSync(filePath, "utf8");
          const relativePath = filePath.replace(cwd + "/", "");
          if (!content.match(/^#\s+/m)) {
            result.warnings++;
            result.messages.push(`${relativePath}: Missing title heading`);
          }
          if (content.trim().length === 0) {
            result.errors++;
            result.messages.push(`${relativePath}: Empty file`);
          }
          const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
          let match;
          while ((match = linkPattern.exec(content)) !== null) {
            const linkPath = match[2];
            if (!linkPath.startsWith("http") && !linkPath.startsWith("#")) {
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
    }
  };
  checkDir(docsDir);
  return result;
}
export {
  validateCommand
};
//# sourceMappingURL=validate-L5DUKBUB.js.map