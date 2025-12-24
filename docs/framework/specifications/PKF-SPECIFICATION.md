# Project Knowledge Framework (PKF) Specification

**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2025-12-24

## Overview

The Project Knowledge Framework (PKF) is a comprehensive, implementation-agnostic specification for organizing, maintaining, and governing documentation across software projects. Extracted from the Claude Agent Orchestration Framework (CAOF), PKF provides a structured approach to documentation that works for both human developers and AI agents.

### Purpose

PKF defines standards for:
- Documentation structure and organization
- Register management (TODO, ISSUES, CHANGELOG)
- Template usage and creation
- File naming and directory conventions
- Cross-referencing and linking patterns
- Archive management and deprecation

### Design Principles

1. **Consistency** - Uniform documentation patterns across all repositories and components
2. **Discoverability** - Standard locations and navigation for finding information
3. **Maintainability** - Structured tracking via registers with clear ownership
4. **AI-Friendly** - Optimized for AI agent consumption with clear hierarchies
5. **Minimal Overhead** - Only require what adds value; avoid documentation for documentation's sake
6. **Single Source of Truth** - Clear authority for each piece of information
7. **Archive Management** - Clear deprecation and historical preservation policies
8. **Portability** - Framework can be applied to any project regardless of technology stack

---

## Document Type Taxonomy

### Primary Document Categories

| Category | Purpose | Typical Location |
|----------|---------|------------------|
| **Registers** | Track work items, issues, and changes | `docs/registers/` |
| **Specifications** | Define standards and contracts | `docs/framework/specifications/` |
| **Guides** | Explain how to accomplish tasks | `docs/guides/` |
| **References** | Provide lookup information (APIs, architecture) | `docs/api/`, `docs/architecture/` |
| **Templates** | Provide reusable document structures | `docs/framework/templates/` |
| **AI Guidance** | Instruct AI agents working on the project | `CLAUDE.md`, `.claude/` |

### Register Types

Registers are the core tracking mechanism in PKF:

| Register | Purpose | Item Type | ID Format |
|----------|---------|-----------|-----------|
| **TODO.md** | Pending tasks and work items | `todo-item` | `TODO-NNN` |
| **ISSUES.md** | Bugs, problems, and blockers | `issue-item` | `ISSUE-NNN` |
| **CHANGELOG.md** | Version history and changes | `changelog-entry` | `vX.Y.Z` |

### Document Status Values

| Status | Applies To | Meaning |
|--------|-----------|---------|
| `Draft` | Specs, Architecture | Work in progress, not finalized |
| `Active` | Specs, Architecture | Current, authoritative version |
| `Deprecated` | Any | Superseded, will be removed |
| `Archived` | Any | Historical record, no longer active |

---

## Directory Structure Standards

### Project-Level Structure

```
{{PROJECT_ROOT}}/
├── CLAUDE.md                           # AI agent guidance (REQUIRED)
├── README.md                           # Human-readable overview (REQUIRED)
├── RULES.md                            # Development rules (optional)
├── CONVENTIONS.md                      # Coding conventions (optional)
│
├── docs/                               # ACTIVE documentation
│   ├── README.md                       # Documentation navigation hub
│   │
│   ├── framework/                      # Documentation framework (meta)
│   │   ├── README.md                   # Framework overview
│   │   ├── specifications/             # Framework specification docs
│   │   │   └── *.md
│   │   ├── templates/                  # Reusable templates
│   │   │   └── *.md
│   │   └── schemas/                    # JSON Schemas for validation
│   │       └── *.schema.json
│   │
│   ├── architecture/                   # Architecture documentation
│   │   ├── README.md                   # Architecture overview
│   │   ├── *.md                        # Architecture documents
│   │   └── decisions/                  # Architecture Decision Records
│   │       └── ADR-NNN-*.md
│   │
│   ├── guides/                         # User and developer guides
│   │   ├── README.md                   # Guides index
│   │   └── *.md
│   │
│   ├── api/                            # API documentation
│   │   ├── README.md                   # API index
│   │   └── *.md
│   │
│   ├── examples/                       # Usage examples
│   │   ├── README.md                   # Examples index
│   │   └── */
│   │
│   ├── proposals/                      # Enhancement proposals
│   │   ├── README.md                   # Proposal index
│   │   ├── active/                     # Active proposals
│   │   ├── implemented/                # Completed proposals
│   │   └── archived/                   # Rejected/deferred proposals
│   │
│   └── registers/                      # PROJECT-LEVEL registers
│       ├── TODO.md                     # Task tracking
│       ├── ISSUES.md                   # Issue tracking
│       └── CHANGELOG.md                # Version history
│
├── docs_archive/                       # ARCHIVED documentation
│   ├── README.md                       # Archive index
│   ├── versions/                       # Version-specific archives
│   └── iterations/                     # Abandoned approach archives
│
└── .claude/                            # AI agent configuration
    ├── settings.json                   # Claude Code settings
    ├── SYSTEM-PROMPT.md               # Extended AI guidance
    └── agents/                         # Custom agent definitions
        ├── AGENT-GUIDE.md             # Agent reference
        └── *.md                        # Individual agent specs
```

