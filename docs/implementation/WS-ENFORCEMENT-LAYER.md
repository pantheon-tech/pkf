# Implementation Plan: PKF Enforcement Layer

**Workstream ID:** WS-ENF
**Status:** Draft
**Created:** 2025-12-27
**Architecture Reference:** [PKF-ARCHITECTURE.md](/mnt/devbox/skip/project/pkf/docs/architecture/PKF-ARCHITECTURE.md) Section 9

---

## 1. Overview

The Enforcement Layer is the critical infrastructure that makes PKF useful. Without enforcement, documentation frameworks inevitably drift. This workstream implements the three-layer enforcement model:

1. **IDE Layer** - Real-time feedback via VS Code extensions
2. **Pre-commit Layer** - Local gate via husky + lint-staged
3. **CI/CD Layer** - Remote gate via GitHub Actions

### Scope

Per PKF Architecture Section 9, this workstream covers:

- Package.json scripts (`pkf:*` commands)
- Remark configuration for frontmatter validation
- Vale configuration for prose linting
- Pre-commit hooks with husky + lint-staged
- GitHub Actions workflow for CI/CD validation
- Structure validator (`pkf-processor validate-structure`)

### Out of Scope

- pkf-processor core implementation (separate workstream)
- Filing Agent (Section 10)
- IDE extension development (future enhancement)

---

## 2. Verified APIs and Tool Versions

Per PKF Architecture Appendix C.1, all tools must meet health criteria:

| Tool | Version | npm Package | Purpose |
|------|---------|-------------|---------|
| Node.js | >=20.x | - | Runtime |
| ajv-cli | 5.x | `ajv-cli` | JSON Schema validation |
| remark-cli | 12.x | `remark-cli` | Markdown processing |
| remark-frontmatter | 5.x | `remark-frontmatter` | YAML frontmatter parsing |
| remark-lint-frontmatter-schema | 4.x | `remark-lint-frontmatter-schema` | Frontmatter schema validation |
| remark-validate-links | 13.x | `remark-validate-links` | Internal link checking |
| Vale | 3.x | `@vscode/vale` (or system install) | Prose linting |
| husky | 9.x | `husky` | Git hooks |
| lint-staged | 15.x | `lint-staged` | Staged file linting |
| npm-run-all2 | 6.x | `npm-run-all2` | Script orchestration |

---

## 3. Task Breakdown

### WS-ENF-T001: Package.json Scripts Setup

**Task ID:** WS-ENF-T001
**Name:** Configure npm scripts for PKF validation
**Description:** Set up all `pkf:*` scripts in package.json per Section 9.3
**Dependencies:** None
**Complexity:** S (1-2 hours)

**File Structure:**
```
package.json (create or update)
```

**Implementation Pattern:**
```json
{
  "scripts": {
    "pkf:build": "pkf-processor build",
    "pkf:validate": "npm-run-all pkf:validate:*",
    "pkf:validate:config": "ajv validate -s .pkf/generated/pkf-config.schema.json -d pkf.config.yaml --spec=draft2020",
    "pkf:validate:structure": "pkf-processor validate-structure",
    "pkf:validate:frontmatter": "remark docs/ --frail --quiet",
    "pkf:validate:links": "remark docs/ --use remark-validate-links --frail --quiet",
    "pkf:validate:prose": "vale docs/",
    "prepare": "husky"
  },
  "devDependencies": {
    "ajv-cli": "^5.0.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "npm-run-all2": "^6.0.0",
    "remark-cli": "^12.0.0",
    "remark-frontmatter": "^5.0.0",
    "remark-lint-frontmatter-schema": "^4.0.0",
    "remark-validate-links": "^13.0.0"
  },
  "lint-staged": {
    "pkf.config.yaml": "ajv validate -s .pkf/generated/pkf-config.schema.json -d",
    "docs/**/*.md": ["remark --frail --quiet", "vale"]
  }
}
```

**Acceptance Criteria:**
- [ ] All `pkf:*` scripts defined and executable
- [ ] `npm run pkf:validate` runs all validation sub-scripts
- [ ] `npm run pkf:build` generates artifacts to `.pkf/generated/`
- [ ] `prepare` script initializes husky on `npm install`
- [ ] lint-staged configuration validates staged files only
- [ ] Exit codes properly propagate (0 = success, non-zero = failure)

**Integration Test:**
```bash
# Verify scripts are callable
npm run pkf:validate --dry-run
npm run pkf:build --dry-run
```

