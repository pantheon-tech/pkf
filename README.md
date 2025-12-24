# Project Knowledge Framework (PKF)

A comprehensive, implementation-agnostic specification for organizing, maintaining, and governing documentation across software projects.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Overview

PKF (Project Knowledge Framework) provides a structured approach to documentation that works for both human developers and AI agents. Originally extracted from the Claude Agent Orchestration Framework (CAOF), PKF defines standards for:

- **Documentation structure and organization** - Clear hierarchy for docs, guides, references
- **Register management** - TODO, ISSUES, CHANGELOG tracking with YAML frontmatter
- **Template system** - Reusable document templates with placeholders
- **Schema validation** - JSON Schema validation for register entries
- **AI agent guidance** - CLAUDE.md files for AI agent instructions

## Key Features

- **Implementation-agnostic** - Works with any technology stack
- **AI-friendly** - Optimized for AI agent consumption
- **Machine-parseable** - JSON Schemas for programmatic validation
- **Human-readable** - Clear documentation for developers
- **Portable** - Can be applied to any project

## Quick Start

### For New Projects

```bash
# 1. Copy PKF to your project
cp -r pkf/templates/ your-project/docs/framework/templates/
cp -r pkf/schemas/ your-project/docs/framework/schemas/

# 2. Create required files from templates
cp templates/CLAUDE.template.md your-project/CLAUDE.md
cp templates/README.template.md your-project/README.md
cp templates/registers/*.template.md your-project/docs/registers/

# 3. Replace placeholders
# Edit files and replace {{PLACEHOLDER}} values
```

### For Existing Projects

See [Implementation Guide](docs/guides/IMPLEMENTATION-GUIDE.md) for migration instructions.

## Documentation

| Document | Description |
|----------|-------------|
| [PKF Specification](docs/framework/specifications/PKF-SPECIFICATION.md) | Complete framework specification |
| [Implementation Guide](docs/guides/IMPLEMENTATION-GUIDE.md) | Setup and migration guide |
| [Schemas](schemas/) | JSON Schema validation files |
| [Templates](templates/) | Document templates |

## Project Structure

```
pkf/
├── README.md                    # This file
├── CLAUDE.md                    # AI agent guidance
│
├── docs/
│   ├── README.md               # Documentation hub
│   ├── registers/              # Project registers
│   │   ├── TODO.md
│   │   ├── ISSUES.md
│   │   └── CHANGELOG.md
│   ├── framework/
│   │   ├── specifications/     # PKF specification
│   │   ├── schemas/            # Validation schemas
│   │   └── templates/          # Reference templates
│   ├── guides/                 # User guides
│   └── architecture/           # Architecture docs
│
├── schemas/                    # Distributable schemas
│   └── *.schema.json
│
├── templates/                  # Distributable templates
│   ├── CLAUDE.template.md
│   ├── README.template.md
│   ├── registers/
│   ├── guides/
│   └── references/
│
└── agents/                     # AI agent definitions
    └── *.md
```

## Core Concepts

### Document Type Taxonomy

| Category | Purpose | Location |
|----------|---------|----------|
| **Registers** | Track work items | `docs/registers/` |
| **Specifications** | Define standards | `docs/framework/specifications/` |
| **Guides** | Explain how-to | `docs/guides/` |
| **References** | Lookup info | `docs/api/`, `docs/architecture/` |
| **Templates** | Reusable structures | `templates/` |

### Register System

| Register | Tracks | ID Format |
|----------|--------|-----------|
| TODO.md | Tasks, work items | `TODO-001` |
| ISSUES.md | Bugs, problems | `ISSUE-001` |
| CHANGELOG.md | Version history | `v1.0.0` |

### Placeholder System

Templates use `{{PLACEHOLDER}}` syntax:

```markdown
# {{PROJECT_NAME}}

**Version:** {{VERSION}}
**Last Updated:** {{DATE}}
```

## Contributing

1. Review the [PKF Specification](docs/framework/specifications/PKF-SPECIFICATION.md)
2. Follow PKF standards (the framework follows itself!)
3. Update registers when making changes
4. Ensure schema validation passes

## Changelog

See [CHANGELOG.md](docs/registers/CHANGELOG.md) for version history.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Version:** 1.0.0 | **Last Updated:** 2025-12-24
