# pkf-processor

PKF Configuration Processor - transforms `pkf.config.yaml` into validation artifacts.

## Installation

```bash
npm install pkf-processor --save-dev
```

## Usage

### CLI

```bash
# Build validation artifacts
npx pkf-processor build

# With options
npx pkf-processor build --config pkf.config.yaml --output .pkf/generated

# Validate structure
npx pkf-processor validate-structure
```

### Programmatic

```typescript
import {
  parseConfigFile,
  expandTree,
  generateStructureJson,
  generatePathSchemaMap,
  generateRemarkConfig,
} from 'pkf-processor';

// Parse configuration
const config = parseConfigFile('pkf.config.yaml');
if (!config.success) {
  console.error(config.error);
  process.exit(1);
}

// Expand compose tree
const tree = expandTree(config.data.docs);
if (!tree.success) {
  console.error(tree.error);
  process.exit(1);
}

// Generate artifacts
const structure = generateStructureJson(tree.data, config.data);
const pathMap = generatePathSchemaMap(tree.data, config.data);
const remarkConfig = generateRemarkConfig(pathMap);
```

## Generated Artifacts

| Artifact | Description |
|----------|-------------|
| `structure.json` | Expected directory structure |
| `path-schema-map.json` | Path glob → schema mappings |
| `.remarkrc.generated.mjs` | Remark configuration for frontmatter validation |

## Configuration

See [PKF Architecture](../../docs/architecture/PKF-ARCHITECTURE.md) for full configuration reference.

## License

MIT
