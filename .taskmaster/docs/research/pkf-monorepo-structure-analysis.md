# PKF Monorepo Structure Analysis: Current vs. Optimal

**Generated:** 2026-01-04
**Analyst:** Claude Sonnet 4.5
**Question:** Should PKF remain a monorepo with multiple packages, or should the structure be redesigned?

---

## Executive Summary

**Current Status:** ✅ **Monorepo structure is CORRECT but INCOMPLETE**

**Recommendation:** **Keep monorepo, add `@pantheon-tech/pkf-core` shared package**

**Rationale:**
- Zero circular dependencies (excellent foundation)
- Packages are completely independent (NO internal deps found)
- 60-65% code reuse potential identified but unrealized
- MCP server implementation will duplicate pkf-init code without shared package
- Current structure supports independent versioning (critical for stable API)

---

## I. Current Structure Analysis

### 1.1 Package Inventory

```
packages/
├── pkf/                    # Core specification & CLI (minimalist)
├── pkf-init/              # AI-assisted migration (1,689 SLOC)
├── pkf-processor/         # Config processor & validator
├── pkf-validator/         # Schema validation
└── [planned] pkf-mcp-server/  # MCP server (60% overlap with pkf-init)
```

### 1.2 Dependency Analysis Results

**Cross-Package Dependencies:** ❌ **ZERO** (packages are islands)

```json
// No internal dependencies found in any package.json!
{
  "dependencies": {
    // Only external deps: chalk, commander, typescript, etc.
    // NO @pantheon-tech/pkf-* references
  }
}
```

**Circular Dependencies:** ✅ **ZERO** (madge analysis clean)

```bash
npx madge --circular --extensions ts packages/*/src
✔ No circular dependency found!
```

**Dependency Overlap:**

| Dependency | pkf | pkf-init | pkf-processor | pkf-validator | Duplication |
|------------|-----|----------|---------------|---------------|-------------|
| `chalk` | ✅ | ✅ | ✅ | ✅ | 4x |
| `commander` | ✅ | ✅ | ✅ | ✅ | 4x |
| `typescript` | ✅ | ✅ | ✅ | ✅ | 4x (devDep) |
| `vitest` | ❌ | ✅ | ✅ | ✅ | 3x (devDep) |
| `ajv` | ❌ | ❌ | ✅ | ✅ | 2x |
| `yaml` | ❌ | ❌ | ✅ | ✅ | 2x |
| `@anthropic-ai/sdk` | ❌ | ✅ | ❌ | ❌ | 1x (unique) |

**Analysis:**
- ✅ Good: Shared dependencies (chalk, commander) - monorepo tools hoist these
- ⚠️ Missed Opportunity: No shared utilities despite code reuse potential
- ⚠️ Future Problem: MCP server will duplicate pkf-init internals

### 1.3 Code Reuse Analysis (from earlier analysis)

**Identified Reuse Potential:**

| Component | Source | Target | Reuse % |
|-----------|--------|--------|---------|
| Type mapping | pkf-init | pkf-mcp-server | 100% |
| Schema loader | pkf-init | pkf-mcp-server | 80% |
| Template processor | pkf-init | pkf-mcp-server | 60% |
| Frontmatter generator | pkf-init | pkf-mcp-server | 70% |
| Document scanner | pkf-init | pkf-mcp-server | 50% |
| Agent orchestrator | pkf-init | pkf-mcp-server | 40% |

**Total Estimated Reuse:** 60-65% of pkf-init → pkf-mcp-server

**Current Implementation:** ❌ **ZERO REUSE** (packages are isolated)

---

## II. Alternative Architectures

### Option 1: Keep Current Structure (No Changes)

```
packages/
├── pkf/
├── pkf-init/
├── pkf-processor/
├── pkf-validator/
└── pkf-mcp-server/        # New, duplicates pkf-init code
```

**Pros:**
- ✅ No migration work
- ✅ Independent versioning
- ✅ Simple mental model

**Cons:**
- ❌ 60% code duplication between pkf-init and pkf-mcp-server
- ❌ Bug fixes require updates in multiple places
- ❌ Larger bundle sizes
- ❌ Maintenance burden increases with each package
- ❌ No shared utilities for common patterns

