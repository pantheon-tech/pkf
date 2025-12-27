# Implementation Plan: pkf-processor

**Workstream ID:** WS-001
**Name:** PKF Processor Core Module
**Version:** 1.0.0-MVP
**Status:** Draft
**Created:** 2025-12-27
**Architecture Reference:** PKF-ARCHITECTURE.md v1.0.1-draft (Section 5.5)

---

## 1. Overview

The `pkf-processor` is the single required PKF component that transforms `pkf.config.yaml` into validation artifacts. It is installed as a dev dependency and invoked via npm scripts.

### 1.1 Scope (Phase 1 MVP)

| In Scope | Out of Scope (Future) |
|----------|----------------------|
| YAML config parsing | Watch mode |
| Component file resolution | Caching/checksums |
| Compose tree expansion | Schema DSL to JSON Schema |
| structure.json generation | Template generation |
| path-schema-map.json generation | Filing Agent integration |
| .remarkrc.generated.mjs generation | IDE extensions |
| CLI: `build`, `validate-structure` | CLI: `init`, `watch` |
| Error reporting | Warning aggregation |

### 1.2 Key Outputs

```
.pkf/generated/
  schemas/              # Copied/referenced JSON schemas
  structure.json        # Expected directory structure
  path-schema-map.json  # Path glob -> schema mappings
  .remarkrc.generated.mjs  # Remark configuration
```

---

## 2. Verified APIs and Dependencies

### 2.1 NPM Dependencies

| Package | Version | Purpose | Health |
|---------|---------|---------|--------|
| `yaml` | ^2.x | YAML parsing (eemeli/yaml) | Active, High reputation |
| `zod` | ^3.x | Schema validation | Active, High reputation |
| `fast-glob` | ^3.x | File pattern matching | Active, High reputation |
| `ajv` | ^8.x | JSON Schema validation | Active, High reputation |
| `commander` | ^12.x | CLI framework | Active, High reputation |
| `chalk` | ^5.x | Terminal colors | Active |

### 2.2 Verified API Patterns

**YAML Parsing (eemeli/yaml):**
```typescript
import YAML from 'yaml';

// Parse YAML string to JavaScript object
const config = YAML.parse(fs.readFileSync('pkf.config.yaml', 'utf8'));

// With error handling
try {
  const parsed = YAML.parse(yamlString);
} catch (err) {
  // Handle YAML syntax errors
}
```

**Zod Validation:**
```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  project: z.object({
    name: z.string().min(1),
  }),
  docs: z.record(z.unknown()),
});

// Parse with validation
const result = ConfigSchema.safeParse(rawConfig);
if (!result.success) {
  // Handle validation errors via result.error.issues
}
```

**Fast-glob:**
```typescript
import fg from 'fast-glob';

// Find all markdown files
const files = await fg(['docs/**/*.md'], {
  cwd: projectRoot,
  absolute: true
});
```

---

## 3. Task Breakdown

### WS-001-T001: Project Scaffolding

**Task ID:** WS-001-T001
**Name:** Initialize pkf-processor package
**Description:** Set up TypeScript project structure with build configuration
**Dependencies:** None
**Complexity:** S (1-2 hrs)

**File Structure:**
```
packages/pkf-processor/
  src/
    index.ts           # Main exports
    cli.ts             # CLI entry point
  package.json
  tsconfig.json
  tsup.config.ts       # Build configuration
  README.md
```

**Implementation Pattern:**
```json
{
  "name": "pkf-processor",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "bin": {
    "pkf-processor": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit"
  }
}
```

**Acceptance Criteria:**
- [ ] Package builds without errors
- [ ] CLI entry point executes: `npx pkf-processor --version`
- [ ] TypeScript strict mode enabled
- [ ] ESM output format configured

---

### WS-001-T002: Configuration Schema Definitions

**Task ID:** WS-001-T002
**Name:** Define Zod schemas for pkf.config.yaml
**Description:** Create comprehensive Zod schemas matching PKF configuration structure
**Dependencies:** WS-001-T001
**Complexity:** M (2-4 hrs)

