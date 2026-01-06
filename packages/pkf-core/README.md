# @pantheon-tech/pkf-core

**Core business logic for Project Knowledge Framework (PKF)**

Version: 0.1.0 (Design Phase)

---

## Overview

`@pantheon-tech/pkf-core` is a framework-agnostic TypeScript library that provides the core business logic for the Project Knowledge Framework. It enables 60-65% code reuse between `pkf-init` CLI and `pkf-mcp-server`, with a stateless, composable architecture.

## Status

**Current Phase:** Design - API interfaces defined, implementation pending

This package is currently in the design phase. All TypeScript interfaces have been defined and validated, but implementations are planned for future releases.

## Design Principles

- **Framework-Agnostic:** No CLI or MCP-specific dependencies
- **Stateless Operations:** Pure functions with explicit state parameters
- **Composable Modules:** Independent modules via subpath exports
- **Comprehensive Typing:** Full TypeScript support with strict types
- **Error Handling:** Result types for expected failures, exceptions for programmer errors

## Architecture

```
@pantheon-tech/pkf-core
├── type-mapper     # Document classification & path resolution
├── schema          # Schema loading & validation
├── templates       # Template processing & rendering
├── frontmatter     # Frontmatter generation & parsing
├── scanner         # Document scanning & discovery
├── blueprint       # Blueprint parsing & summary
├── utils           # Common utilities (YAML, file ops)
└── types           # Shared TypeScript types
```

## Installation

```bash
npm install @pantheon-tech/pkf-core js-yaml
```

**Note:** `js-yaml` is a peer dependency and must be installed separately.

## Usage

### Scan and Classify Documents

```typescript
import { createScanner } from '@pantheon-tech/pkf-core/scanner';
import { detectDocumentType } from '@pantheon-tech/pkf-core/type-mapper';

const scanner = createScanner({ rootDir: process.cwd() });
const result = await scanner.scan();

for (const doc of result.documents) {
  const type = detectDocumentType(doc.relativePath);
  console.log(`${doc.relativePath} -> ${type}`);
}
```

### Validate Documents

```typescript
import { createSchemaLoader } from '@pantheon-tech/pkf-core/schema';
import { detectDocumentType, getSchemaForDocType } from '@pantheon-tech/pkf-core/type-mapper';

const loader = createSchemaLoader({ schemaDir: './schemas' });

const schemaName = getSchemaForDocType(detectDocumentType(doc.relativePath));
const validation = await loader.validate(doc, schemaName);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### Generate Frontmatter

```typescript
import { createSchemaLoader } from '@pantheon-tech/pkf-core/schema';
import { generateFrontmatter } from '@pantheon-tech/pkf-core/frontmatter';

const loader = createSchemaLoader();
const schema = await loader.load('guide');

const frontmatter = generateFrontmatter(schema, {
  title: 'Getting Started',
  category: 'tutorial'
});

console.log(frontmatter.yaml);
```

## API Reference

See the complete API documentation:
- [API Design](../../docs/architecture/pkf-core-api.md)
- [Versioning Policy](../../docs/architecture/pkf-core-versioning.md)

## Module Exports

All modules are available via subpath exports:

```typescript
import { createScanner } from '@pantheon-tech/pkf-core/scanner';
import { detectDocumentType } from '@pantheon-tech/pkf-core/type-mapper';
import { createSchemaLoader } from '@pantheon-tech/pkf-core/schema';
import { createTemplateProcessor } from '@pantheon-tech/pkf-core/templates';
import { generateFrontmatter } from '@pantheon-tech/pkf-core/frontmatter';
import { parseBlueprint } from '@pantheon-tech/pkf-core/blueprint';
import { safeParseYaml } from '@pantheon-tech/pkf-core/utils';
import type { PKFDocument } from '@pantheon-tech/pkf-core/types';
```

## Requirements

- **Node.js:** >= 18.0.0
- **TypeScript:** >= 5.0.0 (for development)
- **js-yaml:** ^4.1.0 (peer dependency)

## Development

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build

# Clean build artifacts
npm run clean
```

## Roadmap

### v0.1.0 (Current - Design Phase)
- ✅ API design documentation
- ✅ TypeScript interface definitions
- ✅ Module export structure
- ✅ Versioning policy
- ⏳ Implementation (planned)

### v0.2.0 (Planned)
- Implementation of core modules
- Unit tests
- Integration tests

### v0.3.0 (Planned)
- pkf-init refactor to use pkf-core
- Performance optimizations

### v1.0.0 (Future)
- Stable API with semver guarantees
- Full documentation
- pkf-mcp-server integration

## Contributing

This package is part of the PKF monorepo. See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT

## Related Packages

- **@pantheon-tech/pkf-init:** CLI tool for PKF initialization (uses pkf-core)
- **@pantheon-tech/pkf-mcp-server:** MCP server for PKF (planned, will use pkf-core)

---

For questions or issues, please open an issue in the [PKF repository](https://github.com/pantheon-tech/pkf).
