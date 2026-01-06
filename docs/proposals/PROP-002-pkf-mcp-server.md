---
title: "PKF MCP Server with Agentic Librarian"
type: proposal
proposal-id: PROP-002
proposal-status: draft
created: 2026-01-02
updated: 2026-01-02
status: draft
author: Claude
tags:
  - mcp
  - integration
  - agents
  - api
  - tools
---

# PROP-002: PKF MCP Server with Agentic Librarian

## Executive Summary

Expose PKF (Project Knowledge Framework) operations as MCP (Model Context Protocol) tools, mediated by an intelligent "Librarian" agent that understands documentation semantics, validates operations, and maintains documentation consistency across operations.

## Motivation

### Current State

PKF currently operates as:
1. **CLI tool** (`pkf-init`) - One-time migration of existing docs to PKF structure
2. **Specification framework** - Standards for how documentation should be organized
3. **Templates and schemas** - Reusable patterns for documentation

### Limitations

- **No runtime integration** - Cannot use PKF operations while working in Claude Desktop/Code
- **Manual documentation updates** - Developers must manually maintain PKF compliance
- **No intelligent assistance** - No agent to validate or suggest documentation improvements
- **Siloed from development workflow** - PKF is separate from coding tools

### Vision

An MCP server that:
- **Exposes PKF as tools** - Add, update, validate docs via MCP protocol
- **Intelligent mediation** - Agentic librarian validates, categorizes, and maintains quality
- **Seamless integration** - Works naturally within Claude Desktop and Claude Code workflows
- **Proactive maintenance** - Suggests missing docs, detects drift, ensures consistency

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Desktop / Claude Code             │
│                                                              │
│  User: "Add API documentation for the UserService class"    │
└────────────────────────┬─────────────────────────────────────┘
                         │ MCP Protocol (JSON-RPC over stdio)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    PKF MCP Server (Node.js)                  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │           Agentic Librarian (Core Agent)           │     │
│  │                                                    │     │
│  │  • Receives tool call inputs                      │     │
│  │  • Validates against PKF schemas                  │     │
│  │  • Infers document type from content/context      │     │
│  │  • Determines target location in PKF structure    │     │
│  │  • Generates frontmatter with correct schema      │     │
│  │  • Maintains index files (auto-updates)           │     │
│  │  • Detects documentation drift                    │     │
│  │  • Suggests missing documentation                 │     │
│  │                                                    │     │
│  │  Session State:                                   │     │
│  │   - Conversation history                          │     │
│  │   - Document index cache                          │     │
│  │   - User preferences                              │     │
│  │   - Recent operations                             │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                  MCP Tools Layer                   │     │
│  │                                                    │     │
│  │  1. add_document(content, hints)                  │     │
│  │  2. update_document(path, changes)                │     │
│  │  3. search_documentation(query, filters)          │     │
│  │  4. validate_document(path)                       │     │
│  │  5. suggest_structure(project_info)               │     │
│  │  6. detect_drift(codebase_path)                   │     │
│  │  7. generate_from_template(type, placeholders)    │     │
│  │  8. update_indexes(scope)                         │     │
│  │  9. get_documentation_health()                    │     │
│  │ 10. infer_metadata(content, context)              │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              PKF Engine (Business Logic)           │     │
│  │                                                    │     │
│  │  • Schema loader & validator                      │     │
│  │  • Template processor                             │     │
│  │  • Frontmatter generator                          │     │
│  │  • Type-to-schema mapper                          │     │
│  │  • Index updater                                  │     │
│  │  • Drift detector                                 │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │         MCP Resources (Read-Only Endpoints)        │     │
│  │                                                    │     │
│  │  • pkf://schemas/{name}                           │     │
│  │  • pkf://templates/{type}                         │     │
│  │  • pkf://docs/{path}                              │     │
│  │  • pkf://config                                   │     │
│  │  • pkf://index/{section}                          │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              MCP Prompts (Templates)               │     │
│  │                                                    │     │
│  │  • document_api_class                             │     │
│  │  • write_architecture_doc                         │     │
│  │  • create_changelog_entry                         │     │
│  │  • audit_documentation                            │     │
│  └────────────────────────────────────────────────────┘     │
└────────────────────────┬─────────────────────────────────────┘
                         │ File System Operations
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      Project File System                     │
│                                                              │
│  docs/                                                       │
│  ├── README.md                                               │
│  ├── guides/                                                 │
│  ├── api/                                                    │
│  ├── architecture/                                           │
│  ├── registers/                                              │
│  └── ...                                                     │
│                                                              │
│  schemas/                                                    │
│  templates/                                                  │
│  pkf.config.yaml                                             │
└──────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Agentic Librarian (Core Intelligence)

The Librarian is a **stateful, intelligent agent** that:

