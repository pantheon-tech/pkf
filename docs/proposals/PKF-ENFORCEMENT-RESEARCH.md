# PKF Enforcement Research: Making Documentation Frameworks Stick

**Version:** 1.0.0
**Date:** 2025-12-27
**Status:** Research Complete

---

## Executive Summary

This research investigates how PKF (Project Knowledge Framework) can evolve from a "initialize once and drift" documentation specification into a **deployable, extensible, enforceable framework** that maintains consistency over time.

### Key Findings

1. **Documentation drift is inevitable** without active enforcement
2. **Layered validation** (structure → prose → content → contracts) prevents drift
3. **Schema-first generation** is more reliable than manual sync
4. **CI/CD gates are essential** - pre-commit hooks alone are insufficient
5. **Extensibility requires plugin architecture** with a frozen core
6. **Immutability patterns** (ADRs) prevent historical corruption

### Recommended Approach

Transform PKF from a specification into a **CLI-based toolchain** with:
- `pkf init` - Initialize project with validated structure
- `pkf lint` - Validate compliance against schemas
- `pkf generate` - Generate docs from templates/schemas
- `pkf check` - Pre-commit/CI validation
- `pkf upgrade` - Migrate to newer PKF versions

---

## 1. The Problem: Documentation Drift

### What is Documentation Drift?

