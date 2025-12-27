# PKF Architecture Specification

**Version:** 1.0.1-draft
**Status:** Draft - Revised per PKF-REVIEW-001
**Date:** 2025-12-28
**Authors:** OAF Development Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Design Goals](#3-design-goals)
4. [Architecture Overview](#4-architecture-overview)
5. [Compose Pattern](#5-compose-pattern)
6. [Component Type System](#6-component-type-system)
7. [Schema System](#7-schema-system)
8. [Template System](#8-template-system)
9. [Enforcement Architecture](#9-enforcement-architecture)
10. [Filing Agent Protocol](#10-filing-agent-protocol)
11. [Integration Patterns](#11-integration-patterns)
12. [Configuration Reference](#12-configuration-reference)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

The **Project Knowledge Framework (PKF)** is a declarative documentation framework that provides:

1. **Structured Documentation** - Schema-enforced document organization
2. **Compose Pattern** - Intuitive tree-based configuration
3. **Deterministic Validation** - Zero-code enforcement via existing tools
4. **AI Filing Agent** - Intelligent document intake and routing

PKF enables projects to define, validate, and maintain documentation structures through pure YAML/JSON configuration, with optional AI orchestration for document filing workflows.

### Key Innovations

| Innovation | Description |
|------------|-------------|
| **Compose Pattern** | Config directly represents the documentation tree |
| **Type-Driven Nodes** | Each node's `_type` determines its behavior |
| **Hybrid Enforcement** | Deterministic validation + AI assistance |
| **Filing Protocol** | Schema-based agent-to-agent document handoffs |

---

## 2. Problem Statement

### 2.1 Documentation Drift

Without active management, project documentation:
- Drifts from established structure over time
- Accumulates inconsistent patterns
- Loses traceability between documents
- Becomes difficult to navigate and maintain

### 2.2 Existing Solutions Limitations

| Approach | Limitation |
|----------|------------|
| **Static Site Generators** | No schema enforcement |
| **Wiki Systems** | Unstructured, no validation |
| **Custom Scripts** | Project-specific, not reusable |
| **Manual Reviews** | Inconsistent, not scalable |

### 2.3 Requirements

1. **Declarative** - Define structure in configuration, not code
2. **Enforceable** - Automated validation at multiple layers
3. **Extensible** - Support project-specific schemas and sections
4. **Composable** - Build complex structures from simple components
5. **AI-Compatible** - Enable agentic document workflows

---

## 3. Design Goals

### 3.1 Primary Goals

1. **No Custom Code Required** - Pure YAML/JSON configuration
2. **Existing Tool Integration** - Leverage ajv, remark, husky, etc.
3. **Progressive Adoption** - Start simple, add complexity as needed
4. **Framework Agnostic** - Works with any project type

### 3.2 Non-Goals

1. Content generation (delegated to OAF or other systems)
2. Version control (delegated to Git)
3. Publishing/rendering (delegated to static site generators)
4. Full CMS functionality

### 3.3 Implementation Philosophy

**Clarification: "No Custom Code" Scope**

The principle "No Custom Code Required" means:

| What Users Do | What Users Don't Do |
|---------------|---------------------|
| Write `pkf.config.yaml` | Write validation scripts |
| Define schemas in YAML | Write schema compilers |
| Define templates in YAML | Write template processors |
| Run `npm run pkf:validate` | Write custom validators |
| Install `pkf-processor` | Fork or modify pkf-processor |

**Single Required Component:** Users install `pkf-processor` as a dev dependency. This is the only PKF-provided code. All other tools are existing open-source packages (ajv-cli, remark, husky).

**Relationship to PKF-ENFORCEMENT-RESEARCH.md:**

The Research document explores a future CLI toolchain (`pkf init`, `pkf lint`). This specification defines the current approach:

| Aspect | Current (v1.0) | Future Direction |
|--------|----------------|------------------|
| Interface | npm scripts | `pkf` CLI wrapper |
| Setup | Manual package.json | `pkf init` |
| Validation | Direct tool invocation | `pkf validate` |

The CLI wrapper is **not required** for v1.0 and is considered a convenience layer for future versions.

---

## 4. Architecture Overview

### 4.1 Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PKF ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Layer 4: AI ORCHESTRATION (Optional)                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  PKF Filing Agent                                                │   │
│  │  • Document intake and classification                           │   │
│  │  • Clarification loops with producers                           │   │
│  │  • Intelligent location resolution                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│  Layer 3: ENFORCEMENT                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Pre-commit Hooks │ CI/CD Gates │ IDE Integration               │   │
│  │  (husky)          │ (GitHub Actions) │ (VS Code)                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│  Layer 2: VALIDATION                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Schema      │ Structure    │ Frontmatter  │ Link    │ Prose   │   │
│  │  (ajv-cli)   │ (pkf-struct) │ (remark)     │ (remark)│ (vale)  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│  Layer 1.5: CONFIGURATION PROCESSOR (Build-time)                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  pkf.config.yaml ──▶ Configuration Processor ──▶ Generated      │   │
│  │                      (pkf-processor)             Artifacts      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│  Layer 1: DEFINITION                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  pkf.config.yaml │ Component Types │ Schemas │ Templates       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│  Layer 0: REPOSITORY                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  docs/ directory │ Markdown files │ Frontmatter │ Git          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Relationships

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ pkf.config.yaml │────▶│ Component Types │────▶│ JSON Schemas    │
│ (tree structure)│     │ (node behavior) │     │ (validation)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         │                      │                       │
         ▼                      ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Directory       │     │ Templates       │     │ Validators      │
│ Structure       │     │ (new docs)      │     │ (enforcement)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 5. Compose Pattern

### 5.1 Core Concept

The PKF Compose Pattern represents the documentation tree directly in configuration. Each node declares its type inline, and the configuration structure mirrors the actual directory structure.

**Key Principle:** The tree IS the configuration.

### 5.2 Tree Structure

```yaml
# pkf.config.yaml
$schema: "./pkf/pkf-config.schema.json"
version: "1.0.0"
project:
  name: "MyProject"

# Component definitions (reusable building blocks)
components:
  types: "./pkf/components/types.yaml"
  schemas: "./pkf/components/schemas.yaml"
  templates: "./pkf/components/templates.yaml"

# The documentation tree - THIS IS THE STRUCTURE
docs:
  _type: root
  _readme: true

  architecture:
    _type: section
    _items:
      _type: document
      _schema: architecture-doc
      _template: architecture-template
      _naming: "{slug}.md"
    individual:
      _type: section
      _description: "Individual architecture documents"

  proposals:
    _type: section
    _lifecycle: [draft, active, archived]
    _items:
      _type: document
      _schema: proposal
      _template: proposal-template
      _naming: "P{nn}-{slug}.md"
    draft:
      _type: lifecycle-state
      _state: draft
      _default: true
    active:
      _type: lifecycle-state
      _state: active
    archived:
      _type: lifecycle-state
      _state: archived
      _terminal: true

  registers:
    _type: section
    _readme: false
    TODO.md:
      _type: register
      _schema: todo-item
      _template: todo-register
    ISSUES.md:
      _type: register
      _schema: issue-item
      _template: issues-register
    CHANGELOG.md:
      _type: register
      _schema: changelog-entry
      _template: changelog-register
```

### 5.3 Resulting Directory Structure

The above configuration produces:

```
docs/
├── README.md                    # _type: root (auto-generated hub)
├── architecture/
│   ├── README.md                # _type: section
│   ├── {slug}.md                # _type: document, _schema: architecture-doc
│   └── individual/
│       └── README.md
├── proposals/
│   ├── README.md
│   ├── draft/                   # _type: lifecycle-state
│   │   └── P{nn}-{slug}.md      # inherits _items from parent
│   ├── active/
│   └── archived/
└── registers/
    ├── TODO.md                  # _type: register
    ├── ISSUES.md
    └── CHANGELOG.md
```

### 5.4 Special Properties

| Property | Type | Description |
|----------|------|-------------|
| `_type` | string | Node type (required for all nodes) |
| `_readme` | boolean | Whether README.md is required (default: true for sections) |
| `_items` | object | Default document configuration for items in this section |
| `_schema` | string | Schema name for validation |
| `_template` | string | Template name for new documents |
| `_naming` | string | File naming pattern |
| `_lifecycle` | array | Creates lifecycle state subdirectories |
| `_state` | string | Lifecycle state name |
| `_default` | boolean | Default state for new items |
| `_terminal` | boolean | No transitions out of this state |
| `_description` | string | Human-readable description |

**Naming Convention:** All PKF-reserved properties use underscore prefix (`_type`, `_schema`, etc.). User-defined properties at root level (`version`, `project`) do not use underscore prefix.

### 5.5 Configuration Processor

The Configuration Processor is the core build-time component that transforms `pkf.config.yaml` into validation artifacts.

#### 5.5.1 Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONFIGURATION PROCESSOR                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  INPUT                                                                   │
│  ┌─────────────────┐                                                    │
│  │ pkf.config.yaml │                                                    │
│  │ types.yaml      │                                                    │
│  │ schemas.yaml    │                                                    │
│  │ templates.yaml  │                                                    │
│  └────────┬────────┘                                                    │
│           │                                                              │
│           ▼                                                              │
│  PROCESSING                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  1. Parse YAML configuration                                     │   │
│  │  2. Resolve component references                                 │   │
│  │  3. Expand Compose tree with _items inheritance                  │   │
│  │  4. Transform Schema DSL → JSON Schema                           │   │
│  │  5. Generate directory structure expectations                    │   │
│  │  6. Generate remark configuration                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│           │                                                              │
│           ▼                                                              │
│  OUTPUT (generated/)                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  schemas/*.schema.json     - JSON Schema files                   │   │
│  │  structure.json            - Expected directory structure        │   │
│  │  .remarkrc.generated.mjs   - Remark lint configuration          │   │
│  │  path-schema-map.json      - Path → schema mappings              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 5.5.2 Execution Model

The processor runs at **build-time**, not runtime:

| Trigger | Command | Output |
|---------|---------|--------|
| Initial setup | `npx pkf-processor init` | Generated artifacts |
| Config change | `npx pkf-processor build` | Regenerated artifacts |
| Pre-commit hook | Cached (no regeneration) | Uses existing artifacts |
| CI/CD | `npx pkf-processor build` | Fresh generation |

**Caching:** Artifacts are regenerated only when config files change (checksum-based).

#### 5.5.3 Processor Interface

```typescript
// pkf-processor types
import { z } from 'zod';

/**
 * Configuration Processor input contract.
 */
export const ProcessorInputSchema = z.object({
  /** Path to pkf.config.yaml */
  configPath: z.string().default('pkf.config.yaml'),

  /** Output directory for generated artifacts */
  outputDir: z.string().default('.pkf/generated'),

  /** Watch mode for development */
  watch: z.boolean().default(false),

  /** Validation strictness */
  strict: z.boolean().default(true),
});

export type ProcessorInput = z.infer<typeof ProcessorInputSchema>;

/**
 * Configuration Processor output contract.
 */
export const ProcessorOutputSchema = z.object({
  /** Whether processing succeeded */
  success: z.boolean(),

  /** Generated artifact paths */
  artifacts: z.object({
    schemas: z.array(z.string()),
    structureJson: z.string(),
    remarkConfig: z.string(),
    pathSchemaMap: z.string(),
  }),

  /** Processing errors (if any) */
  errors: z.array(z.object({
    file: z.string(),
    line: z.number().optional(),
    message: z.string(),
    severity: z.enum(['error', 'warning']),
  })).default([]),

  /** Processing duration in ms */
  duration: z.number(),
});

export type ProcessorOutput = z.infer<typeof ProcessorOutputSchema>;
```

#### 5.5.4 Error Handling

The processor reports errors for:

| Error Type | Example | Severity |
|------------|---------|----------|
| Invalid YAML syntax | `Unexpected token` | error |
| Unknown `_type` value | `_type: unknownType` | error |
| Missing required property | `_type: document` without `_schema` | error |
| Unresolved schema reference | `_schema: nonexistent` | error |
| Circular inheritance | `extends: self` | error |
| Invalid DSL syntax | `type: invalidType` | error |
| Deprecated property | `_deprecated: true` | warning |

#### 5.5.5 Implementation Note

The processor is the **single required PKF component**. Users install it as a dev dependency and invoke via npm scripts. No other custom code is required—all validation uses generated artifacts with standard tools (ajv-cli, remark-cli).

```json
{
  "devDependencies": {
    "pkf-processor": "^1.0.0"
  },
  "scripts": {
    "pkf:build": "pkf-processor build",
    "pkf:watch": "pkf-processor build --watch"
  }
}
```

---

## 6. Component Type System

### 6.1 Type Definitions

```yaml
# pkf/components/types.yaml

types:
  root:
    description: "Documentation root"
    requiresReadme: true
    allowsChildren: true
    properties: {}

  section:
    description: "Directory containing documents or subsections"
    requiresReadme: true
    allowsChildren: true
    properties:
      _lifecycle:
        description: "Creates lifecycle state subdirectories"
        type: array
        items: string
      _items:
        description: "Default document type for items in this section"
        type: object
      _archive:
        description: "Whether this is an archive section"
        type: boolean
      _archivePattern:
        description: "Pattern for archive subdirectories"
        type: string

  lifecycle-state:
    description: "Lifecycle state subdirectory (draft, active, archived)"
    requiresReadme: false
    allowsChildren: true
    inheritsItems: true
    properties:
      _state:
        description: "State name"
        type: string
        required: true
      _default:
        description: "Default state for new items"
        type: boolean
      _terminal:
        description: "No transitions out of this state"
        type: boolean

  document:
    description: "A markdown document with frontmatter"
    requiresReadme: false
    allowsChildren: false
    properties:
      _schema:
        description: "Schema for frontmatter validation"
        type: string
        required: true
      _template:
        description: "Template for new documents"
        type: string
      _naming:
        description: "Naming pattern for files"
        type: string
        required: true

  directory:
    description: "A subdirectory (not a document)"
    requiresReadme: true
    allowsChildren: true
    properties:
      _schema:
        description: "Schema for directory metadata"
        type: string
      _naming:
        description: "Naming pattern for directories"
        type: string
      _children:
        description: "Child section structure"
        type: object

  register:
    description: "A register file (TODO, ISSUES, CHANGELOG)"
    requiresReadme: false
    allowsChildren: false
    properties:
      _schema:
        description: "Schema for register items"
        type: string
        required: true
      _template:
        description: "Template for the register file"
        type: string
```

### 6.2 Type Inheritance

```
                    ┌──────────────┐
                    │     node     │  (abstract base)
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  container │  │   leaf     │  │  special   │
    │  (has      │  │  (file)    │  │            │
    │  children) │  │            │  │            │
    └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
          │               │               │
    ┌─────┼─────┐         │               │
    │     │     │         │               │
    ▼     ▼     ▼         ▼               ▼
  root section lifecycle document     register
             directory     state
```

### 6.3 Lifecycle State Machine

The lifecycle state system (`_lifecycle`, `lifecycle-state`) supports document workflow management.

#### 6.3.1 State Transitions

**Current Design Decision:** State transitions are **NOT enforced** by PKF validation.

Rationale:
- Documents may need emergency state changes
- Git history provides audit trail
- Enforcement adds complexity without proportional benefit

**Implementation:**
- Files can be moved between state directories freely
- `_terminal: true` is metadata only (signals intent, not enforcement)
- Validation checks file location, not transition legality

#### 6.3.2 Manual File Move Behavior

| Scenario | Behavior |
|----------|----------|
| Move file to different state directory | Allowed, no validation error |
| Move file out of `_terminal` state | Allowed (warning only if strict mode) |
| Move file to non-existent state | Error - directory doesn't exist |
| Delete file from state | Allowed |

#### 6.3.3 `_default` Conflict Resolution

If multiple states declare `_default: true`:
- **Processor behavior:** Warning emitted, first declared state wins
- **Filing Agent behavior:** Prompts for clarification

```yaml
# Warning: Multiple defaults
draft:
  _type: lifecycle-state
  _state: draft
  _default: true    # ← First wins
active:
  _type: lifecycle-state
  _state: active
  _default: true    # ← Warning: ignored
```

#### 6.3.4 Future: Enforced Transitions (Optional)

For projects requiring strict lifecycle enforcement, a future extension may add:

```yaml
# Future: Transition rules (not in v1.0)
lifecycle-rules:
  draft:
    allowedTransitions: [active, archived]
  active:
    allowedTransitions: [archived]
  archived:
    allowedTransitions: []  # Terminal
```

This would be opt-in via `enforcement.strictLifecycle: true`.

---

## 7. Schema System

### 7.1 Schema Hierarchy

```yaml
# pkf/components/schemas.yaml

schemas:
  # Base schemas (inherited by others)
  base-entry:
    description: "Base for all register entries"
    abstract: true
    properties:
      id:
        type: string
        required: true
      status:
        type: string
        required: true
      created:
        type: date
        required: true
      updated:
        type: date

  # Register item schemas
  todo-item:
    extends: base-entry
    id:
      prefix: "TODO"
      pattern: "^TODO-\\d{3,}$"
      padding: 3
    statuses: [pending, in-progress, blocked, completed, cancelled]
    properties:
      priority:
        type: enum
        values: [critical, high, medium, low]
        default: medium
      assignee:
        type: string
      labels:
        type: array
        items: string
      depends_on:
        type: array
        items:
          type: string
          pattern: "^TODO-\\d{3,}$"

  issue-item:
    extends: base-entry
    id:
      prefix: "ISSUE"
      pattern: "^ISSUE-\\d{3,}$"
      padding: 3
    statuses: [open, investigating, resolved, closed, wontfix]
    properties:
      severity:
        type: enum
        values: [critical, major, minor, trivial]
      component:
        type: string

  changelog-entry:
    extends: base-entry
    id:
      pattern: "^v\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9.]+)?$"
    statuses: [unreleased, released]
    properties:
      changes:
        type: object
        properties:
          added: { type: array, items: string }
          changed: { type: array, items: string }
          fixed: { type: array, items: string }
          removed: { type: array, items: string }

  # Document schemas
  proposal:
    extends: base-entry
    id:
      prefix: "P"
      pattern: "^P\\d{2}$"
      padding: 2
    statuses: [draft, review, approved, implementing, completed, rejected, superseded]
    properties:
      title:
        type: string
        required: true
      phase:
        type: enum
        values: [S, "0", "1", "2", "3", "4", "5", "6", "7", "8"]
      tasks:
        type: number
      supersedes:
        type: string
        pattern: "^P\\d{2}$"

  architecture-doc:
    properties:
      title:
        type: string
        required: true
      status:
        type: enum
        values: [draft, review, approved, deprecated]
        default: draft
      created:
        type: date
        required: true
      decision:
        type: string
      consequences:
        type: array
        items: string
```

### 7.2 JSON Schema Generation

Schemas are compiled to JSON Schema for validation:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://pkf.dev/schemas/proposal.schema.json",
  "title": "PKF Proposal",
  "type": "object",
  "required": ["id", "title", "status", "created"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^P\\d{2}$"
    },
    "title": {
      "type": "string",
      "minLength": 1
    },
    "status": {
      "type": "string",
      "enum": ["draft", "review", "approved", "implementing", "completed", "rejected", "superseded"]
    },
    "created": {
      "type": "string",
      "format": "date"
    },
    "phase": {
      "type": "string",
      "enum": ["S", "0", "1", "2", "3", "4", "5", "6", "7", "8"]
    },
    "tasks": {
      "type": "integer"
    },
    "supersedes": {
      "type": "string",
      "pattern": "^P\\d{2}$"
    }
  }
}
```

### 7.3 Schema DSL Reference

The Schema DSL provides shorthand syntax that transforms to JSON Schema. This section defines all DSL keywords and their transformations.

#### 7.3.1 DSL Keywords

| DSL Keyword | JSON Schema Equivalent | Description |
|-------------|------------------------|-------------|
| `extends` | `allOf` + `$ref` | Schema inheritance |
| `abstract` | (metadata only) | Cannot be used directly |
| `type: date` | `type: "string", format: "date"` | ISO 8601 date |
| `type: datetime` | `type: "string", format: "date-time"` | ISO 8601 datetime |
| `type: enum` | `type: "string", enum: [...]` | Enumeration |
| `statuses` | `properties.status.enum` | Shorthand for status enum |
| `required: true` | Added to `required` array | Mark field required |
| `default` | `default` | Default value |
| `id.prefix` | (used in pattern generation) | ID prefix for auto-generation |
| `id.pattern` | `pattern` | Regex pattern for ID |
| `id.padding` | (used in ID generation) | Zero-padding for numeric IDs |

#### 7.3.2 Transformation Rules

**`extends` Resolution:**
```yaml
# DSL Input
todo-item:
  extends: base-entry
  properties:
    priority:
      type: string
```

```json
// JSON Schema Output
{
  "allOf": [
    { "$ref": "#/$defs/base-entry" },
    {
      "type": "object",
      "properties": {
        "priority": { "type": "string" }
      }
    }
  ]
}
```

**Inheritance Conflict Resolution:** Child properties override parent properties. If both define `status`, child's definition wins.

**`type: date` Transformation:**
```yaml
# DSL Input
created:
  type: date
  required: true
```

```json
// JSON Schema Output
{
  "created": {
    "type": "string",
    "format": "date"
  }
}
// "created" added to "required" array
```

**`statuses` Shorthand:**
```yaml
# DSL Input
statuses: [pending, in-progress, completed]
```

```json
// JSON Schema Output
{
  "properties": {
    "status": {
      "type": "string",
      "enum": ["pending", "in-progress", "completed"]
    }
  },
  "required": ["status"]
}
```

**`id` Composite Property:**
```yaml
# DSL Input
id:
  prefix: "TODO"
  pattern: "^TODO-\\d{3,}$"
  padding: 3
```

```json
// JSON Schema Output
{
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^TODO-\\d{3,}$"
    }
  }
}
// prefix and padding used for ID generation, not validation
```

#### 7.3.3 Error Handling

The processor reports DSL errors:

| Error | Example | Message |
|-------|---------|---------|
| Unknown type | `type: uuid` | `Unknown type "uuid". Valid types: string, number, boolean, array, object, date, datetime, enum` |
| Invalid extends | `extends: missing` | `Cannot resolve schema reference "missing"` |
| Circular extends | `a extends b, b extends a` | `Circular inheritance detected: a → b → a` |
| Missing enum values | `type: enum` (no values) | `Enum type requires "values" property` |

---

## 8. Template System

### 8.1 Template Definitions

```yaml
# pkf/components/templates.yaml

templates:
  proposal-template:
    forSchema: proposal
    filename: "PROPOSAL-TEMPLATE.md"
    frontmatter:
      required: [id, title, status, created]
      defaults:
        status: draft
    body:
      - heading: "Summary"
        level: 2
        required: true
        placeholder: "Brief description of the proposal"
      - heading: "Motivation"
        level: 2
        required: true
        placeholder: "Why is this change needed?"
      - heading: "Design"
        level: 2
        required: true
        placeholder: "Technical design details"
      - heading: "Implementation"
        level: 2
        required: false
        placeholder: "Implementation approach"
      - heading: "Alternatives"
        level: 2
        required: false
        placeholder: "Alternative approaches considered"
      - heading: "References"
        level: 2
        required: false
        placeholder: "Related documents and resources"

  architecture-template:
    forSchema: architecture-doc
    filename: "ARCHITECTURE-TEMPLATE.md"
    frontmatter:
      required: [title, status, created]
      defaults:
        status: draft
    body:
      - heading: "Context"
        level: 2
        required: true
        placeholder: "Background and context for this decision"
      - heading: "Decision"
        level: 2
        required: true
        placeholder: "The architectural decision made"
      - heading: "Consequences"
        level: 2
        required: true
        placeholder: "Positive and negative consequences"

  todo-register:
    forSchema: todo-item
    filename: "TODO-TEMPLATE.md"
    format: register
    header: |
      # TODO Register

      Task tracking for the project.

      ## Active Tasks
    itemFormat: |
      ### {id}: {title}

      **Status:** {status} | **Priority:** {priority}
      **Created:** {created} | **Assignee:** {assignee}

      {description}
```

### 8.2 Template Variables

| Variable | Description |
|----------|-------------|
| `{id}` | Document/item ID |
| `{title}` | Title field |
| `{status}` | Current status |
| `{created}` | Creation date |
| `{updated}` | Last update date |
| `{slug}` | URL-friendly title |
| `{nn}` | Zero-padded number (2 digits) |
| `{nnn}` | Zero-padded number (3 digits) |
| `{date}` | Current date (YYYY-MM-DD) |
| `{author}` | Current user/agent |

#### 8.2.1 Variable Escaping

To include literal braces in template content, use double braces:

| Syntax | Output | Description |
|--------|--------|-------------|
| `{id}` | `P01` | Variable substitution |
| `{{id}}` | `{id}` | Literal `{id}` in output |
| `{{` | `{` | Literal opening brace |
| `}}` | `}` | Literal closing brace |

**Example:**
```markdown
# Template with literal braces
The document ID is {id}.
To reference this pattern, use the format {{id}}.
```

**Output:**
```markdown
# Template with literal braces
The document ID is P01.
To reference this pattern, use the format {id}.
```

---

## 9. Enforcement Architecture

### 9.1 Enforcement Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ENFORCEMENT LAYERS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Layer 1: IDE (Real-time)                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • VS Code YAML extension (schema validation)                   │   │
│  │  • remark VS Code extension (frontmatter linting)               │   │
│  │  • Red squiggles on invalid content                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  Layer 2: Pre-commit (Local Gate)                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • husky + lint-staged                                          │   │
│  │  • Only validates changed files (fast)                          │   │
│  │  • Blocks commit if validation fails                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  Layer 3: CI/CD (Remote Gate)                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • GitHub Actions workflow                                      │   │
│  │  • Full validation of entire docs/                              │   │
│  │  • Blocks PR merge if validation fails                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Validation Tools

| Tool | Purpose | npm Package | Health Status |
|------|---------|-------------|---------------|
| **ajv-cli** | Validate config/frontmatter against JSON Schema | `ajv-cli` | ✅ Active (Ajv org) |
| **remark-cli** | Markdown processing pipeline | `remark-cli` | ✅ Active (unified) |
| **remark-frontmatter** | Parse YAML frontmatter | `remark-frontmatter` | ✅ Active (remark) |
| **remark-lint-frontmatter-schema** | Validate frontmatter against schema | `remark-lint-frontmatter-schema` | ✅ Active |
| **remark-validate-links** | Check internal links | `remark-validate-links` | ✅ Active (remark) |
| **pkf-processor** | Config processing + structure validation | `pkf-processor` | ✅ PKF-provided |
| **vale** | Prose style and terminology linting | `@vscode/vale` (or CLI) | ✅ Active (errata-ai) |
| **husky** | Git hooks | `husky` | ✅ Active (typicode) |
| **lint-staged** | Run linters on staged files | `lint-staged` | ✅ Active (lint-staged) |

**Package Health Criteria:** All dependencies must have:
- Commit activity within 12 months
- Maintained by organization or active individual
- No unpatched security vulnerabilities
- Fallback strategy documented (see Appendix C.2)

**Note:** `directory-schema-validator` was evaluated but rejected due to lack of maintenance (last publish >2 years). Structure validation is instead built into `pkf-processor`, which uses `fast-glob` + `ajv` internally.

### 9.3 Package Configuration

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
  "lint-staged": {
    "pkf.config.yaml": "ajv validate -s .pkf/generated/pkf-config.schema.json -d",
    "docs/**/*.md": ["remark --frail --quiet", "vale"]
  }
}
```

### 9.4 Remark Configuration

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
          'docs/proposals/**/*.md': './pkf/schemas/proposal.schema.json',
          'docs/architecture/**/*.md': './pkf/schemas/architecture-doc.schema.json',
          'docs/registers/TODO.md': './pkf/schemas/todo-item.schema.json',
          'docs/registers/ISSUES.md': './pkf/schemas/issue-item.schema.json',
          'docs/registers/CHANGELOG.md': './pkf/schemas/changelog-entry.schema.json',
        },
      },
    ],
    remarkValidateLinks,
  ],
};

export default remarkConfig;
```

### 9.5 Vale Configuration

Vale enforces prose style and terminology consistency:

```ini
# .vale.ini
StylesPath = .vale/styles

MinAlertLevel = suggestion

Packages = Microsoft, write-good

[docs/*.md]
BasedOnStyles = Vale, Microsoft, write-good

# Project-specific terminology
[docs/architecture/*.md]
TokenIgnores = PKF, OAF, YAML, JSON, frontmatter

[docs/proposals/*.md]
TokenIgnores = PKF, OAF, YAML, JSON, frontmatter
```

**Note:** Vale is optional but recommended. It catches passive voice, jargon, and inconsistent terminology.

### 9.6 GitHub Actions Workflow

```yaml
# .github/workflows/pkf-validate.yml
name: PKF Validation

on:
  pull_request:
    paths:
      - 'docs/**'
      - 'pkf.config.yaml'
      - 'pkf/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Build PKF artifacts
        run: npm run pkf:build

      - name: Validate PKF Config
        run: npm run pkf:validate:config

      - name: Validate Directory Structure
        run: npm run pkf:validate:structure

      - name: Validate Frontmatter Schemas
        run: npm run pkf:validate:frontmatter

      - name: Validate Internal Links
        run: npm run pkf:validate:links

      - name: Validate Prose (optional)
        run: npm run pkf:validate:prose
        continue-on-error: true  # Warning only, not blocking
```

### 9.7 Error Output Examples

Example error outputs from validation tools:

**Schema Validation Error (ajv-cli):**
```
docs/proposals/draft/P01-example.md invalid
data/status must be equal to one of the allowed values: draft, review, approved
    at: /status
    allowed: ["draft", "review", "approved", "implementing", "completed", "rejected", "superseded"]
    actual: "pending"
```

**Structure Validation Error (pkf-processor):**
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
```

**Link Validation Error (remark-validate-links):**
```
docs/architecture/overview.md
  15:5-15:45  warning  Link to unknown file: `../api/endpoints.md`  remark-validate-links

1 warning
```

**Frontmatter Validation Error (remark-lint-frontmatter-schema):**
```
docs/proposals/draft/P02-new-feature.md
  1:1-5:4  error  Frontmatter validation failed:
    - Missing required property: "title"
    - Property "id" must match pattern "^P\d{2}$", got "proposal-2"
```

---

## 10. Filing Agent Protocol

> **Scope Note:** This section defines an **optional** AI orchestration layer for PKF. The core PKF framework (Sections 5-9) operates independently of the Filing Agent. Projects not using AI-assisted documentation may skip this section entirely.
>
> For detailed Filing Agent implementation, see the separate **PKF-FILING-AGENT.md** specification (when available). This section provides the protocol overview and integration points.

### 10.1 Overview

The PKF Filing Agent is an AI-powered intermediary that receives documents from content producers and ensures correct filing in the PKF structure.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DOCUMENT FILING WORKFLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐                      ┌─────────────────────────────┐   │
│  │ Producer    │                      │   PKF Filing Agent          │   │
│  │ Agent       │    FilingRequest     │   (Intermediary)            │   │
│  │             │ ──────────────────▶  │                             │   │
│  │  architect  │                      │  1. Classify document       │   │
│  │  developer  │                      │  2. Validate schema         │   │
│  │  reviewer   │  ◀──────────────────│  3. Determine location      │   │
│  │             │    FilingResponse    │  4. Check for conflicts     │   │
│  └─────────────┘    (or Clarification)│  5. File or iterate         │   │
│                                       └─────────────────────────────┘   │
│                                                    │                     │
│                                                    ▼                     │
│                                       ┌─────────────────────────────┐   │
│                                       │   PKF Repository            │   │
│                                       │   docs/                     │   │
│                                       └─────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Handoff Types

The protocol extends OAF's handoff system with filing-specific types:

```typescript
export const FilingHandoffTypeSchema = z.enum([
  'filing_request',          // Document submission for filing
  'filing_response',         // Filing result
  'clarification_request',   // Agent needs clarification
  'clarification_response',  // Producer provides clarification
]);
```

### 10.3 Filing Request Schema

```typescript
export const FilingRequestSchema = z.object({
  metadata: HandoffMetadataSchema,
  filingId: z.string().min(1),
  content: z.string().min(1),
  frontmatter: z.record(z.unknown()).optional(),
  suggestedType: DocumentTypeSchema,
  suggestedState: LifecycleStateSchema.optional(),
  suggestedPath: z.string().optional(),
  context: z.object({
    workstreamId: z.string().optional(),
    phase: z.string().optional(),
    relatedDocuments: z.array(z.string()).default([]),
    supersedes: z.string().optional(),
    parentDocument: z.string().optional(),
    notes: z.string().optional(),
  }).default({}),
  preferences: z.object({
    autoAcceptFixes: z.boolean().default(false),
    maxIterations: z.number().default(3),
    strictMode: z.boolean().default(false),
  }).default({}),
});
```

### 10.4 Filing Response Schema

```typescript
export const FilingResponseSchema = z.object({
  metadata: HandoffMetadataSchema,
  filingId: z.string().min(1),
  status: z.enum(['filed', 'clarification_needed', 'rejected']),

  filed: z.object({
    path: z.string(),
    documentId: z.string(),
    documentType: DocumentTypeSchema,
    lifecycleState: LifecycleStateSchema,
    filedAt: z.string().datetime(),
    fixesApplied: z.array(z.string()).default([]),
    crossReferences: z.array(z.string()).default([]),
    indexedInRag: z.boolean().default(false),
  }).optional(),

  clarification: z.object({
    clarificationId: z.string(),
    iteration: z.number(),
    maxIterations: z.number(),
    issues: z.array(FilingIssueSchema),
    suggestions: z.array(FilingSuggestionSchema),
    questions: z.array(ClarificationQuestionSchema),
    instructions: z.string(),
  }).optional(),

  rejection: z.object({
    reason: z.string(),
    permanent: z.boolean(),
    issues: z.array(FilingIssueSchema),
    remediation: z.string().optional(),
  }).optional(),

  message: z.string(),
});
```

### 10.5 Filing Issue Schema

```typescript
export const FilingIssueSchema = z.object({
  id: z.string(),
  type: z.enum([
    'schema_violation',
    'missing_field',
    'invalid_value',
    'naming_conflict',
    'duplicate_content',
    'invalid_location',
    'cross_reference_error',
    'lifecycle_violation',
  ]),
  severity: z.enum(['error', 'warning', 'info']),
  field: z.string().optional(),
  message: z.string(),
  location: z.object({
    line: z.number(),
    column: z.number().optional(),
  }).optional(),
  expected: z.string().optional(),
  actual: z.string().optional(),
});
```

### 10.6 State Machine

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FILING STATE MACHINE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                         ┌──────────────┐                                │
│                         │   INTAKE     │                                │
│                         └──────┬───────┘                                │
│                                │                                         │
│                                ▼                                         │
│                         ┌──────────────┐                                │
│               ┌────────▶│  VALIDATING  │◀────────┐                      │
│               │         └──────┬───────┘         │                      │
│               │                │                 │                      │
│               │         ┌──────┴──────┐          │                      │
│               │         ▼             ▼          │                      │
│               │    [errors?]     [no errors]     │                      │
│               │         │             │          │                      │
│               │         ▼             ▼          │                      │
│               │  ┌────────────┐ ┌──────────────┐ │                      │
│               │  │ CLARIFYING │ │   LOCATING   │ │                      │
│               │  └─────┬──────┘ └──────┬───────┘ │                      │
│               │        │               │         │                      │
│               │        ▼               │         │                      │
│               │  ┌────────────┐        │         │                      │
│               │  │  (await    │        │         │                      │
│               │  │  producer) │        │         │                      │
│               │  └─────┬──────┘        │         │                      │
│               │        │               │         │                      │
│      ┌────────┴────────┤               │         │                      │
│      │                 │               │         │                      │
│      ▼                 ▼               ▼         │                      │
│ [withdraw]      [response]       [conflicts?]    │                      │
│      │                 │               │         │                      │
│      ▼                 │         ┌─────┴────┐    │                      │
│ ┌──────────┐           │         ▼          ▼    │                      │
│ │ REJECTED │           │    [yes]       [no]     │                      │
│ └──────────┘           │       │          │      │                      │
│                        │       │          ▼      │                      │
│                        │       │    ┌──────────┐ │                      │
│                        │       │    │  FILING  │ │                      │
│                        │       │    └────┬─────┘ │                      │
│                        │       │         │       │                      │
│                        │       │         ▼       │                      │
│                        │       │    ┌──────────┐ │                      │
│                        │       │    │ COMPLETE │ │                      │
│                        │       │    └──────────┘ │                      │
│                        │       │                 │                      │
│                        └───────┴─────────────────┘                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.7 Clarification Loop

```
Producer                          Filing Agent
   │                                   │
   │  FilingRequest                    │
   │──────────────────────────────────▶│
   │                                   │ validate()
   │                                   │ ──────────▶ issues found
   │                                   │
   │  FilingResponse(clarification)    │
   │◀──────────────────────────────────│
   │                                   │
   │  [producer fixes or accepts]      │
   │                                   │
   │  ClarificationResponse            │
   │──────────────────────────────────▶│
   │                                   │ validate()
   │                                   │ ──────────▶ passed
   │                                   │
   │                                   │ locate()
   │                                   │ ──────────▶ path resolved
   │                                   │
   │                                   │ file()
   │                                   │ ──────────▶ written
   │                                   │
   │  FilingResponse(filed)            │
   │◀──────────────────────────────────│
   │                                   │
```

---

## 11. Integration Patterns

### 11.1 OAF Integration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     OAF + PKF INTEGRATION                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  OAF Workflow                          PKF Filing                        │
│  ───────────                          ──────────                         │
│                                                                          │
│  Phase 1: Architecture                                                   │
│  ┌─────────────────────┐              ┌─────────────────────────────┐   │
│  │ architect agent     │──────────────│  PKF Filing Agent           │   │
│  │ produces: ARCH-001  │  filing      │  • Validate schema          │   │
│  └─────────────────────┘  request     │  • Determine location       │   │
│                                       │  • File document            │   │
│  Phase 2: Planning                    │                             │   │
│  ┌─────────────────────┐              │                             │   │
│  │ planner agent       │──────────────│                             │   │
│  │ produces: PLAN-001  │              └─────────────────────────────┘   │
│  └─────────────────────┘                         │                      │
│                                                  ▼                      │
│                                       ┌─────────────────────────────┐   │
│                                       │  PKF Repository             │   │
│                                       │  docs/                      │   │
│                                       │  ├── architecture/ARCH-001  │   │
│                                       │  └── plans/PLAN-001         │   │
│                                       └─────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.2 RAG Memory Integration

```yaml
filing:
  integration:
    ragMemory:
      enabled: true
      indexOnFile: true
      entityTypes:
        proposal: "PROPOSAL"
        architecture: "ARCHITECTURE_DOC"
        workstream: "WORKSTREAM"
      relationships:
        - from: "document"
          to: "supersedes"
          type: "SUPERSEDES"
        - from: "document"
          to: "relatedDocuments"
          type: "RELATES_TO"
```

### 11.3 Extension Pattern

Projects extend PKF by providing additional component files:

```yaml
# pkf.config.yaml
components:
  types:
    - "./pkf/components/types.yaml"        # Base PKF
    - "./pkf/project/types.yaml"           # Project extensions
  schemas:
    - "./pkf/components/schemas.yaml"      # Base PKF
    - "./pkf/project/schemas.yaml"         # Project extensions
  templates:
    - "./pkf/components/templates.yaml"    # Base PKF
    - "./pkf/project/templates.yaml"       # Project extensions
```

---

## 12. Configuration Reference

### 12.1 pkf.config.yaml

```yaml
# Full PKF configuration reference
$schema: "./pkf/pkf-config.schema.json"

# PKF version
version: "1.0.0"

# Project information
project:
  name: "MyProject"
  version: "1.0.0"
  description: "Project description"
  repository: "https://github.com/org/repo"

# Component file references
components:
  types: "./pkf/components/types.yaml"
  schemas: "./pkf/components/schemas.yaml"
  templates: "./pkf/components/templates.yaml"

# Documentation tree structure
docs:
  _type: root
  # ... tree definition

# Enforcement configuration
enforcement:
  enabled: true
  preCommit: true
  ci: true
  strict: true

# Validation configuration
validation:
  validateSchemas: true
  validateLinks: true
  validateStructure: true
  requireNavHubs: true

# Filing agent configuration
filing:
  enabled: true
  validation:
    strictMode: false
  clarification:
    maxIterations: 3
    autoApplyThreshold: 0.9
  location:
    autoAssignId: true
  integration:
    ragMemory:
      enabled: true
      indexOnFile: true

# ID generation
idGeneration:
  proposal: "P{nn}"
  architecture: "ARCH-{nnn}"
  todo: "TODO-{nnn}"
  issue: "ISSUE-{nnn}"
  workstream: "WS-{nnn}"
```

### 12.2 Directory Structure Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://pkf.dev/schemas/structure.schema.json",
  "title": "PKF Directory Structure",
  "type": "object",
  "required": ["docs"],
  "properties": {
    "docs": {
      "type": "object",
      "required": ["README.md"],
      "additionalProperties": true
    }
  }
}
```

---

## 13. Implementation Roadmap

### Phase 1: Core Framework (MVP)

- [ ] Compose pattern parser
- [ ] Component type system
- [ ] Basic schema definitions
- [ ] JSON Schema generation
- [ ] ajv-cli integration

### Phase 2: Enforcement Layer

- [ ] remark-lint integration
- [ ] directory-schema-validator integration
- [ ] husky + lint-staged setup
- [ ] GitHub Actions workflow

### Phase 3: Filing Agent

- [ ] Filing request/response schemas
- [ ] Filing service implementation
- [ ] Clarification loop
- [ ] OAF handoff integration

### Phase 4: Tooling

- [ ] VS Code extension
- [ ] CLI tool (optional)
- [ ] Documentation generator
- [ ] Migration utilities

---

## 14. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Compose Pattern** | Configuration pattern where the tree structure IS the config |
| **Component Type** | Defines behavior of a node in the documentation tree |
| **Enforcement Layer** | Automated validation at pre-commit and CI/CD |
| **Filing Agent** | AI intermediary for document intake and routing |
| **Handoff** | Structured message between agents |
| **Lifecycle State** | Document state (draft, active, archived) |
| **Register** | Collection file (TODO, ISSUES, CHANGELOG) |

### Appendix B: JSON Schema Catalog

| Schema | Purpose | Location |
|--------|---------|----------|
| `pkf-config.schema.json` | Main config validation | `pkf/schemas/` |
| `types.schema.json` | Component type definitions | `pkf/schemas/` |
| `proposal.schema.json` | Proposal frontmatter | `pkf/schemas/` |
| `architecture-doc.schema.json` | Architecture doc frontmatter | `pkf/schemas/` |
| `todo-item.schema.json` | TODO register items | `pkf/schemas/` |
| `issue-item.schema.json` | ISSUES register items | `pkf/schemas/` |
| `changelog-entry.schema.json` | CHANGELOG entries | `pkf/schemas/` |
| `filing-request.schema.json` | Filing protocol requests | `pkf/schemas/filing/` |
| `filing-response.schema.json` | Filing protocol responses | `pkf/schemas/filing/` |

### Appendix C: Tool Versions and Health

#### C.1 Version Requirements

| Tool | Minimum Version |
|------|-----------------|
| Node.js | 20.x |
| npm | 10.x |
| pkf-processor | 1.x |
| ajv-cli | 5.x |
| remark-cli | 12.x |
| vale | 3.x |
| husky | 9.x |
| lint-staged | 15.x |

#### C.2 Fallback Strategies

| Tool | Fallback if Unavailable |
|------|-------------------------|
| **ajv-cli** | Use `ajv` programmatically via pkf-processor |
| **remark-cli** | Manual frontmatter review (not recommended) |
| **vale** | Skip prose validation (optional tool) |
| **husky** | Manual pre-commit checks or CI-only validation |
| **lint-staged** | Full file validation (slower) |

#### C.3 Package Health Criteria

All dependencies must meet:
- ✅ Commit activity within 12 months
- ✅ Maintained by organization or responsive individual
- ✅ No unpatched critical CVEs
- ✅ npm weekly downloads > 1,000 (indicates community usage)

**Rejected Packages:**
- `directory-schema-validator` - Last publish >2 years, replaced by pkf-processor built-in

### Appendix D: References

- [ajv-cli](https://github.com/ajv-validator/ajv-cli) - JSON Schema validator
- [remark](https://github.com/remarkjs/remark) - Markdown processor
- [remark-lint-frontmatter-schema](https://github.com/JulianCataldo/remark-lint-frontmatter-schema) - Frontmatter validation
- [Vale](https://github.com/errata-ai/vale) - Prose linting
- [MkDocs Configuration](https://www.mkdocs.org/user-guide/configuration/) - Tree-based nav inspiration
- [Hugo Archetypes](https://gohugo.io/content-management/archetypes/) - Template system inspiration
- [CUE Language](https://cuelang.org/docs/introduction/) - Constraint-based composition
- [Terraform Module Composition](https://developer.hashicorp.com/terraform/language/modules/develop/composition) - Flat composition pattern

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0-draft | 2025-12-27 | OAF Team | Initial draft for peer review |
| 1.0.1-draft | 2025-12-28 | OAF Team | Peer review revisions (PKF-REVIEW-001) |

### Revision Summary (1.0.1-draft)

Addressed peer review feedback:

| Issue ID | Status | Resolution |
|----------|--------|------------|
| CRIT-001 | ✅ Resolved | Added Section 5.5 Configuration Processor |
| CRIT-002 | ✅ Resolved | Replaced directory-schema-validator with pkf-processor |
| CRIT-003 | ✅ Resolved | Added Section 3.3 Implementation Philosophy |
| MAJ-001 | ✅ Resolved | Added Section 7.3 Schema DSL Reference |
| MAJ-002 | ✅ Resolved | Added Section 6.3 Lifecycle State Machine |
| MAJ-003 | ✅ Resolved | Added scope note to Section 10 (extraction pending) |
| MAJ-004 | ✅ Resolved | Added Vale to Section 9.2, 9.5, 9.6 |
| MIN-001 | ✅ Resolved | Added naming convention to Section 5.4 |
| MIN-002 | ✅ Resolved | Added Section 9.7 Error Output Examples |
| MIN-003 | ✅ Resolved | Added Section 8.2.1 Variable Escaping |

---

**Status:** Revised per peer review PKF-REVIEW-001. Ready for re-review.

All critical and major issues from PKF-REVIEW-001 have been addressed. Key additions:
- Section 5.5: Configuration Processor specification
- Section 6.3: Lifecycle state machine behavior
- Section 7.3: Schema DSL transformation rules
- Section 9.5: Vale prose linting configuration
- Section 9.7: Error output examples
- Appendix C: Package health criteria and fallback strategies

**Outstanding Work:**
- MAJ-003: Filing Agent extraction to separate specification (noted but deferred)
- MAJ-005/MAJ-006: Research document updates (separate document)

Submit re-review feedback via the standard review process.
