# PKF Comprehensive Architecture Analysis & MCP Implementation Strategy

**Generated:** 2026-01-04
**Analyst:** Claude Sonnet 4.5
**Purpose:** Deep architectural analysis, MCP strategy, and actionable recommendations

---

## Executive Summary

The Project Knowledge Framework (PKF) is a sophisticated monorepo implementing a documentation framework with AI-assisted capabilities. The project demonstrates professional architecture but requires critical fixes before production deployment. Two key proposals (PROP-001 and PROP-002) outline a strategic roadmap for robustness improvements and MCP server implementation.

**Current Status:** Feature-complete core, production-blocked by 3 ESLint errors
**Strategic Direction:** Transform into MCP-served tools with "Agentic Librarian" intelligence
**Key Opportunity:** Leverage existing pkf-init as foundation for MCP server implementation

---

## I. Project Structure & Architecture

### 1.1 Monorepo Organization

```
pkf/
├── packages/
│   ├── pkf/                    # Core specification & schemas (framework)
│   ├── pkf-init/              # AI-assisted migration tool (1,689 SLOC)
│   ├── pkf-processor/         # Config processor & validator
│   └── pkf-validator/         # Schema validation tooling
│
├── docs/                       # Self-documenting (follows PKF standards)
│   ├── proposals/             # PROP-001, PROP-002 (strategic roadmap)
│   ├── architecture/          # PKF-ARCHITECTURE.md (comprehensive)
│   └── implementation/        # Workstream plans
│
├── schemas/                    # Distributable JSON schemas
├── templates/                  # Reusable doc templates
└── agents/                     # AI agent definitions
```

**Architecture Pattern:** Domain-driven monorepo with clear separation between:
- **Framework** (pkf) - Specification and standards
- **Tooling** (pkf-processor, pkf-validator) - Static validation
- **AI Services** (pkf-init) - Dynamic AI-assisted operations
- **Distribution** (schemas, templates) - Consumable artifacts

### 1.2 pkf-init Package: AI-Powered Migration Engine

**Purpose:** AI-assisted migration of existing docs to PKF structure
**Technology Stack:**
- TypeScript 5.3.3 (strict mode)
- Anthropic SDK 0.39.0 (Claude integration)
- Commander.js (CLI framework)
- Vitest 2.1.9 (testing)

**Core Architecture - 4-Stage Workflow:**

```typescript
// Workflow Stages (src/stages/)
1. Analysis Stage (886 lines)
   - Scans repository for markdown files
   - Parallel document inspection (max 3 concurrent)
   - Uses 2 AI agents: documentation-analyst-init + document-inspector
   - Generates blueprint YAML with discovered docs

2. Schema Design Stage
   - Multi-agent conversation with convergence detection
   - Max 5 iterations of agent-to-agent dialogue
   - Generates schemas.yaml for document types
   - Built-in convergence signals (e.g., "SCHEMAS_FINALIZED")

3. Implementation Stage
   - Creates directory structure
   - Generates pkf.config.yaml
   - Initializes register files (TODO, ISSUES, CHANGELOG)
   - Creates backup before modifications

4. Migration Stage
   - Sub-phases: Pre-validation → Parallel migration → Reference updates → Cleanup → Post-validation
   - Parallel execution with worker pool
   - Cross-reference link updating
   - Rollback support via manifest tracking
```

**State Management:**
- Atomic file operations for workflow state (`.pkf-init-state.json`)
- Checkpoint/resume capability
- Lock manager for concurrent execution prevention (⚠️ has TOCTOU race condition)

**AI Integration Patterns:**
- Agent orchestration with conversation management
- Retry logic with exponential backoff
- Prompt caching for cost optimization
- Token counting and budget enforcement ($50 default max)

### 1.3 Key Design Patterns Identified

#### Pattern 1: Multi-Agent Orchestration
```typescript
// src/agents/orchestrator.ts
- Single agent tasks (one-shot)
- Multi-turn conversations (convergence detection)
- Parallel task execution with batch processing
- Session state preservation
```

**Strengths:**
- Flexible conversation patterns
- Built-in convergence detection
- Stateful conversation tracking