**Verdict:** ❌ **Rejected** - Code duplication is unacceptable

---

### Option 2: Monorepo with Shared Core Package (RECOMMENDED)

```
packages/
├── pkf/                   # Specification & schemas (distributable)
├── pkf-core/             # NEW: Shared utilities & business logic
├── pkf-init/             # AI migration (uses pkf-core)
├── pkf-mcp-server/       # MCP server (uses pkf-core)
├── pkf-processor/        # Config processor
└── pkf-validator/        # Schema validator
```

**pkf-core Contents:**

```typescript
// @pantheon-tech/pkf-core
export {
  // Type mapping (from pkf-init)
  DOC_TYPE_TO_SCHEMA,
  getSchemaForDocType,
  normalizeDocType,
} from './type-mapper';

export {
  // Schema operations
  SchemaLoader,
  loadSchema,
  validateAgainstSchema,
} from './schema';

export {
  // Template processing
  TemplateManager,
  processTemplate,
  TemplateVariables,
} from './templates';

export {
  // Frontmatter utilities
  generateFrontmatter,
  parseFrontmatter,
  FrontmatterGenerator,
} from './frontmatter';

export {
  // Document scanning
  scanDocuments,
  DocumentScanner,
  DocumentMetadata,
} from './scanner';

export {
  // Common utilities
  atomicFileWrite,
  safeYamlLoad,
  safeYamlDump,
} from './utils';

export {
  // Shared types
  PKFConfig,
  DocumentType,
  SchemaDefinition,
} from './types';
```

**Updated Dependencies:**

```json
// pkf-init/package.json
{
  "dependencies": {
    "@pantheon-tech/pkf-core": "workspace:*",
    "@anthropic-ai/sdk": "^0.39.0",
    "commander": "^12.1.0",
    "ora": "^8.1.1",
    "inquirer": "^12.3.0"
  }
}

// pkf-mcp-server/package.json
{
  "dependencies": {
    "@pantheon-tech/pkf-core": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.4",
    "@anthropic-ai/sdk": "^0.39.0",
    "zod": "^3.25.0"
  }
}
```

**Pros:**
- ✅ DRY principle: Single source of truth for shared code
- ✅ Bug fixes propagate automatically
- ✅ Smaller bundle sizes (shared code tree-shaken)
- ✅ Independent versioning still possible
- ✅ Clear separation: core logic vs. interfaces
- ✅ Testable: Core logic tested once, used everywhere
- ✅ Migration-friendly: Extract existing code gradually

**Cons:**
- ⚠️ Initial extraction work (2-3 days)
- ⚠️ Need to design stable API for pkf-core
- ⚠️ Potential for breaking changes in core affecting multiple packages

**Verdict:** ✅ **RECOMMENDED** - Best balance of DRY and modularity

---

### Option 3: Single Package with Multiple Entry Points

```
packages/
└── pkf/                   # Monolithic package
    ├── src/
    │   ├── core/         # Shared logic
    │   ├── cli/          # pkf-init functionality
    │   ├── mcp/          # MCP server
    │   ├── processor/    # Config processor
    │   └── validator/    # Validator
    └── package.json       # Single package
```

**Export Pattern:**

```json
// package.json
{
  "name": "@pantheon-tech/pkf",
  "exports": {
    ".": "./dist/index.js",
    "./cli": "./dist/cli/index.js",
    "./mcp": "./dist/mcp/index.js",
    "./processor": "./dist/processor/index.js",
    "./validator": "./dist/validator/index.js"
  }
}
```

**Pros:**
- ✅ Zero code duplication
- ✅ Single version number
- ✅ Simplified publishing
- ✅ Tree-shaking works optimally

**Cons:**
- ❌ All-or-nothing versioning (breaking change in MCP affects CLI users)
- ❌ Large package size (users download everything)
- ❌ Cannot independently version components
- ❌ Violates single responsibility (package does too much)
- ❌ Harder to maintain as project grows

**Verdict:** ❌ **Rejected** - Loss of modularity outweighs benefits

---

### Option 4: Hybrid (Core + Domain Packages + All-in-One)

