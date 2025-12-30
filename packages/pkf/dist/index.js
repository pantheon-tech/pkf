import {
  buildCommand
} from "./chunk-X4FPCO6W.js";

// src/commands/init.ts
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
var __dirname = dirname(fileURLToPath(import.meta.url));
var TEMPLATES = {
  minimal: {
    description: "Basic PKF setup with essential files only",
    files: ["pkf.config.yaml", "docs/README.md", "docs/registers/TODO.md"]
  },
  standard: {
    description: "Standard PKF setup with guides and registers",
    files: [
      "pkf.config.yaml",
      "CLAUDE.md",
      "docs/README.md",
      "docs/INDEX",
      "docs/guides/README.md",
      "docs/registers/README.md",
      "docs/registers/TODO.md",
      "docs/registers/ISSUES.md",
      "docs/registers/CHANGELOG.md"
    ]
  },
  full: {
    description: "Full PKF setup with all directories and lifecycle support",
    files: [
      "pkf.config.yaml",
      "CLAUDE.md",
      "docs/README.md",
      "docs/INDEX",
      "docs/guides/README.md",
      "docs/guides/INDEX",
      "docs/architecture/README.md",
      "docs/architecture/active/README.md",
      "docs/architecture/archived/README.md",
      "docs/proposals/README.md",
      "docs/proposals/draft/README.md",
      "docs/proposals/active/README.md",
      "docs/proposals/archived/README.md",
      "docs/registers/README.md",
      "docs/registers/TODO.md",
      "docs/registers/ISSUES.md",
      "docs/registers/CHANGELOG.md"
    ]
  }
};
async function initCommand(options) {
  const template = options.template || "standard";
  const cwd = process.cwd();
  console.log(chalk.bold("\nPKF - Project Knowledge Framework\n"));
  if (existsSync(join(cwd, "pkf.config.yaml"))) {
    console.log(chalk.yellow("\u26A0 PKF is already initialized in this project."));
    console.log(chalk.gray("  To reinitialize, remove pkf.config.yaml first.\n"));
    return;
  }
  console.log(chalk.cyan(`Initializing PKF with ${chalk.bold(template)} template...
`));
  console.log(chalk.gray(`  ${TEMPLATES[template].description}
`));
  const files = TEMPLATES[template].files;
  let created = 0;
  for (const file of files) {
    const filePath = join(cwd, file);
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (!existsSync(filePath)) {
      const content = getTemplateContent(file, cwd);
      writeFileSync(filePath, content);
      console.log(chalk.green(`  \u2713 Created ${file}`));
      created++;
    } else {
      console.log(chalk.gray(`  - Skipped ${file} (already exists)`));
    }
  }
  console.log(chalk.bold.green(`
\u2713 PKF initialized successfully!`));
  console.log(chalk.gray(`  Created ${created} files
`));
  console.log(chalk.bold("Next steps:"));
  console.log(chalk.gray("  1. Edit pkf.config.yaml to customize your documentation structure"));
  console.log(chalk.gray("  2. Run `pkf build` to generate validation artifacts"));
  console.log(chalk.gray("  3. Run `pkf validate` to check your documentation\n"));
}
function getTemplateContent(file, cwd) {
  const projectName = cwd.split("/").pop() || "my-project";
  if (file === "pkf.config.yaml") {
    return `# PKF Configuration
# Documentation: https://github.com/anthropics/pkf

version: "1.0.0"

project:
  name: ${projectName}
  description: Project documentation

output:
  dir: .pkf/generated

docs:
  _type: root
  _readme: true
  _index: true

  guides:
    _type: section
    _readme: true

  registers:
    _type: registers
    _readme: true
    _items:
      TODO.md:
        _schema: todo-item
      ISSUES.md:
        _schema: issue-item
      CHANGELOG.md:
        _schema: changelog-entry
`;
  }
  if (file === "CLAUDE.md") {
    return `# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Project:** ${projectName}
**Version:** 1.0.0
**Status:** Active

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Run validation
npx pkf validate
\`\`\`

## Key Files

- \`pkf.config.yaml\` - PKF configuration
- \`docs/\` - Documentation root

## Registers

- \`docs/registers/TODO.md\` - Pending tasks
- \`docs/registers/ISSUES.md\` - Known issues
- \`docs/registers/CHANGELOG.md\` - Version history

---

**Last Updated:** ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
`;
  }
  if (file === "docs/README.md") {
    return `# ${projectName} Documentation

Welcome to the ${projectName} documentation.

## Contents

- [Guides](./guides/) - How-to guides and tutorials
- [Registers](./registers/) - TODO, ISSUES, CHANGELOG

## Quick Links

- [TODO](./registers/TODO.md) - Current tasks
- [CHANGELOG](./registers/CHANGELOG.md) - Version history

---

**Last Updated:** ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
`;
  }
  if (file === "docs/INDEX") {
    return `# Documentation Index

README.md: Documentation hub
guides/: How-to guides and tutorials
registers/: Project registers (TODO, ISSUES, CHANGELOG)
`;
  }
  if (file.includes("registers/TODO.md")) {
    return `# TODO

## Quick Stats

- **Total Items:** 0
- **Pending:** 0
- **In Progress:** 0
- **Completed:** 0

## Pending

_No pending items._

## In Progress

_No items in progress._

## Completed

_No completed items._

---

**Last Updated:** ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
`;
  }
  if (file.includes("registers/ISSUES.md")) {
    return `# Known Issues

## Quick Stats

- **Total Issues:** 0
- **Open:** 0
- **Resolved:** 0

## Open Issues

_No open issues._

## Resolved Issues

_No resolved issues._

---

**Last Updated:** ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
`;
  }
  if (file.includes("registers/CHANGELOG.md")) {
    return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Initial project setup
- PKF documentation framework

---

**Last Updated:** ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
`;
  }
  if (file.includes("README.md")) {
    const section = file.split("/")[1];
    return `# ${section.charAt(0).toUpperCase() + section.slice(1)}

This directory contains ${section} documentation.

---

**Last Updated:** ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
`;
  }
  if (file.includes("INDEX")) {
    return `# Index

README.md: Section overview
`;
  }
  return `# ${file}

Placeholder content.
`;
}

// src/commands/validate.ts
import { existsSync as existsSync2, readFileSync, readdirSync } from "fs";
import { join as join2, extname } from "path";
import { execSync } from "child_process";
import chalk2 from "chalk";
async function validateCommand(options) {
  const cwd = process.cwd();
  const configPath = options.config || "pkf.config.yaml";
  const structurePath = join2(cwd, ".pkf/generated/structure.json");
  console.log(chalk2.bold("\nPKF Validate\n"));
  if (!existsSync2(join2(cwd, configPath))) {
    console.log(chalk2.red(`\u2717 PKF not initialized in this project`));
    console.log(chalk2.gray("  Run `pkf init` to initialize PKF.\n"));
    process.exit(1);
  }
  if (!existsSync2(structurePath)) {
    console.log(chalk2.yellow("\u26A0 Build artifacts not found. Running build first...\n"));
    const { buildCommand: buildCommand2 } = await import("./build-ZV6H5Z3A.js");
    await buildCommand2({ config: configPath });
    console.log("");
  }
  const results = [];
  let totalErrors = 0;
  let totalWarnings = 0;
  if (!options.content) {
    console.log(chalk2.cyan("Validating structure..."));
    const structureResult = await validateStructure(cwd, structurePath);
    results.push(structureResult);
    totalErrors += structureResult.errors;
    totalWarnings += structureResult.warnings;
  }
  if (!options.structure) {
    console.log(chalk2.cyan("Validating content..."));
    const contentResult = await validateContent(cwd);
    results.push(contentResult);
    totalErrors += contentResult.errors;
    totalWarnings += contentResult.warnings;
  }
  console.log(chalk2.bold("\nValidation Summary:\n"));
  for (const result of results) {
    const status = result.errors > 0 ? chalk2.red("\u2717") : result.warnings > 0 ? chalk2.yellow("\u26A0") : chalk2.green("\u2713");
    console.log(`${status} ${chalk2.bold(result.category)}`);
    console.log(chalk2.gray(`  Errors: ${result.errors}, Warnings: ${result.warnings}`));
    for (const msg of result.messages.slice(0, 5)) {
      console.log(chalk2.gray(`  - ${msg}`));
    }
    if (result.messages.length > 5) {
      console.log(chalk2.gray(`  ... and ${result.messages.length - 5} more`));
    }
    console.log("");
  }
  console.log(chalk2.bold("\u2500".repeat(40)));
  if (totalErrors > 0) {
    console.log(chalk2.red.bold(`
\u2717 Validation failed`));
    console.log(chalk2.gray(`  ${totalErrors} error(s), ${totalWarnings} warning(s)
`));
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(chalk2.yellow.bold(`
\u26A0 Validation passed with warnings`));
    console.log(chalk2.gray(`  ${totalWarnings} warning(s)
`));
  } else {
    console.log(chalk2.green.bold(`
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
    join2(cwd, "node_modules/.bin/pkf-processor"),
    join2(cwd, "node_modules/@pantheon-tech/pkf-processor/dist/cli.js")
  ];
  let pkfProcessorPath = null;
  for (const p of pkfProcessorPaths) {
    if (existsSync2(p)) {
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
    const docsDir = join2(cwd, "docs");
    if (!existsSync2(docsDir)) {
      result.errors++;
      result.messages.push("docs/ directory not found");
    }
    const readmeFile = join2(docsDir, "README.md");
    if (existsSync2(docsDir) && !existsSync2(readmeFile)) {
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
  const docsDir = join2(cwd, "docs");
  if (!existsSync2(docsDir)) {
    return result;
  }
  const checkDir = (dir) => {
    try {
      const files = readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = join2(dir, file.name);
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
              const resolvedPath = join2(dir, linkPath);
              if (!existsSync2(resolvedPath)) {
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

// src/commands/status.ts
import { existsSync as existsSync3, readFileSync as readFileSync2, statSync } from "fs";
import { join as join3 } from "path";
import chalk3 from "chalk";
async function statusCommand() {
  const cwd = process.cwd();
  console.log(chalk3.bold("\nPKF Status\n"));
  const configPath = join3(cwd, "pkf.config.yaml");
  const isInitialized = existsSync3(configPath);
  if (!isInitialized) {
    console.log(chalk3.yellow("\u26A0 PKF is not initialized in this project\n"));
    console.log(chalk3.gray("  Run `pkf init` to get started.\n"));
    return;
  }
  console.log(chalk3.green("\u2713 PKF initialized\n"));
  try {
    const configContent = readFileSync2(configPath, "utf8");
    const versionMatch = configContent.match(/version:\s*["']?([^"'\n]+)["']?/);
    const nameMatch = configContent.match(/name:\s*["']?([^"'\n]+)["']?/);
    console.log(chalk3.bold("Configuration:"));
    console.log(chalk3.gray(`  Project: ${nameMatch?.[1] || "Unknown"}`));
    console.log(chalk3.gray(`  Version: ${versionMatch?.[1] || "Unknown"}`));
    console.log(chalk3.gray(`  Config:  ${configPath}`));
    console.log("");
  } catch {
    console.log(chalk3.yellow("  Could not parse configuration\n"));
  }
  const buildDir = join3(cwd, ".pkf/generated");
  const structurePath = join3(buildDir, "structure.json");
  const hasBuildArtifacts = existsSync3(structurePath);
  console.log(chalk3.bold("Build Status:"));
  if (hasBuildArtifacts) {
    const stats = statSync(structurePath);
    const lastBuild = stats.mtime.toLocaleString();
    console.log(chalk3.green(`  \u2713 Build artifacts present`));
    console.log(chalk3.gray(`    Last build: ${lastBuild}`));
  } else {
    console.log(chalk3.yellow(`  \u26A0 No build artifacts found`));
    console.log(chalk3.gray(`    Run \`pkf build\` to generate`));
  }
  console.log("");
  const docsDir = join3(cwd, "docs");
  const hasDocsDir = existsSync3(docsDir);
  console.log(chalk3.bold("Documentation:"));
  if (hasDocsDir) {
    const readmePath = join3(docsDir, "README.md");
    const hasReadme = existsSync3(readmePath);
    console.log(chalk3.green(`  \u2713 docs/ directory exists`));
    console.log(hasReadme ? chalk3.green(`  \u2713 docs/README.md present`) : chalk3.yellow(`  \u26A0 docs/README.md missing`));
    const registersDir = join3(docsDir, "registers");
    if (existsSync3(registersDir)) {
      const todo = existsSync3(join3(registersDir, "TODO.md"));
      const issues = existsSync3(join3(registersDir, "ISSUES.md"));
      const changelog = existsSync3(join3(registersDir, "CHANGELOG.md"));
      console.log(chalk3.gray(`  Registers:`));
      console.log(todo ? chalk3.green(`    \u2713 TODO.md`) : chalk3.gray(`    - TODO.md (missing)`));
      console.log(issues ? chalk3.green(`    \u2713 ISSUES.md`) : chalk3.gray(`    - ISSUES.md (missing)`));
      console.log(changelog ? chalk3.green(`    \u2713 CHANGELOG.md`) : chalk3.gray(`    - CHANGELOG.md (missing)`));
    }
  } else {
    console.log(chalk3.yellow(`  \u26A0 docs/ directory not found`));
  }
  console.log("");
  const claudePath = join3(cwd, "CLAUDE.md");
  const hasClaudeMd = existsSync3(claudePath);
  console.log(chalk3.bold("AI Integration:"));
  console.log(hasClaudeMd ? chalk3.green(`  \u2713 CLAUDE.md present`) : chalk3.gray(`  - CLAUDE.md not found (optional)`));
  console.log("");
  console.log(chalk3.bold("\u2500".repeat(40)));
  console.log(chalk3.gray("\nRun `pkf validate` for detailed validation.\n"));
}
export {
  buildCommand,
  initCommand,
  statusCommand,
  validateCommand
};
//# sourceMappingURL=index.js.map