### Package/Module-Level Structure

For projects with multiple packages or modules:

```
packages/{{PACKAGE_NAME}}/
├── CLAUDE.md                    # Package-level AI guidance (REQUIRED)
├── README.md                    # Package overview (REQUIRED)
│
├── docs/
│   ├── README.md                # Package documentation index
│   ├── registers/               # Package-level tracking
│   │   ├── TODO.md
│   │   ├── ISSUES.md
│   │   └── CHANGELOG.md
│   ├── api/                     # Package API documentation (optional)
│   └── guides/                  # Package-specific guides (optional)
│
└── src/                         # Source code
```

### Required vs Optional Sections

| Section | Project-Level | Package-Level | Condition |
|---------|---------------|---------------|-----------|
| `CLAUDE.md` | Required | Required | Always |
| `README.md` | Required | Required | Always |
| `docs/README.md` | Required | Required | Always |
| `docs/registers/` | Required | Required | Always (TODO, ISSUES, CHANGELOG) |
| `docs/api/` | Optional | Conditional | Only if public API exists |
| `docs/guides/` | Optional | Conditional | Only if guides are needed |
| `docs/architecture/` | Required | Conditional | Project: always; Package: 5+ modules |
| `docs/framework/` | Required | Not Used | Project-level only |
| `docs_archive/` | Optional | Not Used | When archiving is needed |

---

## Naming Conventions

### File Naming Matrix

| Type | Convention | Pattern | Example |
|------|------------|---------|---------|
| **Specifications** | SCREAMING-KEBAB-CASE | `{NAME}.md` | `DOCUMENTATION-STANDARDS.md` |
| **Templates** | SCREAMING-KEBAB-CASE | `{NAME}-TEMPLATE.md` | `CLAUDE-TEMPLATE.md` |
| **Registers** | SCREAMING-CASE | `{TYPE}.md` | `TODO.md`, `ISSUES.md` |
| **Architecture Docs** | SCREAMING-KEBAB-CASE | `{NAME}.md` | `SYSTEM-OVERVIEW.md` |
| **ADRs** | ADR-NNN-kebab-case | `ADR-{NNN}-{name}.md` | `ADR-001-dependency-injection.md` |
| **User Guides** | kebab-case | `{name}.md` | `getting-started.md` |
| **API Docs** | kebab-case | `{name}.md` | `api-reference.md` |
| **Proposals** | PROP-NNN-kebab-case | `PROP-{NNN}-{name}.md` | `PROP-003-sdk-alignment.md` |
| **Schemas** | kebab-case | `{name}.schema.json` | `todo-item.schema.json` |
| **Index Files** | README | `README.md` | `README.md` |

### ID Numbering Conventions

| Type | Pattern | Padding | Example |
|------|---------|---------|---------|
| **TODOs** | `TODO-NNN` | 3 digits | `TODO-001`, `TODO-042` |
| **ISSUEs** | `ISSUE-NNN` | 3 digits | `ISSUE-001`, `ISSUE-023` |
| **ADRs** | `ADR-NNN` | 3 digits | `ADR-001`, `ADR-015` |
| **Proposals** | `PROP-NNN` | 3 digits | `PROP-001`, `PROP-100` |
| **Versions** | `vMAJOR.MINOR.PATCH` | SemVer | `v1.2.3`, `v0.1.0-alpha.1` |

### Proposal Numbering Ranges

Proposals use numbered ranges to enable logical grouping:

| Range | Category | Description |
|-------|----------|-------------|
| **PROP-0xx** | Core Workflow | Pre-architecture, coordination, governance |
| **PROP-1xx** | Agent System | Agent definitions, prompts, orchestration |
| **PROP-2xx** | MCP/Tools | Tool enhancements, integrations |
| **PROP-3xx** | Memory/Session | Memory management, persistence |
| **PROP-4xx** | Integration | External systems, deployments |
| **PROP-9xx** | Experimental | Research, speculative ideas |

---

## Register Specifications

### Register Format

All registers follow this structure:

```markdown
# [Register Name]

> [Brief description of register purpose]

## Quick Stats

- **Total Items:** N
- **Open/Pending:** N
- **Closed/Completed:** N
- **Last Updated:** YYYY-MM-DD

---

## Items

### [ITEM-ID] Item Title

\`\`\`yaml
id: ITEM-ID
type: [item-type]
status: [status]
priority: [priority]
created: YYYY-MM-DD
updated: YYYY-MM-DD
# ... additional fields per item schema
\`\`\`

**Description:**

[Detailed description]

---

## Archive

[Completed/resolved items moved here]

---

*Register format: v1.0.0 | See [Documentation Framework](path/to/framework.md)*
```

