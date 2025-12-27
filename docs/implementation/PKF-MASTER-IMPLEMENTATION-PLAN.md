# PKF Master Implementation Plan

**Version:** 1.0.0
**Status:** Approved for Implementation
**Created:** 2025-12-27
**Architecture Reference:** PKF-ARCHITECTURE.md v1.0.1-draft

---

## Executive Summary

This master plan coordinates the implementation of the Project Knowledge Framework (PKF) across 4 workstreams and 34 tasks. PKF is a declarative documentation management framework built on the Compose Pattern.

| Metric | Value |
|--------|-------|
| **Total Workstreams** | 4 |
| **Total Tasks** | 34 |
| **Estimated Effort** | 52-104 hours |
| **Critical Path** | WS-PKF → WS-DSL → WS-ENF → WS-TPL (partially) |

---

## 1. Workstream Overview

| ID | Workstream | Tasks | Est. Hours | Priority |
|----|------------|-------|------------|----------|
| WS-PKF | pkf-processor Core | 11 | 20-40 | **Critical** |
| WS-DSL | Schema DSL System | 8 | 19-38 | **Critical** |
| WS-ENF | Enforcement Layer | 7 | ~12-20 | High |
| WS-TPL | Template System | 8 | 13-26 | Medium |

---

## 2. Workstream Details

### 2.1 WS-PKF: pkf-processor Core Module

**Document:** [WS-001-PKF-PROCESSOR.md](./WS-001-PKF-PROCESSOR.md)

The foundational component that transforms `pkf.config.yaml` into validation artifacts.

**Key Outputs:**
- `.pkf/generated/structure.json` - Expected directory structure
- `.pkf/generated/path-schema-map.json` - Path → schema mappings
- `.pkf/generated/.remarkrc.generated.mjs` - Remark configuration

**Tasks:**
| ID | Task | Complexity | Dependencies |
|----|------|------------|--------------|
| T001 | Project Scaffolding | S | - |
| T002 | Configuration Schema Definitions (Zod) | M | T001 |
| T003 | YAML Parser Service | M | T002 |
| T004 | Compose Tree Expander | **L** | T003 |
| T005 | Structure JSON Generator | M | T004 |
| T006 | Path-Schema Map Generator | S | T004 |
| T007 | Remark Config Generator | S | T006 |
| T008 | Structure Validator | M | T005 |
| T009 | CLI Implementation | M | T007, T008 |
| T010 | Error Handling | S | T003 |
| T011 | Integration Tests | M | T009 |

**Dependencies:**
- `yaml` ^2.x - YAML parsing
- `zod` ^3.x - Schema validation
- `fast-glob` ^3.x - File pattern matching
- `ajv` ^8.x - JSON Schema validation
- `commander` ^12.x - CLI framework
- `chalk` ^5.x - Terminal colors

---

### 2.2 WS-DSL: Schema DSL System

**Document:** [WS-001-SCHEMA-DSL-SYSTEM.md](./WS-001-SCHEMA-DSL-SYSTEM.md)

Transforms human-friendly YAML schema definitions into JSON Schema draft-07.

**Key Features:**
- `extends` keyword for schema inheritance
- `type: date/datetime` shorthand
- `statuses` shorthand for enum status fields
- `id.*` configuration for ID patterns

**Tasks:**
| ID | Task | Complexity | Dependencies |
|----|------|------------|--------------|
| T001 | DSL Type Definitions | M | - |
| T002 | YAML Parser with Source Tracking | M | T001 |
| T003 | Inheritance Resolver | **L** | T002 |
| T004 | Keyword Transformer | **L** | T003 |
| T005 | JSON Schema Generator | M | T004 |
| T006 | Error Reporter | S | T002, T003 |
| T007 | Main Entry Point | M | T005, T006 |
| T008 | pkf-processor Integration | M | T007 |

**Keyword Transformations:**
| DSL | JSON Schema |
|-----|-------------|
| `extends: base` | `allOf: [{ $ref: "#/$defs/base" }]` |
| `type: date` | `type: "string", format: "date"` |
| `type: datetime` | `type: "string", format: "date-time"` |
| `statuses: [a, b]` | `properties.status.enum: ["a", "b"]` |

---

### 2.3 WS-ENF: Enforcement Layer

**Document:** [WS-ENFORCEMENT-LAYER.md](./WS-ENFORCEMENT-LAYER.md)

Three-layer validation infrastructure that makes PKF useful.

**Layers:**
1. **IDE** - Real-time feedback (VS Code extensions)
2. **Pre-commit** - Local gate (husky + lint-staged)
3. **CI/CD** - Remote gate (GitHub Actions)