**File Structure:**
```
packages/pkf-processor/
  src/
    schema/
      config.schema.ts      # Main config schema
      node.schema.ts        # Tree node schemas (_type, _items, etc.)
      component.schema.ts   # Component reference schemas
      index.ts              # Schema exports
```

**Implementation Pattern:**
```typescript
// src/schema/node.schema.ts
import { z } from 'zod';

export const NodeTypeSchema = z.enum([
  'root',
  'section',
  'lifecycle-state',
  'document',
  'directory',
  'register'
]);

export const BaseNodeSchema = z.object({
  _type: NodeTypeSchema,
  _readme: z.boolean().optional(),
  _description: z.string().optional(),
});

export const SectionNodeSchema = BaseNodeSchema.extend({
  _type: z.literal('section'),
  _lifecycle: z.array(z.string()).optional(),
  _items: z.lazy(() => DocumentNodeSchema).optional(),
});

export const DocumentNodeSchema = BaseNodeSchema.extend({
  _type: z.literal('document'),
  _schema: z.string(),
  _template: z.string().optional(),
  _naming: z.string(),
});
```

**Acceptance Criteria:**
- [ ] All node types from Section 6.1 have Zod schemas
- [ ] Schema validates example pkf.config.yaml from architecture doc
- [ ] TypeScript types exported: `PkfConfig`, `TreeNode`, `NodeType`
- [ ] Unit tests cover valid and invalid configurations
- [ ] >90% test coverage for schema module

---

### WS-001-T003: YAML Parser Service

**Task ID:** WS-001-T003
**Name:** Implement YAML parsing with validation
**Description:** Parse pkf.config.yaml and component files with error reporting
**Dependencies:** WS-001-T002
**Complexity:** M (2-4 hrs)

**File Structure:**
```
packages/pkf-processor/
  src/
    parser/
      yaml-parser.ts        # YAML parsing service
      component-resolver.ts # Resolve component file references
      index.ts
```

**Implementation Pattern:**
```typescript
// src/parser/yaml-parser.ts
import YAML from 'yaml';
import { z } from 'zod';
import { PkfConfigSchema } from '../schema/config.schema.js';
import type { ProcessorError } from '../types.js';

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  errors: ProcessorError[];
}

export function parseConfigFile(configPath: string): ParseResult<PkfConfig> {
  const errors: ProcessorError[] = [];

  // Read file
  let content: string;
  try {
    content = fs.readFileSync(configPath, 'utf8');
  } catch (err) {
    return {
      success: false,
      errors: [{
        file: configPath,
        message: `Cannot read file: ${err.message}`,
        severity: 'error'
      }]
    };
  }

  // Parse YAML
  let rawConfig: unknown;
  try {
    rawConfig = YAML.parse(content);
  } catch (err) {
    return {
      success: false,
      errors: [{
        file: configPath,
        line: err.linePos?.[0]?.line,
        message: `YAML syntax error: ${err.message}`,
        severity: 'error'
      }]
    };
  }

  // Validate with Zod
  const result = PkfConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map(issue => ({
        file: configPath,
        message: `${issue.path.join('.')}: ${issue.message}`,
        severity: 'error'
      }))
    };
  }

  return { success: true, data: result.data, errors: [] };
}
```

**Acceptance Criteria:**
- [ ] Parses valid YAML with line number preservation
- [ ] Returns structured errors for invalid YAML syntax
- [ ] Returns structured errors for schema violations
- [ ] Resolves component file references (types.yaml, schemas.yaml, templates.yaml)
- [ ] Handles missing files gracefully
- [ ] Unit tests for parser edge cases

---

### WS-001-T004: Compose Tree Expander

**Task ID:** WS-001-T004
**Name:** Implement tree expansion with _items inheritance
**Description:** Expand the compose tree, applying _items inheritance to lifecycle states
**Dependencies:** WS-001-T003
**Complexity:** L (4-8 hrs)

