# Registers

> Project tracking registers for PKF.

## Overview

Registers are structured documents that track project items over time. Each register follows a specific schema for consistency and machine-readability.

## Available Registers

| Register | Purpose | Schema |
|----------|---------|--------|
| [TODO.md](TODO.md) | Task tracking | `todo-item` |
| [ISSUES.md](ISSUES.md) | Bug and issue tracking | `issue-item` |
| [CHANGELOG.md](CHANGELOG.md) | Version history | `changelog-entry` |

## Register Format

Each register entry includes YAML frontmatter with required fields defined by its schema. See the [PKF Specification](../framework/specifications/PKF-SPECIFICATION.md) for details.

### Example TODO Entry

```yaml
---
id: TODO-001
type: todo-item
status: pending
priority: medium
created: 2025-12-29
title: Example task
---
```

---

**Last Updated:** 2025-12-29
