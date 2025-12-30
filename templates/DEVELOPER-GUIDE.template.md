# Developer Guide

> **Project:** {{PROJECT_NAME}}
> **Version:** {{VERSION}}
> **Last Updated:** {{DATE}}

---

## Introduction

Welcome to the {{PROJECT_NAME}} developer guide. This document provides comprehensive information for developers working on this project.

### Audience

This guide is intended for:
- Core contributors
- External contributors
- Maintainers
- {{ADDITIONAL_AUDIENCE}}

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- {{PREREQUISITE_1}}
- {{PREREQUISITE_2}}
- {{PREREQUISITE_3}}

### Initial Setup

```bash
# 1. Clone the repository
git clone {{REPOSITORY_URL}}
cd {{PROJECT_NAME}}

# 2. Install dependencies
{{INSTALL_COMMAND}}

# 3. Build the project
{{BUILD_COMMAND}}

# 4. Run tests
{{TEST_COMMAND}}
```

---

## Development Environment

### Recommended Tools

| Tool | Purpose | Required |
|------|---------|----------|
| {{TOOL_1}} | {{TOOL_1_PURPOSE}} | {{TOOL_1_REQUIRED}} |
| {{TOOL_2}} | {{TOOL_2_PURPOSE}} | {{TOOL_2_REQUIRED}} |
| {{TOOL_3}} | {{TOOL_3_PURPOSE}} | {{TOOL_3_REQUIRED}} |

### IDE Configuration

#### VS Code

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
```

---

## Architecture

### System Overview

{{ARCHITECTURE_OVERVIEW}}

### Key Components

| Component | Responsibility | Location |
|-----------|---------------|----------|
| {{COMPONENT_1}} | {{COMPONENT_1_RESPONSIBILITY}} | `{{COMPONENT_1_PATH}}` |
| {{COMPONENT_2}} | {{COMPONENT_2_RESPONSIBILITY}} | `{{COMPONENT_2_PATH}}` |
| {{COMPONENT_3}} | {{COMPONENT_3_RESPONSIBILITY}} | `{{COMPONENT_3_PATH}}` |

### Design Patterns

- **{{PATTERN_1}}** - {{PATTERN_1_DESCRIPTION}}
- **{{PATTERN_2}}** - {{PATTERN_2_DESCRIPTION}}

---

## Coding Standards

### Code Style

We follow {{STYLE_GUIDE}} for code formatting.

**Key rules:**
- {{STYLE_RULE_1}}
- {{STYLE_RULE_2}}
- {{STYLE_RULE_3}}

### Naming Conventions

- **Files:** {{FILE_NAMING_CONVENTION}}
- **Classes:** {{CLASS_NAMING_CONVENTION}}
- **Functions:** {{FUNCTION_NAMING_CONVENTION}}
- **Variables:** {{VARIABLE_NAMING_CONVENTION}}

### Documentation

All public APIs must include:
- JSDoc/TSDoc comments
- Parameter descriptions
- Return value documentation
- Usage examples (for complex functions)

---

## Development Workflow

### Branch Strategy

```
main                    # Production-ready code
  ├── develop          # Integration branch
  │   ├── feature/*    # New features
  │   ├── fix/*        # Bug fixes
  │   └── refactor/*   # Code improvements
```

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b {{BRANCH_TYPE}}/{{FEATURE_NAME}}
   ```

2. **Make your changes**
   - Write tests first (TDD)
   - Implement the feature
   - Update documentation

3. **Run checks**
   ```bash
   {{LINT_COMMAND}}         # Lint code
   {{TEST_COMMAND}}         # Run tests
   {{BUILD_COMMAND}}        # Build project
   ```

4. **Commit changes**
   ```bash
   git add .
   git commit -m "{{COMMIT_MESSAGE_FORMAT}}"
   ```

5. **Push and create PR**
   ```bash
   git push origin {{BRANCH_TYPE}}/{{FEATURE_NAME}}
   # Create PR via GitHub UI
   ```

### Commit Message Format

```
{{COMMIT_TYPE}}: {{COMMIT_SUMMARY}}

{{COMMIT_BODY}}

{{COMMIT_FOOTER}}
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test updates
- `chore:` Maintenance tasks

---

## Testing

### Test Structure

```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── e2e/              # End-to-end tests
```

### Writing Tests

```{{CODE_LANGUAGE}}
{{TEST_EXAMPLE}}
```

### Running Tests

```bash
# All tests
{{TEST_COMMAND}}

# Specific test file
{{TEST_FILE_COMMAND}}

# With coverage
{{TEST_COV_COMMAND}}

# Watch mode
{{TEST_WATCH_COMMAND}}
```

---

## Building and Packaging

### Development Build

```bash
{{DEV_BUILD_COMMAND}}
```

### Production Build

```bash
{{PROD_BUILD_COMMAND}}
```

### Build Artifacts

Build artifacts are output to:
- **Development:** `{{DEV_OUTPUT_DIR}}`
- **Production:** `{{PROD_OUTPUT_DIR}}`

---

## Debugging

### Debug Configuration

```json
{{DEBUG_CONFIG}}
```

### Common Issues

| Issue | Solution |
|-------|----------|
| {{ISSUE_1}} | {{SOLUTION_1}} |
| {{ISSUE_2}} | {{SOLUTION_2}} |

---

## Documentation

### Updating Docs

Documentation lives in:
- `docs/` - Main documentation
- `README.md` - Project overview
- `CLAUDE.md` - AI agent guidance

### Registers

Track work in PKF registers:
- [`docs/registers/TODO.md`](docs/registers/TODO.md) - Pending tasks
- [`docs/registers/ISSUES.md`](docs/registers/ISSUES.md) - Known issues
- [`docs/registers/CHANGELOG.md`](docs/registers/CHANGELOG.md) - Version history

---

## Release Process

### Version Numbering

We use [Semantic Versioning](https://semver.org/):
- **Major:** Breaking changes
- **Minor:** New features (backward compatible)
- **Patch:** Bug fixes

### Creating a Release

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit version bump
4. Tag release: `git tag v{{VERSION}}`
5. Push: `git push && git push --tags`
6. {{RELEASE_STEP_6}}

---

## Resources

### Internal Resources

- [Architecture Documentation]({{ARCHITECTURE_DOCS_PATH}})
- [API Reference]({{API_DOCS_PATH}})
- [Contributing Guide](CONTRIBUTING.md)

### External Resources

- {{EXTERNAL_RESOURCE_1}}
- {{EXTERNAL_RESOURCE_2}}

---

## Getting Help

- **Issues:** [GitHub Issues]({{REPOSITORY_URL}}/issues)
- **Discussions:** [GitHub Discussions]({{REPOSITORY_URL}}/discussions)
- **Chat:** {{CHAT_LINK}}

---

**Template:** PKF Developer Guide Template v1.0.0
**Version:** {{VERSION}} | **Last Updated:** {{DATE}}