```
packages/
├── pkf-core/             # Shared business logic
├── pkf-init/             # CLI tool (standalone)
├── pkf-mcp-server/       # MCP server (standalone)
├── pkf-processor/        # Processor (standalone)
├── pkf-validator/        # Validator (standalone)
└── pkf/                  # Meta-package (exports all)
```

**pkf Meta-Package:**

```json
{
  "name": "@pantheon-tech/pkf",
  "version": "1.0.0",
  "dependencies": {
    "@pantheon-tech/pkf-core": "^1.0.0",
    "@pantheon-tech/pkf-init": "^1.0.0",
    "@pantheon-tech/pkf-mcp-server": "^1.0.0",
    "@pantheon-tech/pkf-processor": "^1.0.0",
    "@pantheon-tech/pkf-validator": "^1.0.0"
  }
}
```

**Pros:**
- ✅ Best of both worlds: modularity + convenience
- ✅ Users can install `pkf` for everything or cherry-pick
- ✅ Independent versioning
- ✅ Clear dependency graph

**Cons:**
- ⚠️ More complex publishing workflow
- ⚠️ Need to manage meta-package version

**Verdict:** ⚠️ **VIABLE** - Good for mature ecosystem, overkill for now

---

## III. Detailed Recommendation: Option 2 + Core Package

### 3.1 Proposed Structure

```
packages/
├── pkf-core/                      # NEW: Shared business logic
│   ├── src/
│   │   ├── type-mapper/          # Document type → schema mapping
│   │   ├── schema/               # Schema loading & validation
│   │   ├── templates/            # Template processing
│   │   ├── frontmatter/          # Frontmatter generation
│   │   ├── scanner/              # Document scanning
│   │   ├── utils/                # Atomic FS, safe YAML, etc.
│   │   └── types/                # Shared TypeScript types
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
├── pkf/                           # Specification & schemas
│   ├── schemas/                  # JSON schemas (distributable)
│   ├── templates/                # Template files
│   ├── src/                      # Minimal CLI (if any)
│   └── package.json
│
├── pkf-init/                      # AI-assisted migration CLI
│   ├── src/
│   │   ├── commands/             # CLI commands
│   │   ├── stages/               # Workflow stages (uses pkf-core)
│   │   ├── agents/               # AI orchestration (uses pkf-core)
│   │   ├── migration/            # Migration logic (uses pkf-core)
│   │   └── state/                # State management
│   ├── agents/                   # Agent definitions
│   └── package.json
│
├── pkf-mcp-server/               # NEW: MCP server
│   ├── src/
│   │   ├── server/               # MCP server setup
│   │   ├── librarian/            # Agentic librarian (uses pkf-core)
│   │   ├── tools/                # MCP tool handlers (uses pkf-core)
│   │   ├── resources/            # MCP resources
│   │   └── prompts/              # MCP prompts
│   └── package.json
│
├── pkf-processor/                # Config processor & validator
│   ├── src/
│   │   ├── parser/
│   │   ├── generator/
│   │   └── validator/
│   └── package.json
│
└── pkf-validator/                # Schema validation tooling
    ├── src/
    │   └── validators/
    └── package.json
```

### 3.2 Dependency Graph

```
┌─────────────────────────────────────────────────┐
│             pkf (schemas + templates)           │
│             - No dependencies                   │
│             - Pure distribution package         │
└─────────────────────────────────────────────────┘
                        │
                        │ (runtime: schemas & templates)
                        ↓
┌─────────────────────────────────────────────────┐
│             pkf-core (shared logic)             │
│             - Loads schemas from pkf            │
│             - Template processing               │
│             - Type mapping                      │
│             - Frontmatter generation            │
│             - Common utilities                  │
└─────────────────────────────────────────────────┘
         │                │                │
         │                │                │
         ↓                ↓                ↓
┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│  pkf-init   │  │ pkf-mcp-     │  │ pkf-        │
│  (CLI)      │  │ server       │  │ processor   │
│             │  │ (MCP tools)  │  │             │
│  + Anthro-  │  │ + Anthro-    │  │  + Config   │
│    pic SDK  │  │   pic SDK    │  │    parser   │
│  + State    │  │ + MCP SDK    │  │             │
│    mgmt     │  │ + Librarian  │  │             │
└─────────────┘  └──────────────┘  └─────────────┘
                                          │
                                          ↓
                                  ┌─────────────┐
                                  │ pkf-        │
                                  │ validator   │
                                  │             │
                                  │  + Ajv      │
                                  └─────────────┘
```

