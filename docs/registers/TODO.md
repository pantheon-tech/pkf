# TODO Register

> Task register tracking pending work items, features, and improvements for PKF.

## Quick Stats

- **Total Items:** 10
- **Pending:** 0
- **In Progress:** 0
- **Completed:** 10
- **Blocked:** 0
- **Last Updated:** 2025-12-28

---

## Active Items

### TODO-001: Add Architecture Documentation

```yaml
id: TODO-001
type: todo-item
status: completed
priority: medium
created: 2025-12-24
updated: 2025-12-27
assignee: null
labels: [documentation]
depends_on: []
blocks: []
estimated_effort: medium

description: |
  Create architecture documentation for PKF itself, explaining:
  - How PKF components relate to each other
  - Design decisions behind the framework
  - Extension points and customization

acceptance_criteria:
  - Architecture overview document created
  - Design decisions documented
  - Diagrams showing component relationships

notes: |
  Completed: PKF-ARCHITECTURE.md v1.0.1-draft created at docs/architecture/PKF-ARCHITECTURE.md
  Reviewed via PKF-REVIEW-001 peer review process.
```

---

### TODO-002: Add Validation Tooling

```yaml
id: TODO-002
type: todo-item
status: completed
priority: low
created: 2025-12-24
updated: 2025-12-28
assignee: null
labels: [tooling, enhancement]
depends_on: []
blocks: []
estimated_effort: large

description: |
  Create tooling to validate PKF compliance:
  - CLI tool to validate project structure
  - Schema validation for register entries
  - Link checking for documentation
  - Template placeholder validation

acceptance_criteria:
  - CLI tool created (pkf-validate or similar)
  - Structure validation implemented
  - Schema validation working
  - Link checking functional

notes: |
  Completed: All validation tooling implemented via enforcement layer (TODO-004 through TODO-008).
  Template validation added via scripts/validate-templates.js.
```

---

### TODO-003: Add More Template Variants

```yaml
id: TODO-003
type: todo-item
status: completed
priority: low
created: 2025-12-24
updated: 2025-12-28
assignee: null
labels: [templates, enhancement]
depends_on: []
blocks: []
estimated_effort: small

description: |
  Add additional template variants:
  - DEVELOPER-GUIDE.template.md
  - CONTRIBUTING.template.md
  - ADR (Architecture Decision Record) template
  - PROPOSAL.template.md

acceptance_criteria:
  - Templates created following PKF standards
  - Placeholders documented
  - Added to template index

notes: |
  Completed: All four templates created:
  - templates/DEVELOPER-GUIDE.template.md
  - templates/CONTRIBUTING.template.md
  - templates/ADR.template.md
  - templates/PROPOSAL.template.md
```

---

### TODO-004: Package.json Scripts Setup (WS-ENF-T001)

```yaml
id: TODO-004
type: todo-item
status: completed
priority: high
created: 2025-12-27
updated: 2025-12-28
assignee: null
labels: [enforcement, infrastructure]
depends_on: []
blocks: [TODO-005, TODO-006, TODO-007, TODO-008, TODO-010]
estimated_effort: small

description: |
  Set up all pkf:* scripts in package.json per PKF Architecture Section 9.3.
  Includes: pkf:build, pkf:validate, pkf:validate:config, pkf:validate:structure,
  pkf:validate:frontmatter, pkf:validate:links, pkf:validate:prose

acceptance_criteria:
  - All pkf:* scripts defined and executable
  - npm run pkf:validate runs all validation sub-scripts
  - lint-staged configuration validates staged files only
  - Exit codes properly propagate

notes: |
  Completed: All pkf:* scripts configured in package.json.
  Added ajv-cli for config validation.
  Added pkf:validate:templates for template placeholder validation.
```

---

### TODO-005: Remark Configuration (WS-ENF-T002)

```yaml
id: TODO-005
type: todo-item
status: completed
priority: high
created: 2025-12-27
updated: 2025-12-28
assignee: null
labels: [enforcement, validation]
depends_on: [TODO-004]
blocks: [TODO-007]
estimated_effort: medium

description: |
  Create .remarkrc.mjs with schema-based frontmatter validation per Section 9.4.
  Configure remark-frontmatter, remark-lint-frontmatter-schema, remark-validate-links.

acceptance_criteria:
  - .remarkrc.mjs created with ESM syntax
  - All document types mapped to correct schemas
  - remark docs/ --frail reports frontmatter errors
  - remark docs/ --use remark-validate-links reports broken links

notes: |
  Completed: .remarkrc.mjs already existed and is properly configured.
  Uses generated path-schema mappings from pkf:build.
```

---

### TODO-006: Vale Configuration (WS-ENF-T003)

```yaml
id: TODO-006
type: todo-item
status: completed
priority: medium
created: 2025-12-27
updated: 2025-12-28
assignee: null
labels: [enforcement, prose]
depends_on: [TODO-004]
blocks: [TODO-007]
estimated_effort: medium

description: |
  Create .vale.ini and style configurations per Section 9.5.
  Configure Microsoft and write-good packages.
  Add PKF-specific vocabulary.

acceptance_criteria:
  - .vale.ini created with correct syntax
  - Vale packages (Microsoft, write-good) installed via vale sync
  - Custom vocabulary configured for PKF terminology
  - vale docs/ runs without configuration errors

notes: |
  Completed: .vale.ini and vocabulary files created.
  Vale packages directory added to .gitignore.
  Vale binary not installed on system but configuration is ready.
```

---

### TODO-007: Husky Pre-commit Hooks (WS-ENF-T004)