---

### WS-ENF-T002: Remark Configuration

**Task ID:** WS-ENF-T002
**Name:** Configure remark for frontmatter validation
**Description:** Create .remarkrc.mjs with schema-based frontmatter validation per Section 9.4
**Dependencies:** WS-ENF-T001 (devDependencies installed)
**Complexity:** M (2-4 hours)

**File Structure:**
```
.remarkrc.mjs (create)
```

**Implementation Pattern:**
```javascript
// .remarkrc.mjs
import remarkFrontmatter from 'remark-frontmatter';
import remarkLintFrontmatterSchema from 'remark-lint-frontmatter-schema';
import remarkValidateLinks from 'remark-validate-links';

const remarkConfig = {
  plugins: [
    remarkFrontmatter,
    [
      remarkLintFrontmatterSchema,
      {
        schemas: {
          // Proposals use proposal schema
          'docs/proposals/**/*.md': './.pkf/generated/schemas/proposal.schema.json',
          // Architecture docs use architecture schema
          'docs/architecture/**/*.md': './.pkf/generated/schemas/architecture-doc.schema.json',
          // Registers use their respective schemas
          'docs/registers/TODO.md': './.pkf/generated/schemas/todo-item.schema.json',
          'docs/registers/ISSUES.md': './.pkf/generated/schemas/issue-item.schema.json',
          'docs/registers/CHANGELOG.md': './.pkf/generated/schemas/changelog-entry.schema.json',
        },
      },
    ],
    remarkValidateLinks,
  ],
};

export default remarkConfig;
```

**Acceptance Criteria:**
- [ ] `.remarkrc.mjs` created with ESM syntax
- [ ] All document types mapped to correct schemas
- [ ] Glob patterns match actual directory structure
- [ ] Schema paths point to generated artifacts
- [ ] `remark docs/ --frail` reports frontmatter errors
- [ ] `remark docs/ --use remark-validate-links` reports broken links

**Integration Test:**
```bash
# Create a test file with invalid frontmatter
echo '---
status: invalid-status
---
# Test' > docs/test-invalid.md

# Should fail validation
npm run pkf:validate:frontmatter && echo "FAIL: Should have errored" || echo "PASS: Correctly errored"

# Cleanup
rm docs/test-invalid.md
```

---

### WS-ENF-T003: Vale Configuration

**Task ID:** WS-ENF-T003
**Name:** Configure Vale for prose linting
**Description:** Create .vale.ini and style configurations per Section 9.5
**Dependencies:** None
**Complexity:** M (2-4 hours)

**File Structure:**
```
.vale.ini (create)
.vale/
  styles/
    config/
      vocabularies/
        PKF/
          accept.txt
          reject.txt
```

**Implementation Pattern:**

```ini
# .vale.ini
StylesPath = .vale/styles

MinAlertLevel = suggestion

# Use official Vale packages
Packages = Microsoft, write-good

# Apply to all markdown files in docs/
[docs/*.md]
BasedOnStyles = Vale, Microsoft, write-good

# Architecture documents - allow technical terms
[docs/architecture/*.md]
TokenIgnores = PKF, OAF, YAML, JSON, frontmatter, CLI, npm, ajv, remark, husky, lint-staged, GitHub, CI/CD

# Proposals - allow technical terms
[docs/proposals/*.md]
TokenIgnores = PKF, OAF, YAML, JSON, frontmatter, CLI, npm

# Registers - lighter touch
[docs/registers/*.md]
BasedOnStyles = Vale
# Disable some rules for register files
Microsoft.Headings = NO
```

**Vocabulary Files:**

```txt
# .vale/styles/config/vocabularies/PKF/accept.txt
PKF
OAF
frontmatter
YAML
JSON
CLI
npm
ajv
remark
husky
lint-staged
GitHub
CI/CD
```

```txt
# .vale/styles/config/vocabularies/PKF/reject.txt
# Words to flag as errors
todo
fixme
```

**Acceptance Criteria:**
- [ ] `.vale.ini` created with correct syntax
- [ ] Vale packages (Microsoft, write-good) installed via `vale sync`
- [ ] Custom vocabulary configured for PKF terminology
- [ ] Different rules applied per directory
- [ ] `vale docs/` runs without configuration errors
- [ ] Known good docs pass, known bad docs fail

