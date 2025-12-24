# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Project Rules:** This {{SCOPE_TYPE}} follows the [Project Rules]({{RULES_PATH}}) and [Coding Conventions]({{CONVENTIONS_PATH}}).

## {{SCOPE_TYPE_CAPITALIZED}} Overview

**{{SCOPE_TYPE_CAPITALIZED}}:** `{{PACKAGE_NAME}}`
**Version:** {{VERSION}}
**Status:** {{STATUS}}

{{BRIEF_DESCRIPTION}}

### Purpose

{{DETAILED_PURPOSE}}

### Key Features

- {{FEATURE_1}}
- {{FEATURE_2}}
- {{FEATURE_3}}

---

## Quick Start

```bash
# Install dependencies
{{INSTALL_COMMAND}}

# Build
{{BUILD_COMMAND}}

# Test
{{TEST_COMMAND}}

# Lint
{{LINT_COMMAND}}
```

---

## Architecture

### Directory Structure

```
{{PACKAGE_NAME}}/
├── src/
│   ├── index.ts          # Public exports
│   ├── {{MODULE_1}}/     # {{MODULE_1_DESCRIPTION}}
│   └── {{MODULE_2}}/     # {{MODULE_2_DESCRIPTION}}
├── tests/
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── docs/
│   ├── README.md         # Documentation index
│   └── registers/        # TODO, ISSUES, CHANGELOG
├── package.json
├── tsconfig.json
└── CLAUDE.md             # This file
```

### Key Design Decisions

1. **{{DECISION_1_TITLE}}** - {{DECISION_1_RATIONALE}}
2. **{{DECISION_2_TITLE}}** - {{DECISION_2_RATIONALE}}

### Core Abstractions

| Abstraction | Purpose | Location |
|-------------|---------|----------|
| {{ABSTRACTION_1}} | {{PURPOSE_1}} | `src/{{PATH_1}}` |
| {{ABSTRACTION_2}} | {{PURPOSE_2}} | `src/{{PATH_2}}` |

---

## Dependencies

### Internal Dependencies

| Package | Purpose | Required |
|---------|---------|----------|
| {{INT_DEP_1}} | {{INT_DEP_1_PURPOSE}} | {{INT_DEP_1_REQUIRED}} |

### External Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| {{EXT_DEP_1}} | {{EXT_DEP_1_PURPOSE}} | {{EXT_DEP_1_VERSION}} |

---

## Development

### Building

```bash
{{BUILD_COMMAND}}          # Full build
{{BUILD_WATCH_COMMAND}}    # Watch mode
```

### Testing

```bash
{{TEST_COMMAND}}           # Run all tests
{{TEST_UNIT_COMMAND}}      # Unit tests only
{{TEST_INT_COMMAND}}       # Integration tests
{{TEST_COV_COMMAND}}       # With coverage
```

### Linting

```bash
{{LINT_COMMAND}}           # Check for issues
{{LINT_FIX_COMMAND}}       # Auto-fix issues
```

---

## API Reference

### Primary Exports

```{{CODE_LANGUAGE}}
// Main entry point
import { {{MAIN_EXPORT}} } from '{{PACKAGE_NAME}}';

// Example usage
{{USAGE_EXAMPLE}}
```

### Key Types

```{{CODE_LANGUAGE}}
{{KEY_TYPES}}
```

---

## Integration Points

### Used By

- `{{CONSUMER_1}}` - {{CONSUMER_1_USAGE}}
- `{{CONSUMER_2}}` - {{CONSUMER_2_USAGE}}

### Uses

- `{{DEPENDENCY_1}}` - {{DEPENDENCY_1_USAGE}}

---

## Registers

Track work items in the following registers:

- [`docs/registers/TODO.md`](docs/registers/TODO.md) - Pending tasks
- [`docs/registers/ISSUES.md`](docs/registers/ISSUES.md) - Bugs and problems
- [`docs/registers/CHANGELOG.md`](docs/registers/CHANGELOG.md) - Version history

---

## Contributing

1. Follow [Project Rules]({{RULES_PATH}})
2. Update relevant registers when making changes
3. Ensure all tests pass before committing
4. Add changelog entries for notable changes

---

**Template:** PKF CLAUDE Template v1.0.0
**Last Updated:** {{DATE}}
