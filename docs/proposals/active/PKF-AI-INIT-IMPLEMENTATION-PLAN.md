---
title: PKF AI-Assisted Initialization - Implementation Plan
version: "1.1.0"
status: Active
category: guide
created: 2025-12-28
updated: 2025-12-28
author: System Architect
tags:
  - pkf-init
  - implementation
  - planning
---

# PKF AI-Assisted Initialization - Implementation Plan

**Version:** 1.1
**Created:** 2025-12-28
**Last Revised:** 2025-12-28
**Status:** Approved (Peer Review Score: 9.7/10)
**Architecture Reference:** PKF-AI-INIT-ARCHITECTURE-v1.1.md (Score: 9.25/10)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Phase Breakdown](#2-phase-breakdown)
3. [Phase 0: Prerequisites](#3-phase-0-prerequisites-4-weeks)
4. [Phase 1: Foundation](#4-phase-1-foundation-2-weeks)
5. [Phase 2: Agent System](#5-phase-2-agent-system-2-weeks)
6. [Phase 3: Workflow Engine](#6-phase-3-workflow-engine-2-weeks)
7. [Phase 4: Migration System](#7-phase-4-migration-system-2-weeks)
8. [Phase 5: Polish & Testing](#8-phase-5-polish--testing-2-weeks)
9. [Testing Strategy](#9-testing-strategy)
   - 9.1 [Test Pyramid](#91-test-pyramid)
   - 9.2 [Unit Tests](#92-unit-tests)
   - 9.3 [Integration Tests](#93-integration-tests)
   - 9.4 [End-to-End Tests](#94-end-to-end-tests)
   - 9.5 [Test Fixtures](#95-test-fixtures)
   - 9.6 [Test Fixture Specifications](#96-test-fixture-specifications)
   - 9.7 [Integration Test Matrix](#97-integration-test-matrix)
10. [Risk Management](#10-risk-management)
11. [Success Criteria](#11-success-criteria)
12. [Resource Requirements](#12-resource-requirements)
13. [Appendix A: Checklist Summary](#appendix-a-checklist-summary)
14. [Appendix B: Implementation Reference](#appendix-b-implementation-reference)

---

## 1. Overview

### 1.1 Objective

Implement the AI-assisted initialization feature for PKF based on the approved architecture (v1.1, score 9.25/10).

**Goal:** Enable users to initialize PKF in existing projects through AI-powered analysis, schema design, and documentation migration.

### 1.2 Timeline

**Total Duration:** 16 weeks (4 months with 2-week buffer)

| Phase | Duration | Dependencies | Deliverables |
|-------|----------|--------------|--------------|
| Phase 0 | 4 weeks | None | pkf-validator package |
| Phase 1 | 2 weeks | Phase 0 | Foundation (CLI, state, config) |
| Phase 2 | 2 weeks | Phase 1 | Agent system & orchestrator |
| Phase 3 | 2 weeks | Phase 2 | Workflow engine & stages |
| Phase 4 | 2 weeks | Phase 3 | Migration system |
| Phase 5 | 2 weeks | Phase 4 | Polish, testing, documentation |
| **Buffer** | 2 weeks | - | Overflow & refinement |

### 1.3 Team Composition

**Recommended Team Size:** 2-3 developers

**Roles:**
- **Lead Developer:** Orchestrator, state management, workflow engine
- **Agent Specialist:** Agent definitions, convergence logic, API integration
- **Testing Engineer:** Test fixtures, integration tests, validation (can be shared role)

### 1.4 Success Metrics

- ✅ Successfully initializes PKF in 90% of test repositories
- ✅ Schema design converges within 5 iterations in 80% of cases
- ✅ Token estimation accuracy within ±30%
- ✅ Cost estimation accuracy within ±30%
- ✅ Time estimation accuracy within ±40%
- ✅ No data loss (backup mechanism 100% reliable)
- ✅ All validation passes after migration

---

## 2. Phase Breakdown

### 2.1 Critical Path

```
Phase 0 (pkf-validator)
  ↓
Phase 1 (Foundation) ← Can start in parallel with Phase 0 Week 2-3
  ↓
Phase 2 (Agent System)
  ↓
Phase 3 (Workflow Engine)
  ↓
Phase 4 (Migration System)
  ↓
Phase 5 (Polish & Testing)
```

### 2.2 Parallel Work Opportunities

**Phase 0 + Phase 1 Overlap:**
- While validators are being implemented (Phase 0), CLI scaffolding and state management (Phase 1) can begin after Week 1 of Phase 0

**Phase 2 + Phase 3 Overlap:**
- Agent definition markdown files can be written during Phase 2
- Workflow stage planning can begin during Phase 2

### 2.3 Key Milestones

| Milestone | Week | Deliverable |
|-----------|------|-------------|
| M1: Validation Ready | Week 4 | pkf-validator package complete |
| M2: Foundation Ready | Week 6 | CLI + State + Config working |
| M3: Agents Working | Week 8 | Agent orchestrator + convergence |
| M4: Workflow Complete | Week 10 | All 4 stages working end-to-end |
| M5: Migration Working | Week 12 | Document migration + validation |
| M6: Production Ready | Week 14 | All tests passing, documentation complete |

---

## 3. Phase 0: Prerequisites (4 weeks)

### 3.1 Objective

Implement the `pkf-validator` package with all validation capabilities required by the init workflow.

### 3.2 Week 0-1: Config & TODO Validators

#### Tasks

**Day 1-2: Package Setup**
- [ ] Create `packages/pkf-validator/` directory structure
- [ ] Initialize package.json with dependencies
  - `ajv` (JSON Schema validation)
  - `js-yaml` (YAML parsing)
  - `glob` (file pattern matching)
  - `chalk` (colored output)
- [ ] Set up TypeScript configuration
- [ ] Create test directory structure

**Day 3-5: Config Validator**
- [ ] Implement `validateConfig()` function
  - Load `pkf.config.yaml`
  - Validate against `schemas/pkf-config.schema.json`
  - Check directory references exist
  - Validate document type definitions
- [ ] Write unit tests (10+ cases)
- [ ] Add CLI command: `pkf validate:config`

**Day 6-10: TODO Validator**
- [ ] Implement `validateTodo()` function
  - Parse TODO.md
  - Validate frontmatter against `schemas/todo-item.schema.json`
  - Check status values (pending, in-progress, completed, blocked)
  - Validate dates (created, updated, due_date)
  - Check ID uniqueness
- [ ] Write unit tests (15+ cases)
- [ ] Add CLI command: `pkf validate:todo`

**Deliverables:**
- ✅ Config validator working with CLI
- ✅ TODO validator working with CLI
- ✅ Unit tests passing (25+ tests)

---

### 3.3 Week 1-2: Issue & Changelog Validators

#### Tasks

**Day 1-5: Issue Validator**
- [ ] Implement `validateIssues()` function
  - Parse ISSUES.md
  - Validate frontmatter against `schemas/issue-item.schema.json`
  - Check status values (open, investigating, in-progress, resolved, closed)
  - Validate severity (critical, high, medium, low)
  - Check ID uniqueness and format
- [ ] Write unit tests (15+ cases)
- [ ] Add CLI command: `pkf validate:issues`

**Day 6-10: Changelog Validator**
- [ ] Implement `validateChangelog()` function
  - Parse CHANGELOG.md
  - Validate frontmatter against `schemas/changelog-entry.schema.json`
  - Check version format (semver)
  - Validate dates
  - Check change types (added, changed, deprecated, removed, fixed, security)
  - Verify chronological order
- [ ] Write unit tests (15+ cases)
- [ ] Add CLI command: `pkf validate:changelog`

**Deliverables:**
- ✅ Issue validator working with CLI
- ✅ Changelog validator working with CLI
- ✅ Unit tests passing (30+ tests)

---

### 3.4 Week 2-3: Frontmatter Validator

#### Tasks

**Day 1-3: Schema DSL Parser**
- [ ] Implement `parseSchemaDSL()` function
  - Load `schemas.yaml`
  - Validate against `schemas/pkf-schema-dsl.schema.json`
  - Resolve `_extends` inheritance
  - Build flattened schema map
- [ ] Write unit tests (10+ cases)

**Day 4-7: Frontmatter Validator**
- [ ] Implement `validateFrontmatter()` function
  - Discover all markdown files in docs/
  - Extract frontmatter from each file
  - Determine document type from path/schema mapping
  - Validate frontmatter against resolved schema
  - Check required fields
  - Validate enum values
  - Check pattern matches (regex)
  - Validate dates
- [ ] Write unit tests (20+ cases)
- [ ] Add CLI command: `pkf validate:frontmatter`

**Day 8-10: Validator Polish & Edge Cases**
- [ ] Add edge case handling to all validators
  - Empty files
  - Malformed YAML
  - Missing frontmatter
  - Invalid UTF-8 characters
- [ ] Enhance error messages with context
- [ ] Add performance optimizations (caching, parallel validation)
- [ ] Write additional tests for edge cases (15+ cases)

**Deliverables:**
- ✅ Frontmatter validator working with CLI
- ✅ Schema DSL parsing with inheritance
- ✅ Edge cases handled gracefully
- ✅ Unit tests passing (45+ tests)

**Note:** Link validator and prose validator (Vale integration) deferred to Phase 5 to ensure Phase 0 completes on schedule.

---

### 3.5 Week 3-4: Integration & Aggregation

#### Tasks

**Day 1-3: Master Validator**
- [ ] Implement `validateAll()` function
  - Run all validators in sequence
  - Aggregate results
  - Generate summary report
  - Exit with appropriate code (0 = success, 1 = errors, 2 = warnings only)
- [ ] Add CLI command: `pkf validate` (runs all)
- [ ] Write integration tests

**Day 4-6: Reporting & Output**
- [ ] Implement pretty-printed output
  - Colored output (red = error, yellow = warning, green = success)
  - File paths with line numbers
  - Error messages with context
  - Summary statistics
- [ ] Add `--json` flag for machine-readable output
- [ ] Add `--verbose` flag for detailed output

**Day 7-10: Package Polish**
- [ ] Write package README.md
- [ ] Create API documentation
- [ ] Add integration tests (5+ scenarios)
- [ ] Performance testing (validate 100+ file repository)
- [ ] Update main package.json with `pkf:validate` script

**Deliverables:**
- ✅ pkf-validator package complete and published (or linked locally)
- ✅ All validators working end-to-end
- ✅ Integration tests passing (5+ scenarios)
- ✅ Documentation complete
- ✅ Performance validated (<5s for 100 files)

---

## 4. Phase 1: Foundation (2 weeks)

### 4.1 Objective

Build the foundational components: CLI interface, state management, configuration loading, and cost tracking.

### 4.2 Week 5: Package Setup & State Management

#### Tasks

**Day 1-2: Package Scaffolding**
- [ ] Create `packages/pkf-init/` directory structure
```
packages/pkf-init/
├── src/
│   ├── cli.ts
│   ├── commands/
│   │   └── init.ts
│   ├── state/
│   │   ├── workflow-state.ts
│   │   └── lock-manager.ts
│   ├── config/
│   │   └── loader.ts
│   ├── utils/
│   │   ├── cost-tracker.ts
│   │   └── logger.ts
│   └── types/
│       └── index.ts
├── tests/
├── package.json
└── tsconfig.json
```
- [ ] Initialize package.json with dependencies
  - `@anthropic-ai/sdk`
  - `commander` (CLI)
  - `inquirer` (interactive prompts)
  - `ora` (spinners)
  - `chalk` (colors)
  - `js-yaml`
- [ ] Set up TypeScript configuration

**Day 3-5: Workflow State Manager**
- [ ] Implement `WorkflowState` interface (from architecture Section 4.2)
- [ ] Implement `WorkflowStateManager` class
  - `load()` - Load state from `.pkf-init-state.json`
  - `save()` - Save state atomically
  - `checkpoint()` - Create checkpoint
  - `canResume()` - Check if resume is possible
  - `clear()` - Clear state on completion
- [ ] Write unit tests (15+ cases)

**Day 6-8: Lock Manager**
- [ ] Implement `InitLockManager` class (from architecture Section 21.3)
  - `acquire()` - Atomic lock acquisition
  - `release()` - Release lock
  - `forceRelease()` - Force release with warning
  - Stale lock detection (1 hour timeout)
  - SIGINT/SIGTERM handlers
- [ ] Write unit tests (10+ cases)
- [ ] Test concurrent execution scenarios

**Day 9-10: Cost Tracker**
- [ ] Implement `CostTracker` class
  - Token counting per model
  - Cost calculation per model (pricing table)
  - Budget enforcement
  - Cost estimation
- [ ] Write unit tests (10+ cases)

**Deliverables:**
- ✅ State management working with checkpoints
- ✅ Lock manager preventing concurrent runs
- ✅ Cost tracker with budget enforcement
- ✅ Unit tests passing (35+ tests)

---

### 4.3 Week 6: CLI Interface & Configuration

#### Tasks

**Day 1-3: CLI Structure**
- [ ] Implement `cli.ts` entry point
- [ ] Implement `init` command with all flags (from architecture Section 4.1)
  - `--interactive, -i`
  - `--dry-run`
  - `--resume`
  - `--step <step>`
  - `--docs-path <path>`
  - `--max-cost <amount>`
  - `--workers <count>`
  - `--api-key <key>`
  - `--api-tier <tier>`
  - `--output <dir>`
  - `--backup-dir <dir>`
  - `--skip-backup`
  - `--force`
  - `--verbose, -v`
- [ ] Write help text and examples

**Day 4-6: Configuration Loader**
- [ ] Implement `ConfigLoader` class
  - Load API key (env var, CLI arg, config file)
  - Validate API key format
  - Load project metadata
  - Detect existing PKF installation
  - Warn if PKF already initialized
- [ ] Write unit tests (10+ cases)

**Day 7-8: Interactive Mode**
- [ ] Implement approval gates using `inquirer`
  - Stage 1 approval (blueprint review)
  - Stage 2 approval (schema review)
  - Stage 3 approval (directory structure preview)
  - Stage 4 approval (migration plan review)
- [ ] Add progress spinners using `ora`
- [ ] Add colored output using `chalk`

**Day 9-10: Dry-Run Mode**
- [ ] Implement `--dry-run` flag logic
  - Run analysis only
  - Show cost estimate
  - Show time estimate
  - Display migration plan
  - Don't create any files
- [ ] Implement time estimator (from architecture Section 21.4)
- [ ] Write integration tests

**Deliverables:**
- ✅ CLI accepting all flags with validation
- ✅ Configuration loading with API key validation
- ✅ Interactive mode with approval gates
- ✅ Dry-run mode with estimates
- ✅ Integration tests passing (5+ scenarios)

---

## 5. Phase 2: Agent System (2 weeks)

### 5.1 Objective

Implement the agent orchestration system, including API integration, rate limiting, convergence detection, and agent definitions.

### 5.2 Week 7: API Integration & Rate Limiting

#### Tasks

**Day 1-3: Anthropic SDK Integration**
- [ ] Implement `AnthropicClient` wrapper
  - Initialize SDK with API key
  - Message creation with retry logic
  - Token usage tracking
  - Error handling (rate limits, network errors)
- [ ] Write unit tests (mocked API)

**Day 4-6: Rate Limiter**
- [ ] Implement `RateLimiter` class (from architecture Section 16.2)
  - Token bucket algorithm
  - Per-tier limits configuration
  - `acquire()` method with waiting
  - Bucket refill logic
  - Exponential backoff on 429/529 errors
- [ ] Write unit tests (15+ cases)
- [ ] Test with different tier configurations

**Day 7-8: Token Estimator**
- [ ] Implement `TokenEstimator` class (from architecture Section 21.2)
  - `estimate()` - Character-based estimation
  - `estimateConversation()` - Message array estimation
  - `estimateAgentExecution()` - Full context estimation
  - `estimateFileAnalysis()` - File analysis estimation
- [ ] Write unit tests (10+ cases)
- [ ] Validate against real API responses

**Day 9-10: Request Queue**
- [ ] Implement `RequestQueue` class (from architecture Section 16.4)
  - Queue management
  - Concurrent execution control
  - Rate limiter integration
- [ ] Write unit tests (10+ cases)
- [ ] Test parallel execution scenarios

**Deliverables:**
- ✅ Anthropic SDK integration working
- ✅ Rate limiting preventing API errors
- ✅ Token estimation within ±30% accuracy
- ✅ Request queue supporting parallel workers
- ✅ Unit tests passing (45+ tests)

---

### 5.3 Week 8: Agent Orchestrator & Convergence

#### Tasks

**Day 1-3: Agent Configuration**
- [ ] Implement `AgentConfig` interface
- [ ] Implement agent config loader
  - Load agent markdown files from `agents/pkf-init/`
  - Parse YAML frontmatter
  - Extract system instructions
- [ ] Create agent definition files:
  - `agents/pkf-init/documentation-analyst-init.md`
  - `agents/pkf-init/pkf-implementer.md`
  - `agents/pkf-init/documentation-migration-worker.md`
- [ ] Write unit tests (5+ cases)

**Day 4-6: Agent Orchestrator**
- [ ] Implement `AgentOrchestrator` class (from architecture Section 4.3)
  - `executeAgent()` - Single agent execution
  - Token estimation integration
  - Rate limiter integration
  - Cost tracking integration
  - Error handling and retry
- [ ] Write unit tests (mocked agents)

**Day 7-9: Convergence Detection**
- [ ] Implement `detectConvergence()` function (from architecture Section 21.1)
  - Explicit signal detection (regex)
  - Implicit agreement detection
  - `ConvergenceResult` interface
- [ ] Implement `agentConversation()` method
  - Bi-directional agent loop
  - Convergence checking after each turn
  - Max iterations handling
  - Metadata tracking
- [ ] Write unit tests (15+ cases)

**Day 10: Integration Testing**
- [ ] Test agent orchestrator with real API (small test case)
- [ ] Validate convergence detection with mock conversations
- [ ] Test cost tracking accuracy
- [ ] Test token estimation accuracy

**Deliverables:**
- ✅ Agent orchestrator working with real API
- ✅ Convergence detection reliable (80%+ success rate)
- ✅ Agent definitions complete (3 agents)
- ✅ Unit tests passing (35+ tests)
- ✅ Integration tests passing (3+ scenarios)

---

## 6. Phase 3: Workflow Engine (2 weeks)

### 6.1 Objective

Implement the multi-stage workflow engine including analysis, schema design, and implementation stages.

### 6.2 Week 9: Stage 1 & 2 (Analysis + Schema Design)

#### Tasks

**Day 1-3: Stage 1 - Analysis**
- [ ] Implement `AnalysisStage` class
  - Scan repository for documentation
  - Execute documentation-analyst-init agent
  - Generate blueprint YAML
  - Validate blueprint against `schemas/docs-blueprint.schema.json`
  - Save blueprint to `.pkf-init-state.json`
- [ ] Write unit tests (mocked agent)
- [ ] Create test fixtures (3+ sample repos)

**Day 4-7: Stage 2 - Schema Design**
- [ ] Implement `SchemaDesignStage` class
  - Load blueprint from state
  - Initialize agent conversation loop
  - Execute documentation-analyst-init ↔ pkf-implementer conversation
  - Track iterations (max 5)
  - Detect convergence
  - Extract schemas.yaml from final response
  - Validate schemas.yaml against `schemas/pkf-schema-dsl.schema.json`
  - Save schemas.yaml to state
- [ ] Write unit tests (mocked agents)
- [ ] Test convergence scenarios (success and failure)

**Day 8-10: Stage Integration**
- [ ] Implement stage coordinator
  - Checkpoint between stages
  - Resume capability
  - Approval gates (if interactive)
  - Progress reporting
- [ ] Write integration tests (Stage 1 → Stage 2)
- [ ] Test with real API on sample repository

**Deliverables:**
- ✅ Stage 1 (Analysis) working end-to-end
- ✅ Stage 2 (Schema Design) working with convergence
- ✅ Checkpoints and resume working
- ✅ Integration tests passing (2+ scenarios)

---

### 6.3 Week 10: Stage 3 (Implementation)

#### Tasks

**Day 1-3: Directory Structure Generator**
- [ ] Implement `StructureGenerator` class
  - Generate PKF directory structure
  - Create required directories (docs/, registers/, etc.)
  - Generate structure.json
  - Validate against `pkf:validate:structure`
- [ ] Write unit tests (5+ cases)

**Day 4-6: Configuration Generator**
- [ ] Implement `ConfigGenerator` class
  - Generate pkf.config.yaml from schemas
  - Map document types to paths
  - Set up register paths
  - Set up template paths
  - Validate against `schemas/pkf-config.schema.json`
- [ ] Write unit tests (5+ cases)

**Day 7-8: Register Initializer**
- [ ] Implement `RegisterInitializer` class
  - Create TODO.md from template
  - Create ISSUES.md from template
  - Create CHANGELOG.md from template
  - Populate with initial entries
  - Validate against respective schemas
- [ ] Write unit tests (5+ cases)

**Day 9-10: Stage 3 Implementation**
- [ ] Implement `ImplementationStage` class
  - Execute pkf-implementer agent
  - Generate all files (structure, config, registers)
  - Validate all outputs
  - Create backup of existing docs (if any)
  - Save implementation state
- [ ] Write integration tests (Stage 2 → Stage 3)

**Deliverables:**
- ✅ Stage 3 (Implementation) working end-to-end
- ✅ Directory structure generated correctly
- ✅ Configuration files validated
- ✅ Backup mechanism working
- ✅ Integration tests passing (3+ scenarios)

---

## 7. Phase 4: Migration System (2 weeks)

### 7.1 Objective

Implement the documentation migration system with parallel workers and frontmatter injection.

### 7.2 Week 11: Migration Planner & Worker System

#### Tasks

**Day 1-3: Migration Planner**
- [ ] Implement `MigrationPlanner` class
  - Load existing documentation list from blueprint
  - Determine document type for each file
  - Generate migration tasks (file → type → target path)
  - Prioritize tasks (critical files first)
  - Estimate migration cost and time
- [ ] Write unit tests (10+ cases)

**Day 4-6: Migration Worker**
- [ ] Implement `MigrationWorker` class
  - Execute documentation-migration-worker agent
  - Read existing document
  - Determine target schema from config
  - Generate frontmatter
  - Preserve existing content
  - Write to new location
  - Validate frontmatter
- [ ] Write unit tests (mocked agent)

**Day 7-9: Parallel Execution**
- [ ] Implement `ParallelMigrationExecutor` class
  - Queue all migration tasks
  - Execute workers in parallel (configurable count)
  - Use RequestQueue for rate limiting
  - Track progress
  - Collect results
  - Handle failures gracefully
- [ ] Write unit tests (10+ cases)

**Day 10: Worker Agent Definition**
- [ ] Create documentation-migration-worker agent
  - Write markdown file with instructions
  - Add YAML frontmatter
  - Test with sample migrations
  - Tune prompts for accuracy

**Deliverables:**
- ✅ Migration planner generating tasks
- ✅ Migration worker executing single task
- ✅ Parallel execution with rate limiting
- ✅ Worker agent definition complete
- ✅ Unit tests passing (20+ tests)

---

### 7.3 Week 12: Stage 4 Implementation & Validation

#### Tasks

**Day 1-3: Stage 4 - Migration**
- [ ] Implement `MigrationStage` class
  - Load migration plan from planner
  - Execute parallel migration
  - Show progress (spinner with file count)
  - Collect results
  - Handle partial failures
  - Save migration results to state
- [ ] Write integration tests (Stage 3 → Stage 4)

**Day 4-6: Post-Migration Validation**
- [ ] Implement validation step
  - Run `pkf:validate:frontmatter` on all migrated files
  - Run `pkf:validate:structure`
  - Collect validation errors
  - Report to user
  - Offer to rollback if critical errors
- [ ] Write tests for validation scenarios

**Day 7-8: Rollback Mechanism**
- [ ] Implement `rollback()` function
  - Restore from backup directory
  - Remove generated files
  - Clear state
  - Report success
- [ ] Write tests for rollback scenarios

**Day 9-10: End-to-End Testing**
- [ ] Test full workflow on sample repositories (3+ repos)
  - Small repo (10 docs)
  - Medium repo (50 docs)
  - Large repo (100 docs)
- [ ] Validate success metrics
  - Migration success rate
  - Validation pass rate
  - Cost accuracy
  - Time accuracy
- [ ] Fix issues found

**Deliverables:**
- ✅ Stage 4 (Migration) working end-to-end
- ✅ Post-migration validation working
- ✅ Rollback mechanism working
- ✅ Full workflow tested on 3+ repositories
- ✅ Success metrics validated

---

## 8. Phase 5: Polish & Testing (2 weeks)

### 8.1 Objective

Polish the user experience, add comprehensive testing, write documentation, and prepare for release.

### 8.2 Week 13: UX Polish & Error Handling

#### Tasks

**Day 1-3: Error Messages**
- [ ] Review all error messages
  - Make them actionable
  - Add suggestions for fixes
  - Include relevant context
  - Test all error paths
- [ ] Implement error recovery
  - Graceful degradation
  - Partial success handling
  - Clear failure states

**Day 4-6: Progress Reporting**
- [ ] Enhance progress output
  - Stage-by-stage progress
  - Substep progress (analyzing file 5/42)
  - Time remaining estimates
  - Cost accumulation display
- [ ] Add verbose mode details
  - Agent conversation snippets
  - Token usage per call
  - Validation results details

**Day 7-8: Interactive Mode Polish**
- [ ] Improve approval gate UX
  - Show preview of changes
  - Allow edits before approval
  - Add "explain" option
  - Add "skip this stage" option
- [ ] Test interactive flows

**Day 9-10: Additional Validators & Resume Experience**
- [ ] Implement link validator (deferred from Phase 0)
  - Extract all markdown links from docs/
  - Check internal links exist
  - Warn on broken anchors
  - Report external links (don't validate HTTP)
  - Add CLI command: `pkf validate:links`
  - Write unit tests (10+ cases)
- [ ] Integrate prose validator (Vale)
  - Add Vale integration to master validator
  - Use existing `.vale.ini` configuration
  - Add CLI command: `pkf validate:prose`
  - Write unit tests (5+ cases)
- [ ] Improve resume UX
  - Show progress from last run
  - Highlight what will be skipped
  - Allow resuming from different stage
  - Test various resume scenarios

**Deliverables:**
- ✅ Link validator complete (optional but recommended)
- ✅ Prose validator integrated
- ✅ All error messages actionable
- ✅ Progress reporting clear and helpful
- ✅ Interactive mode polished
- ✅ Resume experience smooth

---

### 8.3 Week 14: Testing & Documentation

#### Tasks

**Day 1-3: Integration Tests**
- [ ] Create comprehensive test fixtures
  - Empty repository
  - Repository with README only
  - Repository with partial docs
  - Repository with complete docs (different formats)
  - Large repository (100+ files)
- [ ] Write integration tests for all fixtures
  - Test full workflow
  - Test resume capability
  - Test failure scenarios
  - Test validation failures
- [ ] Achieve 80%+ integration test coverage

**Day 4-6: Documentation**
- [ ] Write pkf-init README.md
  - Installation instructions
  - Quick start guide
  - All CLI flags explained
  - Examples for common scenarios
  - Troubleshooting section
- [ ] Write SKILL.md for PKF
  - How to use pkf init
  - Interactive vs non-interactive
  - Dry-run recommendations
  - Cost optimization tips
- [ ] Update main PKF docs
  - Add initialization section
  - Link to new agent definitions
  - Update getting started guide

**Day 7-8: Performance Testing**
- [ ] Test with large repositories
  - 100 files: target <60 min
  - 200 files: target <90 min
- [ ] Optimize bottlenecks
  - Parallel worker tuning
  - Token estimation caching
  - State save frequency
- [ ] Validate rate limiting under load

**Day 9-10: Security Review**
- [ ] Review API key handling
- [ ] Review file system operations
- [ ] Review output sanitization
- [ ] Fix any security issues found
- [ ] Document security best practices

**Deliverables:**
- ✅ Integration tests covering all scenarios (10+ test cases)
- ✅ Documentation complete (README, SKILL.md, guides)
- ✅ Performance validated on large repos
- ✅ Security review passed
- ✅ Ready for release

---

## 9. Testing Strategy

### 9.1 Test Pyramid

```
                    E2E Tests (5)
                   /           \
            Integration Tests (25)
           /                      \
      Unit Tests (200+)
```

### 9.2 Unit Tests

**Target Coverage:** 85%+

**Key Areas:**
- State management (15 tests)
- Lock manager (10 tests)
- Cost tracker (10 tests)
- Rate limiter (15 tests)
- Token estimator (10 tests)
- Convergence detection (15 tests)
- Each validator (10 tests × 5 = 50 tests)
- Migration planner (10 tests)
- Configuration generator (10 tests)
- Structure generator (5 tests)
- Migration worker (10 tests)
- Utilities (20 tests)

**Total:** 200+ unit tests

### 9.3 Integration Tests

**Target:** 25 integration tests

**Scenarios:**
- Phase 0: Validator integration (5 tests)
- Phase 1: State + Lock + Config (3 tests)
- Phase 2: Agent + Rate limiting (5 tests)
- Phase 3: Stage 1 → Stage 2 → Stage 3 (3 tests)
- Phase 4: Full workflow with migration (5 tests)
- Resume scenarios (3 tests)
- Failure scenarios (1 test per stage)

### 9.4 End-to-End Tests

**Target:** 5 E2E tests

**Fixtures:**
1. Empty repository (no docs) → Full PKF initialization
2. Repository with README only → PKF initialization with analysis
3. Repository with mixed docs → Full migration
4. Large repository (100 files) → Performance validation
5. Resume scenario → Interrupted workflow → Resume to completion

### 9.5 Test Fixtures

**Required Test Repositories:**

1. **empty-repo/**
   - README.md
   - src/ with code files
   - No documentation

2. **readme-only-repo/**
   - README.md with content
   - Basic project structure
   - No other docs

3. **partial-docs-repo/**
   - README.md
   - docs/ with 5-10 markdown files
   - No frontmatter
   - Inconsistent structure

4. **complete-docs-repo/**
   - README.md
   - docs/ with 20-30 files
   - Some frontmatter (non-PKF)
   - Clear structure

5. **large-repo/**
   - README.md
   - docs/ with 100+ files
   - Multiple subdirectories
   - Various document types

### 9.6 Test Fixture Specifications

Detailed specifications for creating test repositories.

#### Fixture 1: empty-repo

**Purpose:** Test PKF initialization on repository with no existing documentation

**Directory Structure:**
```
empty-repo/
├── README.md              (Basic project info, 50 lines, no frontmatter)
├── package.json
├── src/
│   ├── index.ts          (100 lines of sample code)
│   ├── utils.ts          (50 lines of sample code)
│   └── config.ts         (30 lines of sample code)
├── tests/
│   └── index.test.ts     (50 lines)
└── .gitignore
```

**README.md Content:**
```markdown
# Empty Repo Test Fixture

This is a test repository with no documentation structure.

## Installation
npm install

## Usage
npm start

## License
MIT
```

**Expected Behavior:**
- Stage 1: Blueprint shows `docs_found: false`, recommends creating base structure
- Stage 2: Schema design creates minimal schema (`base-document` type only)
- Stage 3: Creates full PKF directory structure (docs/, registers/, etc.)
- Stage 4: Migrates README.md to docs/README.md with generated frontmatter

**Validation:**
- All files pass `pkf:validate`
- Structure matches PKF standards
- README.md has valid frontmatter (`type: readme`, `title`, `created`)
- All registers created (TODO.md, ISSUES.md, CHANGELOG.md)

---

#### Fixture 2: readme-only-repo

**Purpose:** Test PKF initialization with minimal existing documentation

**Directory Structure:**
```
readme-only-repo/
├── README.md              (Comprehensive, 200 lines, no frontmatter)
├── package.json
├── src/
│   ├── index.ts
│   ├── api/
│   │   ├── users.ts
│   │   └── products.ts
│   └── utils/
│       ├── logger.ts
│       └── validator.ts
├── tests/
└── .gitignore
```

**README.md Content:** Comprehensive with sections:
- Overview (50 lines)
- Installation (30 lines)
- API Documentation (60 lines - describes 2 endpoints)
- Configuration (30 lines)
- Contributing (30 lines)

**Expected Behavior:**
- Stage 1: Blueprint detects README with API information, recommends splitting
- Stage 2: Schema design creates 2 types: `readme`, `api-doc`
- Stage 3: Creates PKF structure
- Stage 4: Migrates README.md, suggests extracting API sections to separate docs

**Validation:**
- README.md migrated with frontmatter
- Suggestion to split API docs shown to user
- Structure valid

---

#### Fixture 3: partial-docs-repo

**Purpose:** Test PKF initialization with existing but inconsistent documentation

**Directory Structure:**
```
partial-docs-repo/
├── README.md              (100 lines, has YAML frontmatter but not PKF-compliant)
├── docs/
│   ├── getting-started.md (No frontmatter)
│   ├── api-reference.md   (No frontmatter)
│   ├── architecture.md    (Has non-PKF frontmatter)
│   ├── deployment.md      (No frontmatter)
│   ├── guides/
│   │   ├── beginner.md    (No frontmatter)
│   │   └── advanced.md    (No frontmatter)
│   └── troubleshooting.md (No frontmatter)
├── CHANGELOG.md           (Keep-a-Changelog format, no frontmatter)
├── package.json
├── src/
└── .gitignore
```

**Sample Frontmatter (architecture.md):**
```yaml
---
title: System Architecture
author: John Doe
date: 2025-01-01
tags: [architecture, design]
---
```

**Expected Behavior:**
- Stage 1: Blueprint detects 8 documents, 4 types (readme, guide, api-doc, architecture)
- Stage 2: Schema design creates schemas for detected types, extends base-document
- Stage 3: Creates PKF structure, preserves existing docs/ directory
- Stage 4: Migrates all files, converts existing frontmatter to PKF format

**Validation:**
- All migrated files have PKF-compliant frontmatter
- Existing content preserved
- Directory structure normalized
- CHANGELOG.md migrated to docs/registers/CHANGELOG.md

---

#### Fixture 4: complete-docs-repo

**Purpose:** Test PKF initialization with complete, well-structured documentation

**Directory Structure:**
```
complete-docs-repo/
├── README.md
├── docs/
│   ├── README.md          (Documentation index)
│   ├── getting-started.md
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── database.md
│   │   ├── api-design.md
│   │   └── security.md
│   ├── api/
│   │   ├── users.md
│   │   ├── products.md
│   │   ├── orders.md
│   │   └── authentication.md
│   ├── guides/
│   │   ├── installation.md
│   │   ├── configuration.md
│   │   ├── deployment.md
│   │   ├── monitoring.md
│   │   └── troubleshooting.md
│   ├── development/
│   │   ├── contributing.md
│   │   ├── code-style.md
│   │   ├── testing.md
│   │   └── release-process.md
│   └── changelog.md
├── package.json
├── src/
└── .gitignore
```

**Total:** 25 markdown files

**Sample Non-PKF Frontmatter:**
```yaml
---
title: API Reference - Users
description: User management endpoints
version: 1.0
last_updated: 2025-01-15
---
```

**Expected Behavior:**
- Stage 1: Blueprint detects 25 documents, 6 types (readme, architecture, api-doc, guide, development-doc, changelog)
- Stage 2: Schema design creates comprehensive schemas with inheritance
- Stage 3: Creates PKF structure, integrates with existing docs/
- Stage 4: Migrates all 25 files with type-specific frontmatter

**Validation:**
- All 25 files have type-appropriate PKF frontmatter
- Directory structure preserved
- Links between documents remain valid
- Registers created separately from docs/

---

#### Fixture 5: large-repo

**Purpose:** Test performance with large repository (100+ files)

**Directory Structure:**
```
large-repo/
├── README.md
├── docs/
│   ├── api/              (40 files - one per endpoint)
│   ├── guides/           (20 files)
│   ├── architecture/     (15 files)
│   ├── development/      (10 files)
│   ├── troubleshooting/  (10 files)
│   ├── changelog/        (5 release notes)
│   └── misc/             (5 files)
├── package.json
├── src/                  (50+ source files)
└── .gitignore
```

**Total:** 105 markdown files in docs/

**Expected Behavior:**
- Stage 1: Blueprint detects 105 documents, 7-8 types
- Stage 2: Schema design uses composition heavily (base-document → specialized types)
- Stage 3: Creates PKF structure
- Stage 4: Parallel migration with progress reporting (3-5 workers)

**Performance Targets:**
- Stage 1 (Analysis): < 5 minutes
- Stage 2 (Schema Design): < 10 minutes
- Stage 3 (Implementation): < 2 minutes
- Stage 4 (Migration): < 45 minutes
- **Total:** < 60 minutes

**Validation:**
- All 105 files migrated successfully
- No validation errors
- Performance within target
- Cost within estimate (±30%)

---

### 9.7 Integration Test Matrix

Detailed specification of integration tests.

| Test ID | Phase | Scenario | Inputs | Expected Output | Assertions |
|---------|-------|----------|--------|-----------------|------------|
| **Phase 0 - Validators** |
| INT-001 | 0 | Validate valid config | `pkf.config.yaml` with correct schema | `ValidationResult` with `valid: true` | `result.valid === true`, `errors.length === 0` |
| INT-002 | 0 | Validate invalid config | `pkf.config.yaml` with missing fields | `ValidationResult` with errors | `result.valid === false`, `errors[0].code === 'REQUIRED_FIELD'` |
| INT-003 | 0 | Validate TODO with valid items | `TODO.md` with 5 valid items | `ValidationResult` valid | `result.valid === true`, `warnings.length === 0` |
| INT-004 | 0 | Validate TODO with invalid status | `TODO.md` with invalid status value | `ValidationResult` with errors | `errors[0].message.includes('Invalid status')` |
| INT-005 | 0 | Validate all (integrated) | Full PKF repository | All validators pass | `validateAll().valid === true` |
| **Phase 1 - Foundation** |
| INT-006 | 1 | State save and load | Create state, save, then load | Loaded state matches saved | `loaded.phase === saved.phase`, `loaded.checkpoint === saved.checkpoint` |
| INT-007 | 1 | Concurrent lock acquisition | Acquire lock, attempt second acquire | Second acquire throws error | `error.message.includes('already in progress')` |
| INT-008 | 1 | Lock stale detection | Create lock >1 hour old, acquire new lock | New lock acquired successfully | `lockManager.acquire()` succeeds, old lock removed |
| INT-009 | 1 | Cost tracking | Execute 3 agent calls with different models | Cost calculated correctly | `cost > 0`, `cost === sum(modelCosts)` |
| INT-010 | 1 | Budget enforcement | Set `maxCost: $5`, exceed with API calls | Execution stops with budget error | `error.code === 'BUDGET_EXCEEDED'` |
| **Phase 2 - Agent System** |
| INT-011 | 2 | Agent execution (real API) | Simple prompt "Count to 5" | Agent responds with numbers | `result.success === true`, `result.output.includes('5')` |
| INT-012 | 2 | Rate limiter (token bucket) | Make 10 requests rapidly | Rate limiter throttles correctly | Time elapsed > calculated wait time |
| INT-013 | 2 | Token estimation accuracy | Execute agent, compare estimate vs actual | Estimate within ±30% | `Math.abs(estimate - actual) / actual <= 0.3` |
| INT-014 | 2 | Convergence detection (explicit) | Mock conversation with "SCHEMA-DESIGN-APPROVED" | Convergence detected | `convergence.converged === true`, `convergence.signal === 'SCHEMA-DESIGN-APPROVED'` |
| INT-015 | 2 | Convergence detection (implicit) | Mock conversation with 3+ agreements | Implicit convergence detected | `convergence.converged === true`, `convergence.reason === 'Implicit agreement'` |
| INT-016 | 2 | Agent conversation loop | Two mock agents, max 5 iterations | Conversation completes or reaches max | `result.metadata.iterations <= 5` |
| **Phase 3 - Workflow** |
| INT-017 | 3 | Stage 1: Analysis | Run on empty-repo fixture | Blueprint generated | `blueprint.analysis.docs_found === false` |
| INT-018 | 3 | Stage 2: Schema Design | Blueprint → agent conversation → schemas.yaml | Valid schemas.yaml generated | Validates against `pkf-schema-dsl.schema.json` |
| INT-019 | 3 | Stage 3: Implementation | schemas.yaml → generate structure | PKF structure created | All directories exist, config valid |
| INT-020 | 3 | Checkpoint and resume | Run Stage 1, checkpoint, resume from Stage 2 | Workflow resumes correctly | Stage 1 skipped, Stage 2 executes |
| **Phase 4 - Migration** |
| INT-021 | 4 | Migration planning | complete-docs-repo (25 files) | Migration plan with 25 tasks | `plan.tasks.length === 25` |
| INT-022 | 4 | Single file migration | Migrate one file with worker | File migrated with frontmatter | Frontmatter valid, content preserved |
| INT-023 | 4 | Parallel migration | Migrate 10 files with 3 workers | All files migrated | `results.length === 10`, all success |
| INT-024 | 4 | Post-migration validation | Migrated repository | Validation passes | `validateAll().valid === true` |
| INT-025 | 4 | Rollback mechanism | Migrate, then rollback | Original state restored | Backup restored, generated files removed |

**Total:** 25 integration tests

---

## 10. Risk Management

### 10.1 Technical Risks

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| Agent convergence fails | Medium | High | Test convergence extensively, add explicit override | Agent Specialist |
| Token estimation inaccurate | Medium | Medium | Log actual vs estimated, tune formula | Agent Specialist |
| Rate limiting triggers | Low | Medium | Test with different tiers, add exponential backoff | Lead Developer |
| API costs exceed budget | Medium | High | Dry-run mode, cost tracking, budget enforcement | Lead Developer |
| Migration corrupts data | Low | Critical | Atomic operations, backups, rollback mechanism | Lead Developer |
| Performance issues (large repos) | Medium | Medium | Parallel workers, optimize bottlenecks | Testing Engineer |
| Concurrent execution conflicts | Low | Medium | Lock manager, atomic operations | Lead Developer |
| Validation failures post-migration | High | Medium | Comprehensive validator testing in Phase 0 (200+ tests), validation dry-runs in Stage 4, manual review gate for critical failures | Testing Engineer |
| Anthropic API outage/downtime | Low | Medium | Exponential backoff with jitter (Section 16.3 architecture), state checkpoints enable resume, retry logic for 5xx errors | Lead Developer |
| Schema complexity exceeds agent reasoning | Medium | Medium | Human review gate in Stage 2, schema simplification prompts, fallback to manual schema design, complexity warnings in blueprint | Agent Specialist |

### 10.2 Schedule Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Phase 0 takes longer | High | High | Parallel Phase 1 start, reduce scope (defer link validator) |
| Agent prompt tuning takes time | Medium | Medium | Allocate buffer time in Phase 5 |
| Integration issues | Medium | Medium | Early integration tests, incremental integration |
| Test fixture creation delays | Low | Low | Start fixture creation in Phase 0 |

### 10.3 User Experience Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Time estimates inaccurate | Medium | Medium | Conservative estimates, show breakdown |
| Approval gates confusing | Medium | Medium | Clear explanations, examples, help text |
| Error messages unclear | Medium | Medium | User testing, iterative improvement |
| Resume UX confusing | Low | Medium | Clear state display, progress tracking |

---

## 11. Success Criteria

### 11.1 Functional Requirements

- ✅ Analyzes repository and generates blueprint
- ✅ Designs PKF schema through agent conversation
- ✅ Implements PKF directory structure
- ✅ Migrates existing documentation
- ✅ Validates all outputs
- ✅ Supports checkpoint and resume
- ✅ Enforces budget limits
- ✅ Prevents concurrent execution
- ✅ Creates backups before changes
- ✅ Provides dry-run mode

### 11.2 Performance Metrics

- ✅ Small repo (10 docs): 15-25 min
- ✅ Medium repo (50 docs): 30-45 min
- ✅ Large repo (100 docs): 45-75 min
- ✅ Token estimation: ±30% accuracy
- ✅ Cost estimation: ±30% accuracy
- ✅ Time estimation: ±40% accuracy

### 11.3 Quality Metrics

- ✅ Unit test coverage: ≥85%
- ✅ Integration test coverage: ≥70%
- ✅ Migration success rate: ≥90%
- ✅ Schema design convergence: ≥80% within 5 iterations
- ✅ Validation pass rate post-migration: ≥90%
- ✅ Zero data loss incidents

### 11.4 User Experience Metrics

- ✅ Error messages are actionable (user testing)
- ✅ Interactive mode is intuitive (user testing)
- ✅ Dry-run provides clear estimate
- ✅ Resume works reliably
- ✅ Progress reporting is clear

---

## 12. Resource Requirements

### 12.1 Development Resources

**Team Size:** 2-3 developers

**Time Allocation:**
- Lead Developer: 16 weeks (full-time)
- Agent Specialist: 8 weeks (Phases 2-3, then Phase 5)
- Testing Engineer: 6 weeks (Phase 4-5) (can be part-time or shared)

**Total Effort:** ~30 person-weeks

### 12.2 Infrastructure

**Development Environment:**
- Node.js 18+
- TypeScript 5+
- Git
- Access to Anthropic API (Build 1+ tier recommended for testing)

**CI/CD:**
- GitHub Actions (already set up)
- Test fixtures repository (or submodules)
- API key secret management

**Budget:**
- API costs (testing): ~$100-200 for development
- API costs (integration tests): ~$50-100 per full test suite run

### 12.3 External Dependencies

**Critical:**
- Anthropic API availability
- `@anthropic-ai/sdk` stability

**Important:**
- pkf-validator completion (Phase 0)
- PKF Schema DSL specification (complete)
- Test repositories/fixtures

---

## Appendix A: Checklist Summary

### Phase 0 Checklist (4 weeks)
- [ ] Config validator complete
- [ ] TODO validator complete
- [ ] Issue validator complete
- [ ] Changelog validator complete
- [ ] Frontmatter validator complete
- [ ] Master `validateAll()` complete
- [ ] Integration tests passing
- [ ] Documentation complete

### Phase 1 Checklist (2 weeks)
- [ ] State management complete
- [ ] Lock manager complete
- [ ] Cost tracker complete
- [ ] CLI interface complete
- [ ] Configuration loader complete
- [ ] Interactive mode complete
- [ ] Dry-run mode complete

### Phase 2 Checklist (2 weeks)
- [ ] Anthropic SDK integration complete
- [ ] Rate limiter complete
- [ ] Token estimator complete
- [ ] Request queue complete
- [ ] Agent orchestrator complete
- [ ] Convergence detection complete
- [ ] Agent definitions complete (3 agents)

### Phase 3 Checklist (2 weeks)
- [ ] Stage 1 (Analysis) complete
- [ ] Stage 2 (Schema Design) complete
- [ ] Stage 3 (Implementation) complete
- [ ] Directory structure generator complete
- [ ] Configuration generator complete
- [ ] Register initializer complete

### Phase 4 Checklist (2 weeks)
- [ ] Migration planner complete
- [ ] Migration worker complete
- [ ] Parallel execution complete
- [ ] Stage 4 (Migration) complete
- [ ] Post-migration validation complete
- [ ] Rollback mechanism complete

### Phase 5 Checklist (2 weeks)
- [ ] Error messages polished
- [ ] Progress reporting polished
- [ ] Interactive mode polished
- [ ] Resume experience polished
- [ ] Integration tests complete (25+ tests)
- [ ] Documentation complete
- [ ] Performance validated
- [ ] Security review passed
- [ ] Link validator complete (optional)
- [ ] Prose validator integrated

---

## Appendix B: Implementation Reference

This appendix provides key TypeScript interfaces and algorithms for critical components. Full implementations are in the architecture document (PKF-AI-INIT-ARCHITECTURE-v1.1.md).

### B.1 Convergence Detection (Phase 2, Week 8)

**Reference:** Architecture Section 21.1

```typescript
// packages/pkf-init/src/agents/convergence.ts

export interface ConvergenceResult {
  converged: boolean;
  reason?: string;
  signal?: string;
}

export function detectConvergence(messages: AgentMessage[]): ConvergenceResult {
  if (messages.length === 0) {
    return { converged: false, reason: 'No messages' };
  }

  const lastMessage = messages[messages.length - 1];
  const content = lastMessage.content;

  // Check for explicit convergence signals
  const convergenceSignals = [
    /SCHEMA-DESIGN-CONVERGED:\s*(.+)/i,
    /SCHEMA-DESIGN-APPROVED:\s*(.+)/i,
    /IMPLEMENTATION-COMPLETE:\s*(.+)/i
  ];

  for (const pattern of convergenceSignals) {
    const match = content.match(pattern);
    if (match) {
      return {
        converged: true,
        reason: match[1].trim(),
        signal: match[0]
      };
    }
  }

  // Check for implicit convergence (both agents agree for 2+ turns)
  if (messages.length >= 4) {
    const lastFourMessages = messages.slice(-4);
    const agreementPatterns = [
      /I agree|approved|looks good|ready to proceed/i,
      /no further changes|this is complete|ready for/i
    ];

    const agreementCount = lastFourMessages.filter(msg =>
      agreementPatterns.some(pattern => pattern.test(msg.content))
    ).length;

    if (agreementCount >= 3) {
      return {
        converged: true,
        reason: 'Implicit agreement detected',
        signal: 'IMPLICIT_CONVERGENCE'
      };
    }
  }

  return { converged: false };
}
```

**Usage in AgentOrchestrator:**
```typescript
async agentConversation(
  agent1: AgentConfig,
  agent2: AgentConfig,
  initialPrompt: string,
  maxIterations: number = 5
): Promise<AgentResult> {
  const messages: AgentMessage[] = [];
  messages.push({ role: 'user', content: initialPrompt });

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Agent 1 responds
    const agent1Response = await this.executeAgent(agent1, messages);
    messages.push({ role: 'assistant', content: agent1Response.output });

    // Check convergence
    const convergence = detectConvergence(messages);
    if (convergence.converged) {
      return {
        success: true,
        output: messages[messages.length - 1].content,
        metadata: {
          iterations: iteration + 1,
          convergenceReason: convergence.reason
        }
      };
    }

    // Agent 2 responds
    const agent2Response = await this.executeAgent(agent2, messages);
    messages.push({ role: 'assistant', content: agent2Response.output });

    // Check convergence again
    const convergence2 = detectConvergence(messages);
    if (convergence2.converged) {
      return { success: true, output: messages[messages.length - 1].content };
    }
  }

  return { success: false, error: 'Max iterations without convergence' };
}
```

---

### B.2 Token Estimation (Phase 2, Week 7)

**Reference:** Architecture Section 21.2

```typescript
// packages/pkf-init/src/utils/token-estimator.ts

export class TokenEstimator {
  /**
   * Rough estimation: 1 token ≈ 4 characters for English text
   * Add 20% buffer for markdown, code blocks, formatting
   */
  static estimate(content: string): number {
    const baseTokens = Math.ceil(content.length / 4);
    const buffer = Math.ceil(baseTokens * 0.2);
    return baseTokens + buffer;
  }

  /**
   * Estimate for message array (conversation)
   */
  static estimateConversation(messages: AgentMessage[]): number {
    const totalContent = messages.map(m => m.content).join('');
    return this.estimate(totalContent);
  }

  /**
   * Estimate for agent execution including system prompt
   */
  static estimateAgentExecution(
    systemPrompt: string,
    messages: AgentMessage[],
    maxOutputTokens: number = 4096
  ): number {
    const inputTokens = this.estimate(systemPrompt) +
                        this.estimateConversation(messages);
    // Estimate output at 50% of max to be conservative
    const outputTokens = Math.ceil(maxOutputTokens * 0.5);
    return inputTokens + outputTokens;
  }
}
```

**Formula:**
```
baseTokens = characterCount / 4
bufferTokens = baseTokens * 0.2  (20% for formatting)
outputTokens = maxOutputTokens * 0.5  (conservative)
totalEstimate = baseTokens + bufferTokens + outputTokens
```

**Accuracy Target:** ±30% (conservative estimates prevent rate limit exhaustion)

---

### B.3 Lock Manager (Phase 1, Week 5)

**Reference:** Architecture Section 21.3

```typescript
// packages/pkf-init/src/state/lock-manager.ts

export class InitLockManager {
  private lockFilePath: string;
  private lockAcquired: boolean = false;

  constructor(workingDir: string = process.cwd()) {
    this.lockFilePath = join(workingDir, '.pkf-init.lock');
  }

  /**
   * Attempt to acquire initialization lock
   * Throws error if lock already held by another process
   */
  async acquire(): Promise<void> {
    try {
      const lockExists = await this.fileExists(this.lockFilePath);

      if (lockExists) {
        const lockData = await this.readLock();

        // Check if lock is stale (>1 hour old)
        const lockAge = Date.now() - lockData.timestamp;
        if (lockAge > 3600000) {
          await fs.unlink(this.lockFilePath);
        } else {
          throw new Error(
            `PKF initialization already in progress (PID: ${lockData.pid}). ` +
            `Use --force to override.`
          );
        }
      }

      // Create lock file atomically using 'wx' flag
      await fs.writeFile(
        this.lockFilePath,
        JSON.stringify({
          pid: process.pid,
          timestamp: Date.now(),
          version: '1.0.0'
        }, null, 2),
        { flag: 'wx' }  // Fail if file exists
      );

      this.lockAcquired = true;
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        throw new Error('PKF initialization already in progress (race condition)');
      }
      throw error;
    }
  }

  async release(): Promise<void> {
    if (!this.lockAcquired) return;

    try {
      await fs.unlink(this.lockFilePath);
      this.lockAcquired = false;
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}
```

**Lock File Format:**
```json
{
  "pid": 12345,
  "timestamp": 1703779200000,
  "version": "1.0.0"
}
```

---

### B.4 Rate Limiter (Phase 2, Week 7)

**Reference:** Architecture Section 16.2

```typescript
// packages/pkf-init/src/utils/rate-limiter.ts

export class RateLimiter {
  private tokensPerMinute: number;
  private requestsPerMinute: number;
  private tokenBucket: number;
  private requestBucket: number;
  private lastRefill: number;

  constructor(tier: 'free' | 'build1' | 'build2' | 'build3' | 'build4' = 'build1') {
    const limits = {
      free: { rpm: 5, tpm: 20000 },
      build1: { rpm: 50, tpm: 40000 },
      build2: { rpm: 50, tpm: 80000 },
      build3: { rpm: 50, tpm: 160000 },
      build4: { rpm: 50, tpm: 400000 }
    };

    const { rpm, tpm } = limits[tier];
    this.requestsPerMinute = rpm;
    this.tokensPerMinute = tpm;
    this.tokenBucket = tpm;
    this.requestBucket = rpm;
    this.lastRefill = Date.now();
  }

  async acquire(estimatedTokens: number): Promise<void> {
    this.refillBuckets();

    // Check if we have capacity
    if (this.requestBucket < 1 || this.tokenBucket < estimatedTokens) {
      const waitTime = this.calculateWaitTime(estimatedTokens);
      await this.sleep(waitTime);
      this.refillBuckets();
    }

    // Consume tokens
    this.requestBucket -= 1;
    this.tokenBucket -= estimatedTokens;
  }

  private refillBuckets(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    const elapsedMinutes = elapsedMs / 60000;

    this.tokenBucket = Math.min(
      this.tokensPerMinute,
      this.tokenBucket + (this.tokensPerMinute * elapsedMinutes)
    );
    this.requestBucket = Math.min(
      this.requestsPerMinute,
      this.requestBucket + (this.requestsPerMinute * elapsedMinutes)
    );

    this.lastRefill = now;
  }

  private calculateWaitTime(estimatedTokens: number): number {
    const tokenShortfall = estimatedTokens - this.tokenBucket;
    const requestShortfall = 1 - this.requestBucket;

    const tokenWaitMinutes = tokenShortfall / this.tokensPerMinute;
    const requestWaitMinutes = requestShortfall / this.requestsPerMinute;

    const waitMinutes = Math.max(tokenWaitMinutes, requestWaitMinutes);
    return Math.ceil(waitMinutes * 60000); // Convert to milliseconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

### B.5 Core Interfaces

**WorkflowState (Phase 1, Week 5):**
```typescript
interface WorkflowState {
  version: string;
  startedAt: string;
  updatedAt: string;
  currentStage: WorkflowStage;
  checkpoints: Checkpoint[];

  // Stage-specific state
  analysis?: AnalysisState;
  design?: DesignState;
  implementation?: ImplementationState;
  migration?: MigrationState;

  // Tracking
  apiCallCount: number;
  totalCost: number;
  maxCost?: number;
}

enum WorkflowStage {
  NOT_STARTED = 'not_started',
  ANALYZING = 'analyzing',
  DESIGNING = 'designing',
  IMPLEMENTING = 'implementing',
  MIGRATING = 'migrating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
```

**AgentConfig (Phase 2, Week 8):**
```typescript
interface AgentConfig {
  name: string;
  instructions: string;  // From agents/*.md
  model: string;         // 'sonnet', 'haiku', 'opus'
  temperature: number;
  maxTokens: number;
}
```

**AgentResult (Phase 2, Week 8):**
```typescript
interface AgentResult {
  success: boolean;
  output: string;
  cost: number;
  tokensUsed: number;
  error?: string;
  metadata?: Record<string, unknown>;
}
```

---

**Version:** 1.1
**Status:** Revised (Addressing peer review feedback)
**Next Steps:** Submit for second peer review (target: 9.5/10)