**Tasks:**
| ID | Task | Complexity | Dependencies |
|----|------|------------|--------------|
| T001 | Package.json Scripts Setup | S | - |
| T002 | Remark Configuration | M | T001 |
| T003 | Vale Configuration | M | - |
| T004 | Husky Pre-commit Hooks | S | T002, T003 |
| T005 | GitHub Actions Workflow | M | T004 |
| T006 | Structure Validator Command | **L** | WS-PKF |
| T007 | Integration Test Suite | M | T005 |

**NPM Scripts:**
```json
{
  "pkf:build": "pkf-processor build",
  "pkf:validate": "npm-run-all pkf:validate:*",
  "pkf:validate:structure": "pkf-processor validate-structure",
  "pkf:validate:frontmatter": "remark docs/ --frail --quiet",
  "pkf:validate:links": "remark docs/ --use remark-validate-links --frail --quiet",
  "pkf:validate:prose": "vale docs/"
}
```

---

### 2.4 WS-TPL: Template System

**Document:** [WS-001-TEMPLATE-SYSTEM.md](./WS-001-TEMPLATE-SYSTEM.md)

Enables consistent document creation with variable substitution.

**Key Features:**
- Variable substitution: `{id}`, `{title}`, `{date}`
- Escaping: `{{id}}` → literal `{id}`
- Frontmatter injection with defaults
- Body structure with headings and placeholders

**Tasks:**
| ID | Task | Complexity | Dependencies |
|----|------|------------|--------------|
| T001 | Template Definition Schema | M | - |
| T002 | Variable System | M | - |
| T003 | Template Parser | S | T001 |
| T004 | Frontmatter Generator | M | T001, T002 |
| T005 | Body Structure Generator | M | T001, T002 |
| T006 | Template Generator | M | T004, T005 |
| T007 | Template Writer | S | T006 |
| T008 | Module Index | S | T007 |

---

## 3. Cross-Workstream Dependencies

```
                              ┌────────────────────────┐
                              │   WS-PKF (Core)        │
                              │   pkf-processor        │
                              └──────────┬─────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
          ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
          │   WS-DSL        │  │   WS-ENF        │  │   WS-TPL        │
          │   Schema DSL    │  │   Enforcement   │  │   Templates     │
          └────────┬────────┘  └────────┬────────┘  └─────────────────┘
                   │                    │
                   │                    ▼
                   │           ┌─────────────────┐
                   └──────────►│  Integration    │
                               │  (All validate) │
                               └─────────────────┘
```

**Key Dependencies:**
| From | To | Dependency Type |
|------|----|-----------------|
| WS-DSL | WS-PKF | Schema DSL integrates with pkf-processor (WS-DSL-T008) |
| WS-ENF | WS-PKF | Structure validator uses pkf-processor (WS-ENF-T006) |
| WS-ENF | WS-DSL | Remark uses generated JSON schemas |
| WS-TPL | WS-DSL | Templates reference schema names via `forSchema` |

---

## 4. Implementation Phases

### Phase 1: Foundation (WS-PKF-T001 to T004)

**Objective:** Establish project structure and core parsing.

**Deliverables:**
- [ ] pkf-processor package scaffolded
- [ ] Zod schemas for pkf.config.yaml
- [ ] YAML parser with validation
- [ ] Compose tree expander with `_items` inheritance

**Exit Criteria:**
- `pkf-processor build` parses pkf.config.yaml
- Tree expansion handles nested sections and lifecycle states

---

### Phase 2: Artifact Generation (WS-PKF-T005-T009, WS-DSL-T001-T005)

**Objective:** Generate all validation artifacts.

**Deliverables:**
- [ ] structure.json generation
- [ ] path-schema-map.json generation
- [ ] .remarkrc.generated.mjs generation
- [ ] Schema DSL parser and transformer
- [ ] JSON Schema draft-07 output

**Exit Criteria:**
- `pkf-processor build` outputs all artifacts to `.pkf/generated/`
- DSL compiles to valid JSON Schema (validated by Ajv)

---

### Phase 3: Enforcement Infrastructure (WS-ENF-T001-T005)

**Objective:** Enable automated validation at all layers.

**Deliverables:**
- [ ] npm scripts configured
- [ ] Remark configuration for frontmatter
- [ ] Vale configuration for prose
- [ ] Husky pre-commit hooks
- [ ] GitHub Actions workflow

**Exit Criteria:**
- `npm run pkf:validate` runs all validations
- Commits blocked on validation failure
- PRs show validation status

---

### Phase 4: Template System (WS-TPL-T001-T008)

**Objective:** Enable document scaffolding.

**Deliverables:**
- [ ] Template definition parsing
- [ ] Variable substitution engine
- [ ] Frontmatter and body generation
- [ ] Template file output

