# Changelog

> Version history and release notes for PKF.

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Quick Stats

- **Current Version:** 1.0.0
- **Total Releases:** 1
- **Last Release:** 2025-12-24

---

## [Unreleased]

```yaml
version: unreleased
type: changelog-entry
status: unreleased
date: null
```

### Added

-

### Changed

-

### Fixed

-

---

## [1.0.0] - 2025-12-24

```yaml
version: 1.0.0
type: changelog-entry
status: released
date: 2025-12-24
breaking_changes: false
migration_required: false
highlights:
  - Initial release of PKF
  - Complete specification extracted from CAOF
  - 8 JSON schemas for validation
  - 8 parameterized templates
  - 3 AI agent definitions
migration_notes: null
contributors: []
```

### Added

- **PKF Specification** - Complete framework specification document
- **Implementation Guide** - Setup and migration guide for adopting PKF
- **JSON Schemas**
  - `pkf-config.schema.json` - Project configuration
  - `document-frontmatter.schema.json` - Document metadata
  - `register-entry.schema.json` - Base register entry
  - `todo-item.schema.json` - TODO item validation
  - `issue-item.schema.json` - Issue item validation
  - `changelog-entry.schema.json` - Changelog entry validation
  - `directory-structure.schema.json` - Structure validation
  - `template-metadata.schema.json` - Template placeholder metadata
- **Templates**
  - `CLAUDE.template.md` - AI agent guidance
  - `README.template.md` - Project README
  - `TODO.template.md` - TODO register
  - `ISSUES.template.md` - Issues register
  - `CHANGELOG.template.md` - Changelog register
  - `USER-GUIDE.template.md` - User guide
  - `API-REFERENCE.template.md` - API reference
  - `ARCHITECTURE.template.md` - Architecture document
- **Agent Definitions**
  - `documentation-analyst.md` - Documentation auditing
  - `documentation-writer.md` - Documentation creation
  - `codebase-doc-comparator.md` - Doc/code drift detection

### Documentation

- Created comprehensive PKF specification
- Added implementation guide with setup and migration instructions
- Established self-documenting project structure (PKF follows itself)

---

**Register Version:** 1.0.0
**Template:** PKF CHANGELOG Template v1.0.0
**Last Updated:** 2025-12-24

<!-- Link definitions -->
[Unreleased]: #unreleased
[1.0.0]: #100---2025-12-24