**Integration Test:**
```bash
# Install Vale packages
vale sync

# Test prose linting
vale docs/

# Test with intentionally bad prose
echo "This sentence is really really bad and has got lots of passive voice." > docs/test-prose.md
vale docs/test-prose.md && echo "FAIL: Should have warnings" || echo "PASS: Correctly warned"
rm docs/test-prose.md
```

---

### WS-ENF-T004: Husky Pre-commit Hooks

**Task ID:** WS-ENF-T004
**Name:** Configure husky pre-commit hooks
**Description:** Set up husky + lint-staged for local validation per Section 9.3
**Dependencies:** WS-ENF-T001, WS-ENF-T002, WS-ENF-T003
**Complexity:** S (1-2 hours)

**File Structure:**
```
.husky/
  pre-commit (create)
```

**Implementation Pattern:**

```bash
#!/usr/bin/env sh
# .husky/pre-commit

# Exit on error
set -e

# Run lint-staged on staged files only (fast)
npx lint-staged
```

**lint-staged Configuration (in package.json):**
```json
{
  "lint-staged": {
    "pkf.config.yaml": [
      "ajv validate -s .pkf/generated/pkf-config.schema.json -d"
    ],
    "docs/**/*.md": [
      "remark --frail --quiet",
      "vale"
    ]
  }
}
```

**Installation Commands:**
```bash
# Initialize husky
npx husky init

# Create pre-commit hook
echo '#!/usr/bin/env sh
set -e
npx lint-staged' > .husky/pre-commit

# Make executable
chmod +x .husky/pre-commit
```

**Acceptance Criteria:**
- [ ] `.husky/` directory created and committed
- [ ] `pre-commit` hook is executable
- [ ] `npm install` automatically sets up hooks via `prepare` script
- [ ] Staged markdown files trigger validation
- [ ] Staged pkf.config.yaml triggers schema validation
- [ ] Invalid files block commit with clear error message
- [ ] Valid files allow commit to proceed

**Integration Test:**
```bash
# Test the hook manually
echo '---
invalid: true
---
# Bad Doc' > docs/test-hook.md
git add docs/test-hook.md

# This should fail
git commit -m "test" && echo "FAIL: Hook should have blocked" || echo "PASS: Hook blocked correctly"

# Cleanup
git reset HEAD docs/test-hook.md
rm docs/test-hook.md
```

---

### WS-ENF-T005: GitHub Actions Workflow

**Task ID:** WS-ENF-T005
**Name:** Create GitHub Actions CI workflow
**Description:** Implement CI/CD validation workflow per Section 9.6
**Dependencies:** WS-ENF-T001, WS-ENF-T002, WS-ENF-T003
**Complexity:** M (2-4 hours)

**File Structure:**
```
.github/
  workflows/
    pkf-validate.yml (create)
```

**Implementation Pattern:**

```yaml
# .github/workflows/pkf-validate.yml
name: PKF Validation

on:
  pull_request:
    paths:
      - 'docs/**'
      - 'pkf.config.yaml'
      - 'pkf/**'
      - '.remarkrc.mjs'
      - '.vale.ini'
  push:
    branches:
      - main
    paths:
      - 'docs/**'
      - 'pkf.config.yaml'
      - 'pkf/**'

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for remark-validate-links

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build PKF artifacts
        run: npm run pkf:build

      - name: Validate PKF Configuration
        run: npm run pkf:validate:config

      - name: Validate Directory Structure
        run: npm run pkf:validate:structure

      - name: Validate Frontmatter Schemas
        run: npm run pkf:validate:frontmatter

      - name: Validate Internal Links
        run: npm run pkf:validate:links

      - name: Install Vale
        uses: errata-ai/vale-action@v2
        with:
          version: '3.0.0'
          reporter: github-pr-check
        # Only run on PRs for inline annotations
        if: github.event_name == 'pull_request'

      - name: Validate Prose (CLI)
        run: npm run pkf:validate:prose
        continue-on-error: true  # Prose is advisory, not blocking

      - name: Summary
        if: always()
        run: |
          echo "## PKF Validation Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Check | Status |" >> $GITHUB_STEP_SUMMARY
          echo "|-------|--------|" >> $GITHUB_STEP_SUMMARY
          echo "| Configuration | ${{ steps.config.outcome || 'passed' }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Structure | ${{ steps.structure.outcome || 'passed' }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Frontmatter | ${{ steps.frontmatter.outcome || 'passed' }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Links | ${{ steps.links.outcome || 'passed' }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Prose | advisory |" >> $GITHUB_STEP_SUMMARY
```