### Item Status Values

#### TODO Items

| Status | Meaning | Transition From |
|--------|---------|-----------------|
| `pending` | Not started | (initial) |
| `in-progress` | Work underway | `pending`, `blocked` |
| `blocked` | Waiting on dependency | `pending`, `in-progress` |
| `completed` | Done | `in-progress` |
| `cancelled` | No longer needed | `pending`, `blocked` |

#### Issue Items

| Status | Meaning | Transition From |
|--------|---------|-----------------|
| `open` | New issue | (initial) |
| `investigating` | Being analyzed | `open` |
| `in-progress` | Fix underway | `investigating` |
| `resolved` | Fixed | `in-progress` |
| `wontfix` | Will not be fixed | `open`, `investigating` |
| `duplicate` | Duplicate of another | `open` |

#### Changelog Entries

| Status | Meaning |
|--------|---------|
| `unreleased` | Changes not yet released (HEAD section) |
| `released` | Publicly released |

### Priority Values

| Priority | Meaning | Color Coding (optional) |
|----------|---------|------------------------|
| `critical` | Immediate attention required | Red |
| `high` | Should be done soon | Orange |
| `medium` | Normal priority (default) | Yellow |
| `low` | Can wait | Green |

### Severity Values (Issues Only)

| Severity | Meaning | Examples |
|----------|---------|----------|
| `critical` | System unusable, data loss | Crash, security breach |
| `high` | Major functionality broken | Core feature fails |
| `medium` | Feature partially broken | Edge case fails |
| `low` | Minor inconvenience | Cosmetic, typos |

---

## Navigation Hub Pattern

Every major documentation directory MUST have a `README.md` that serves as a navigation hub:

```markdown
# [Directory Name]

> Brief description of this documentation section

## Contents

- [Document 1](document-1.md) - Brief description
- [Document 2](document-2.md) - Brief description
- [Subdirectory/](subdirectory/) - Brief description

## Quick Links

- [Most Important Doc](important.md)
- [Getting Started](getting-started.md)

## See Also

- [Related Section](../related/)
```

### Navigation Hub Requirements

1. **Title**: Clear name matching the directory purpose
2. **Description**: One-line explanation of what the section contains
3. **Contents**: Complete list of all documents with brief descriptions
4. **Quick Links**: Highlight most-accessed or important documents
5. **See Also**: Links to related sections

---

## Cross-Reference Standards

### Relative Path Conventions

```markdown
<!-- From package to project root -->
[Project Rules](../../RULES.md)

<!-- From project root to package -->
[Package README](packages/types/README.md)

<!-- Within same directory -->
[Sibling Doc](sibling-doc.md)

<!-- To parent directory -->
[Parent README](../README.md)

<!-- To specific section -->
[Section Name](#section-anchor)

<!-- To specific section in another file -->
[Section in Other File](other-file.md#section-anchor)
```

### Link Validation Rules

1. **No absolute URLs for internal docs** - Use relative paths
2. **No broken links** - All links must resolve
3. **No orphaned docs** - All docs must be linked from navigation
4. **Anchor consistency** - Section anchors must match headings

---

## CLAUDE.md Structure

CLAUDE.md is the AI agent guidance file. Every project and package MUST have one.

### Required Sections

1. **Header** - Package/project name, version, status, brief purpose
2. **Project Rules Reference** - Link to RULES.md and CONVENTIONS.md (if applicable)
3. **Overview** - Purpose, scope, key features
4. **Quick Start** - Essential commands (install, build, test)
5. **Architecture** - Directory structure, key design decisions
6. **Dependencies** - Internal and external dependencies
7. **Development** - Build, test, lint commands
8. **Integration Points** - "Used By" and "Uses" relationships
9. **Registers** - Links to TODO, ISSUES, CHANGELOG
10. **Contributing** - How to contribute

### Optional Sections

Add when relevant:

- **Performance Considerations** - When package has performance implications
- **Known Limitations** - When architectural constraints exist
- **Troubleshooting** - When common issues occur
- **Architecture Diagram** - When package has 5+ modules
- **Backward Compatibility** - When versioning matters

---

## Archive Management

### Archive Structure

```
docs_archive/
├── README.md                     # Archive navigation
├── ARCHIVE-INDEX.md              # Searchable index
│
├── versions/                     # Version-specific archives
│   └── v{X.Y.Z}/
│       └── README.md             # Version context
│
└── iterations/                   # Abandoned approaches
    └── {iteration-name}/
        └── README.md             # Iteration context
```

### What Gets Archived vs Deleted

