# PKF Implementation Guide

**Version:** 1.0.0
**Last Updated:** 2025-12-24

This guide provides step-by-step instructions for implementing the Project Knowledge Framework (PKF) in new projects or migrating existing documentation to PKF standards.

---

## Table of Contents

1. [Overview](#overview)
2. [Fresh Project Setup](#fresh-project-setup)
3. [Migration from Existing Documentation](#migration-from-existing-documentation)
4. [Validation and Linting](#validation-and-linting)
5. [AI Agent Integration](#ai-agent-integration)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### What is PKF?

The Project Knowledge Framework (PKF) is a specification for organizing project documentation that works for both human developers and AI agents. It provides:

- **Structured documentation hierarchy** - Clear organization of docs, guides, references
- **Register system** - TODO, ISSUES, CHANGELOG tracking with YAML frontmatter
- **Templates** - Reusable document templates for consistency
- **Schemas** - JSON Schema validation for register entries
- **AI guidance** - CLAUDE.md files for AI agent instructions

### PKF Components

| Component | Description | Location |
|-----------|-------------|----------|
| **Specification** | Core PKF standards | `PKF-SPECIFICATION.md` |
| **Schemas** | JSON Schema validation | `schemas/*.schema.json` |
| **Templates** | Document templates | `templates/*.template.md` |
| **Agents** | AI agent definitions | `agents/*.md` |

---

## Fresh Project Setup

### Prerequisites

- Git repository initialized
- Project structure (src/, tests/, etc.) in place
- Package manager configured (npm, pnpm, yarn)

### Step 1: Create Directory Structure

```bash
# Create documentation directories
mkdir -p docs/{architecture,guides,api,examples,registers,framework/{templates,schemas,specifications}}

# Create archive directory (optional)
mkdir -p docs_archive/{versions,iterations}

# Create AI agent directory (optional)
mkdir -p .claude/agents
```

### Step 2: Create Required Files

#### 2.1 Create CLAUDE.md

Copy from template and customize:

```bash
# Copy template
cp templates/CLAUDE.template.md CLAUDE.md
```

Replace placeholders:
- `{{PROJECT_NAME}}` - Your project name
- `{{VERSION}}` - Current version (e.g., "0.1.0")
- `{{STATUS}}` - "Alpha", "Beta", "Stable"
- `{{DATE}}` - Current date (YYYY-MM-DD)
- Other placeholders as needed

#### 2.2 Create README.md

Copy from template and customize:

```bash
cp templates/README.template.md README.md
```

#### 2.3 Create Registers

```bash
# Create register files from templates
cp templates/registers/TODO.template.md docs/registers/TODO.md
cp templates/registers/ISSUES.template.md docs/registers/ISSUES.md
cp templates/registers/CHANGELOG.template.md docs/registers/CHANGELOG.md
```

Replace placeholders in each file.

#### 2.4 Create Navigation Hubs

Create `README.md` files for each documentation directory:

```markdown
# [Directory Name]

> Brief description of this section

## Contents

- [Document 1](document-1.md) - Description
- [Subdirectory/](subdirectory/) - Description

## See Also

- [Related Section](../related/)
```

### Step 3: Initialize Version

1. Update `docs/registers/CHANGELOG.md` with initial version entry
2. Set version in `package.json`
3. Update CLAUDE.md with version

### Step 4: Verify Structure

Run verification checklist:

- [ ] `CLAUDE.md` exists at project root
- [ ] `README.md` exists at project root
- [ ] `docs/README.md` exists (navigation hub)
- [ ] `docs/registers/TODO.md` exists
- [ ] `docs/registers/ISSUES.md` exists
- [ ] `docs/registers/CHANGELOG.md` exists
- [ ] All placeholders replaced
- [ ] All internal links work

---

## Migration from Existing Documentation

### Phase 1: Assessment (Day 1)

#### 1.1 Audit Current State

Create an inventory of existing documentation:

```markdown
# Documentation Inventory

| File/Directory | Type | PKF Target | Action |
|----------------|------|------------|--------|
| README.md | Overview | Keep | Update format |
| docs/guide.md | Guide | docs/guides/ | Move & update |
| CHANGELOG.md | Register | docs/registers/ | Move & convert |
| api/ | Reference | docs/api/ | Keep location |
```

#### 1.2 Identify Gaps

Use the documentation-analyst agent pattern:

1. List all documentation files
2. Compare against PKF requirements
3. Note missing required files
4. Prioritize gaps

### Phase 2: Structure Migration (Day 2-3)

#### 2.1 Create PKF Directory Structure

```bash
# Create new directories
mkdir -p docs/{architecture,guides,api,registers,framework/{templates,schemas}}
```

#### 2.2 Move Existing Files

```bash
# Move guides
mv docs/guide.md docs/guides/user-guide.md

# Move changelog
mv CHANGELOG.md docs/registers/CHANGELOG.md

# Move API docs
mv api/* docs/api/
```

#### 2.3 Create Missing Required Files

Use templates for:
- `CLAUDE.md` (if missing)
- `docs/registers/TODO.md` (if missing)
- `docs/registers/ISSUES.md` (if missing)
- Navigation hub READMEs

### Phase 3: Content Migration (Day 4-5)

#### 3.1 Convert Register Format

Convert existing tracking files to PKF format:

**Before (unstructured):**
```markdown
## TODO

- Fix bug in parser
- Add feature X
```

**After (PKF format):**
```markdown
### TODO-001: Fix parser bug

```yaml
id: TODO-001
type: todo-item
status: pending
priority: high
created: 2025-12-24
updated: 2025-12-24
```

**Description:**
Fix the parsing bug that causes incorrect output.
```

#### 3.2 Add YAML Frontmatter

Add frontmatter to all register entries following schemas.

#### 3.3 Update Cross-References

Find and update all internal links:

```bash
# Find all markdown links
grep -rn '\[.*\](.*\.md)' docs/
```

Update paths to match new structure.

### Phase 4: Validation (Day 6)

#### 4.1 Link Validation

Check all internal links work:

```bash
# Simple link check
find docs -name "*.md" -exec grep -l '\[.*\](.*\.md)' {} \; | while read file; do
  echo "Checking: $file"
  grep -o '\[.*\](.*\.md)' "$file" | while read link; do
    target=$(echo "$link" | sed 's/.*(\(.*\))/\1/')
    if [ ! -f "$(dirname "$file")/$target" ]; then
      echo "  BROKEN: $target"
    fi
  done
done
```

#### 4.2 Schema Validation

Validate register entries against schemas:

```bash
# Using ajv-cli or similar
ajv validate -s schemas/todo-item.schema.json -d docs/registers/TODO.md
```

#### 4.3 Completeness Check

Verify PKF requirements:

- [ ] All required files exist
- [ ] All placeholders replaced
- [ ] All links valid
- [ ] All registers have valid YAML
- [ ] Navigation hubs complete

### Phase 5: Archive Legacy (Day 7)

#### 5.1 Move Legacy Documentation

```bash
# Move legacy docs to archive
mkdir -p docs_archive/iterations/legacy
mv docs_old/* docs_archive/iterations/legacy/
```

#### 5.2 Create Archive README

```markdown
# Archive: Legacy Documentation

**Archived Date:** 2025-12-24
**Reason:** Migrated to PKF structure
**Superseded By:** [Current Documentation](../../docs/)

## Contents

- [old-guide.md](old-guide.md) - Original user guide
- [api/](api/) - Original API documentation

## Migration Notes

Documentation migrated to PKF structure on 2025-12-24.
```

---

## Validation and Linting

### Schema Validation

PKF provides JSON Schemas for validating register entries:

| Schema | Validates |
|--------|-----------|
| `todo-item.schema.json` | TODO register entries |
| `issue-item.schema.json` | ISSUE register entries |
| `changelog-entry.schema.json` | CHANGELOG entries |
| `pkf-config.schema.json` | PKF configuration |

### Validation Tools

#### Using AJV (Node.js)

```bash
# Install ajv-cli
npm install -g ajv-cli

# Validate TODO items
ajv validate -s schemas/todo-item.schema.json -d extracted-todo.json
```

#### Using JSON Schema Validators

Most IDEs support JSON Schema validation. Add schema references to enable inline validation.

### Link Checking

```bash
# Using markdown-link-check
npm install -g markdown-link-check
find docs -name "*.md" | xargs -I {} markdown-link-check {}
```

### Custom Linting Rules

PKF recommends these linting checks:

1. **File naming** - Verify file names match conventions
2. **Section headers** - Required sections present
3. **Date format** - All dates are YYYY-MM-DD
4. **ID format** - IDs match patterns (TODO-NNN, etc.)
5. **Link integrity** - All internal links valid

---

## AI Agent Integration

### Using PKF with AI Agents

PKF is designed for AI agent consumption. Key integration points:

#### 1. CLAUDE.md Entry Point

AI agents should start with `CLAUDE.md` for project context:

```markdown
<!-- In CLAUDE.md -->
## Quick Reference

When working on this project:
1. Follow [RULES.md](RULES.md) for development rules
2. Check [TODO.md](docs/registers/TODO.md) for pending tasks
3. Update [CHANGELOG.md](docs/registers/CHANGELOG.md) for notable changes
```

#### 2. Custom Agent Definitions

For specialized tasks, define custom agents in `.claude/agents/`:

| Agent | Purpose |
|-------|---------|
| `documentation-analyst` | Audit documentation quality |
| `documentation-writer` | Create/update documentation |
| `codebase-doc-comparator` | Detect doc/code drift |

#### 3. Agent Workflow Patterns

**Sequential Analysis:**
```
documentation-analyst → codebase-doc-comparator → documentation-writer
```

**Parallel Audit:**
```
├─> documentation-analyst (coverage)
├─> codebase-doc-comparator (drift)
└─> [aggregate findings]
```

### AI-Friendly Documentation Patterns

1. **Clear Hierarchy** - Use consistent heading levels
2. **Explicit Links** - No ambiguous references
3. **YAML Frontmatter** - Machine-parseable metadata
4. **File:Line References** - `file.ts:42` format
5. **Consistent Templates** - Predictable structure

---

## Maintenance Procedures

### Daily/Per-Change

When making changes:

1. **Update affected documentation**
   - README if features change
   - API docs if interfaces change
   - Architecture if structure changes

2. **Update registers**
   - Mark TODOs complete
   - Add new items as discovered
   - Update CHANGELOG for notable changes

### Weekly

1. **Update register statistics**
   - Count open/closed items
   - Update "Last Updated" dates

2. **Review and triage**
   - Prioritize new items
   - Close stale items
   - Merge duplicates

3. **Link validation**
   - Check for broken links
   - Update moved references

### Per Release

1. **Version updates**
   - Update version in CLAUDE.md, README
   - Finalize CHANGELOG entries
   - Move "Unreleased" to version section

2. **Archive (if major/minor)**
   - Copy current docs to `docs_archive/versions/vX.Y.Z/`
   - Create archive README

3. **Documentation review**
   - Update feature lists
   - Verify API documentation current
   - Check examples still work

---

## Troubleshooting

### Common Issues

#### Issue: Broken Internal Links

**Symptom:** Links return 404 or file not found

**Solution:**
1. Check relative path is correct
2. Verify file exists at target location
3. Check for typos in filename
4. Use consistent case (lowercase recommended)

#### Issue: Invalid YAML Frontmatter

**Symptom:** Schema validation fails

**Solution:**
1. Verify YAML syntax (proper indentation, quotes)
2. Check field names match schema
3. Ensure required fields present
4. Validate date format (YYYY-MM-DD)

#### Issue: Missing Required Files

**Symptom:** PKF compliance check fails

**Solution:**
1. Run `ls -la` to verify file exists
2. Check file is in correct directory
3. Create from template if missing
4. Verify file has content (not empty)

#### Issue: Stale Statistics

**Symptom:** Quick Stats don't match actual counts

**Solution:**
1. Manually recount items
2. Update statistics section
3. Update "Last Updated" date
4. Consider automation script

### Getting Help

- Review [PKF Specification](../framework/specifications/PKF-SPECIFICATION.md)
- Check [schemas/](../framework/schemas/) for validation rules
- Reference [templates/](../../templates/) for correct format
- Use documentation-analyst agent for audits

---

## Appendix: Quick Reference

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Specifications | SCREAMING-KEBAB | `PKF-SPECIFICATION.md` |
| Templates | SCREAMING-KEBAB | `TODO-TEMPLATE.md` |
| Registers | SCREAMING | `TODO.md` |
| Guides | kebab-case | `getting-started.md` |
| Schemas | kebab-case | `todo-item.schema.json` |

### Required Files Checklist

```
[ ] CLAUDE.md
[ ] README.md
[ ] docs/README.md
[ ] docs/registers/TODO.md
[ ] docs/registers/ISSUES.md
[ ] docs/registers/CHANGELOG.md
```

### Placeholder Reference

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{PROJECT_NAME}}` | Project name | "MyProject" |
| `{{PACKAGE_NAME}}` | Package name | "@org/package" |
| `{{VERSION}}` | SemVer version | "1.0.0" |
| `{{DATE}}` | ISO date | "2025-12-24" |
| `{{STATUS}}` | Release status | "Alpha" |
| `{{REPOSITORY_URL}}` | Git repository | "https://github.com/..." |

---

**Template:** PKF Implementation Guide v1.0.0
**Last Updated:** 2025-12-24