**Acceptance Criteria:**
- [ ] Workflow file created with valid YAML syntax
- [ ] Triggers on PR to docs paths
- [ ] Triggers on push to main for docs paths
- [ ] All validation steps run in correct order
- [ ] pkf:build runs before validation steps
- [ ] Prose validation is non-blocking (continue-on-error)
- [ ] Job summary provides clear status table
- [ ] Vale action provides PR annotations for prose issues

**Integration Test:**
```bash
# Validate workflow syntax
npx yaml-lint .github/workflows/pkf-validate.yml

# Test locally with act (optional)
# act pull_request -W .github/workflows/pkf-validate.yml
```

---

### WS-ENF-T006: Structure Validator Command

**Task ID:** WS-ENF-T006
**Name:** Implement structure validation in pkf-processor
**Description:** Add `validate-structure` command to pkf-processor per Section 9.2
**Dependencies:** pkf-processor core (separate workstream)
**Complexity:** L (4-8 hours)

**Note:** This task depends on pkf-processor being implemented. It defines the interface and expected behavior.

**File Structure:**
```
packages/pkf-processor/
  src/
    commands/
      validate-structure.ts (create)
    validators/
      structure-validator.ts (create)
      structure-rules.ts (create)
```

**Implementation Pattern:**

```typescript
// packages/pkf-processor/src/commands/validate-structure.ts
import { z } from 'zod';
import { Result, ok, err } from '@pkf/utils';

export interface StructureValidationResult {
  valid: boolean;
  errors: StructureError[];
  warnings: StructureWarning[];
}

export interface StructureError {
  type: 'missing_file' | 'invalid_location' | 'naming_violation' | 'readme_required';
  path: string;
  expected?: string;
  message: string;
  rule: string;
}

export interface StructureWarning {
  type: 'deprecated_location' | 'recommended_readme';
  path: string;
  message: string;
}

/**
 * Validates directory structure against pkf.config.yaml tree definition.
 *
 * Checks:
 * 1. Required files exist (README.md where _readme: true)
 * 2. Files are in correct locations per _type definitions
 * 3. File naming matches _naming patterns
 * 4. No files exist outside defined tree (if strict mode)
 */
export async function validateStructure(
  configPath: string = 'pkf.config.yaml',
  options: { strict?: boolean } = {}
): Promise<Result<StructureValidationResult, Error>> {
  // Implementation details...
}
```

**Expected Error Output (per Section 9.7):**
```
PKF Structure Validation Failed:

ERROR: Missing required file
  Expected: docs/architecture/README.md
  Location: docs/architecture/
  Rule: section nodes require README.md when _readme: true

ERROR: Invalid file location
  File: docs/proposals/P05-feature.md
  Expected: docs/proposals/draft/ or docs/proposals/active/
  Reason: Proposals must be in a lifecycle state directory

1 error(s), 0 warning(s)
```

**Acceptance Criteria:**
- [ ] `pkf-processor validate-structure` command exists
- [ ] Reads pkf.config.yaml and parses tree structure
- [ ] Checks README.md existence where `_readme: true`
- [ ] Validates file locations against `_type` definitions
- [ ] Validates naming against `_naming` patterns
- [ ] Reports errors in format per Section 9.7
- [ ] Exit code 0 on success, 1 on failure
- [ ] Supports `--strict` flag for additional checks

**Integration Test:**
```bash
# Test with valid structure
npm run pkf:validate:structure

# Test error detection
mkdir -p docs/invalid-section
touch docs/invalid-section/orphan.md
npm run pkf:validate:structure && echo "FAIL: Should detect orphan" || echo "PASS: Detected orphan"
rm -rf docs/invalid-section
```

---

### WS-ENF-T007: Integration Test Suite

**Task ID:** WS-ENF-T007
**Name:** Create integration test suite for enforcement layer
**Description:** End-to-end tests verifying all enforcement layers work together
**Dependencies:** WS-ENF-T001 through WS-ENF-T006
**Complexity:** M (2-4 hours)

**File Structure:**
```
tests/
  enforcement/
    integration.test.ts (create)
    fixtures/
      valid-doc.md (create)
      invalid-frontmatter.md (create)
      invalid-prose.md (create)
      broken-links.md (create)
```

**Test Scenarios:**