**Issues:**
- Debug console.error statements in production (Task #3)
- Parallel operations lack error handling (Task #6)

#### Pattern 2: Type-to-Schema Mapping
```typescript
// src/utils/type-mapping.ts (created per PROP-001)
const DOC_TYPE_TO_SCHEMA: Record<string, string> = {
  'readme': 'base-doc',
  'guide-user': 'guide',
  'guide-developer': 'guide',
  'api-reference': 'spec',
  'architecture': 'base-doc',
  'changelog': 'register',
  'todo': 'register',
  'issues': 'register',
  // ... comprehensive mapping
};
```

**Purpose:** Normalize document type names to schema identifiers
**Impact:** Prevents schema mapping errors during migration (PROP-001 motivation)

#### Pattern 3: Atomic State Operations
```typescript
// src/state/workflow-state.ts
async save(state: WorkflowState): Promise<void> {
  const tempPath = `${this.statePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(state, null, 2));
  await fs.rename(tempPath, this.statePath); // Atomic rename
}
```

**Strengths:**
- Prevents state corruption
- POSIX-compliant atomic operation

**Gaps:**
- No version migration strategy (Task #18)
- State cache can become stale if externally modified

---

## II. PROP-001: Robustness Improvements Analysis

### 2.1 Motivation & Context

**Triggering Event:** CAOF project migration encountered:
1. Silent agent failures (errors invisible)
2. Type-to-schema mismatches (readme → ? schema)
3. Incomplete cleanup (empty dirs remained)
4. Late validation (errors detected at migration stage)

**Impact:** Manual intervention required, delayed migration

### 2.2 Proposed Solutions

#### Solution 1: Schema Design Stage Improvements

**Type Mapping Validation:**
```typescript
private validateTypeToSchemaMapping(
  blueprint: string,
  schemasYaml: string
): ValidationResult {
  // Extract document types from blueprint
  // Validate each type has corresponding schema
  // Return errors/warnings
}
```

**Status:** ✅ Partially implemented (type-mapping.ts exists)
**Remaining:** Pre-migration validation hook

#### Solution 2: Agent Orchestration Enhancements

**Improved Error Reporting:**
```typescript
private logAgentError(
  agentName: string,
  iteration: number,
  error: string,
  context?: Record<string, unknown>
): void {
  logger.error(`Agent ${agentName} failed at iteration ${iteration}`);
  logger.error(`Error: ${error}`);

  if (this.debug) {
    logger.debug('Agent context:', context);
    // Write to debug log file
  }
}
```

**Status:** ⚠️ Partially done (console.error added, structured logging needed)
**Gap:** Debug logs always active (should be gated behind verbose flag)

#### Solution 3: Index File Management

**Automatic Index Update:**
```typescript
export class IndexUpdater {
  // Find INDEX files in docs tree
  // Update links after file moves
  // Detect broken links
  // Generate update report
}
```

**Status:** ❌ Not implemented
**Priority:** Medium (nice-to-have post-migration feature)

#### Solution 4: Enhanced Cleanup

**Recursive Empty Directory Removal:**
```typescript
export async function removeEmptyDirectories(
  rootDir: string,
  options: { dryRun?, excludePatterns?, maxDepth? }
): Promise<{ removed: string[]; skipped: string[] }> {
  // Recursively scan for empty directories
  // Remove bottom-up
  // Respect exclude patterns
}
```

**Status:** ❌ Not implemented
**Priority:** Low (minor UX improvement)

### 2.3 Implementation Status

| Feature | Status | Priority | Task ID |
|---------|--------|----------|---------|
| Type-to-schema mapping | ✅ Complete | Critical | N/A |
| Error logging improvements | ⚠️ Partial | High | #3 |
| Index file updater | ❌ Planned | Medium | - |
| Pre-migration validation | ❌ Planned | High | - |
| Enhanced cleanup | ❌ Planned | Low | - |

---

## III. PROP-002: PKF MCP Server with Agentic Librarian

### 3.1 Strategic Vision

**Goal:** Transform PKF from CLI tool → MCP server with intelligent agent mediation

**Value Proposition:**
- **Runtime integration:** Use PKF while coding in Claude Desktop/Code
- **Intelligent assistance:** AI validates, categorizes, maintains quality
- **Proactive maintenance:** Detects drift, suggests missing docs
- **Seamless workflow:** Natural integration into development process

### 3.2 Proposed Architecture

```
┌─────────────────────────────────────────────────┐
│         Claude Desktop / Claude Code             │
│  User: "Add API documentation for UserService"  │
└──────────────────┬──────────────────────────────┘
                   │ MCP Protocol (JSON-RPC/stdio)
                   ↓
┌─────────────────────────────────────────────────┐
│          PKF MCP Server (Node.js)                │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │   Agentic Librarian (Core Agent)       │     │
│  │   • Infers document type               │     │
│  │   • Resolves target path               │     │
│  │   • Generates frontmatter              │     │
│  │   • Validates against schemas          │     │
│  │   • Updates index files                │     │
│  │   • Detects documentation drift        │     │
│  └────────────────────────────────────────┘     │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │   MCP Tools Layer (10 Tools)           │     │
│  │   1. add_document                      │     │
│  │   2. update_document                   │     │
│  │   3. search_documentation              │     │
│  │   4. validate_document                 │     │
│  │   5. suggest_structure                 │     │
│  │   6. detect_drift                      │     │
│  │   7. generate_from_template            │     │
│  │   8. update_indexes                    │     │
│  │   9. get_documentation_health          │     │
│  │  10. infer_metadata                    │     │
│  └────────────────────────────────────────┘     │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │   PKF Engine (Business Logic)          │     │
│  │   • Reuse pkf-init components          │     │
│  │   • Schema loader & validator          │     │
│  │   • Template processor                 │     │
│  │   • Frontmatter generator              │     │
│  └────────────────────────────────────────┘     │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │   MCP Resources (Read-Only)            │     │
│  │   • pkf://schemas/{name}               │     │
│  │   • pkf://templates/{type}             │     │
│  │   • pkf://config                       │     │
│  └────────────────────────────────────────┘     │
└──────────────────┬──────────────────────────────┘
                   │ File System Operations
                   ↓
┌─────────────────────────────────────────────────┐
│          Project File System                    │
│  docs/, schemas/, pkf.config.yaml              │
└─────────────────────────────────────────────────┘
```

### 3.3 Agentic Librarian Design

**Intelligence Capabilities:**

```typescript
interface LibrarianContext {
  // Conversation tracking
  conversationHistory: ConversationEntry[];

  // Document corpus awareness
  documentIndex: Map<string, DocumentMetadata>;

  // Learned preferences
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

**Core Functions:**

1. **Type Inference** - Analyze content semantics to determine document type
2. **Path Resolution** - Determine correct location in PKF structure
3. **Frontmatter Generation** - Create valid, complete YAML frontmatter
4. **Validation** - Check documents against schemas
5. **Proactive Suggestions** - Identify missing docs, broken links

**AI Integration Pattern:**
```typescript
async inferDocumentType(content: string, hints?: TypeHints): Promise<string> {
  // 1. Check explicit type hint
  // 2. Analyze filename patterns
  // 3. Check code context
  // 4. Use AI semantic analysis
  const response = await this.anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 500,
    temperature: 0.3,
    messages: [{
      role: 'user',
      content: `Classify this document: ${content.substring(0, 2000)}`
    }]
  });
  return normalizeDocType(response.content[0].text.trim());
}
```

### 3.4 MCP Tools Specifications

#### Tool 1: add_document

**Purpose:** Add documentation with intelligent placement and frontmatter

**Schema (Zod):**
```typescript
z.object({
  content: z.string().describe("Markdown content"),
  hints: z.object({
    filename: z.string().optional(),
    type: z.enum(['readme', 'guide-user', 'api-reference', ...]).optional(),
    codeContext: z.object({
      className: z.string().optional(),
      filePath: z.string().optional(),
      language: z.string().optional()
    }).optional()
  }).optional(),
  targetPath: z.string().optional(),
  validate: z.boolean().default(true)
})
```

**Workflow:**
1. Infer document type from content/hints
2. Resolve target path based on PKF structure
3. Generate frontmatter with schema-specific fields
4. Validate against schema
5. Write document
6. Update index files
7. Return success with metadata

**Reuse Potential:** ✅ High (leverage existing pkf-init components)

#### Tool 2: update_document

**Purpose:** Update existing docs while maintaining PKF compliance

**Schema:**
```typescript
z.object({
  path: z.string(),
  changes: z.object({
    content: z.string().optional(),
    frontmatter: z.record(z.any()).optional(),
    append: z.string().optional(),
    section: z.object({
      heading: z.string(),
      content: z.string()
    }).optional()
  }),
  updateTimestamp: z.boolean().default(true)
})
```

#### Tool 3: search_documentation

**Purpose:** Semantic and metadata-based search

**Schema:**
```typescript
z.object({
  query: z.string(),
  filters: z.object({
    type: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['draft', 'review', 'published', 'deprecated']).optional(),
    createdAfter: z.string().optional(),
    updatedAfter: z.string().optional()
  }).optional(),
  limit: z.number().default(10).max(50),
  includeContent: z.boolean().default(false)
})
```

**Implementation Strategy:** Use existing document scanning from pkf-init

#### Tool 4: validate_document

**Purpose:** Validate against PKF schemas

**Reuse:** ✅ High (pkf-validator + pkf-init validation logic)

#### Tool 5: suggest_structure

**Purpose:** Analyze codebase and suggest docs

**Reuse:** ✅ Medium (adaptation of pkf-init analysis stage)

#### Tool 6: detect_drift

**Purpose:** Detect code/doc divergence

**Implementation:** New capability (requires code parsing + comparison)

#### Tool 7: generate_from_template

**Purpose:** Generate docs from PKF templates

**Reuse:** ✅ High (existing template system)

#### Tool 8: update_indexes

**Purpose:** Update INDEX/README files

**Reuse:** ⚠️ Partial (PROP-001 IndexUpdater, not yet implemented)

#### Tool 9: get_documentation_health

**Purpose:** Overall health metrics

**Implementation:** New aggregation of validation results

#### Tool 10: infer_metadata

**Purpose:** Extract metadata for frontmatter

**Reuse:** ✅ High (pkf-init frontmatter generation)

### 3.5 MCP Resources

**Read-Only Endpoints:**

```typescript
// pkf://schemas/{name} - JSON Schema files
// pkf://templates/{type} - Template content
// pkf://config - Current pkf.config.yaml
// pkf://docs/{path} - Documentation content
// pkf://index/{section} - Index file content
```

**Implementation:** Straightforward file serving with caching

### 3.6 MCP Prompts

**Reusable Conversation Starters:**

```typescript
server.prompt("document_api_class", {
  description: "Generate API documentation for a class",
  arguments: [
    { name: "className", required: true },
    { name: "filePath", required: true },
    { name: "includeExamples", required: false }
  ]
}, async ({ className, filePath, includeExamples }) => {
  // Return prompt message with pkf-reference template
});

server.prompt("audit_documentation", {
  description: "Audit project documentation",
  arguments: [
    { name: "projectPath", required: true },
    { name: "focus", required: false }
  ]
}, async ({ projectPath, focus }) => {
  // Return prompt for comprehensive audit using PKF tools
});
```

### 3.7 Integration Strategies

#### Claude Desktop Integration

**Configuration (`claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "pkf-librarian": {
      "command": "node",
      "args": ["/path/to/pkf-mcp-server/dist/index.js"],
      "env": {
        "PKF_PROJECT_ROOT": "/path/to/project",
        "PKF_LOG_LEVEL": "info"
      }
    }
  }
}
```

#### Claude Code Integration

**Project `.mcp.json`:**
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

**Package Installation:**
```bash
npm install --save-dev @pantheon-tech/pkf-mcp-server
```

**Plugin Pattern:**
```json
// package.json
{
  "claudeCode": {
    "plugins": ["@pantheon-tech/pkf-mcp-server"]
  }
}
```

### 3.8 Implementation Timeline (from PROP-002)

**Week 1-2: Foundation**
- Set up MCP server scaffolding
- Implement core Librarian agent
- Add basic tools (add_document, validate_document)
- Integration tests

**Week 3-4: Intelligence**
- Implement type inference with AI
- Path resolution logic
- Frontmatter generation
- Index updater

**Week 5-6: Tools Completion**
- Remaining tools (search, detect_drift, etc.)
- MCP resources for schemas/templates
- MCP prompts for common tasks
- Comprehensive testing

**Week 7-8: Polish & Release**
- Documentation and examples
- Performance optimization
- Error handling improvements
- Beta release

### 3.9 Code Reuse Analysis

**High Reuse Potential (>70%):**
- Agent orchestration (`src/agents/orchestrator.ts`)
- Type inference (`src/utils/type-mapping.ts`)
- Frontmatter generation (scattered in stages)
- Template processing (migration worker)
- Schema loading and validation
- File scanning utilities

**Medium Reuse (30-70%):**
- Analysis stage logic → suggest_structure tool
- Migration stage logic → update_document tool
- State management → session context

**New Implementation Required:**
- MCP server framework integration
- Tool request/response handling
- Session state management
- Drift detection (code parsing)
- Health metrics aggregation

**Estimated Reuse:** 60-65% of existing pkf-init codebase

---

## IV. Current Implementation Gaps & Blockers

### 4.1 Critical Blockers (Must Fix Before Production)

#### Issue 1: ESLint Errors (Task #11)

**Files:**
```
packages/pkf-init/src/migration/worker.ts:614:63
  - Unused parameter 'schema'

packages/pkf-init/src/stages/schema-design.ts:390:11
  - Unused variable 'patterns'

packages/pkf-init/src/stages/schema-design.ts:396:38
  - Regex no-regex-spaces
```

**Impact:** Blocks npm publish, CI/CD fails
**Effort:** 1 hour
**Priority:** CRITICAL

#### Issue 2: Race Condition in Lock Manager (Task #12)

**Location:** `src/state/lock-manager.ts:68-82`

**Problem:**
```typescript
// TOCTOU vulnerability
const lockContent = await fs.readFile(this.lockPath, 'utf-8');
const existingLock = JSON.parse(lockContent);
// ... validation ...
await fs.writeFile(this.lockPath, JSON.stringify(lockData)); // ❌ Not atomic
```

**Impact:** Data corruption risk in concurrent usage
**Effort:** 4 hours
**Priority:** CRITICAL

**Solution (from research):**
```typescript
async createLock(lockPath: string): Promise<boolean> {
  try {
    const fileHandle = await fs.open(
      lockPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY
    );
    await fileHandle.write(JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
    await fileHandle.close();
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') return false;
    throw error;
  }
}
```

#### Issue 3: Production Debug Logs (Task #3)

**Location:** `src/agents/orchestrator.ts:216-330`

**Problem:**
```typescript
console.error(`[DEBUG] Starting agent conversation: maxIterations=${maxIterations}`);
console.error(`[DEBUG] Iteration ${iterations}/${maxIterations} starting`);
// ... 7+ more console.error statements
```

**Impact:** Polluted stderr, poor UX
**Effort:** 2 hours
**Priority:** HIGH

**Solution:**
```typescript
// Replace with conditional logger
if (this.verbose) {
  logger.debug(`Starting agent conversation: maxIterations=${maxIterations}`);
}
```

### 4.2 High-Priority Improvements

#### Missing Unit Tests (Task #14)

**Untested Modules:**
- `src/stages/analysis.ts` (886 lines)
- `src/stages/schema-design.ts`
- `src/stages/implementation.ts`
- `src/stages/migration.ts`
- `src/migration/worker.ts`
- `src/agents/orchestrator.ts`
- `src/api/anthropic-client.ts`

**Current Test Coverage:** ~60% (integration only)
**Target:** 70%+ with unit tests

**Effort:** 2-3 weeks
**Priority:** HIGH

#### Hardcoded Templates (Task #15)

**Location:** `src/migration/worker.ts:663-696`

**Problem:**
```typescript
switch (type) {
  case 'readme':
    return `# ${title}\n\n> TODO: Add project description...`;
  case 'guide':
    return `# ${title}\n\n> TODO: Add guide introduction...`;
  // ... more hardcoded templates
}
```

**Impact:** Not customizable, violates DRY
**Effort:** 1 week
**Priority:** HIGH

**Solution:**
```typescript
// templates/readme.md
# {{TITLE}}

> TODO: Add project description

// src/utils/template-manager.ts
async loadTemplate(templateName: string): Promise<string> {
  const templatePath = path.join(this.templateDir, `${templateName}.md`);
  return await fs.readFile(templatePath, 'utf-8');
}
```

### 4.3 Medium-Priority Enhancements

- **Task #6:** Error handling in parallel operations
- **Task #7:** Configurable constants
- **Task #8:** State migration strategy
- **Task #9:** Secure YAML parsing
- **Task #10:** Performance optimizations

### 4.4 Missing Features from PROP-001

**Not Yet Implemented:**
- ❌ Index file updater utility
- ❌ Pre-migration validation
- ❌ Enhanced cleanup (recursive empty dir removal)
- ❌ Agent output validation
- ❌ Health check command

**Recommendation:** Defer to MCP implementation (some features better suited for MCP tools)

---

## V. MCP Implementation Strategy & Roadmap

### 5.1 Phased Implementation Approach

#### Phase 0: Critical Fixes (Week 1)
**Goal:** Make pkf-init production-ready

**Tasks:**
- ✅ Fix 3 ESLint errors (4 hours)
- ✅ Fix lock manager race condition (4 hours)
- ✅ Remove/gate debug console logs (2 hours)
- ✅ Add unit tests for lock manager (4 hours)

**Deliverable:** pkf-init v1.0.2 released

#### Phase 1: MCP Server Scaffolding (Week 2-3)
**Goal:** Basic MCP server with 2-3 tools working

**Tasks:**
- Create `packages/pkf-mcp-server/` package structure
- Install MCP SDK (`@modelcontextprotocol/sdk` ^1.0.4)
- Implement server initialization with stdio transport
- Extract reusable components from pkf-init:
  - Type mapping utility
  - Schema loader
  - Template processor
  - Frontmatter generator
- Implement Librarian agent skeleton
- Implement 2 basic tools:
  - `add_document` (most complex, proves architecture)
  - `validate_document` (leverages existing validation)
- Write integration tests

**Deliverable:** pkf-mcp-server v0.1.0 (alpha) with 2 working tools

#### Phase 2: Core Tools (Week 4-5)
**Goal:** Implement remaining essential tools

**Tasks:**
- Implement `update_document` tool
- Implement `search_documentation` tool
- Implement `generate_from_template` tool
- Implement `infer_metadata` tool
- Add MCP resources for schemas/templates
- Session state management
- Comprehensive error handling

**Deliverable:** pkf-mcp-server v0.2.0 (beta) with 6 tools

#### Phase 3: Intelligence & Integration (Week 6-7)
**Goal:** Add AI-powered features and integration

**Tasks:**
- Implement `suggest_structure` tool (reuse analysis stage)
- Implement `detect_drift` tool (new code parsing)
- Implement `update_indexes` tool (from PROP-001)
- Implement `get_documentation_health` tool
- Add MCP prompts for common tasks
- Claude Desktop integration testing
- Claude Code plugin development
- Performance optimization

**Deliverable:** pkf-mcp-server v0.3.0 (RC) with all 10 tools

#### Phase 4: Polish & Release (Week 8)
**Goal:** Production-ready release

**Tasks:**
- Comprehensive documentation
- Example projects
- Video walkthrough
- Performance benchmarking
- Security audit
- Beta user feedback incorporation

**Deliverable:** pkf-mcp-server v1.0.0 (stable)

### 5.2 Package Structure

```
packages/pkf-mcp-server/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── server.ts                   # Server initialization
│   │
│   ├── librarian/                  # Agentic Librarian
│   │   ├── agent.ts                # Core agent logic
│   │   ├── inference.ts            # Type/path inference
│   │   ├── frontmatter.ts          # Frontmatter generation
│   │   ├── validation.ts           # Document validation
│   │   └── context.ts              # Session state
│   │
│   ├── tools/                      # MCP tool handlers
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
│   │
│   ├── resources/                  # MCP resources
│   │   ├── schemas.ts
│   │   ├── templates.ts
│   │   ├── config.ts
│   │   └── docs.ts
│   │
│   ├── prompts/                    # MCP prompts
│   │   ├── api-documentation.ts
│   │   ├── changelog-entry.ts
│   │   └── audit.ts
│   │
│   ├── engine/                     # Shared business logic
│   │   ├── schema-loader.ts        # From pkf-init
│   │   ├── template-processor.ts   # From pkf-init
│   │   ├── type-mapper.ts          # From pkf-init
│   │   ├── index-updater.ts        # From PROP-001
│   │   ├── drift-detector.ts       # New
│   │   └── codebase-analyzer.ts    # From pkf-init analysis
│   │
│   └── utils/                      # Utilities
│       ├── logger.ts
│       ├── markdown.ts
│       ├── yaml.ts
│       └── fs.ts
│
├── tests/
│   ├── librarian.test.ts
│   ├── tools/
│   └── integration/
│
├── examples/                       # Example projects
│   ├── basic-usage/
│   └── advanced-workflow/
│
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

### 5.3 Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "@anthropic-ai/sdk": "^0.39.0",
    "zod": "^3.25.0",
    "js-yaml": "^4.1.0",
    "gray-matter": "^4.0.3",
    "minimatch": "^10.0.0",
    "pino": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.0.0",
    "tsup": "^8.0.0"
  }
}
```

### 5.4 Code Extraction from pkf-init

**Modules to Extract:**

1. **Type Mapping** (`src/utils/type-mapping.ts`)
   - Already modular
   - Zero dependencies
   - Direct reuse: 100%

2. **Schema Loader** (from config loader)
   - Extract schema loading logic
   - Add caching layer
   - Direct reuse: 80%

3. **Template Processor** (from migration worker)
   - Extract template string replacement
   - Add file-based template loading
   - Direct reuse: 60%

4. **Frontmatter Generator** (from migration worker)
   - Extract YAML generation logic
   - Make schema-agnostic
   - Direct reuse: 70%

5. **Document Scanner** (from analysis stage)
   - Extract file scanning logic
   - Remove AI orchestration
   - Direct reuse: 50%

6. **Agent Orchestrator** (modified)
   - Extract conversation management
   - Adapt for single-doc operations
   - Direct reuse: 40%

**Extraction Strategy:**

```typescript
// pkf-init/src/utils/type-mapping.ts
export { DOC_TYPE_TO_SCHEMA, getSchemaForDocType, normalizeDocType };