**Key Principles:**
1. **pkf** - Pure distribution (schemas, templates)
2. **pkf-core** - Business logic (no CLI, no framework-specific code)
3. **pkf-init**, **pkf-mcp-server** - Interface layers (use pkf-core)
4. **pkf-processor**, **pkf-validator** - Independent tooling

### 3.3 pkf-core API Design

**Package Exports:**

```typescript
// @pantheon-tech/pkf-core/package.json
{
  "name": "@pantheon-tech/pkf-core",
  "version": "1.0.0",
  "exports": {
    ".": "./dist/index.js",
    "./type-mapper": "./dist/type-mapper/index.js",
    "./schema": "./dist/schema/index.js",
    "./templates": "./dist/templates/index.js",
    "./frontmatter": "./dist/frontmatter/index.js",
    "./scanner": "./dist/scanner/index.js",
    "./utils": "./dist/utils/index.js",
    "./types": "./dist/types/index.js"
  }
}
```

**Usage in pkf-init:**

```typescript
// pkf-init/src/stages/analysis.ts
import { scanDocuments, DocumentScanner } from '@pantheon-tech/pkf-core/scanner';
import { getSchemaForDocType } from '@pantheon-tech/pkf-core/type-mapper';

// Instead of duplicating scanner code
const scanner = new DocumentScanner(projectRoot);
const documents = await scanner.scan();
```

**Usage in pkf-mcp-server:**

```typescript
// pkf-mcp-server/src/tools/add-document.ts
import { generateFrontmatter, FrontmatterGenerator } from '@pantheon-tech/pkf-core/frontmatter';
import { getSchemaForDocType, normalizeDocType } from '@pantheon-tech/pkf-core/type-mapper';
import { safeYamlDump } from '@pantheon-tech/pkf-core/utils';

async function addDocument(params: AddDocumentParams): Promise<ToolResult> {
  const docType = normalizeDocType(params.hints?.type || 'readme');
  const schemaName = getSchemaForDocType(docType);

  const generator = new FrontmatterGenerator(schemaName);
  const frontmatter = await generator.generate(params.content, params.hints);

  const yamlFrontmatter = safeYamlDump(frontmatter);
  // ... rest of implementation
}
```

### 3.4 Migration Path

**Phase 1: Create pkf-core package (Week 1)**

1. **Day 1-2:** Scaffold pkf-core package
   ```bash
   mkdir -p packages/pkf-core/src/{type-mapper,schema,templates,frontmatter,scanner,utils,types}
   npm init -w packages/pkf-core
   ```

2. **Day 3:** Extract type-mapper from pkf-init
   ```bash
   cp packages/pkf-init/src/utils/type-mapping.ts packages/pkf-core/src/type-mapper/index.ts
   # Update imports in pkf-init to use @pantheon-tech/pkf-core/type-mapper
   ```

3. **Day 4:** Extract schema utilities
   - Schema loader logic
   - Validation utilities
   - JSON schema operations

4. **Day 5:** Extract template processing
   - Template string replacement
   - Variable substitution
   - Template file loading

5. **Day 6:** Extract frontmatter generation
   - YAML generation
   - Schema-specific field logic
   - Metadata extraction

6. **Day 7:** Extract document scanner
   - File globbing logic
   - Metadata extraction
   - Document indexing

**Phase 2: Update pkf-init to use pkf-core (Week 1)**

1. Replace duplicated code with imports from pkf-core
2. Update tests to ensure no regressions
3. Verify CLI still works identically

**Phase 3: Build pkf-mcp-server using pkf-core (Week 2-8)**

1. Start with pkf-core as foundation
2. Add MCP-specific layers (librarian, tools)
3. No code duplication with pkf-init

**Deliverable:** Monorepo with shared core, ready for MCP implementation

### 3.5 Versioning Strategy

**Semantic Versioning per Package:**