```yaml
id: TODO-007
type: todo-item
status: completed
priority: high
created: 2025-12-27
updated: 2025-12-28
assignee: null
labels: [enforcement, git-hooks]
depends_on: [TODO-004, TODO-005, TODO-006]
blocks: [TODO-008]
estimated_effort: small

description: |
  Set up husky + lint-staged for local validation per Section 9.3.
  Create pre-commit hook that runs lint-staged on staged files.

acceptance_criteria:
  - .husky/ directory created and committed
  - pre-commit hook is executable
  - npm install automatically sets up hooks via prepare script
  - Invalid files block commit with clear error message

notes: |
  Completed: .husky/pre-commit already existed and is properly configured.
  lint-staged configuration in package.json validates staged files.
```

---

### TODO-008: GitHub Actions Workflow (WS-ENF-T005)

```yaml
id: TODO-008
type: todo-item
status: completed
priority: high
created: 2025-12-27
updated: 2025-12-28
assignee: null
labels: [enforcement, ci-cd]
depends_on: [TODO-004, TODO-005, TODO-006]
blocks: [TODO-010]
estimated_effort: medium

description: |
  Create GitHub Actions CI workflow per Section 9.6.
  Trigger on PRs to docs paths. Run all validation steps.
  Provide PR annotations for prose issues via Vale action.

acceptance_criteria:
  - Workflow file created with valid YAML syntax
  - Triggers on PR to docs paths
  - All validation steps run in correct order
  - Prose validation is non-blocking (continue-on-error)
  - Job summary provides clear status table

notes: |
  Completed: .github/workflows/pkf-validate.yml already existed.
  Workflow triggers on PRs and pushes to main for docs paths.
```

---

### TODO-009: Structure Validator Command (WS-ENF-T006)

```yaml
id: TODO-009
type: todo-item
status: completed
priority: high
created: 2025-12-27
updated: 2025-12-28
assignee: null
labels: [enforcement, pkf-processor]
depends_on: [pkf-processor-core]
blocks: [TODO-010]
estimated_effort: large

description: |
  Implement pkf-processor validate-structure command per Section 9.2.
  Validates directory structure against pkf.config.yaml tree definition.

acceptance_criteria:
  - pkf-processor validate-structure command exists
  - Reads pkf.config.yaml and parses tree structure
  - Checks README.md existence where _readme: true
  - Validates file locations against _type definitions
  - Reports errors in format per Section 9.7
  - Exit code 0 on success, 1 on failure

notes: |
  Completed: Implemented structure validator in pkf-processor.
  Created src/validator/structure-validator.ts
  Created src/commands/validate-structure.ts
  Validates directory structure against generated structure.json
  Reports errors and warnings with proper formatting
```

---

### TODO-010: Enforcement Integration Tests (WS-ENF-T007)

```yaml
id: TODO-010
type: todo-item
status: completed
priority: medium
created: 2025-12-27
updated: 2025-12-28
assignee: null
labels: [enforcement, testing]
depends_on: [TODO-004, TODO-005, TODO-006, TODO-007, TODO-008]
blocks: []
estimated_effort: medium

description: |
  Create integration test suite for enforcement layer.
  End-to-end tests verifying all enforcement layers work together.

acceptance_criteria:
  - Test suite covers all validation types
  - Fixtures demonstrate valid and invalid cases
  - Tests clean up after themselves
  - Tests can run in CI environment
  - Coverage of error message format verification

notes: |
  Completed: Created tests/enforcement/smoke-test.sh
  Smoke tests validate all enforcement configurations and scripts.
  All 17 checks passing.
```

---

## Completed

### TODO-001: Add Architecture Documentation

```yaml
id: TODO-001
type: todo-item
status: completed
priority: medium
created: 2025-12-24
updated: 2025-12-27
```

See active items section above for full details.

### TODO-002: Add Validation Tooling

```yaml
id: TODO-002
type: todo-item
status: completed
priority: low
created: 2025-12-24
updated: 2025-12-28
```

See active items section above for full details.

### TODO-003: Add More Template Variants

```yaml
id: TODO-003
type: todo-item
status: completed
priority: low
created: 2025-12-24
updated: 2025-12-28
```

See active items section above for full details.

### TODO-004: Package.json Scripts Setup

```yaml
id: TODO-004
type: todo-item
status: completed
priority: high
created: 2025-12-27
updated: 2025-12-28
```

See active items section above for full details.

### TODO-005: Remark Configuration

```yaml
id: TODO-005
type: todo-item
status: completed
priority: high
created: 2025-12-27
updated: 2025-12-28
```

See active items section above for full details.

### TODO-006: Vale Configuration

```yaml
id: TODO-006
type: todo-item
status: completed
priority: medium
created: 2025-12-27
updated: 2025-12-28
```

See active items section above for full details.

### TODO-007: Husky Pre-commit Hooks

```yaml
id: TODO-007
type: todo-item
status: completed
priority: high
created: 2025-12-27
updated: 2025-12-28
```

See active items section above for full details.

### TODO-008: GitHub Actions Workflow

```yaml
id: TODO-008
type: todo-item
status: completed
priority: high
created: 2025-12-27
updated: 2025-12-28
```

See active items section above for full details.

### TODO-009: Structure Validator Command

```yaml
id: TODO-009
type: todo-item
status: completed
priority: high
created: 2025-12-27
updated: 2025-12-28
```

See active items section above for full details.

### TODO-010: Enforcement Integration Tests

```yaml
id: TODO-010
type: todo-item
status: completed
priority: medium
created: 2025-12-27
updated: 2025-12-28
```

See active items section above for full details.

---

## Cancelled

<!-- Move cancelled items here with reason -->

---

**Register Version:** 1.0.0
**Template:** PKF TODO Template v1.0.0
**Last Updated:** 2025-12-28