**Exit Criteria:**
- Templates generated from templates.yaml
- Variable substitution works with escaping

---

### Phase 5: Integration & Testing (All WS integration tasks)

**Objective:** Full system integration and testing.

**Deliverables:**
- [ ] End-to-end integration tests
- [ ] Documentation
- [ ] Example pkf.config.yaml

**Exit Criteria:**
- All tests pass
- Coverage > 80%
- No circular dependencies

---

## 5. Parallelization Strategy

### Can Run in Parallel

| Group | Tasks | Rationale |
|-------|-------|-----------|
| Early Foundation | WS-PKF-T001, WS-TPL-T001, WS-ENF-T001 | No mutual dependencies |
| Schema Work | WS-PKF-T002, WS-DSL-T001 | Independent Zod schemas |
| Config Setup | WS-ENF-T002, WS-ENF-T003 | Remark and Vale independent |
| Variable + Body | WS-TPL-T004, WS-TPL-T005 | Both depend on T001+T002 |

### Must Be Sequential

| Sequence | Tasks | Reason |
|----------|-------|--------|
| Parser Chain | WS-PKF: T001→T002→T003→T004 | Each builds on previous |
| DSL Chain | WS-DSL: T001→T002→T003→T004→T005 | Sequential transformation |
| Generator Chain | WS-PKF: T004→T005/T006→T007→T009 | Artifact dependencies |
| Hook Chain | WS-ENF: T002→T004→T005 | Pre-commit needs remark |

---

## 6. Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Schema inheritance complexity | Medium | High | Extensive tests for diamond patterns |
| YAML source tracking limits | Medium | Medium | Fallback to line-counting |
| remark-lint-frontmatter-schema changes | Low | Medium | Pin version, test before upgrade |
| Large tree performance | Low | Medium | Lazy evaluation, caching |
| File system permissions | Low | High | Dry-run mode, clear errors |

---

## 7. Technology Stack

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| yaml | ^2.x | YAML parsing |
| zod | ^3.x | Runtime validation |
| fast-glob | ^3.x | File pattern matching |
| ajv | ^8.x | JSON Schema validation |
| commander | ^12.x | CLI framework |
| chalk | ^5.x | Terminal colors |

### Enforcement Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| remark-cli | ^12.x | Markdown processing |
| remark-frontmatter | ^5.x | YAML frontmatter parsing |
| remark-lint-frontmatter-schema | ^4.x | Schema validation |
| remark-validate-links | ^13.x | Link checking |
| husky | ^9.x | Git hooks |
| lint-staged | ^15.x | Staged file linting |
| vale | ^3.x | Prose linting |

---

## 8. Success Criteria

### Minimum Viable Product (MVP)

- [ ] `pkf-processor build` generates all artifacts
- [ ] `pkf-processor validate-structure` validates directory tree
- [ ] JSON Schema generated from Schema DSL
- [ ] Pre-commit hooks block invalid documents
- [ ] CI workflow validates PRs

### Full Release

- [ ] All 34 tasks completed
- [ ] Test coverage > 80%
- [ ] Documentation complete
- [ ] Example project with pkf.config.yaml
- [ ] Template generation functional

---

## 9. Workstream Documents

| Document | Description |
|----------|-------------|
| [WS-001-PKF-PROCESSOR.md](./WS-001-PKF-PROCESSOR.md) | Core processor implementation |
| [WS-001-SCHEMA-DSL-SYSTEM.md](./WS-001-SCHEMA-DSL-SYSTEM.md) | Schema DSL compiler |
| [WS-ENFORCEMENT-LAYER.md](./WS-ENFORCEMENT-LAYER.md) | Validation infrastructure |
| [WS-001-TEMPLATE-SYSTEM.md](./WS-001-TEMPLATE-SYSTEM.md) | Template generation |

---

## 10. Tracking

### TODO Register Entries

Implementation tasks will be tracked in `docs/registers/TODO.md` with IDs:

- `TODO-PKF-xxx` - pkf-processor tasks
- `TODO-DSL-xxx` - Schema DSL tasks
- `TODO-ENF-xxx` - Enforcement tasks
- `TODO-TPL-xxx` - Template tasks

### Progress Checkpoints

| Checkpoint | Target | Criteria |
|------------|--------|----------|
| CP-1 | Phase 1 Complete | Tree expansion works |
| CP-2 | Phase 2 Complete | All artifacts generated |
| CP-3 | Phase 3 Complete | CI validates PRs |
| CP-4 | Phase 4 Complete | Templates generate |
| CP-5 | MVP | All success criteria met |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-27 | coordinator | Initial master plan synthesis |

---

*Generated from 4 workstream implementation plans*