| Content Type | Action | Retention |
|--------------|--------|-----------|
| Version-specific docs | Archive | Permanent |
| Abandoned architectures | Archive | Permanent (historical record) |
| Deprecated features | Archive | Until major version + 2 |
| Superseded guides | Archive | 1-3 years |
| Temporary notes | Delete | Immediate |
| Duplicate content | Delete | Immediate |
| Draft docs never finalized | Delete | Immediate |

### Archive Metadata Requirements

Every archived directory MUST contain a README.md with:

```markdown
# Archive: [Name]

**Archived Date:** YYYY-MM-DD
**Original Date Range:** YYYY-MM-DD to YYYY-MM-DD
**Reason:** [Why archived]
**Superseded By:** [Link to current docs] OR "Not applicable"

## Context

### Historical Background
[Why this existed]

### Timeline
- Created: YYYY-MM-DD
- Active Period: YYYY-MM-DD to YYYY-MM-DD
- Archived: YYYY-MM-DD

### Lessons Learned
[Insights from this iteration]

## Contents
[List of archived documents]

## See Also
[Links to current documentation]
```

---

## Validation and Quality

### Schema Validation

All register items SHOULD validate against JSON schemas:

- `register.schema.json` - Overall register structure
- `todo-item.schema.json` - TODO item format
- `issue-item.schema.json` - Issue item format
- `changelog-entry.schema.json` - Changelog entry format

### Quality Checklist

Before committing documentation changes:

- [ ] All links are valid and point to existing files
- [ ] All code examples are syntax-highlighted correctly
- [ ] All YAML frontmatter validates against schemas
- [ ] All register statistics are up-to-date
- [ ] All navigation hubs (README.md) are updated
- [ ] All version numbers are consistent
- [ ] All dates use YYYY-MM-DD format

### Maintenance Procedures

#### Per Change

- [ ] Update affected documentation
- [ ] Update relevant registers
- [ ] Validate links and references

#### Weekly

- [ ] Update Quick Stats in registers
- [ ] Review and triage new items
- [ ] Check for broken links

#### Per Release

- [ ] Update all version numbers
- [ ] Create CHANGELOG entries
- [ ] Archive previous version (if major/minor)
- [ ] Update API documentation

---

## AI Agent Integration

### Entry Points

| User Type | Entry Point | Purpose |
|-----------|-------------|---------|
| **AI Agent** | `CLAUDE.md` | Primary guidance |
| **Developer** | `README.md` | Human overview |
| **Architect** | `docs/architecture/` | System design |

### AI-Optimized Documentation

Documentation following PKF is optimized for AI agents:

1. **Clear Hierarchy** - Structured headings and sections
2. **Explicit Links** - No ambiguous references
3. **YAML Frontmatter** - Machine-parseable metadata
4. **Consistent Patterns** - Predictable document structures
5. **File:Line References** - Precise code pointers

### Custom Agent Definitions

For projects using AI agents extensively, define custom agents in `.claude/agents/`:

```markdown
---
name: agent-name
description: Brief description of agent purpose
model: [opus|sonnet|haiku]
tools: [Tool1, Tool2, ...]
---

# Agent Name

## Identity
- Agent ID, Role, Phase

## Purpose
What this agent does

## Responsibilities
1. Responsibility 1
2. Responsibility 2

## Constraints
- What agent must NOT do

## Completion Criteria
- Success conditions
```

---

## Implementation Checklist

### New Project Setup

- [ ] Create `CLAUDE.md` from template
- [ ] Create `README.md` with project overview
- [ ] Create `docs/README.md` navigation hub
- [ ] Create `docs/registers/` with TODO, ISSUES, CHANGELOG
- [ ] Create `docs/framework/` with templates (optional)
- [ ] Add first CHANGELOG entry
- [ ] Verify all internal links work

### New Package Setup

- [ ] Copy `CLAUDE-TEMPLATE.md` → `CLAUDE.md` and customize
- [ ] Create `README.md` with package overview
- [ ] Create `docs/README.md` navigation hub
- [ ] Create `docs/registers/` with TODO, ISSUES, CHANGELOG
- [ ] Add first CHANGELOG entry
- [ ] Link from project-level docs

### Migration from Existing Docs

- [ ] Audit existing documentation
- [ ] Map to PKF structure
- [ ] Create missing registers
- [ ] Move/rename files to match conventions
- [ ] Update all internal links
- [ ] Archive legacy docs as needed
- [ ] Validate complete structure

---

## References

### External Standards

- [Keep a Changelog](https://keepachangelog.com/) - Changelog format
- [Semantic Versioning](https://semver.org/) - Version numbering
- [Architecture Decision Records](https://adr.github.io/) - ADR format
- [CommonMark](https://commonmark.org/) - Markdown standard

---

**Document Version:** 1.0.0
**PKF Specification Version:** 1.0.0
**Last Review:** 2025-12-24