**Capabilities:**
- **Content understanding** - Analyzes document content to infer type, audience, purpose
- **Schema matching** - Selects appropriate PKF schema based on document characteristics
- **Path resolution** - Determines correct location in PKF directory structure
- **Frontmatter generation** - Creates valid, complete frontmatter automatically
- **Quality assurance** - Validates documents against PKF standards
- **Proactive suggestions** - Identifies missing docs, broken links, stale content
- **Context retention** - Remembers recent operations and user preferences

**State Management:**
```typescript
interface LibrarianContext {
  // Conversation tracking
  conversationHistory: Array<{
    timestamp: number;
    operation: string;
    documentPath?: string;
    result: 'success' | 'failure';
  }>;

  // Document corpus awareness
  documentIndex: Map<string, DocumentMetadata>;

  // User preferences learned over time
  preferences: {
    defaultSchemas: Map<string, string>;
    writingStyle: 'technical' | 'conversational';
    frontmatterVerbosity: 'minimal' | 'complete';
  };

  // Project configuration
  pkfConfig: PKFConfig;

  // Real-time health tracking
  healthMetrics: {
    totalDocs: number;
    missingFrontmatter: number;
    brokenLinks: number;
    staleDocs: number;
    lastValidation: number;
  };
}
```

**Intelligence Patterns:**

1. **Type Inference**
   ```typescript
   async inferDocumentType(content: string, hints: TypeHints): Promise<string> {
     // Analyze content structure
     const hasCodeBlocks = /```/.test(content);
     const hasEndpoints = /## (GET|POST|PUT|DELETE)/.test(content);
     const hasArchDiagrams = /```mermaid/.test(content);

     // Use hints from context
     if (hints.filename?.includes('API')) return 'api-reference';
     if (hints.codeContext?.className) return 'api-reference';
     if (hasArchDiagrams) return 'architecture';

     // Check conversation history for patterns
     const recentTypes = this.getRecentDocumentTypes(5);
     if (recentTypes.every(t => t === 'guide-user')) {
       // User is writing a series of guides
       return 'guide-user';
     }

     // Fall back to content analysis
     return this.analyzeContentSemantics(content);
   }
   ```

2. **Path Resolution**
   ```typescript
   async resolveTargetPath(
     type: string,
     filename: string,
     context: PathContext
   ): Promise<string> {
     // Use type-to-directory mapping
     const baseDir = getDirectoryForType(type);

     // Check for existing patterns in project
     const existingDocs = this.documentIndex.get(type);
     if (existingDocs?.length > 0) {
       // Infer structure from existing docs
       const commonPrefix = findCommonPathPrefix(existingDocs);
       if (commonPrefix) return path.join(commonPrefix, filename);
     }

     // Use PKF standard structure
     return path.join('docs', baseDir, filename);
   }
   ```

3. **Frontmatter Generation**
   ```typescript
   async generateFrontmatter(
     type: string,
     content: string,
     metadata: ContentMetadata
   ): Promise<string> {
     // Load appropriate schema
     const schema = await this.getSchemaForType(type);

     // Extract metadata from content
     const title = this.extractTitle(content);
     const description = this.generateDescription(content);

     // Use learned preferences
     const verbosity = this.context.preferences.frontmatterVerbosity;

     // Generate YAML frontmatter
     const frontmatter = {
       type,
       title,
       description: verbosity === 'complete' ? description : undefined,
       created: new Date().toISOString().split('T')[0],
       status: 'draft',
       author: metadata.author || this.inferAuthor(),
       tags: this.extractTags(content),
       // Schema-specific fields
       ...this.getSchemaSpecificFields(schema, metadata)
     };

     return yaml.stringify(frontmatter);
   }
   ```

#### 2. MCP Tools Layer

##### Tool 1: `add_document`

**Purpose:** Add new documentation with intelligent placement and frontmatter

**Schema:**
```typescript
{
  content: z.string()
    .describe("Markdown content of the document"),

  hints: z.object({
    filename: z.string().optional()
      .describe("Suggested filename (librarian may adjust)"),
    type: z.enum([
      "readme", "guide-user", "guide-developer",
      "api-reference", "architecture", "changelog",
      "template", "example"
    ]).optional()
      .describe("Document type hint (librarian will validate)"),
    codeContext: z.object({
      className: z.string().optional(),
      filePath: z.string().optional(),
      language: z.string().optional()
    }).optional()
      .describe("Code context if documenting code"),
  }).optional(),

  targetPath: z.string().optional()
    .describe("Override automatic path resolution"),

  validate: z.boolean().default(true)
    .describe("Validate before saving")
}
```

