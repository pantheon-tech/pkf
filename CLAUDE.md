# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project:** Project Knowledge Framework (PKF)
**Version:** 1.0.0
**Status:** Active

PKF is a comprehensive, implementation-agnostic specification for organizing, maintaining, and governing documentation across software projects. It provides standards for documentation structure, register management, templates, and AI agent integration.

### Purpose

PKF defines how to structure project documentation so that it works effectively for both human developers and AI agents. It provides:

- Documentation hierarchy standards
- Register system (TODO, ISSUES, CHANGELOG)
- Template system with placeholders
- JSON Schema validation
- AI agent definitions

### Key Features

- Implementation-agnostic (works with any tech stack)
- AI-friendly (optimized for agent consumption)
- Machine-parseable (JSON Schema validation)
- Self-documenting (PKF follows its own standards)

---

## Quick Start

```bash
# No build required - PKF is a documentation framework

# To use PKF in another project:
# 1. Copy templates/
# 2. Copy schemas/
# 3. Create required files from templates
# 4. Replace placeholders
```

---

## Architecture

### Directory Structure

```
pkf/
├── docs/
│   ├── README.md               # Documentation hub
│   ├── registers/              # TODO, ISSUES, CHANGELOG
│   ├── framework/
│   │   ├── specifications/     # Core PKF spec
│   │   ├── schemas/            # JSON Schemas
│   │   └── templates/          # Reference templates
│   ├── guides/                 # Implementation guide
│   └── architecture/           # Architecture docs
│
├── schemas/                    # Distributable schemas
├── templates/                  # Distributable templates
├── agents/                     # AI agent definitions
│
├── README.md                   # Project overview
└── CLAUDE.md                   # This file
```

### Key Design Decisions

1. **Self-referential** - PKF follows its own standards for documentation
2. **Separation of concerns** - Distributable files (schemas/, templates/) separate from docs
3. **AI-first** - All documentation optimized for AI agent consumption

### Core Components

| Component | Purpose | Location |
|-----------|---------|----------|
| Specification | Core PKF standards | `docs/framework/specifications/` |
| Schemas | Validation rules | `schemas/` |
| Templates | Document templates | `templates/` |
| Agents | AI agent definitions | `agents/` |

---

## Key Files

### Specification
- `docs/framework/specifications/PKF-SPECIFICATION.md` - Complete PKF specification

### Schemas
- `schemas/pkf-config.schema.json` - Project configuration
- `schemas/todo-item.schema.json` - TODO item validation
- `schemas/issue-item.schema.json` - Issue item validation
- `schemas/changelog-entry.schema.json` - Changelog validation

### Templates
- `templates/CLAUDE.template.md` - AI guidance template
- `templates/README.template.md` - Project README template
- `templates/registers/*.template.md` - Register templates

### Agent Definitions
- `agents/documentation-analyst.md` - Documentation auditing
- `agents/documentation-writer.md` - Documentation creation
- `agents/codebase-doc-comparator.md` - Doc/code drift detection

---

## Working with PKF

### Modifying the Specification

1. Edit `docs/framework/specifications/PKF-SPECIFICATION.md`
2. Update version number
3. Add CHANGELOG entry
4. Update any affected schemas or templates

### Adding New Templates

1. Create template in `templates/` with `.template.md` extension
2. Use `{{PLACEHOLDER}}` syntax for variables
3. Add to template index in specification
4. Document placeholders

### Adding New Schemas

1. Create schema in `schemas/` with `.schema.json` extension
2. Follow JSON Schema draft-07
3. Reference from specification
4. Copy to `docs/framework/schemas/` for reference

---

## Registers

Track work items in the following registers:

- [`docs/registers/TODO.md`](docs/registers/TODO.md) - Pending tasks
- [`docs/registers/ISSUES.md`](docs/registers/ISSUES.md) - Bugs and problems
- [`docs/registers/CHANGELOG.md`](docs/registers/CHANGELOG.md) - Version history

---

## AI Agent Integration

### Available Agents

| Agent | Purpose |
|-------|---------|
| `documentation-analyst` | Audit documentation quality and coverage |
| `documentation-writer` | Create and update documentation |
| `codebase-doc-comparator` | Detect drift between docs and code |

### Using Agents

Spawn agents for documentation tasks:

```
When analyzing PKF documentation:
→ Use documentation-analyst for coverage audits
→ Use documentation-writer for new docs
→ Use codebase-doc-comparator for drift checks
```

---

## Contributing

1. Follow PKF standards (PKF is self-documenting)
2. Update registers when making changes
3. Ensure all templates have valid placeholders
4. Validate schemas are syntactically correct

---

**Version:** 1.0.0
**Last Updated:** 2025-12-24

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
