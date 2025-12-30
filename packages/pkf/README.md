# PKF - Project Knowledge Framework

Declarative documentation management for software projects.

## Installation

```bash
npm install @pantheon-tech/pkf
```

Or use directly with npx:

```bash
npx @pantheon-tech/pkf init
```

## Quick Start

```bash
# Initialize PKF in your project
pkf init

# Build validation artifacts
pkf build

# Validate your documentation
pkf validate

# Check project status
pkf status
```

## Commands

### `pkf init`

Initialize PKF in the current project. Creates:
- `pkf.config.yaml` - Configuration file
- `docs/` - Documentation directory structure
- `CLAUDE.md` - AI integration file (optional)

Options:
- `--template <name>` - Template to use: `minimal`, `standard` (default), or `full`
- `-y, --yes` - Skip prompts and use defaults

### `pkf build`

Process `pkf.config.yaml` and generate validation artifacts.

Options:
- `-c, --config <path>` - Config file path (default: `pkf.config.yaml`)
- `-o, --output <dir>` - Output directory (default: `.pkf/generated`)
- `--strict` - Enable strict validation mode

### `pkf validate`

Run all documentation validations.

Options:
- `--structure` - Validate directory structure only
- `--content` - Validate content only (frontmatter, links)
- `--fix` - Attempt to auto-fix issues

### `pkf status`

Show PKF status in the current project.

## Configuration

PKF uses a YAML configuration file (`pkf.config.yaml`):

```yaml
version: "1.0.0"

project:
  name: my-project
  description: Project documentation

output:
  dir: .pkf/generated

docs:
  _type: root
  _readme: true

  guides:
    _type: section
    _readme: true

  registers:
    _type: registers
    _items:
      TODO.md:
        _schema: todo-item
      ISSUES.md:
        _schema: issue-item
      CHANGELOG.md:
        _schema: changelog-entry
```

## Packages

PKF is composed of several packages:

| Package | Description |
|---------|-------------|
| `@pantheon-tech/pkf` | Unified CLI (this package) |
| `@pantheon-tech/pkf-processor` | Config processing and artifact generation |
| `@pantheon-tech/pkf-validator` | Documentation validation |

## Documentation

- [PKF Specification](https://github.com/pantheon-tech/pkf/docs/framework/specifications/PKF-SPECIFICATION.md)
- [Implementation Guide](https://github.com/pantheon-tech/pkf/docs/guides/IMPLEMENTATION-GUIDE.md)

## License

MIT