**Handler Logic:**
```typescript
async ({ content, hints, targetPath, validate }) => {
  const librarian = getLibrarian();

  // 1. Infer document type
  const inferredType = await librarian.inferDocumentType(content, hints);

  // 2. Resolve target path
  const resolvedPath = targetPath ||
    await librarian.resolveTargetPath(
      inferredType,
      hints?.filename || 'document.md',
      { codeContext: hints?.codeContext }
    );

  // 3. Generate frontmatter
  const frontmatter = await librarian.generateFrontmatter(
    inferredType,
    content,
    { author: hints?.codeContext?.author }
  );

  // 4. Combine frontmatter + content
  const fullDocument = `---\n${frontmatter}---\n\n${content}`;

  // 5. Validate if requested
  if (validate) {
    const validation = await librarian.validateDocument(
      fullDocument,
      inferredType
    );
    if (!validation.valid) {
      return {
        content: [{
          type: "text",
          text: `Validation failed:\n${validation.errors.join('\n')}`
        }],
        isError: true
      };
    }
  }

  // 6. Write document
  await fs.writeFile(resolvedPath, fullDocument, 'utf-8');

  // 7. Update indexes
  await librarian.updateIndexes([resolvedPath]);

  // 8. Record operation
  librarian.recordOperation('add_document', resolvedPath, 'success');

  return {
    content: [{
      type: "text",
      text: `Document added successfully:\n` +
            `  Path: ${resolvedPath}\n` +
            `  Type: ${inferredType}\n` +
            `  Schema: ${getSchemaForDocType(inferredType)}`
    }]
  };
}
```

##### Tool 2: `update_document`

**Purpose:** Update existing documentation while maintaining PKF compliance

**Schema:**
```typescript
{
  path: z.string()
    .describe("Relative path to document (from project root)"),

  changes: z.object({
    content: z.string().optional()
      .describe("New content (replaces existing)"),
    frontmatter: z.record(z.any()).optional()
      .describe("Frontmatter fields to update"),
    append: z.string().optional()
      .describe("Content to append"),
    section: z.object({
      heading: z.string(),
      content: z.string()
    }).optional()
      .describe("Replace or add a specific section")
  }),

  updateTimestamp: z.boolean().default(true)
    .describe("Update 'updated' field in frontmatter")
}
```

**Handler Logic:**
```typescript
async ({ path, changes, updateTimestamp }) => {
  const librarian = getLibrarian();

  // 1. Read existing document
  const existing = await fs.readFile(path, 'utf-8');
  const { frontmatter, content } = parseFrontmatter(existing);

  // 2. Apply changes
  let newContent = content;
  let newFrontmatter = { ...frontmatter };

  if (changes.content) {
    newContent = changes.content;
  } else if (changes.append) {
    newContent += '\n\n' + changes.append;
  } else if (changes.section) {
    newContent = replaceSection(
      content,
      changes.section.heading,
      changes.section.content
    );
  }

  if (changes.frontmatter) {
    newFrontmatter = { ...newFrontmatter, ...changes.frontmatter };
  }

  // 3. Update timestamp
  if (updateTimestamp) {
    newFrontmatter.updated = new Date().toISOString().split('T')[0];
  }

  // 4. Validate
  const fullDocument = formatDocument(newFrontmatter, newContent);
  const validation = await librarian.validateDocument(
    fullDocument,
    newFrontmatter.type
  );

  if (!validation.valid) {
    return {
      content: [{ type: "text", text: `Validation failed: ${validation.errors}` }],
      isError: true
    };
  }

  // 5. Write
  await fs.writeFile(path, fullDocument, 'utf-8');

  // 6. Update index cache
  await librarian.updateIndexCache(path, newFrontmatter);

  return {
    content: [{
      type: "text",
      text: `Document updated: ${path}`
    }]
  };
}
```

##### Tool 3: `search_documentation`

**Purpose:** Semantic and metadata-based documentation search

**Schema:**
```typescript
{
  query: z.string()
    .describe("Search query (supports semantic search)"),

  filters: z.object({
    type: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(["draft", "review", "published", "deprecated"]).optional(),
    createdAfter: z.string().optional(),
    updatedAfter: z.string().optional()
  }).optional(),

  limit: z.number().default(10).max(50),

  includeContent: z.boolean().default(false)
    .describe("Include full content in results (expensive)")
}
```

##### Tool 4: `validate_document`

**Purpose:** Validate document against PKF schemas

**Schema:**
```typescript
{
  path: z.string()
    .describe("Path to document to validate"),

  strict: z.boolean().default(false)
    .describe("Enable strict validation (warnings as errors)"),

  autoFix: z.boolean().default(false)
    .describe("Attempt to auto-fix common issues")
}
```

##### Tool 5: `suggest_structure`

**Purpose:** Analyze codebase and suggest documentation structure

**Schema:**
```typescript
{
  projectPath: z.string()
    .describe("Path to project root"),

  scan: z.object({
    includeCode: z.boolean().default(true),
    includeTests: z.boolean().default(false),
    maxDepth: z.number().default(5)
  }).optional(),

  outputFormat: z.enum(["yaml", "markdown", "json"]).default("markdown")
}
```