// pkf-mcp-server/src/engine/type-mapper.ts
import { DOC_TYPE_TO_SCHEMA, getSchemaForDocType, normalizeDocType } from '@pantheon-tech/pkf-init';
export { DOC_TYPE_TO_SCHEMA, getSchemaForDocType, normalizeDocType };
```

**Considerations:**
- Keep pkf-init and pkf-mcp-server in sync for shared logic
- Consider extracting shared code to `@pantheon-tech/pkf-core` package
- Monorepo structure simplifies code sharing

---

## VI. Integration Patterns & Best Practices

### 6.1 MCP Server Best Practices (from Research)

#### 1. Modular Architecture with DDD

```typescript
// src/domains/tools/index.ts
export * from './definitions';
export * from './handlers';
export * from './schemas';
export * from './types';
```

**Benefits:**
- Clear separation of concerns
- Easier testing
- Better scalability

#### 2. Composable Zod Schemas

```typescript
// src/schemas/common.ts
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20)
});

export const fileInfoSchema = z.object({
  path: z.string(),
  size: z.number().int().nonnegative(),
  lastModified: z.string().datetime()
});

// src/tools/list-files.ts
const listFilesSchema = z.object({
  directory: z.string().default('./'),
  ...paginationSchema.shape
});
```

**Benefits:**
- DRY principle
- Type safety
- Reusable validation

#### 3. Dependency Injection for Testing

```typescript
// src/infrastructure/container.ts
import { Container } from 'inversify';