> "Documentation Drift refers to the ongoing process of a codebase becoming out of sync with its documentation. This occurs when new features, improvements, or changes are made to the codebase without the accompanying documentation being updated accordingly."
> — [Gaudion.dev](https://gaudion.dev/blog/documentation-drift)

### Why Frameworks Fail

| Failure Mode | Cause | Result |
|--------------|-------|--------|
| **Initialize & Forget** | No ongoing validation | Structure degrades over time |
| **Optional Compliance** | No enforcement gates | Some docs follow spec, others don't |
| **Version Lock** | No upgrade path | Framework becomes outdated |
| **Over-Specification** | Too rigid rules | Teams bypass or abandon framework |
| **Under-Specification** | Too flexible rules | Inconsistency grows |
| **Manual Sync** | Docs separate from code | Drift inevitable |

### Industry Data

- **75% of APIs do not conform to specifications** (2025 API research)
- Most ADRs become "digital dust collectors" referenced only during crisis
- Without active reinforcement, even well-documented decisions drift

---

## 2. Enforcement Mechanisms: What Works

### 2.1 Layered Validation Model

Successful documentation frameworks use **layered validation**:

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: CONTRACT TESTING                                       │
│  ├── API docs match implementation                               │
│  ├── Examples actually run                                       │
│  └── Cross-references resolve                                    │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: CONTENT VALIDATION                                     │
│  ├── Link checking (lychee)                                      │
│  ├── Image asset validation                                      │
│  ├── Cross-document reference checking                           │
│  └── Schema compliance (JSON Schema)                             │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: PROSE ENFORCEMENT                                      │
│  ├── Vale (style guides: Microsoft, Google)                      │
│  ├── Terminology consistency                                     │
│  ├── Spelling/grammar                                            │
│  └── Branding guidelines                                         │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: STRUCTURE ENFORCEMENT                                  │
│  ├── markdownlint (40+ rules)                                    │
│  ├── YAML frontmatter validation                                 │
│  ├── File naming conventions                                     │
│  └── Directory structure compliance                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Git + CI/CD as Enforcement Backbone

Every successful documentation framework uses **Git + CI/CD** for enforcement:

```
LOCAL                    REMOTE                   PUBLISHED
──────                   ──────                   ─────────

Developer Writes Doc
        │
        ▼
Pre-commit Hook ────────→ Fails? Fix locally
        │ Pass
        ▼
Push to Remote
        │
        ▼
CI/CD Pipeline ─────────→ Fails? Block merge
├── Lint (markdownlint)
├── Style (Vale)
├── Links (lychee)
├── Schema (JSON Schema)
└── Build (generate site)
        │ Pass
        ▼
Merge to Main
        │
        ▼
Deploy Docs Site
```

### 2.3 Pre-commit vs CI/CD

| Mechanism | Enforcement Level | Can Be Bypassed? | Best For |
|-----------|-------------------|------------------|----------|
| **Pre-commit hooks** | Local | Yes (`--no-verify`) | Fast feedback |
| **CI/CD gates** | Remote | No (blocks merge) | **Mandatory compliance** |
| **IDE plugins** | Editor | Yes (not installed) | Real-time feedback |

**Conclusion:** Pre-commit provides developer experience; **CI/CD gates are essential for enforcement**.

---

## 3. Tooling Landscape

### 3.1 Documentation Linting

| Tool | Purpose | Rules | Integration |
|------|---------|-------|-------------|
| **[markdownlint](https://github.com/DavidAnson/markdownlint)** | Markdown structure | 40+ built-in | CLI, VS Code, CI |
| **[Vale](https://vale.sh/)** | Prose style/grammar | Configurable | CLI, CI, editors |
| **[textlint](https://textlint.github.io/)** | Pluggable linting | Custom rules | CLI, CI |
| **[lychee](https://lychee.cli.rs/)** | Link checking | N/A | CLI, CI |

### 3.2 Schema Validation

| Tool | Input | Output | Use Case |
|------|-------|--------|----------|
| **[jsonschema2md](https://github.com/adobe/jsonschema2md)** | JSON Schema | Markdown docs | Auto-generate docs from schema |
| **[json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans)** | JSON Schema | HTML/Markdown | Beautiful schema docs |
| **[ajv](https://ajv.js.org/)** | JSON/YAML + Schema | Validation result | Runtime validation |
| **[Zod](https://zod.dev/)** | TypeScript | Runtime validation | Type-safe schemas |

### 3.3 Documentation Frameworks

| Framework | Enforcement | Extensibility | Best For |
|-----------|-------------|---------------|----------|
| **[Docusaurus](https://docusaurus.io/)** | Sidebar validation, build checks | React components | Large projects |
| **[MkDocs](https://www.mkdocs.org/)** | YAML config validation | Plugins | Simple docs |
| **[Sphinx](https://www.sphinx-doc.org/)** | reST markup, cross-ref validation | Extensions | Python projects |

### 3.4 ADR Tools

| Tool | Format | Immutability | Features |
|------|--------|--------------|----------|
| **[log4brains](https://github.com/thomvaill/log4brains)** | MADR | Yes | CLI + static site |
| **[adr-tools](https://github.com/npryce/adr-tools)** | Nygard | No | Shell scripts |
| **[MADR](https://adr.github.io/madr/)** | MADR | Yes | Template only |

### 3.5 API Specification Tools

| Tool | Purpose | Enforcement |
|------|---------|-------------|
| **[Spectral](https://stoplight.io/open-source/spectral)** | OpenAPI/AsyncAPI linting | 40+ rules, custom rulesets |
| **[Pact](https://pact.io/)** | Contract testing | Consumer-driven contracts |
| **[Redocly](https://redocly.com/)** | API docs + linting | Built-in rules |

---

## 4. Schema-First Documentation: The Key to Preventing Drift

### 4.1 The Problem with Manual Sync

```
Traditional Approach:
  Code Changes → Developer Updates Docs → Reviewer Checks → Maybe Drift

Schema-First Approach:
  Schema Changes → Docs Auto-Generated → Always In Sync
```

### 4.2 How Schema-First Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    SINGLE SOURCE OF TRUTH                        │
│                                                                  │
│  ┌──────────────────┐                                           │
│  │  Zod Schemas     │ (TypeScript)                              │
│  │  (or JSON Schema)│                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     GENERATION LAYER                        │ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │ JSON Schema  │  │ TypeScript   │  │  Markdown    │     │ │
│  │  │   Export     │  │    Types     │  │    Docs      │     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  └────────────────────────────────────────────────────────────┘ │
│           │                  │                  │                │
│           ▼                  ▼                  ▼                │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   Runtime    │   │   Compile    │   │   Published  │        │
│  │  Validation  │   │    Time      │   │     Docs     │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 PKF Schema-First Implementation

```typescript
// schemas/todo-item.ts (Source of Truth)
import { z } from 'zod';

export const TodoItemSchema = z.object({
  id: z.string().regex(/^TODO-\d{3,}$/),
  type: z.literal('todo-item'),
  status: z.enum(['pending', 'in-progress', 'blocked', 'completed', 'cancelled']),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  created: z.string().date(),
  updated: z.string().date().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  // ... more fields
});

// AUTO-GENERATED: JSON Schema for validation
// AUTO-GENERATED: Markdown documentation
// AUTO-GENERATED: TypeScript types
```

---

## 5. Extensibility Without Breaking Consistency

### 5.1 The Extensibility Challenge

| Too Rigid | Just Right | Too Flexible |
|-----------|------------|--------------|
| Teams bypass framework | Teams customize within bounds | Inconsistency grows |
| Framework becomes unused | Framework stays relevant | Framework loses value |

### 5.2 Extensibility Patterns

#### Pattern 1: Frozen Core + Extensible Plugins

```
PKF Core (Immutable)
├── Base schemas (todo-item, issue-item, changelog-entry)
├── Required files (CLAUDE.md, README.md, registers/)
├── File naming conventions
└── Validation rules

PKF Plugins (Extensible)
├── Custom document types (workflow-manifest, phase-output)
├── Additional linting rules
├── Custom templates
└── Domain-specific schemas
```

#### Pattern 2: Configuration Inheritance

```yaml
# pkf.config.yaml (Project-specific)
extends: "@pkf/base"  # Inherit core rules

# Override specific settings
structure:
  additionalDirs:
    - docs/workflows/
    - docs/plans/
    - docs/reviews/

registers:
  additional:
    - name: IMPLEMENTATION-TASKS
      schema: implementation-task.schema.json

templates:
  additional:
    - WORKSTREAM-TEMPLATE.md
    - CODE-REVIEW-TEMPLATE.md

validation:
  customRules:
    - ./rules/oaf-specific.js
```

#### Pattern 3: Schema Extension

```typescript
// Core schema (frozen)
const BaseDocumentSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  created: z.string().date(),
});

// Extended schema (project-specific)
const WorkflowManifestSchema = BaseDocumentSchema.extend({
  type: z.literal('workflow-manifest'),
  workflowId: z.string().uuid(),
  phases: z.array(PhaseOutputSchema),
  gates: z.array(GateDecisionSchema),
});
```

### 5.3 Versioning & Migration

```
PKF 1.0.0 (Current)
    │
    ▼ pkf upgrade
PKF 1.1.0 (New features, backward compatible)
    │
    ▼ pkf migrate
PKF 2.0.0 (Breaking changes, migration required)
```

---

## 6. Immutability Patterns: What Should Never Change

### 6.1 MADR (Markdown Architecture Decision Records) Pattern

ADRs use immutability to prevent historical corruption:

```markdown
# ADR-001: Use FalkorDB for Graph Storage

**Status:** Accepted → Deprecated → Superseded by ADR-015

**Context:** [Original context - NEVER EDITED]

**Decision:** [Original decision - NEVER EDITED]

**Consequences:** [Original consequences - NEVER EDITED]
```

**Key Principle:** ADRs are never "wrong" - they capture what was decided at that time. Only the **status** can change.

### 6.2 PKF Immutability Candidates

| Document Type | Mutable? | Rationale |
|---------------|----------|-----------|
| TODO items | Yes | Work items evolve |
| ISSUE items | Yes | Issues get resolved |
| CHANGELOG entries | **No** | Historical record |
| ADRs | **No** | Historical decisions |
| Gate decisions | **No** | Audit trail |
| Phase outputs | **No** | Workflow artifacts |
| Specifications | **No** (versioned) | Standards don't retroactively change |

### 6.3 Enforcement via Git

```bash
# .github/workflows/immutability-check.yml
- name: Check immutable files
  run: |
    # Get list of changed files
    CHANGED=$(git diff --name-only HEAD~1)

    # Check for modifications to immutable directories
    for file in $CHANGED; do
      if [[ $file =~ ^docs/registers/CHANGELOG\.md$ ]]; then
        # Only additions allowed, not modifications
        MODS=$(git diff HEAD~1 -- "$file" | grep -c '^-[^-]')
        if [ $MODS -gt 0 ]; then
          echo "ERROR: CHANGELOG entries are immutable"
          exit 1
        fi
      fi
    done
```

---

## 7. Proposed PKF Enforcement Architecture

### 7.1 PKF CLI Tool

```
pkf <command> [options]

Commands:
  init [template]     Initialize PKF in a project
  lint                Validate all documentation
  generate            Generate docs from schemas
  check               Pre-commit validation (fast)
  validate            Full validation (CI/CD)
  upgrade             Upgrade to newer PKF version
  migrate             Run migrations for breaking changes

Options:
  --config <path>     Path to pkf.config.yaml
  --fix               Auto-fix violations where possible
  --ci                Strict mode for CI/CD (exit code on warnings)
```

### 7.2 Validation Pipeline

```
pkf validate (Full CI/CD Pipeline)
───────────────────────────────────

STAGE 1: Structure Validation
├── Required files exist (CLAUDE.md, README.md, registers/)
├── File naming conventions
├── Directory structure matches config
└── Navigation hubs (README.md) present

STAGE 2: Schema Validation
├── YAML frontmatter validates against schemas
├── Register item format correct
├── Custom document types validate
└── Cross-references valid

STAGE 3: Content Validation
├── markdownlint (40+ rules)
├── Vale (prose style)
├── Link checking (internal + external)
└── Image assets exist

STAGE 4: Consistency Validation
├── Version numbers consistent
├── Dates in correct format
├── IDs unique and sequential
└── Register statistics accurate

STAGE 5: Generated Artifacts
├── Schema docs match schemas
├── Template docs match templates
└── No uncommitted generated files

EXIT CODE: 0 = pass, 1 = fail
```

### 7.3 Configuration Schema

```yaml
# pkf.config.yaml
$schema: https://pkf.dev/schemas/pkf-config.schema.json
version: "1.0.0"

project:
  name: "OAF"
  version: "0.1.0"

extends: "@pkf/base"

structure:
  docsDir: docs
  archiveDir: docs_archive
  registersDir: docs/registers

  # PKF extensions for OAF
  additionalDirs:
    - path: docs/workflows
      purpose: "Workflow execution artifacts"
    - path: docs/plans
      purpose: "Implementation plans"
    - path: docs/reviews
      purpose: "Code review archives"

registers:
  standard:
    - TODO
    - ISSUES
    - CHANGELOG
  additional:
    - name: IMPLEMENTATION-TASKS
      schema: ./schemas/implementation-task.schema.json

validation:
  lint:
    markdownlint: true
    vale: true
    valeConfig: .vale.ini
  links:
    checkExternal: false  # Slow, run weekly
    checkInternal: true
  schemas:
    strict: true  # Fail on additionalProperties

plugins:
  - "@pkf/oaf-extensions"

ci:
  failOnWarning: true
  generateReport: true
  reportFormat: markdown
```

### 7.4 Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                     PKF INTEGRATION POINTS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐                                           │
│  │   IDE PLUGINS    │  VS Code, JetBrains                       │
│  │  ├── Real-time   │  markdownlint, Vale                       │
│  │  │   linting     │                                           │
│  │  └── Schema      │  YAML IntelliSense                        │
│  │      completion  │                                           │
│  └──────────────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │  PRE-COMMIT      │  .pre-commit-config.yaml                  │
│  │  ├── pkf check   │  Fast validation                          │
│  │  └── Auto-fix    │  Where possible                           │
│  └──────────────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │  CI/CD GATES     │  GitHub Actions, GitLab CI                │
│  │  ├── pkf validate│  Full validation                          │
│  │  ├── Block merge │  On failure                               │
│  │  └── Report      │  PR annotations                           │
│  └──────────────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │  SCHEDULED       │  Weekly/nightly                           │
│  │  ├── Link check  │  External links                           │
│  │  ├── Drift check │  Doc/code comparison                      │
│  │  └── Report      │  Dashboard/alerts                         │
│  └──────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. AI-Assisted Enforcement

### 8.1 Drift Detection Agents

Tools like [DeepDocs](https://medium.com/@deepdocs/deepdocs-keep-your-documentation-in-sync-with-your-code-73699b73c1d2) show the future of documentation enforcement:

> "DeepDocs monitors your main branch for new commits. When your code changes, it checks if the related docs need updating. If they do, it creates a new branch with clean, focused updates."

### 8.2 PKF AI Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    PKF AI ENFORCEMENT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  On Code Change:                                                 │
│  ┌──────────────────┐                                           │
│  │ codebase-doc-    │  Compare docs to implementation          │
│  │ comparator agent │  Detect drift                             │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │ documentation-   │  Generate doc updates                     │
│  │ writer agent     │  Create PR with changes                   │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │ documentation-   │  Validate generated docs                  │
│  │ analyst agent    │  Ensure PKF compliance                    │
│  └──────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 ADRs as AI Instructions

From [Daily DevOps](https://daily-devops.net/posts/instruction-by-design/):

> "AI Code Assistants can enforce decisions in real time, catching issues before they become problems. Every architectural choice can directly influence code suggestions from AI assistants. By making ADRs machine-consumable and embedding clear instructions, they become the single source of truth that powers both human understanding and automated enforcement."

---

## 9. Implementation Roadmap

### Phase 1: Core CLI (2-3 weeks)

```
pkf init      - Initialize from templates
pkf lint      - markdownlint + Vale integration
pkf validate  - Schema validation
pkf check     - Pre-commit hook
```

### Phase 2: CI/CD Integration (1-2 weeks)

```
GitHub Actions workflow
GitLab CI template
Pre-commit config
Exit codes and reports
```

### Phase 3: Schema-First Generation (2-3 weeks)

```
Zod → JSON Schema export
JSON Schema → Markdown docs
Template generation
pkf generate command
```

### Phase 4: Extensibility (2-3 weeks)

```
Plugin architecture
Configuration inheritance
Custom schema support
pkf.config.yaml schema
```

### Phase 5: AI Integration (3-4 weeks)

```
Drift detection hooks
Agent integration
Auto-update PRs
Dashboard/reporting
```

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Lint pass rate** | 100% | CI/CD pipeline |
| **Schema compliance** | 100% | pkf validate |
| **Link validity** | 100% | Weekly link check |
| **Doc-code drift** | < 1 week | codebase-doc-comparator |
| **Adoption rate** | > 90% projects | Usage tracking |
| **Time to compliance** | < 1 day new project | pkf init benchmarks |

---

## 11. Conclusion

PKF can evolve from a specification to an **enforceable framework** by:

1. **Building a CLI toolchain** (`pkf` commands)
2. **Layered validation** (structure → prose → content → contracts)
3. **CI/CD gates as mandatory enforcement** (not just pre-commit)
4. **Schema-first generation** to eliminate manual sync
5. **Plugin architecture** for extensibility without breaking core
6. **Immutability patterns** for historical documents
7. **AI-assisted drift detection** for proactive maintenance

The key insight: **Enforcement must be automatic and mandatory**. Optional linting and manual processes will always drift.

---

## References

### Documentation Frameworks
- [Docusaurus](https://docusaurus.io/)
- [MkDocs Material](https://squidfunk.github.io/mkdocs-material/)
- [Kong: What is Docs as Code?](https://konghq.com/blog/learning-center/what-is-docs-as-code)

### Linting Tools
- [markdownlint](https://github.com/DavidAnson/markdownlint)
- [Vale](https://vale.sh/)
- [Netlify: Docs Linting in CI/CD](https://www.netlify.com/blog/a-key-to-high-quality-documentation-docs-linting-in-ci-cd/)
- [Datadog: How We Use Vale](https://www.datadoghq.com/blog/engineering/how-we-use-vale-to-improve-our-documentation-editing-process/)

### Schema Tools
- [Adobe jsonschema2md](https://github.com/adobe/jsonschema2md)
- [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans)
- [JSON Schema](https://json-schema.org/)

### API Specification
- [Spectral API Linter](https://stoplight.io/open-source/spectral)
- [PactFlow Contract Testing](https://docs.pactflow.io/)
- [Understanding API Drift](https://apidog.com/blog/understanding-and-mitigating-api-drift/)

### ADR Tools
- [Architecture Decision Records](https://adr.github.io/)
- [log4brains](https://github.com/thomvaill/log4brains)
- [MADR](https://adr.github.io/madr/)
- [ADRs as AI Instructions](https://daily-devops.net/posts/instruction-by-design/)

### Drift Prevention
- [What is Documentation Drift?](https://gaudion.dev/blog/documentation-drift)
- [DeepDocs](https://medium.com/@deepdocs/deepdocs-keep-your-documentation-in-sync-with-your-code-73699b73c1d2)

### Pre-commit & CI/CD
- [Pre-commit Framework](https://pre-commit.com/)
- [Pre-commit Hooks Guide 2025](https://gatlenculp.medium.com/effortless-code-quality-the-ultimate-pre-commit-hooks-guide-for-2025-57ca501d9835)

---

*Research compiled 2025-12-27*