```typescript
// tests/enforcement/integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const FIXTURE_DIR = join(__dirname, 'fixtures');
const DOCS_DIR = join(process.cwd(), 'docs', 'test-enforcement');

describe('PKF Enforcement Layer Integration', () => {
  beforeAll(() => {
    mkdirSync(DOCS_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(DOCS_DIR, { recursive: true, force: true });
  });

  describe('Frontmatter Validation', () => {
    it('should pass valid frontmatter', () => {
      const validDoc = `---
title: Valid Document
status: draft
created: 2025-12-27
---
# Valid Document

This is valid content.
`;
      writeFileSync(join(DOCS_DIR, 'valid.md'), validDoc);
      expect(() => execSync('npm run pkf:validate:frontmatter')).not.toThrow();
    });

    it('should fail invalid frontmatter', () => {
      const invalidDoc = `---
status: not-a-valid-status
---
# Invalid
`;
      writeFileSync(join(DOCS_DIR, 'invalid.md'), invalidDoc);
      expect(() => execSync('npm run pkf:validate:frontmatter')).toThrow();
    });
  });

  describe('Link Validation', () => {
    it('should fail on broken internal links', () => {
      const brokenLinks = `# Doc with broken link

See [nonexistent](./does-not-exist.md).
`;
      writeFileSync(join(DOCS_DIR, 'broken.md'), brokenLinks);
      expect(() => execSync('npm run pkf:validate:links')).toThrow();
    });
  });

  describe('Full Validation Pipeline', () => {
    it('should run all validations via pkf:validate', () => {
      // Setup valid doc
      const validDoc = `---
title: Integration Test
status: draft
created: 2025-12-27
---
# Integration Test

This document tests the full validation pipeline.
`;
      writeFileSync(join(DOCS_DIR, 'full-test.md'), validDoc);

      // Should complete without error
      expect(() => execSync('npm run pkf:validate')).not.toThrow();
    });
  });
});
```

**Acceptance Criteria:**
- [ ] Test suite covers all validation types
- [ ] Fixtures demonstrate valid and invalid cases
- [ ] Tests clean up after themselves
- [ ] Tests can run in CI environment
- [ ] Coverage of error message format verification
- [ ] Tests document expected behavior

---

## 4. Dependency Graph

```
                    ┌─────────────────────┐
                    │   WS-ENF-T001       │
                    │   Package.json      │
                    │   Scripts           │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   WS-ENF-T002   │  │   WS-ENF-T003   │  │   WS-ENF-T006   │
│   Remark        │  │   Vale          │  │   Structure     │
│   Config        │  │   Config        │  │   Validator     │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └───────────┬────────┘                    │
                     │                             │
                     ▼                             │
           ┌─────────────────┐                     │
           │   WS-ENF-T004   │                     │
           │   Husky         │                     │
           │   Pre-commit    │                     │
           └────────┬────────┘                     │
                    │                              │
                    ▼                              │
           ┌─────────────────┐                     │
           │   WS-ENF-T005   │                     │
           │   GitHub        │                     │
           │   Actions       │◀────────────────────┘
           └────────┬────────┘
                    │
                    ▼
           ┌─────────────────┐
           │   WS-ENF-T007   │
           │   Integration   │
           │   Tests         │
           └─────────────────┘
```

### Parallelization Opportunities

| Task Group | Can Run In Parallel |
|------------|---------------------|
| T002, T003 | Yes - independent configs |
| T004, T005 | No - T004 before T005 |
| T006 | Independent (external dep on pkf-processor) |

### Critical Path

```
T001 → T002 → T004 → T005 → T007
```

---

## 5. Risk Assessment

### Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| remark-lint-frontmatter-schema version incompatibility | Medium | Low | Pin versions, test before upgrade |
| Vale package download failures in CI | Medium | Low | Cache Vale packages, fallback to skip |
| Husky not initializing on Windows | Low | Medium | Document manual setup, use cross-platform scripts |
| Large docs/ causing slow validation | Medium | Medium | Implement incremental validation, cache results |

### Dependency Risks

| Dependency | Risk | Fallback |
|------------|------|----------|
| remark-lint-frontmatter-schema | Low activity | Fork and maintain, or build into pkf-processor |
| Vale | Stable project | Make optional, skip if unavailable |
| husky | Very active | Manual hooks, or use simple-git-hooks |

### Integration Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| pkf-processor not ready | Blocks T006 | Implement T001-T005 first, mock structure validation |
| Schema paths not generated | Blocks remark | Create placeholder schemas, document path requirements |

---

## 6. Implementation Notes