export const container = new Container();
container.bind<ISchemaLoader>(TYPES.SchemaLoader).to(SchemaLoader).inSingletonScope();
container.bind<ITemplateManager>(TYPES.TemplateManager).to(TemplateManager).inSingletonScope();

// src/tools/add-document.ts
import { container } from '../infrastructure/container';
const schemaLoader = container.get<ISchemaLoader>(TYPES.SchemaLoader);
```

**Benefits:**
- Testable (easy mocking)
- Flexible (easy swapping)
- Maintainable

#### 4. Atomic File Operations

```typescript
// src/utils/atomic-fs.ts
export async function createFileExclusive(path: string, content: string): Promise<void> {
  const fileHandle = await fs.open(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY);
  await fileHandle.writeFile(content);
  await fileHandle.close();
}

export async function updateFileAtomic(path: string, content: string): Promise<void> {
  const tempPath = `${path}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, content);
  await fs.rename(tempPath, path); // Atomic on POSIX
}
```

**Benefits:**
- Prevents race conditions
- Data integrity
- Concurrent access safety

### 6.2 Session State Management

```typescript
// src/librarian/context.ts
interface LibrarianSession {
  id: string;
  userId: string;
  projectRoot: string;

  // Conversation state
  history: ConversationEntry[];

  // Cached data
  documentIndex: Map<string, DocumentMetadata>;
  pkfConfig: PKFConfig;

  // User preferences
  preferences: {
    frontmatterVerbosity: 'minimal' | 'complete';
    defaultSchemas: Map<string, string>;
  };

  // Metrics
  healthMetrics: {
    totalDocs: number;
    missingFrontmatter: number;
    brokenLinks: number;
  };

  createdAt: Date;
  lastActivity: Date;
}

export class SessionManager {
  private sessions: Map<string, LibrarianSession> = new Map();

  getOrCreateSession(sessionId: string, projectRoot: string): LibrarianSession {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        userId: 'default',
        projectRoot,
        history: [],
        documentIndex: new Map(),
        pkfConfig: null,
        preferences: {
          frontmatterVerbosity: 'complete',
          defaultSchemas: new Map()
        },
        healthMetrics: {
          totalDocs: 0,
          missingFrontmatter: 0,
          brokenLinks: 0
        },
        createdAt: new Date(),
        lastActivity: new Date()
      });
    }

    const session = this.sessions.get(sessionId)!;
    session.lastActivity = new Date();
    return session;
  }

  // Clean up stale sessions (>1 hour inactive)
  cleanupStaleSessions(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [id, session] of this.sessions.entries()) {
      if (session.lastActivity.getTime() < oneHourAgo) {
        this.sessions.delete(id);
      }
    }
  }
}
```

### 6.3 Error Handling Patterns

```typescript
// src/utils/errors.ts
export class PKFError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PKFError';
  }
}

export class ValidationError extends PKFError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class SchemaNotFoundError extends PKFError {
  constructor(schemaName: string) {
    super(`Schema not found: ${schemaName}`, 'SCHEMA_NOT_FOUND', { schemaName });
  }
}

// src/tools/add-document.ts
export async function addDocument(params: AddDocumentParams): Promise<ToolResult> {
  try {
    // ... implementation
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        content: [{
          type: 'text',
          text: `Validation failed: ${error.message}\n${JSON.stringify(error.details, null, 2)}`
        }],
        isError: true
      };
    }

    if (error instanceof SchemaNotFoundError) {
      return {
        content: [{
          type: 'text',
          text: `Schema not found: ${error.details.schemaName}\nAvailable schemas: ${listAvailableSchemas()}`
        }],
        isError: true
      };
    }

    // Unknown error
    logger.error('Unexpected error in addDocument', error);
    return {
      content: [{
        type: 'text',
        text: `An unexpected error occurred: ${error.message}`
      }],
      isError: true
    };
  }
}
```

### 6.4 Performance Optimization Patterns

#### 1. Parallel File Operations

```typescript
// Instead of sequential
for (const file of files) {
  const content = await fs.readFile(file, 'utf-8');
  await processFile(content);
}

// Use parallel with Promise.all
const fileContents = await Promise.all(
  files.map(file => fs.readFile(file, 'utf-8'))
);
for (const content of fileContents) {
  await processFile(content);
}
```

#### 2. Caching Strategy

```typescript
// src/engine/schema-loader.ts
export class SchemaLoader {
  private cache: Map<string, JSONSchema> = new Map();

  async loadSchema(schemaName: string): Promise<JSONSchema> {
    if (this.cache.has(schemaName)) {
      return this.cache.get(schemaName)!;
    }

    const schema = await this.loadSchemaFromFile(schemaName);
    this.cache.set(schemaName, schema);
    return schema;
  }

  invalidateCache(schemaName?: string): void {
    if (schemaName) {
      this.cache.delete(schemaName);
    } else {
      this.cache.clear();
    }
  }
}
```

#### 3. Lazy Loading

```typescript
// src/librarian/agent.ts
export class PKFLibrarian {
  private _documentIndex?: Map<string, DocumentMetadata>;

  async getDocumentIndex(): Promise<Map<string, DocumentMetadata>> {
    if (!this._documentIndex) {
      this._documentIndex = await this.scanDocuments();
    }
    return this._documentIndex;
  }

  invalidateDocumentIndex(): void {
    this._documentIndex = undefined;
  }
}
```

---

## VII. Actionable Recommendations

### 7.1 Immediate Actions (This Week)

**Priority 1: Fix Critical Blockers**

1. ✅ **Fix ESLint Errors** (4 hours)
   ```bash
   # Fix unused variable 'schema' in worker.ts:614
   # Fix unused variable 'patterns' in schema-design.ts:390
   # Fix regex spacing in schema-design.ts:396
   npm run lint -- --fix
   ```

2. ✅ **Fix Lock Manager Race Condition** (4 hours)
   ```typescript
   // Implement atomic file operations with O_EXCL flag
   // Add unit tests for concurrent lock attempts
   // Update documentation
   ```

3. ✅ **Remove Debug Logs** (2 hours)
   ```typescript
   // Replace console.error with conditional logger
   // Add --verbose CLI flag
   // Update all debug statements
   ```

**Deliverable:** pkf-init v1.0.2 release

### 7.2 Short-Term Actions (Next 2 Weeks)

**Priority 2: Externalize Templates**

4. ✅ **Extract Template Strings** (1 week)
   - Create `templates/` directory in pkf-init
   - Move hardcoded templates to markdown files
   - Implement TemplateManager class
   - Update migration worker to use templates
   - Add customization documentation

**Priority 3: Add Unit Tests**

5. ✅ **Test Coverage for Lock Manager** (4 hours)
   - Test atomic lock acquisition
   - Test concurrent access scenarios
   - Test stale lock detection
   - Test error conditions

6. ✅ **Test Coverage for Type Mapping** (4 hours)
   - Test all document type mappings
   - Test normalization logic
   - Test edge cases

### 7.3 Medium-Term Actions (Next 4-6 Weeks)

**Priority 4: MCP Server MVP**

7. ✅ **Phase 0: pkf-init Production Ready** (Week 1)
   - Complete tasks 1-6 above
   - Release v1.0.2

8. ✅ **Phase 1: MCP Server Scaffolding** (Week 2-3)
   - Create pkf-mcp-server package
   - Extract reusable components
   - Implement 2 basic tools (add_document, validate_document)
   - Integration tests

9. ✅ **Phase 2: Core Tools** (Week 4-5)
   - Implement 6 tools total
   - MCP resources
   - Session state management

10. ✅ **Phase 3: Intelligence** (Week 6)
    - Remaining 4 tools
    - MCP prompts
    - Claude Desktop/Code integration

### 7.4 Long-Term Strategy (Next 3-6 Months)

**Phase 1:** pkf-mcp-server v1.0.0 (stable release)
- All 10 tools implemented
- Comprehensive documentation
- Example projects
- Performance benchmarking

**Phase 2:** Enhanced Intelligence
- Improved drift detection with AST parsing
- Semantic search with embeddings
- Multi-project support
- Team collaboration features

**Phase 3:** Ecosystem Growth
- VS Code extension
- IntelliJ plugin
- CI/CD integrations
- Documentation preview server

**Phase 4:** Advanced Features
- Multi-language support (beyond markdown)
- Documentation versioning
- Automated doc generation from code
- Analytics and insights

---

## VIII. Risk Analysis & Mitigation

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **MCP SDK Breaking Changes** | Medium | High | Pin to v1.x, monitor roadmap, prepare for v2 migration |
| **AI API Cost Overruns** | Low | Medium | Token counting, budget enforcement, caching |
| **Performance with Large Repos** | Medium | Medium | Lazy loading, caching, parallel processing |
| **Session State Loss** | Low | Low | Persistent state to SQLite, regular snapshots |
| **Type Inference Accuracy** | Medium | Low | User override, manual type hints, validation |

### 8.2 Adoption Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Low User Adoption** | Medium | High | Comprehensive docs, video tutorials, example projects |
| **Learning Curve Too Steep** | Medium | Medium | Interactive setup wizard, sane defaults, progressive disclosure |
| **Integration Friction** | Low | Medium | One-command install, automatic detection, clear error messages |

### 8.3 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Maintenance Burden** | Medium | Medium | Automated testing, CI/CD, clear contribution guidelines |
| **Security Vulnerabilities** | Low | High | Regular npm audit, dependency updates, security policy |
| **Breaking Changes** | Low | High | Semantic versioning, deprecation warnings, migration guides |

---

## IX. Success Metrics

### 9.1 Short-Term Metrics (3 Months)

**Technical:**
- ✅ Zero build errors
- ✅ 70%+ test coverage
- ✅ <2s tool response time
- ✅ <100MB memory usage

**Adoption:**
- 🎯 10+ beta users
- 🎯 5+ GitHub stars
- 🎯 3+ npm weekly downloads

### 9.2 Medium-Term Metrics (6 Months)

**Technical:**
- ✅ 90%+ type inference accuracy
- ✅ 95%+ frontmatter compliance
- ✅ 50%+ reduction in broken links

**Adoption:**
- 🎯 100+ active users
- 🎯 50+ GitHub stars
- 🎯 10+ projects using PKF
- 🎯 5+ community contributions

### 9.3 Long-Term Metrics (12 Months)

**Quality:**
- ✅ 80%+ documentation coverage
- ✅ 98%+ frontmatter compliance
- ✅ 75%+ reduction in stale docs

**Adoption:**
- 🎯 1000+ active users
- 🎯 500+ GitHub stars
- 🎯 100+ npm weekly downloads
- 🎯 Integration with major doc tools

---

## X. Conclusion

### Key Findings

1. **PKF is well-architected** but blocked by 3 critical ESLint errors
2. **PROP-001 roadmap is solid** - focus on type mapping and validation
3. **PROP-002 vision is compelling** - MCP server enables new use cases
4. **60-65% code reuse** possible from pkf-init → pkf-mcp-server
5. **8-week timeline** to MCP server v1.0.0 is achievable

### Strategic Recommendations

1. **Immediate:** Fix critical blockers (Tasks #11, #12, #3)
2. **Short-term:** Externalize templates, add unit tests
3. **Medium-term:** Build MCP server MVP with 10 tools
4. **Long-term:** Ecosystem growth with plugins and integrations

### Next Steps

1. **This Week:** Fix ESLint errors, release pkf-init v1.0.2
2. **Next Week:** Start MCP server scaffolding
3. **Week 3:** Extract components, implement first 2 tools
4. **Week 8:** Beta release of pkf-mcp-server v1.0.0

### Final Thoughts

PKF has strong fundamentals and a clear vision. The transition from CLI tool to MCP-served intelligent assistant will unlock significant value for developers. The proposed architecture leverages existing components effectively while introducing new capabilities.

The project is at a critical juncture - fixing the blockers and executing on the MCP vision will position PKF as a leading documentation framework in the AI-assisted development landscape.

---

**Document Version:** 1.0.0
**Author:** Claude Sonnet 4.5 (Autonomous Analysis)
**Date:** 2026-01-04
**Project:** Project Knowledge Framework (PKF)
**Confidence:** High (based on comprehensive codebase analysis and research)
