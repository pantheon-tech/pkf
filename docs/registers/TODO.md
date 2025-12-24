# TODO Register

> Task register tracking pending work items, features, and improvements for PKF.

## Quick Stats

- **Total Items:** 3
- **Pending:** 3
- **In Progress:** 0
- **Completed:** 0
- **Last Updated:** 2025-12-24

---

## Active Items

### TODO-001: Add Architecture Documentation

```yaml
id: TODO-001
type: todo-item
status: pending
priority: medium
created: 2025-12-24
updated: 2025-12-24
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
  Use the ARCHITECTURE.template.md as the base.
```

---

### TODO-002: Add Validation Tooling

```yaml
id: TODO-002
type: todo-item
status: pending
priority: low
created: 2025-12-24
updated: 2025-12-24
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
  Could be implemented in Node.js or as a simple shell script.
```

---

### TODO-003: Add More Template Variants

```yaml
id: TODO-003
type: todo-item
status: pending
priority: low
created: 2025-12-24
updated: 2025-12-24
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

notes: null
```

---

## Completed

<!-- Move completed items here -->

---

## Cancelled

<!-- Move cancelled items here with reason -->

---

**Register Version:** 1.0.0
**Template:** PKF TODO Template v1.0.0
**Last Updated:** 2025-12-24