| Package | Version | Change Impact |
|---------|---------|---------------|
| `pkf` | 1.0.x | Schemas/templates added → patch |
| `pkf-core` | 1.x.x | New utility → minor, Breaking API → major |
| `pkf-init` | 1.x.x | Independent from pkf-core (depends on ^1.0.0) |
| `pkf-mcp-server` | 0.x.x | Alpha/beta during development |
| `pkf-processor` | 1.x.x | Independent |
| `pkf-validator` | 1.x.x | Independent |

**pkf-core Stability Contract:**

```json
// pkf-init/package.json
{
  "dependencies": {
    "@pantheon-tech/pkf-core": "^1.0.0"  // Accepts 1.x.x (minor updates OK)
  }
}

// pkf-mcp-server/package.json
{
  "dependencies": {
    "@pantheon-tech/pkf-core": "^1.0.0"  // Same version range
  }
}
```

**Breaking Changes in pkf-core:**
- Bump to 2.0.0
- Update dependent packages as needed
- Can version independently (pkf-init stays 1.x, pkf-mcp-server goes 2.x if needed)

---

## IV. Comparison Matrix

| Criteria | Current | Option 1 (No Change) | Option 2 (+ Core) | Option 3 (Single Pkg) | Option 4 (Hybrid) |
|----------|---------|----------------------|-------------------|----------------------|-------------------|
| **Code Duplication** | 0% (isolated) | 60% (mcp→init) | 0% (shared) | 0% (monolith) | 0% (shared) |
| **Maintenance Burden** | Medium | High | Low | Medium | Medium |
| **Independent Versioning** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Bundle Size** | Optimal | Bloated | Optimal | Large | Optimal |
| **Migration Effort** | N/A | None | 3-5 days | 2 weeks | 1 week |
| **Complexity** | Low | Low | Medium | Low | High |
| **Future MCP Support** | ❌ Poor | ❌ Poor | ✅ Excellent | ⚠️ OK | ✅ Excellent |
| **DRY Principle** | ❌ No | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| **Testability** | Medium | Low | High | High | High |
| **API Stability** | N/A | N/A | ⚠️ Needs design | ✅ Internal | ⚠️ Needs design |

**Score (out of 10):**
- Current: 5/10 (foundation OK, missing shared code)
- Option 1: 3/10 (unacceptable duplication)
- **Option 2: 9/10** ✅ (best balance)
- Option 3: 6/10 (too monolithic)
- Option 4: 7/10 (overkill for current scale)

---

## V. Specific Recommendations

### 5.1 Immediate Action Items

1. **Keep the monorepo structure** ✅
   - Current setup is sound
   - Zero circular dependencies is excellent
   - Workspace hoisting works well

2. **Create `@pantheon-tech/pkf-core` package** 🆕
   - Extract shared utilities from pkf-init
   - Design stable API for core functionality
   - Implement comprehensive tests for core

3. **Update pkf-init to depend on pkf-core** 🔄
   - Replace duplicated code with imports
   - Verify no regressions

4. **Build pkf-mcp-server on pkf-core** 🆕
   - Start with shared foundation
   - Add MCP-specific layers
   - Achieve 60-65% code reuse target

### 5.2 Package Responsibilities

| Package | Responsibility | Exports |
|---------|---------------|---------|
| **pkf** | Distributable schemas & templates | Schemas, templates, spec |
| **pkf-core** | Shared business logic | Type mapper, schema ops, template engine, frontmatter, scanner, utils |
| **pkf-init** | CLI for AI-assisted migration | CLI commands, workflow orchestration, agent management, state |
| **pkf-mcp-server** | MCP tools & librarian | MCP server, tools, resources, prompts, librarian agent |
| **pkf-processor** | Config processing & validation | Config parser, structure validator, generator |
| **pkf-validator** | Schema validation | Frontmatter validator, register validator, schema checker |

### 5.3 Design Principles for pkf-core

1. **Framework-agnostic** - No CLI code, no MCP code, pure business logic
2. **Stateless** - All functions pure or with explicit state parameters
3. **Composable** - Small, focused modules
4. **Well-typed** - Comprehensive TypeScript types
5. **Tested** - 90%+ test coverage (foundational code)
6. **Documented** - JSDoc for all public APIs
7. **Stable** - Semantic versioning, clear deprecation policy