**Handler Logic:**
```typescript
async ({ projectPath, scan, outputFormat }) => {
  const librarian = getLibrarian();

  // 1. Scan codebase
  const analysis = await analyzeCodebase(projectPath, scan);

  // 2. Identify documentation gaps
  const gaps = await librarian.identifyGaps(analysis);

  // 3. Suggest structure
  const suggestions = {
    required: [
      { type: 'readme', path: 'README.md', reason: 'Project overview' },
      { type: 'api-reference', path: 'docs/api/API.md', reason: `${analysis.publicAPIs} public APIs found` },
      { type: 'architecture', path: 'docs/architecture/ARCHITECTURE.md', reason: 'Complex multi-module structure' }
    ],
    recommended: gaps.map(gap => ({
      type: gap.type,
      path: gap.suggestedPath,
      reason: gap.reason,
      priority: gap.priority
    })),
    existing: analysis.existingDocs.map(doc => ({
      path: doc.path,
      type: doc.type,
      status: doc.hasFrontmatter ? 'compliant' : 'needs-migration'
    }))
  };

  // 4. Format output
  const formatted = formatSuggestions(suggestions, outputFormat);

  return {
    content: [{ type: "text", text: formatted }]
  };
}
```

##### Tool 6: `detect_drift`

**Purpose:** Detect when documentation diverges from code

**Schema:**
```typescript
{
  codebasePath: z.string(),
  documentPath: z.string(),
  checkTypes: z.array(z.enum([
    "api_signatures",
    "config_options",
    "cli_commands",
    "environment_vars"
  ])).default(["api_signatures"])
}
```

##### Tool 7: `generate_from_template`

**Purpose:** Generate documentation from PKF templates with placeholders

**Schema:**
```typescript
{
  templateType: z.enum([
    "readme", "api-reference", "changelog",
    "adr", "guide", "architecture"
  ]),

  placeholders: z.record(z.string())
    .describe("Key-value pairs for template placeholders"),

  targetPath: z.string().optional()
}
```

##### Tool 8: `update_indexes`

**Purpose:** Update INDEX and README files after documentation changes

**Schema:**
```typescript
{
  scope: z.enum(["all", "directory", "file"])
    .describe("Scope of index update"),

  path: z.string().optional()
    .describe("Specific directory/file (required for directory/file scope)"),

  detectBrokenLinks: z.boolean().default(true)
}
```

##### Tool 9: `get_documentation_health`

**Purpose:** Get overall documentation health metrics

**Schema:**
```typescript
{
  includeRecommendations: z.boolean().default(true),

  checks: z.array(z.enum([
    "frontmatter_completeness",
    "broken_links",
    "stale_docs",
    "missing_types",
    "index_consistency"
  ])).optional()
}
```

**Response:**
```json
{
  "score": 78,
  "checks": {
    "frontmatter_completeness": {
      "score": 95,
      "total": 142,
      "compliant": 135,
      "issues": 7
    },
    "broken_links": {
      "score": 60,
      "total": 456,
      "broken": 23
    },
    "stale_docs": {
      "score": 70,
      "stale": 12,
      "threshold": "90 days"
    }
  },
  "recommendations": [
    "Fix 23 broken links in INDEX files",
    "Update 7 documents missing required frontmatter",
    "Review 12 documents not updated in 90+ days"
  ]
}
```

##### Tool 10: `infer_metadata`

**Purpose:** Extract metadata from content for frontmatter generation

**Schema:**
```typescript
{
  content: z.string(),

  context: z.object({
    codeFile: z.string().optional(),
    className: z.string().optional(),
    language: z.string().optional()
  }).optional()
}
```

#### 3. MCP Resources (Read-Only)

Resources expose PKF artifacts for read-only access:

```typescript
// Schema resource
server.setRequestHandler(McpResourceRequestHandler, async (request) => {
  if (request.params.uri.startsWith("pkf://schemas/")) {
    const schemaName = request.params.uri.replace("pkf://schemas/", "");
    const schema = await loadSchema(schemaName);

    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(schema, null, 2)
      }]
    };
  }

  if (request.params.uri.startsWith("pkf://templates/")) {
    const templateName = request.params.uri.replace("pkf://templates/", "");
    const template = await loadTemplate(templateName);

    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "text/markdown",
        text: template
      }]
    };
  }

  if (request.params.uri === "pkf://config") {
    const config = await loadPKFConfig();
    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "application/yaml",
        text: yaml.stringify(config)
      }]
    };
  }
});
```

#### 4. MCP Prompts (Reusable Templates)

Prompts provide reusable conversation starters for common documentation tasks:

```typescript
server.prompt("document_api_class", {
  description: "Generate API documentation for a class",
  arguments: [
    { name: "className", required: true },
    { name: "filePath", required: true },
    { name: "includeExamples", required: false }
  ]
}, async ({ className, filePath, includeExamples }) => {
  const template = await loadTemplate('api-reference');

  return {
    messages: [{
      role: "user",
      content: `Generate comprehensive API documentation for the ${className} class located at ${filePath}.

Use the PKF api-reference template. Include:
- Class overview and purpose
- Constructor signature and parameters
- Public methods with signatures, parameters, return types
- Usage examples ${includeExamples === 'true' ? '(with code samples)' : ''}
- Error handling and edge cases

