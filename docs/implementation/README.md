# Implementation Plans

> Detailed implementation plans for PKF workstreams, converted from architecture specifications.

## Overview

This directory contains actionable implementation plans for building PKF components. Each plan is derived from the [PKF Architecture Specification](../architecture/active/PKF-ARCHITECTURE.md) and provides:

- Task decomposition with unique IDs
- Dependency analysis and ordering
- Implementation patterns with verified APIs
- Acceptance criteria for each task
- Integration test requirements

## Lifecycle States

| Directory | Description |
|-----------|-------------|
| [active/](active/) | Current implementation plans |
| [completed/](completed/) | Finished implementation plans |
| [tracking/](tracking/) | Workstream-level tracking |

## Active Plans

### Master Plan

- [PKF-MASTER-IMPLEMENTATION-PLAN.md](active/PKF-MASTER-IMPLEMENTATION-PLAN.md) - Coordinates all workstreams

### Workstreams

| Workstream | Status | Tasks | Description |
|------------|--------|-------|-------------|
| [WS-PKF: pkf-processor](active/WS-001-PKF-PROCESSOR.md) | Active | 11 | Core configuration processor |
| [WS-DSL: Schema DSL](active/WS-001-SCHEMA-DSL-SYSTEM.md) | Active | 8 | Schema DSL compiler |
| [WS-TPL: Template System](active/WS-001-TEMPLATE-SYSTEM.md) | Active | 8 | Template generation |
| [WS-ENF: Enforcement Layer](active/WS-ENFORCEMENT-LAYER.md) | Active | 7 | Pre-commit hooks, CI/CD, validation tooling |

## Task ID Format

All tasks use the format: `WS-{ID}-T{NNN}`

- `WS` = Workstream prefix
- `{ID}` = Workstream identifier (e.g., ENF, PROC, FILE)
- `T{NNN}` = Task number (001-999)

Example: `WS-ENF-T001` = Enforcement Layer, Task 001

## Complexity Estimates

| Size | Hours | Criteria |
|------|-------|----------|
| S | 1-2 | Configuration only, no logic |
| M | 2-4 | Requires integration understanding |
| L | 4-8 | Significant implementation work |
| XL | 8+ | Complex feature, multiple components |

## See Also

- [PKF Architecture](../architecture/active/PKF-ARCHITECTURE.md) - Source specifications
- [TODO Register](../registers/TODO.md) - Task tracking
- [Implementation Guide](../guides/IMPLEMENTATION-GUIDE.md) - Setup instructions

---

**Last Updated:** 2025-12-29