### 5.4 Migration Checklist

**Week 1: Extract pkf-core**
- [ ] Create pkf-core package structure
- [ ] Extract type-mapper (100% reuse)
- [ ] Extract schema loader (80% reuse)
- [ ] Extract template processor (60% reuse)
- [ ] Extract frontmatter generator (70% reuse)
- [ ] Extract document scanner (50% reuse)
- [ ] Extract common utilities (atomic FS, safe YAML)
- [ ] Write comprehensive tests for pkf-core
- [ ] Document pkf-core API

**Week 1: Update pkf-init**
- [ ] Add pkf-core dependency
- [ ] Replace type-mapping with pkf-core import
- [ ] Replace schema operations with pkf-core
- [ ] Replace template logic with pkf-core
- [ ] Replace frontmatter logic with pkf-core
- [ ] Run full test suite (ensure no regressions)
- [ ] Update documentation

**Week 2+: Build pkf-mcp-server**
- [ ] Create pkf-mcp-server package
- [ ] Add pkf-core as dependency
- [ ] Implement librarian using pkf-core utilities
- [ ] Implement MCP tools using pkf-core
- [ ] Add MCP-specific layers (resources, prompts)
- [ ] Verify code reuse target (60-65%)

---

## VI. Risks & Mitigation

### Risk 1: pkf-core API Instability

**Risk:** Breaking changes in pkf-core affect multiple packages

**Mitigation:**
- Design API carefully upfront (1-2 days of API design)
- Use semantic versioning strictly
- Write comprehensive tests
- Deprecate gradually (don't remove immediately)
- Document all breaking changes in CHANGELOG

### Risk 2: Extraction Breaks pkf-init

**Risk:** Moving code to pkf-core introduces bugs

**Mitigation:**
- Extract incrementally (one module at a time)
- Run full test suite after each extraction
- Keep test coverage >90%
- Use git tags to mark "before extraction" points

### Risk 3: Over-Engineering pkf-core

**Risk:** Creating abstraction layers that don't add value

**Mitigation:**
- Start with concrete code from pkf-init
- Refactor only what's needed for reuse
- Don't create abstractions for hypothetical future needs
- Follow YAGNI (You Aren't Gonna Need It)

### Risk 4: Versioning Conflicts

**Risk:** pkf-init and pkf-mcp-server need different pkf-core versions

**Mitigation:**
- Design pkf-core API to be backward compatible
- Use peer dependencies where appropriate
- Keep breaking changes to minimum
- Coordinate releases of dependent packages

---

## VII. Conclusion

### Final Recommendation: ✅ **Option 2 - Monorepo with pkf-core**

**Keep the monorepo structure + Add shared core package**

**Why:**
1. **Current foundation is solid** - Zero circular deps, clean workspace
2. **Code duplication is the real problem** - 60% overlap between pkf-init and future pkf-mcp-server
3. **Shared core solves this elegantly** - DRY principle without sacrificing modularity
4. **Independent versioning preserved** - Each package can evolve at its own pace
5. **Migration is low-risk** - Extract incrementally, test continuously

**Implementation Timeline:**
- **Week 1:** Create pkf-core, extract from pkf-init, update pkf-init
- **Week 2-8:** Build pkf-mcp-server on pkf-core foundation

**Success Metrics:**
- Zero code duplication between packages
- pkf-core achieves 60-65% reuse target
- All tests pass after extraction
- pkf-init behavior unchanged
- pkf-mcp-server ships in 8 weeks

### Not Recommended

- ❌ **Option 1 (No change)** - Unacceptable code duplication
- ❌ **Option 3 (Single package)** - Loses modularity benefits
- ⚠️ **Option 4 (Hybrid)** - Overkill for current scale (revisit at 10+ packages)

---

**Next Steps:**
1. Approve monorepo + pkf-core structure
2. Design pkf-core API (1-2 days)
3. Begin extraction (Week 1 timeline)
4. Update pkf-init (same week)
5. Build pkf-mcp-server (Week 2+)

**Confidence Level:** High (based on dependency analysis, code reuse patterns, and MCP requirements)
