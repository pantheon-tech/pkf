#!/usr/bin/env node

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
export {
  initCommand
};
//# sourceMappingURL=init-L5WEA2BP.js.map