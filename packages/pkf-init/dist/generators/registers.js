/**
 * PKF Init Register Initializer
 * Creates the standard register files (TODO, ISSUES, CHANGELOG)
 */
import { writeFile, access } from 'fs/promises';
import { join } from 'path';
/**
 * RegisterInitializer - Creates PKF register files
 */
export class RegisterInitializer {
    registersDir;
    /**
     * Create a new RegisterInitializer
     * @param registersDir - Directory where registers should be created
     */
    constructor(registersDir) {
        this.registersDir = registersDir;
    }
    /**
     * Initialize all register files
     * @returns Information about created and existing files
     */
    async initialize() {
        const created = [];
        const existing = [];
        // Define register files and their content generators
        const registers = [
            ['TODO.md', () => this.createTodo()],
            ['ISSUES.md', () => this.createIssues()],
            ['CHANGELOG.md', () => this.createChangelog()],
        ];
        for (const [filename, contentGenerator] of registers) {
            const filePath = join(this.registersDir, filename);
            try {
                // Check if file exists
                await access(filePath);
                existing.push(filename);
            }
            catch {
                // File doesn't exist, create it
                const content = contentGenerator();
                await writeFile(filePath, content, 'utf-8');
                created.push(filename);
            }
        }
        return { created, existing };
    }
    /**
     * Get current date in YYYY-MM-DD format
     * @returns Formatted date string
     */
    getDate() {
        return new Date().toISOString().split('T')[0];
    }
    /**
     * Create TODO.md content
     * @returns TODO.md template content
     */
    createTodo() {
        const date = this.getDate();
        return `---
title: TODO Register
type: register
created: ${date}
---

# TODO

## Active Tasks

<!-- Add tasks using the format below -->
<!-- ### TODO-001: Task Title
\`\`\`yaml
status: pending
priority: medium
created: YYYY-MM-DD
\`\`\`
Description of the task.
-->

## Completed

<!-- Move completed tasks here -->

---

**Register Version:** 1.0.0
**Last Updated:** ${date}
`;
    }
    /**
     * Create ISSUES.md content
     * @returns ISSUES.md template content
     */
    createIssues() {
        const date = this.getDate();
        return `---
title: Issues Register
type: register
created: ${date}
---

# Issues

## Open Issues

<!-- Add issues using the format below -->
<!-- ### ISSUE-001: Issue Title
\`\`\`yaml
status: open
severity: medium
priority: medium
created: YYYY-MM-DD
\`\`\`
Description of the issue.

**Steps to Reproduce:**
1. Step one
2. Step two

**Expected Behavior:**
What should happen.

**Actual Behavior:**
What actually happens.
-->

## In Progress

<!-- Issues currently being worked on -->

## Resolved

<!-- Resolved issues -->

---

**Register Version:** 1.0.0
**Last Updated:** ${date}
`;
    }
    /**
     * Create CHANGELOG.md content
     * @returns CHANGELOG.md template content
     */
    createChangelog() {
        const date = this.getDate();
        return `---
title: Changelog
type: register
created: ${date}
---

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial PKF structure

### Changed

### Deprecated

### Removed

### Fixed

### Security

---

**Register Version:** 1.0.0
**Last Updated:** ${date}
`;
    }
}
//# sourceMappingURL=registers.js.map