Format the output with proper PKF frontmatter (type: api-reference).`
    }]
  };
});

server.prompt("create_changelog_entry", {
  description: "Create a CHANGELOG entry for a release",
  arguments: [
    { name: "version", required: true },
    { name: "changes", required: true }
  ]
}, async ({ version, changes }) => {
  return {
    messages: [{
      role: "user",
      content: `Create a CHANGELOG entry for version ${version}.

Changes:
${changes}

Follow PKF register format:
- Group changes by type (Added, Changed, Deprecated, Removed, Fixed, Security)
- Use proper markdown formatting
- Include issue/PR references if available
- Add frontmatter with type: changelog`
    }]
  };
});

server.prompt("audit_documentation", {
  description: "Audit project documentation for gaps and issues",
  arguments: [
    { name: "projectPath", required: true },
    { name: "focus", required: false }
  ]
}, async ({ projectPath, focus }) => {
  return {
    messages: [{
      role: "user",
      content: `Audit the documentation at ${projectPath}.

${focus ? `Focus on: ${focus}` : 'Perform a comprehensive audit.'}

Use the PKF tools:
1. get_documentation_health() - Get current health score
2. detect_drift() - Check for code/doc divergence
3. search_documentation() - Find existing docs
4. suggest_structure() - Identify gaps

Provide a detailed report with:
- Current health score and breakdown
- Critical issues requiring immediate attention
- Recommended improvements
- Suggested new documentation`
    }]
  };
});
```

## Implementation Details

### Project Structure

```
packages/pkf-mcp-server/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── server.ts                   # Server initialization
│   ├── librarian/
│   │   ├── agent.ts                # Librarian agent core logic
│   │   ├── inference.ts            # Type/path inference
│   │   ├── frontmatter.ts          # Frontmatter generation
│   │   ├── validation.ts           # Document validation
│   │   └── context.ts              # Session state management
│   ├── tools/
│   │   ├── add-document.ts
│   │   ├── update-document.ts
│   │   ├── search-documentation.ts
│   │   ├── validate-document.ts
│   │   ├── suggest-structure.ts
│   │   ├── detect-drift.ts
│   │   ├── generate-from-template.ts
│   │   ├── update-indexes.ts
│   │   ├── get-health.ts
│   │   └── infer-metadata.ts
│   ├── resources/
│   │   ├── schemas.ts
│   │   ├── templates.ts
│   │   ├── config.ts
│   │   └── docs.ts
│   ├── prompts/
│   │   ├── api-documentation.ts
│   │   ├── changelog-entry.ts
│   │   └── audit.ts
│   ├── engine/
│   │   ├── schema-loader.ts
│   │   ├── template-processor.ts
│   │   ├── type-mapper.ts
│   │   ├── index-updater.ts
│   │   ├── drift-detector.ts
│   │   └── codebase-analyzer.ts
│   └── utils/
│       ├── logger.ts
│       ├── markdown.ts
│       ├── yaml.ts
│       └── fs.ts
├── tests/
│   ├── librarian.test.ts
│   ├── tools/
│   └── integration/
├── package.json
├── tsconfig.json
└── README.md
```

### Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "zod": "^3.25.0",
    "js-yaml": "^4.1.0",
    "gray-matter": "^4.0.3",
    "minimatch": "^10.0.0",
    "pino": "^9.0.0",
    "@anthropic-ai/sdk": "^0.32.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.0.0"
  }
}
```

### Core Librarian Implementation

```typescript
// src/librarian/agent.ts

import { AnthropicClient } from '../utils/anthropic.js';
import type { LibrarianContext, DocumentMetadata } from '../types.js';

export class PKFLibrarian {
  private context: Map<string, LibrarianContext> = new Map();
  private anthropic: AnthropicClient;
  private schemas: Map<string, any> = new Map();

  constructor() {
    this.anthropic = new AnthropicClient();
    this.loadSchemas();
  }

  /**
   * Get or create session context
   */
  private getContext(sessionId: string): LibrarianContext {
    if (!this.context.has(sessionId)) {
      this.context.set(sessionId, {
        conversationHistory: [],
        documentIndex: new Map(),
        preferences: {
          defaultSchemas: new Map(),
          writingStyle: 'technical',
          frontmatterVerbosity: 'complete'
        },
        pkfConfig: this.loadPKFConfig(),
        healthMetrics: {
          totalDocs: 0,
          missingFrontmatter: 0,
          brokenLinks: 0,
          staleDocs: 0,
          lastValidation: 0
        }
      });
    }
    return this.context.get(sessionId)!;
  }