### Installation Order

```bash
# 1. Install dependencies
npm install -D \
  ajv-cli@5 \
  husky@9 \
  lint-staged@15 \
  npm-run-all2@6 \
  remark-cli@12 \
  remark-frontmatter@5 \
  remark-lint-frontmatter-schema@4 \
  remark-validate-links@13

# 2. Initialize husky
npx husky init

# 3. Install Vale (system-level)
brew install vale  # macOS
# or
winget install vale  # Windows
# or
apt-get install vale  # Linux

# 4. Download Vale packages
vale sync
```

### Configuration Validation

Before committing configurations, validate:

```bash
# Validate .remarkrc.mjs syntax
node --check .remarkrc.mjs

# Validate .vale.ini syntax
vale ls-config

# Validate GitHub Actions workflow
npx yaml-lint .github/workflows/pkf-validate.yml

# Test full pipeline
npm run pkf:validate
```

### Error Message Guidelines

Per Section 9.7, all error messages should include:

1. **Error type** - What kind of error (schema, structure, link)
2. **Location** - File path and line number if applicable
3. **Expected** - What was expected
4. **Actual** - What was found
5. **Rule** - Which rule was violated

---

## 7. Acceptance Criteria Summary

The Enforcement Layer is complete when:

- [ ] All `pkf:*` npm scripts defined and functional
- [ ] `.remarkrc.mjs` validates frontmatter against generated schemas
- [ ] `.vale.ini` configured with PKF vocabulary and style rules
- [ ] Husky pre-commit hook blocks commits with validation errors
- [ ] GitHub Actions workflow runs on PRs touching docs
- [ ] `pkf-processor validate-structure` validates directory tree
- [ ] Integration tests pass for all validation scenarios
- [ ] Error messages follow Section 9.7 format
- [ ] Documentation updated with setup instructions

---

## 8. Tracking Updates

### TODO.md Entries

```markdown
### TODO-ENF-001: Implement Package.json Scripts
- **ID:** TODO-ENF-001
- **Status:** pending
- **Priority:** high
- **Task:** WS-ENF-T001

### TODO-ENF-002: Configure Remark
- **ID:** TODO-ENF-002
- **Status:** pending
- **Priority:** high
- **Task:** WS-ENF-T002

### TODO-ENF-003: Configure Vale
- **ID:** TODO-ENF-003
- **Status:** pending
- **Priority:** medium
- **Task:** WS-ENF-T003

### TODO-ENF-004: Setup Husky Pre-commit
- **ID:** TODO-ENF-004
- **Status:** pending
- **Priority:** high
- **Task:** WS-ENF-T004

### TODO-ENF-005: Create GitHub Actions Workflow
- **ID:** TODO-ENF-005
- **Status:** pending
- **Priority:** high
- **Task:** WS-ENF-T005

### TODO-ENF-006: Implement Structure Validator
- **ID:** TODO-ENF-006
- **Status:** blocked
- **Priority:** high
- **Task:** WS-ENF-T006
- **Blocked by:** pkf-processor core implementation

### TODO-ENF-007: Create Integration Tests
- **ID:** TODO-ENF-007
- **Status:** pending
- **Priority:** medium
- **Task:** WS-ENF-T007
```

### NOTES.md Entries

```markdown
## [PATTERN] Enforcement Layer Tool Selection
- **Date:** 2025-12-27
- **Context:** PKF Architecture Section 9.2

Selected tools based on:
1. Active maintenance (commits within 12 months)
2. No critical CVEs
3. Npm downloads > 1,000/week
4. Fallback strategy available

Rejected: directory-schema-validator (unmaintained > 2 years)

## [DECISION] Vale as Optional Layer
- **Date:** 2025-12-27
- **Context:** PKF Architecture Section 9.5

Vale prose linting is:
- Non-blocking in CI (continue-on-error: true)
- Provides PR annotations when available
- Gracefully skips if not installed

Rationale: Prose quality is advisory, not blocking. Teams can opt-in to stricter enforcement.

## [OBSERVATION] Task Complexity Estimates
- **Date:** 2025-12-27

T001: S - Pure configuration, no logic
T002: M - Requires understanding remark plugin system
T003: M - Vale configuration has learning curve
T004: S - Standard husky setup
T005: M - GitHub Actions with multiple steps
T006: L - Requires pkf-processor integration
T007: M - Test design and fixture creation
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-27 | implementation-planner | Initial implementation plan |