**File Structure:**
```
packages/pkf-processor/
  src/
    expander/
      tree-expander.ts      # Main expansion logic
      items-inheritance.ts  # _items inheritance resolver
      lifecycle-expander.ts # Lifecycle state expansion
      index.ts
```

**Implementation Pattern:**
```typescript
// src/expander/tree-expander.ts
import type { TreeNode, ExpandedTree, SectionNode } from '../schema/node.schema.js';

export interface ExpansionContext {
  parentItems?: DocumentNodeSchema;
  path: string[];
}

export function expandTree(
  docs: Record<string, TreeNode>,
  ctx: ExpansionContext = { path: ['docs'] }
): ExpandedTree {
  const expanded: ExpandedTree = { nodes: [], paths: [] };

  for (const [key, node] of Object.entries(docs)) {
    // Skip PKF properties
    if (key.startsWith('_')) continue;

    const currentPath = [...ctx.path, key];
    const pathStr = currentPath.join('/');

    if (node._type === 'section') {
      // Process section with potential _items
      expanded.nodes.push({
        path: pathStr,
        type: 'directory',
        requiresReadme: node._readme !== false,
      });

      // Expand children with inherited _items
      const childCtx: ExpansionContext = {
        parentItems: node._items ?? ctx.parentItems,
        path: currentPath,
      };

      const childExpanded = expandTree(
        filterChildren(node),
        childCtx
      );
      expanded.nodes.push(...childExpanded.nodes);
      expanded.paths.push(...childExpanded.paths);

    } else if (node._type === 'lifecycle-state') {
      // Lifecycle states inherit _items from parent section
      const inheritedItems = ctx.parentItems;
      expanded.nodes.push({
        path: pathStr,
        type: 'directory',
        requiresReadme: false,
        itemSchema: inheritedItems?._schema,
        itemNaming: inheritedItems?._naming,
      });
    }
    // ... handle other node types
  }

  return expanded;
}
```

**Acceptance Criteria:**
- [ ] Correctly expands nested sections
- [ ] `_items` inherited by lifecycle-state nodes
- [ ] Handles `_lifecycle` array to auto-create state directories
- [ ] Detects circular references (error)
- [ ] Preserves path hierarchy for structure.json
- [ ] Unit tests for inheritance scenarios from architecture doc

---

### WS-001-T005: Structure JSON Generator

**Task ID:** WS-001-T005
**Name:** Generate structure.json from expanded tree
**Description:** Output expected directory structure as JSON for validation
**Dependencies:** WS-001-T004
**Complexity:** M (2-4 hrs)

**File Structure:**
```
packages/pkf-processor/
  src/
    generator/
      structure-generator.ts  # Generate structure.json
      index.ts
```

**Implementation Pattern:**
```typescript
// src/generator/structure-generator.ts
export interface StructureNode {
  type: 'directory' | 'file';
  required: boolean;
  pattern?: string;           // For dynamic files (e.g., "{slug}.md")
  schema?: string;            // Schema reference for validation
  children?: Record<string, StructureNode>;
}

export interface StructureJson {
  $schema: string;
  version: string;
  generated: string;
  root: StructureNode;
}

export function generateStructureJson(
  expanded: ExpandedTree,
  config: PkfConfig
): StructureJson {
  const root: StructureNode = {
    type: 'directory',
    required: true,
    children: {}
  };

  for (const node of expanded.nodes) {
    insertNode(root, node);
  }

  return {
    $schema: 'https://pkf.dev/schemas/structure.schema.json',
    version: config.version,
    generated: new Date().toISOString(),
    root
  };
}
```

