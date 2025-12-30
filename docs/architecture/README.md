# PKF Architecture

> Architecture documentation for the Project Knowledge Framework.

## Overview

This directory contains architecture documentation for PKF. Documents are organized by lifecycle state.

## Lifecycle States

| Directory | Description |
|-----------|-------------|
| [active/](active/) | Current architecture documents |
| [archived/](archived/) | Superseded architecture documents |

## Active Documents

### Core Architecture

- **[PKF-ARCHITECTURE.md](active/PKF-ARCHITECTURE.md)** - Comprehensive framework architecture specification
  - Compose Pattern for declarative tree configuration
  - Component Type System
  - Schema and Template Systems
  - Enforcement Architecture (deterministic validation)
  - Filing Agent Protocol (AI orchestration)
  - Integration Patterns

### Planned Documentation

- **DESIGN-DECISIONS.md** - Key design decisions and rationale
- **decisions/** - Architecture Decision Records (ADRs)

## Architecture Overview

PKF provides a layered architecture for documentation management:

```
Layer 4: AI Orchestration    - PKF Filing Agent (optional)
Layer 3: Enforcement         - Pre-commit, CI/CD, IDE
Layer 2: Validation          - Schema, Structure, Frontmatter, Links
Layer 1: Definition          - Config, Types, Schemas, Templates
Layer 0: Repository          - docs/, Markdown, Git
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Compose Pattern** | Configuration directly represents the documentation tree |
| **Component Types** | Defines behavior of nodes (section, document, register) |
| **Schema System** | JSON Schema validation for frontmatter |
| **Enforcement Layers** | Automated validation at multiple stages |
| **Filing Agent** | AI intermediary for document intake |

## See Also

- [PKF Specification](../framework/specifications/PKF-SPECIFICATION.md) - Framework specification
- [TODO Register](../registers/TODO.md) - Planned work items

---

**Status:** Active

**Last Updated:** 2025-12-29