  /**
   * Infer document type from content and context
   */
  async inferDocumentType(
    content: string,
    hints?: TypeHints,
    sessionId: string = 'default'
  ): Promise<string> {
    const ctx = this.getContext(sessionId);

    // 1. Check explicit type hint
    if (hints?.type) {
      const normalized = normalizeDocType(hints.type);
      if (this.isValidType(normalized)) {
        return normalized;
      }
    }

    // 2. Analyze filename
    if (hints?.filename) {
      const fromFilename = this.inferFromFilename(hints.filename);
      if (fromFilename) return fromFilename;
    }

    // 3. Analyze code context
    if (hints?.codeContext) {
      if (hints.codeContext.className) return 'api-reference';
      if (hints.codeContext.filePath?.includes('/test/')) return 'example';
    }

    // 4. Use AI to analyze content semantics
    const semanticType = await this.analyzeContentSemantics(content, ctx);

    return semanticType;
  }

  /**
   * Use AI to understand document semantics
   */
  private async analyzeContentSemantics(
    content: string,
    context: LibrarianContext
  ): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `Analyze this markdown document and classify it into ONE of these PKF document types:

${Object.keys(DOC_TYPE_TO_SCHEMA).join(', ')}

Document content:
${content.substring(0, 2000)}

Respond with ONLY the document type (one word). Consider:
- Content structure (headings, sections)
- Purpose and audience
- Presence of code examples, API signatures, architecture diagrams
- Writing style (tutorial vs reference vs specification)

Type:`
      }]
    });

    const inferredType = response.content[0].text.trim().toLowerCase();
    return normalizeDocType(inferredType);
  }

  /**
   * Resolve target path for document
   */
  async resolveTargetPath(
    type: string,
    filename: string,
    context: PathContext,
    sessionId: string = 'default'
  ): Promise<string> {
    const ctx = this.getContext(sessionId);

    // Use type-to-directory mapping from pkf-init
    const baseDir = PKF_TYPE_TO_DIRECTORY[type] || 'docs';

    // Check if user has established a pattern for this type
    const existingPaths = Array.from(ctx.documentIndex.values())
      .filter(doc => doc.type === type)
      .map(doc => doc.path);

    if (existingPaths.length > 0) {
      // Infer structure from existing docs
      const commonDir = this.findCommonDirectory(existingPaths);
      if (commonDir) {
        return path.join(commonDir, filename);
      }
    }

    // Use standard PKF structure
    return baseDir ? path.join(baseDir, filename) : filename;
  }

  /**
   * Generate frontmatter for document
   */
  async generateFrontmatter(
    type: string,
    content: string,
    metadata: ContentMetadata,
    sessionId: string = 'default'
  ): Promise<string> {
    const ctx = this.getContext(sessionId);
    const schema = this.getSchemaForType(type);

    // Extract information from content
    const title = this.extractTitle(content) || metadata.title || 'Untitled';
    const description = await this.generateDescription(content);
    const tags = this.extractTags(content, metadata);

    // Build frontmatter object
    const frontmatter: Record<string, any> = {
      type,
      title,
      created: new Date().toISOString().split('T')[0],
      status: 'draft'
    };

    // Add optional fields based on verbosity preference
    if (ctx.preferences.frontmatterVerbosity === 'complete') {
      frontmatter.description = description;
      frontmatter.updated = frontmatter.created;
      frontmatter.author = metadata.author || this.inferAuthor();
    }

    if (tags.length > 0) {
      frontmatter.tags = tags;
    }

    // Add schema-specific fields
    const schemaFields = this.getSchemaSpecificFields(schema, content, metadata);
    Object.assign(frontmatter, schemaFields);

    return yaml.stringify(frontmatter);
  }

  /**
   * Generate description using AI
   */
  private async generateDescription(content: string): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-20250514',
      max_tokens: 200,
      temperature: 0.5,
      messages: [{
        role: 'user',
        content: `Write a one-sentence description (max 200 chars) for this document:

${content.substring(0, 1000)}

Description:`
      }]
    });

    return response.content[0].text.trim();
  }

  /**
   * Validate document against PKF schema
   */
  async validateDocument(
    document: string,
    type: string
  ): Promise<ValidationResult> {
    const { frontmatter, content } = matter(document);
    const schema = this.getSchemaForType(type);

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate frontmatter against schema
    const requiredFields = this.getRequiredFields(schema);
    for (const field of requiredFields) {
      if (!(field in frontmatter)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate field types
    for (const [key, value] of Object.entries(frontmatter)) {
      const fieldSchema = schema.properties?.[key];
      if (fieldSchema) {
        const typeError = this.validateFieldType(key, value, fieldSchema);
        if (typeError) errors.push(typeError);
      }
    }

    // Check for broken links
    const brokenLinks = await this.detectBrokenLinks(content);
    if (brokenLinks.length > 0) {
      warnings.push(`Found ${brokenLinks.length} broken links`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Update index files after document changes
   */
  async updateIndexes(changedPaths: string[]): Promise<UpdateResult> {
    // Implementation from PROP-001 IndexUpdater
    const indexUpdater = new IndexUpdater(changedPaths);
    return await indexUpdater.updateAllIndexes('docs');
  }

  /**
   * Record operation in conversation history
   */
  recordOperation(
    operation: string,
    path: string,
    result: 'success' | 'failure',
    sessionId: string = 'default'
  ): void {
    const ctx = this.getContext(sessionId);
    ctx.conversationHistory.push({
      timestamp: Date.now(),
      operation,
      documentPath: path,
      result
    });

    // Trim history to last 100 operations
    if (ctx.conversationHistory.length > 100) {
      ctx.conversationHistory = ctx.conversationHistory.slice(-100);
    }
  }
}
```

## Integration Guide

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pkf-librarian": {
      "command": "node",
      "args": [
        "/absolute/path/to/pkf-mcp-server/dist/index.js"
      ],
      "env": {
        "PKF_PROJECT_ROOT": "/path/to/your/project",
        "PKF_LOG_LEVEL": "info"
      }
    }
  }
}
```

### Claude Code Configuration

```bash
# Add globally
claude mcp add pkf-librarian --scope user

# Or per-project
claude mcp add pkf-librarian --scope project
```

Project `.mcp.json`:
```json
{
  "mcpServers": {
    "pkf-librarian": {
      "command": "node",
      "args": ["./node_modules/.bin/pkf-mcp-server"],
      "env": {
        "PKF_PROJECT_ROOT": "."
      }
    }
  }
}
```

## Usage Examples

### Example 1: Adding API Documentation

**User in Claude Code:**
```
I just created a new UserService class with methods for user management.
Can you document the API?
```

**Claude's thought process:**
1. Recognizes need for API documentation
2. Calls `pkf-librarian.add_document` tool
3. Librarian agent:
   - Infers type: `api-reference` (from "API" and "class")
   - Resolves path: `docs/api/UserService.md`
   - Generates frontmatter with type: `api-reference`
   - Adds schema fields: `version`, API-specific metadata

**Result:**
```markdown
---
type: api-reference
title: "UserService API"
description: "User management service API documentation"
created: 2026-01-02
status: draft
author: Claude
version: "1.0.0"
tags:
  - api
  - user-management
  - service
---

# UserService API

...
```

### Example 2: Detecting Documentation Drift

**User:**
```
I changed the signature of the login() method but I'm not sure
if the docs are still accurate.
```

**Claude:**
1. Calls `pkf-librarian.detect_drift`
2. Librarian compares code signature vs documented signature
3. Reports divergence

**Response:**
```
Documentation drift detected:

File: docs/api/AuthenticationAPI.md
Issue: Method signature mismatch

Code:
  login(email: string, password: string, mfaToken?: string): Promise<Session>

Documentation:
  login(username: string, password: string): Promise<Session>

Changes needed:
  - Parameter renamed: username → email
  - New optional parameter: mfaToken
```

### Example 3: Suggesting Documentation Structure

**User:**
```
I just started a new Express API project. What documentation should I create?
```

**Claude:**
1. Calls `pkf-librarian.suggest_structure`
2. Librarian scans codebase
3. Identifies routes, middleware, models
4. Suggests PKF-compliant structure

**Response:**
```
PKF Structure Recommendations:

Required (High Priority):
  ✓ README.md - Project overview and quick start
  ✓ docs/api/API.md - API endpoint documentation (15 routes detected)
  ✓ docs/architecture/ARCHITECTURE.md - System design and data flow

Recommended (Medium Priority):
  • docs/guides/AUTHENTICATION.md - Auth middleware guide
  • docs/guides/DEPLOYMENT.md - Production deployment steps
  • docs/examples/api-usage.md - Example API calls

Detected (Needs PKF Migration):
  ⚠ routes/README.md - Missing frontmatter
  ⚠ middleware/auth.js comments - Should be extracted to docs/

Tools available:
  - add_document() to create new docs
  - generate_from_template() to use PKF templates
  - update_indexes() to maintain navigation
```

### Example 4: Maintaining Index Files

**User:**
```
I moved several architecture docs into subdirectories.
Are the index files still correct?
```

**Claude:**
1. Calls `pkf-librarian.update_indexes` with scope: "all"
2. Librarian:
   - Detects moved files
   - Updates links in 00-INDEX.md files
   - Checks for broken links
   - Reports results

**Response:**
```
Index update complete:

Updated files:
  ✓ docs/architecture/00-INDEX.md (5 links updated)
  ✓ docs/README.md (2 links updated)

Broken links detected:
  ⚠ docs/proposals/00-INDEX.md
    - [PROP-003](../archived/PROP-003.md) → File not found

Fixed automatically:
  ✓ [Architecture Overview](./overview.md) → [Architecture Overview](./architecture/overview.md)
  ✓ [Design Patterns](./patterns.md) → [Design Patterns](./architecture/decisions/patterns.md)
```

## Benefits

### For Developers

1. **Seamless integration** - Documentation operations available while coding
2. **Intelligent assistance** - Librarian handles PKF compliance automatically
3. **Reduced cognitive load** - No need to remember schema requirements
4. **Proactive maintenance** - Get notified about stale/missing docs
5. **Context awareness** - Librarian learns preferences over time

### For Documentation Quality

1. **Consistent structure** - All docs follow PKF standards
2. **Always up-to-date** - Drift detection prevents doc/code divergence
3. **Complete metadata** - Frontmatter generated automatically
4. **Validated content** - Schemas enforce quality standards
5. **Maintained navigation** - Index files updated automatically

### For Teams

1. **Shared standards** - PKF enforced across all team members
2. **Onboarding** - New members can use PKF tools to learn structure
3. **Code review** - Documentation gaps visible in reviews
4. **Searchability** - Metadata enables powerful search
5. **Audit trail** - Librarian tracks all documentation changes

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Librarian makes wrong type inference** | Medium | User can override with `type` hint; validation catches errors |
| **Performance with large doc corpus** | Medium | Cache document index in memory; lazy load schemas |
| **AI API costs for inference** | Low | Use Haiku for simple operations; cache inferences |
| **Breaking changes in MCP SDK** | High | Pin to stable v1.x; monitor for v2.0 migration path |
| **Stdio transport limitations** | Low | Support HTTP transport as alternative |
| **Session state loss on restart** | Medium | Persist critical state to SQLite database |

## Future Enhancements

### Phase 1 (MVP)
- Core tools: add, update, search, validate
- Basic type inference
- Frontmatter generation
- Index updating

### Phase 2 (Intelligence)
- AI-powered drift detection
- Semantic search with embeddings
- Multi-turn conversation support
- Learning from user corrections

### Phase 3 (Integration)
- Git hook integration (pre-commit validation)
- CI/CD integration (documentation checks)
- IDE plugins (VS Code, IntelliJ)
- Documentation preview server

### Phase 4 (Advanced)
- Multi-project support
- Team collaboration features
- Documentation versioning
- Automated doc generation from code

## Success Metrics

### Adoption Metrics
- Number of active users
- Documents created/updated via MCP vs manually
- Projects using PKF MCP server

### Quality Metrics
- Documentation coverage (% of code documented)
- Frontmatter compliance rate
- Broken link reduction
- Documentation freshness (avg age of updates)

### Performance Metrics
- Tool call response time (target: <2s)
- Inference accuracy (target: >90%)
- Session memory usage (target: <100MB)

## Implementation Timeline

### Week 1-2: Foundation
- [ ] Set up MCP server scaffolding
- [ ] Implement core Librarian agent
- [ ] Add basic tools (add_document, validate_document)
- [ ] Integration tests

### Week 3-4: Intelligence
- [ ] Implement type inference with AI
- [ ] Path resolution logic
- [ ] Frontmatter generation
- [ ] Index updater

### Week 5-6: Tools Completion
- [ ] Remaining tools (search, detect_drift, etc.)
- [ ] MCP resources for schemas/templates
- [ ] MCP prompts for common tasks
- [ ] Comprehensive testing

### Week 7-8: Polish & Release
- [ ] Documentation and examples
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Beta release

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [PKF Specification](../framework/specifications/PKF-SPECIFICATION.md)
- [PROP-001: PKF Robustness Improvements](./PROP-001-robustness-improvements.md)

## Appendices

### Appendix A: Complete Tool Schema Reference

See implementation files for full Zod schemas for all 10 tools.

### Appendix B: Librarian Decision Tree

```
Document Input
    │
    ├─ Has explicit type hint?
    │   └─ Yes → Validate hint → Use if valid
    │   └─ No → Continue to inference
    │
    ├─ Filename pattern match?
    │   └─ Yes → Use pattern-based type
    │   └─ No → Continue to content analysis
    │
    ├─ Code context available?
    │   └─ Yes (class/function) → Use 'api-reference'
    │   └─ No → Continue to semantic analysis
    │
    └─ AI semantic analysis
        └─ Return inferred type with confidence score
```

### Appendix C: Session State Schema

```typescript
interface LibrarianContext {
  conversationHistory: ConversationEntry[];
  documentIndex: Map<string, DocumentMetadata>;
  preferences: UserPreferences;
  pkfConfig: PKFConfig;
  healthMetrics: HealthMetrics;
}

interface ConversationEntry {
  timestamp: number;
  operation: string;
  documentPath?: string;
  result: 'success' | 'failure';
  metadata?: Record<string, any>;
}

interface DocumentMetadata {
  path: string;
  type: string;
  title: string;
  created: string;
  updated: string;
  tags: string[];
  wordCount: number;
  lastValidation?: number;
}

interface UserPreferences {
  defaultSchemas: Map<string, string>;
  writingStyle: 'technical' | 'conversational';
  frontmatterVerbosity: 'minimal' | 'complete';
  autoUpdateIndexes: boolean;
}
```

---

**Status:** Draft proposal for review and feedback
**Next Steps:** Review, refine, approve, implement