**Output Example:**
```json
{
  "$schema": "https://pkf.dev/schemas/structure.schema.json",
  "version": "1.0.0",
  "generated": "2025-12-27T10:00:00.000Z",
  "root": {
    "type": "directory",
    "required": true,
    "children": {
      "README.md": { "type": "file", "required": true },
      "architecture": {
        "type": "directory",
        "required": true,
        "children": {
          "README.md": { "type": "file", "required": true },
          "*.md": {
            "type": "file",
            "required": false,
            "pattern": "{slug}.md",
            "schema": "architecture-doc"
          }
        }
      }
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Generates valid JSON structure
- [ ] Includes README.md requirements per `_readme` settings
- [ ] Includes file patterns for dynamic naming
- [ ] Associates schemas with file patterns
- [ ] Output matches architecture doc Section 5.5.1

---

### WS-001-T006: Path-Schema Map Generator

**Task ID:** WS-001-T006
**Name:** Generate path-schema-map.json
**Description:** Map glob patterns to JSON schema files for remark-lint-frontmatter-schema
**Dependencies:** WS-001-T004
**Complexity:** S (1-2 hrs)

**File Structure:**
```
packages/pkf-processor/
  src/
    generator/
      path-schema-map-generator.ts
```

**Implementation Pattern:**
```typescript
// src/generator/path-schema-map-generator.ts
export interface PathSchemaMap {
  $schema: string;
  version: string;
  generated: string;
  mappings: Record<string, string>;  // glob pattern -> schema path
}

export function generatePathSchemaMap(
  expanded: ExpandedTree,
  config: PkfConfig
): PathSchemaMap {
  const mappings: Record<string, string> = {};

  for (const node of expanded.nodes) {
    if (node.itemSchema) {
      // Convert path to glob pattern
      const glob = `${node.path}/**/*.md`;
      const schemaPath = `./.pkf/generated/schemas/${node.itemSchema}.schema.json`;
      mappings[glob] = schemaPath;
    }
  }

  return {
    $schema: 'https://pkf.dev/schemas/path-schema-map.schema.json',
    version: config.version,
    generated: new Date().toISOString(),
    mappings
  };
}
```

**Output Example:**
```json
{
  "mappings": {
    "docs/proposals/**/*.md": "./.pkf/generated/schemas/proposal.schema.json",
    "docs/architecture/**/*.md": "./.pkf/generated/schemas/architecture-doc.schema.json",
    "docs/registers/TODO.md": "./.pkf/generated/schemas/todo-item.schema.json"
  }
}
```

**Acceptance Criteria:**
- [ ] Generates glob patterns matching actual file locations
- [ ] Maps to correct schema files
- [ ] Handles nested lifecycle states correctly
- [ ] Output usable by remark-lint-frontmatter-schema

---

### WS-001-T007: Remark Config Generator

**Task ID:** WS-001-T007
**Name:** Generate .remarkrc.generated.mjs
**Description:** Generate remark configuration from path-schema mappings
**Dependencies:** WS-001-T006
**Complexity:** S (1-2 hrs)

**File Structure:**
```
packages/pkf-processor/
  src/
    generator/
      remark-config-generator.ts
```

**Implementation Pattern:**
```typescript
// src/generator/remark-config-generator.ts
export function generateRemarkConfig(
  pathSchemaMap: PathSchemaMap
): string {
  const schemaEntries = Object.entries(pathSchemaMap.mappings)
    .map(([glob, schema]) => `      '${glob}': '${schema}'`)
    .join(',\n');

  return `// Generated by pkf-processor - DO NOT EDIT
// Generated: ${new Date().toISOString()}

import remarkFrontmatter from 'remark-frontmatter';
import remarkLintFrontmatterSchema from 'remark-lint-frontmatter-schema';
import remarkValidateLinks from 'remark-validate-links';

const remarkConfig = {
  plugins: [
    remarkFrontmatter,
    [
      remarkLintFrontmatterSchema,
      {
        schemas: {
${schemaEntries}
        },
      },
    ],
    remarkValidateLinks,
  ],
};

export default remarkConfig;
`;
}
```

**Acceptance Criteria:**
- [ ] Generates valid ESM JavaScript
- [ ] Includes all path-schema mappings
- [ ] Includes standard remark plugins (frontmatter, validate-links)
- [ ] Generated file can be imported by remark-cli

---

### WS-001-T008: Structure Validator

**Task ID:** WS-001-T008
**Name:** Implement structure validation command
**Description:** Validate actual directory structure against structure.json
**Dependencies:** WS-001-T005
**Complexity:** M (2-4 hrs)

**File Structure:**
```
packages/pkf-processor/
  src/
    validator/
      structure-validator.ts
      index.ts
