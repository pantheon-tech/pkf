# PKF Templates

> Distributable document templates for PKF adoption.

## Contents

### Core Templates

- [CLAUDE.template.md](CLAUDE.template.md) - AI agent guidance file
- [README.template.md](README.template.md) - Project README

### Register Templates

- [registers/](registers/) - Register templates
  - [TODO.template.md](registers/TODO.template.md) - Task tracking
  - [ISSUES.template.md](registers/ISSUES.template.md) - Issue tracking
  - [CHANGELOG.template.md](registers/CHANGELOG.template.md) - Version history

### Guide Templates

- [guides/](guides/) - Guide templates
  - [USER-GUIDE.template.md](guides/USER-GUIDE.template.md) - User guide

### Reference Templates

- [references/](references/) - Reference document templates
  - [API-REFERENCE.template.md](references/API-REFERENCE.template.md) - API documentation
  - [ARCHITECTURE.template.md](references/ARCHITECTURE.template.md) - Architecture document

## Usage

1. Copy the template you need to your project
2. Rename from `.template.md` to `.md`
3. Replace all `{{PLACEHOLDER}}` values with your content
4. Remove any sections that don't apply

## Common Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{PROJECT_NAME}}` | Project name | "MyProject" |
| `{{PACKAGE_NAME}}` | Package/module name | "@org/package" |
| `{{VERSION}}` | SemVer version | "1.0.0" |
| `{{DATE}}` | ISO date | "2025-12-24" |
| `{{STATUS}}` | Document status | "Active" |
| `{{REPOSITORY_URL}}` | Git repository URL | "https://github.com/..." |

## See Also

- [PKF Specification](../docs/framework/specifications/PKF-SPECIFICATION.md) - Template standards
- [Schemas](../schemas/) - Validation schemas

---

**Last Updated:** 2025-12-24