```

**Implementation Pattern:**
```typescript
// src/validator/structure-validator.ts
import fg from 'fast-glob';
import type { StructureJson, StructureNode } from '../generator/structure-generator.js';
import type { ProcessorError } from '../types.js';

export interface ValidationResult {
  valid: boolean;
  errors: ProcessorError[];
  warnings: ProcessorError[];
}

export async function validateStructure(
  structureJson: StructureJson,
  projectRoot: string
): Promise<ValidationResult> {
  const errors: ProcessorError[] = [];
  const warnings: ProcessorError[] = [];

  // Get actual files
  const actualFiles = await fg(['docs/**/*'], {
    cwd: projectRoot,
    onlyFiles: false,
    markDirectories: true
  });

  // Check required files exist
  const requiredPaths = extractRequiredPaths(structureJson.root, 'docs');
  for (const required of requiredPaths) {
    if (!actualFiles.includes(required)) {
      errors.push({
        file: required,
        message: `Missing required file or directory: ${required}`,
        severity: 'error'
      });
    }
  }

  // Check for files in wrong locations
  // (files that don't match any pattern)

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

**Acceptance Criteria:**
- [ ] Detects missing required files (README.md in sections)
- [ ] Detects missing required directories
- [ ] Reports files in incorrect locations
- [ ] Validates file naming patterns
- [ ] Error messages match format in architecture doc Section 9.7
- [ ] Performance: <2s for 1000 files

---

### WS-001-T009: CLI Implementation

**Task ID:** WS-001-T009
**Name:** Implement CLI commands
**Description:** Create CLI with `build` and `validate-structure` commands
**Dependencies:** WS-001-T007, WS-001-T008
**Complexity:** M (2-4 hrs)

**File Structure:**
```
packages/pkf-processor/
  src/
    cli.ts              # CLI entry point
    commands/
      build.ts          # Build command
      validate.ts       # Validate-structure command
      index.ts
```

**Implementation Pattern:**
```typescript
// src/cli.ts
#!/usr/bin/env node
import { Command } from 'commander';
import { buildCommand } from './commands/build.js';
import { validateCommand } from './commands/validate.js';

const program = new Command();

program
  .name('pkf-processor')
  .description('PKF Configuration Processor')
  .version('1.0.0');

program
  .command('build')
  .description('Process pkf.config.yaml and generate artifacts')
  .option('-c, --config <path>', 'Config file path', 'pkf.config.yaml')
  .option('-o, --output <dir>', 'Output directory', '.pkf/generated')
  .option('--strict', 'Enable strict mode', false)
  .action(buildCommand);

program
  .command('validate-structure')
  .description('Validate directory structure against structure.json')
  .option('-s, --structure <path>', 'Structure file', '.pkf/generated/structure.json')
  .action(validateCommand);

program.parse();
```

```typescript
// src/commands/build.ts
import chalk from 'chalk';
import type { ProcessorOutput } from '../types.js';

export async function buildCommand(options: BuildOptions): Promise<void> {
  console.log(chalk.blue('PKF Processor - Build'));

  const startTime = Date.now();

  // 1. Parse configuration
  const parseResult = parseConfigFile(options.config);
  if (!parseResult.success) {
    printErrors(parseResult.errors);
    process.exit(1);
  }

  // 2. Resolve component files
  const components = await resolveComponents(parseResult.data);

  // 3. Expand tree
  const expanded = expandTree(parseResult.data.docs, {});

  // 4. Generate artifacts
  const structureJson = generateStructureJson(expanded, parseResult.data);
  const pathSchemaMap = generatePathSchemaMap(expanded, parseResult.data);
  const remarkConfig = generateRemarkConfig(pathSchemaMap);

  // 5. Write outputs
  await writeArtifacts(options.output, {
    'structure.json': JSON.stringify(structureJson, null, 2),
    'path-schema-map.json': JSON.stringify(pathSchemaMap, null, 2),
    '.remarkrc.generated.mjs': remarkConfig
  });

  const duration = Date.now() - startTime;
  console.log(chalk.green(`Build complete in ${duration}ms`));

  // Output per ProcessorOutputSchema
  const output: ProcessorOutput = {
    success: true,
    artifacts: {
      schemas: [],
      structureJson: `${options.output}/structure.json`,
      remarkConfig: `${options.output}/.remarkrc.generated.mjs`,
      pathSchemaMap: `${options.output}/path-schema-map.json`
    },
    errors: [],
    duration
  };

  console.log(JSON.stringify(output, null, 2));
}
```

**Acceptance Criteria:**
- [ ] `pkf-processor build` generates all artifacts
- [ ] `pkf-processor validate-structure` validates directory
- [ ] Exit code 0 on success, 1 on error
- [ ] Colored output for terminal
- [ ] JSON output option for CI integration
- [ ] Help text for all commands

---

### WS-001-T010: Error Handling and Reporting

**Task ID:** WS-001-T010
**Name:** Implement comprehensive error handling
**Description:** Structured error types per ProcessorOutputSchema
**Dependencies:** WS-001-T003
**Complexity:** S (1-2 hrs)

**File Structure:**
```
packages/pkf-processor/
  src/
    errors/
      processor-error.ts
      error-formatter.ts
      index.ts
    types.ts
```

**Implementation Pattern:**
```typescript
// src/types.ts
import { z } from 'zod';

export const ProcessorErrorSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  message: z.string(),
  severity: z.enum(['error', 'warning']),
});

export type ProcessorError = z.infer<typeof ProcessorErrorSchema>;

// Error types per architecture doc Section 5.5.4
export const ErrorTypeSchema = z.enum([
  'YAML_SYNTAX',
  'UNKNOWN_TYPE',
  'MISSING_REQUIRED',
  'UNRESOLVED_REFERENCE',
  'CIRCULAR_REFERENCE',
  'INVALID_DSL',
  'DEPRECATED_PROPERTY'
]);

// src/errors/error-formatter.ts
export function formatError(error: ProcessorError): string {
  const location = error.line ? `:${error.line}` : '';
  const prefix = error.severity === 'error' ? 'ERROR' : 'WARNING';
  return `${prefix}: ${error.file}${location}\n  ${error.message}`;
}

export function formatStructureError(error: ProcessorError): string {
  // Format per architecture doc Section 9.7
  return `
PKF Structure Validation Failed:

ERROR: ${error.message}
  Expected: ${error.expected ?? 'N/A'}
  Location: ${error.file}
  Rule: ${error.rule ?? 'N/A'}
`;
}
```

**Acceptance Criteria:**
- [ ] Error types match Section 5.5.4 of architecture doc
- [ ] Error output format matches Section 9.7 examples
- [ ] Line numbers included when available
- [ ] Severity levels (error, warning) properly distinguished
- [ ] Errors are serializable to JSON

---

### WS-001-T011: Integration Tests

**Task ID:** WS-001-T011
**Name:** End-to-end integration tests
**Description:** Test full build and validation workflow
**Dependencies:** WS-001-T009
**Complexity:** M (2-4 hrs)

**File Structure:**
```
packages/pkf-processor/
  test/
    fixtures/
      valid-config/
        pkf.config.yaml
        pkf/components/...
        docs/...
      invalid-config/
        ...
    integration/
      build.test.ts
      validate.test.ts
```

**Implementation Pattern:**
```typescript
// test/integration/build.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('pkf-processor build', () => {
  const fixtureDir = path.join(__dirname, '../fixtures/valid-config');
  const outputDir = path.join(fixtureDir, '.pkf/generated');

  afterEach(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it('generates structure.json from valid config', () => {
    execSync(`npx pkf-processor build -c ${fixtureDir}/pkf.config.yaml`, {
      cwd: fixtureDir
    });

    const structureJson = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'structure.json'), 'utf8')
    );

    expect(structureJson.root.children).toHaveProperty('README.md');
    expect(structureJson.root.children).toHaveProperty('architecture');
  });

  it('generates path-schema-map.json', () => {
    execSync(`npx pkf-processor build`, { cwd: fixtureDir });

    const pathMap = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'path-schema-map.json'), 'utf8')
    );

    expect(pathMap.mappings).toHaveProperty('docs/proposals/**/*.md');
  });

  it('fails with exit code 1 on invalid config', () => {
    const invalidDir = path.join(__dirname, '../fixtures/invalid-config');

    expect(() => {
      execSync(`npx pkf-processor build`, { cwd: invalidDir });
    }).toThrow();
  });
});
```

**Acceptance Criteria:**
- [ ] Tests cover valid configuration processing
- [ ] Tests cover all error scenarios from Section 5.5.4
- [ ] Tests verify structure validation
- [ ] Tests run in <30 seconds
- [ ] 80%+ code coverage

---

## 4. Dependency Graph

```
                    WS-001-T001 (Scaffolding)
                           │
                           ▼
                    WS-001-T002 (Schemas)
                           │
                           ▼
                    WS-001-T003 (Parser)
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       WS-001-T010    WS-001-T004    (parallel)
       (Errors)       (Expander)
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       WS-001-T005   WS-001-T006   WS-001-T008
       (Structure)   (PathMap)    (Validator)
              │            │
              │            ▼
              │      WS-001-T007
              │      (Remark)
              │            │
              └─────┬──────┘
                    │
                    ▼
             WS-001-T009 (CLI)
                    │
                    ▼
             WS-001-T011 (Tests)
```

**Parallelization Opportunities:**
- T005, T006, T008 can run in parallel after T004
- T007 depends on T006
- T010 can be developed in parallel with T004-T008

---

## 5. Complexity Summary

| Task | Complexity | Estimated Hours |
|------|------------|-----------------|
| WS-001-T001 | S | 1-2 |
| WS-001-T002 | M | 2-4 |
| WS-001-T003 | M | 2-4 |
| WS-001-T004 | L | 4-8 |
| WS-001-T005 | M | 2-4 |
| WS-001-T006 | S | 1-2 |
| WS-001-T007 | S | 1-2 |
| WS-001-T008 | M | 2-4 |
| WS-001-T009 | M | 2-4 |
| WS-001-T010 | S | 1-2 |
| WS-001-T011 | M | 2-4 |
| **Total** | | **20-40 hrs** |

---

## 6. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| YAML library edge cases | Medium | Medium | Use eemeli/yaml with comprehensive error handling |
| Complex tree inheritance | Medium | High | Extensive unit tests for _items inheritance |
| Performance with large trees | Low | Medium | Lazy evaluation, caching in future versions |
| Schema DSL complexity | Deferred | N/A | Phase 1 uses JSON Schema directly, DSL in Phase 2 |

---

## 7. Future Phases (Out of Scope)

### Phase 2: Schema DSL Compiler
- Transform Schema DSL (Section 7.3) to JSON Schema
- `extends` resolution with `allOf`
- `type: date/datetime/enum` transformations

### Phase 3: Watch Mode and Caching
- File watcher for development
- Checksum-based caching
- Incremental rebuilds

### Phase 4: Template System
- Template variable substitution
- ID generation (`{nn}`, `{nnn}`)
- New document scaffolding

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-27 | implementation-planner | Initial implementation plan |
