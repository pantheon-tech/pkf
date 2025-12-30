---
title: PKF AI-Assisted Initialization - Architecture Proposal
version: "1.0.0"
status: Archived
category: proposal
created: 2025-12-28
author: System Architect
superseded_by: PKF-AI-INIT-ARCHITECTURE-v1.1.md
tags:
  - pkf-init
  - architecture
  - ai-assisted
---

# PKF AI-Assisted Initialization - Architecture Proposal

**Status:** Archived (Superseded by v1.1)
**Created:** 2025-12-28
**Author:** System Architect

---

## 1. Overview

### Problem Statement

Implementing PKF in existing or new projects requires:
- Understanding existing documentation structure
- Designing appropriate schemas for document types
- Creating PKF configuration files
- Migrating/reformatting existing documentation
- Generating missing documentation

This manual process is time-consuming, error-prone, and creates a barrier to PKF adoption.

### Proposed Solution

An AI-assisted initialization system that uses specialized Claude agents to automate PKF implementation through a multi-stage workflow with human oversight.

### Prerequisites

Before pkf-init can function, the following must exist:

1. **PKF Schema DSL** - See [PKF-SCHEMA-DSL.md](../../framework/specifications/PKF-SCHEMA-DSL.md)
2. **pkf:validate command** - Validation orchestrator (to be implemented in Phase 0)
3. **Validation schemas** - JSON schemas for:
   - `docs-blueprint.schema.json` - Blueprint validation
   - `pkf-schema-dsl.schema.json` - Schema DSL validation
   - Existing PKF schemas (pkf-config, todo-item, etc.)

---

## 2. System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI Interface (pkf init)                  │
│  - Workflow orchestration                                    │
│  - User interaction & approval gates                         │
│  - Progress reporting                                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Workflow State Manager                          │
│  - State persistence (.pkf-init-state.json)                 │
│  - Checkpoint management                                     │
│  - Resume capability                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Agent Orchestrator                              │
│  - Agent lifecycle management                                │
│  - Inter-agent communication                                 │
│  - Parallel execution coordination                           │
└─────┬──────────┬──────────┬─────────────────────────────────┘
      │          │          │
      ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────────────┐
│  Docs    │ │   PKF    │ │  Docs Worker(s)  │
│ Analyst  │ │Implementer│ │   (Parallel)     │
│  Agent   │ │   Agent  │ │                  │
└──────────┘ └──────────┘ └──────────────────┘
```

---

## 3. Workflow Stages

### Stage 1: Analysis (docs-analyst)

**Inputs:**
- Repository path
- Optional: docs path hint
- Existing documentation (if any)

**Process:**
1. Scan repository for documentation
2. Identify document types and patterns
3. Analyze existing structure
4. Generate documentation blueprint (YAML)

**Outputs:**
- `docs-blueprint.yaml` - Structured representation of existing docs
- Analysis report (coverage, quality, gaps)

**Blueprint Schema:**
```yaml
# Example docs-blueprint.yaml
analysis:
  timestamp: "2025-12-28T12:00:00Z"
  repository: "/path/to/repo"
  docs_found: true
  docs_path: "docs/"

structure:
  - path: "README.md"
    type: "readme"
    quality: "good"
    sections: ["overview", "installation", "usage"]

  - path: "docs/architecture.md"
    type: "architecture"
    quality: "needs-refactoring"
    issues: ["missing-frontmatter", "inconsistent-headings"]

  - path: "CHANGELOG.md"
    type: "changelog"
    quality: "excellent"
    format: "keep-a-changelog"

document_types:
  - type: "api-reference"
    count: 12
    pattern: "docs/api/*.md"
    quality: "mixed"

  - type: "guide"
    count: 5
    pattern: "docs/guides/*.md"
    quality: "good"

gaps:
  - type: "todo-register"
    severity: "high"
    recommendation: "Create TODO.md register"

  - type: "issues-register"
    severity: "high"
    recommendation: "Create ISSUES.md register"

recommendations:
  schema_complexity: "medium"
  estimated_document_types: 6
  migration_effort: "medium"
  suggested_schemas:
    - name: "api-doc"
      properties: ["endpoint", "method", "version"]
    - name: "guide"
      properties: ["difficulty", "topics"]
```

---

### Stage 2: Schema Design (docs-analyst ↔ pkf-implementer)

**Iteration Loop (2-5 iterations):**

#### Iteration 1: Initial Proposal
- **docs-analyst** proposes initial schema based on blueprint
- Considers document types, frontmatter needs, validation rules

#### Iteration 2-4: Refinement
- **pkf-implementer** reviews proposal:
  - Checks schema completeness
  - Validates composition patterns
  - Suggests improvements
  - Identifies edge cases
- **docs-analyst** refines based on feedback

#### Iteration 5: Final Approval
- **pkf-implementer** performs final validation
- Generates schema DSL

**Output:**
- `schemas.yaml` - PKF schema DSL
- `pkf.config.yaml` - PKF configuration
- Schema design rationale document

**Convergence Criteria:**
- Both agents agree on schema design
- All document types covered
- Validation rules defined
- No unresolved concerns
- Maximum 5 iterations reached

---

### Stage 3: Implementation (pkf-implementer)

**Process:**
1. **Backup existing docs** (if any)
   ```bash
   mv docs/ docs.old/
   ```

2. **Generate PKF structure**
   ```
   docs/
   ├── README.md
   ├── registers/
   │   ├── TODO.md
   │   ├── ISSUES.md
   │   └── CHANGELOG.md
   ├── architecture/
   │   └── README.md
   └── [other sections per config]
   ```

3. **Create configuration files**
   - `pkf.config.yaml`
   - `schemas.yaml`
   - `.remarkrc.mjs` (if not exists)
   - `.vale.ini` (if not exists)

4. **Generate initial content**
   - Populate registers from blueprint
   - Create section READMEs
   - Generate placeholder files

5. **Run validation**
   ```bash
   npm run pkf:build
   npm run pkf:validate
   ```

**Outputs:**
- Complete PKF documentation structure
- All configuration files
- Validation report

---

### Stage 4: Migration/Generation (parallel docs-workers)

**Coordination by pkf-implementer:**

1. **Create work packages**
   - Group documents by type
   - Assign to workers based on complexity
   - Balance load across workers

2. **Generate worker instructions**
   ```yaml
   # worker-instructions-1.yaml
   worker_id: 1
   tasks:
     - action: migrate
       source: docs.old/api/users.md
       target: docs/api/users.md
       schema: api-doc
       transformations:
         - add-frontmatter
         - reformat-code-blocks
         - fix-headings

     - action: generate
       target: docs/architecture/system-overview.md
       schema: architecture-doc
       context:
         - docs.old/README.md (sections: architecture)
         - src/index.ts (analyze structure)
   ```

3. **Execute workers in parallel**
   ```
   Worker 1: API docs migration
   Worker 2: Guide migration + generation
   Worker 3: Architecture doc generation
   ```

4. **Collect results**
   - Aggregate completion status
   - Merge validation errors
   - Generate migration report

**Safety Mechanisms:**
- Each worker validates its output
- Atomic operations (complete or rollback)
- Progress checkpointing
- Error aggregation

---

## 4. Component Design

### 4.1 CLI Interface

**Location:** `packages/pkf-init/src/cli.ts`

```typescript
// Command structure
pkf init [options]

// Options:
--interactive, -i       # Enable approval gates (default: true)
--dry-run              # Analyze and estimate without changes
--resume               # Resume from last checkpoint
--step <step>          # Run specific step only
--docs-path <path>     # Hint for docs location
--max-cost <amount>    # Budget limit in USD
--workers <count>      # Number of parallel workers (default: 3)
--api-key <key>        # Anthropic API key (or ANTHROPIC_API_KEY env)
--output <dir>         # Output directory (default: ./docs)
--backup-dir <dir>     # Backup location (default: ./docs.old)
--skip-backup          # Don't backup existing docs (dangerous!)
--verbose, -v          # Verbose logging
```

**Example Usage:**
```bash
# Interactive full workflow
pkf init --interactive

# Dry run to see what would happen
pkf init --dry-run

# Just analyze existing docs
pkf init --step analyze

# Design schema only
pkf init --step design --interactive

# Full automated run with budget
pkf init --max-cost 10 --workers 5

# Resume after interruption
pkf init --resume
```

---

### 4.2 Workflow State Manager

**Location:** `packages/pkf-init/src/state/workflow-state.ts`

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

interface Checkpoint {
  id: string;
  timestamp: string;
  stage: WorkflowStage;
  data: Record<string, unknown>;
  success: boolean;
  message?: string;
}

class WorkflowStateManager {
  private statePath: string = '.pkf-init-state.json';

  async load(): Promise<WorkflowState | null>;
  async save(state: WorkflowState): Promise<void>;
  async checkpoint(stage: WorkflowStage, data: unknown): Promise<void>;
  async canResume(): Promise<boolean>;
  async clear(): Promise<void>;
}
```

---

### 4.3 Agent Orchestrator

**Location:** `packages/pkf-init/src/agents/orchestrator.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

interface AgentConfig {
  name: string;
  instructions: string;  // From agents/*.md
  model: string;
  temperature: number;
  maxTokens: number;
}

interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentResult {
  success: boolean;
  output: string;
  cost: number;
  tokensUsed: number;
  error?: string;
}

class AgentOrchestrator {
  private client: Anthropic;
  private costTracker: CostTracker;

  constructor(apiKey: string, maxCost?: number);

  // Single agent execution
  async executeAgent(
    config: AgentConfig,
    messages: AgentMessage[],
    context?: Record<string, unknown>
  ): Promise<AgentResult>;

  // Iterative conversation between two agents
  async agentConversation(
    agent1: AgentConfig,
    agent2: AgentConfig,
    initialPrompt: string,
    maxIterations: number,
    convergenceCriteria: (messages: AgentMessage[]) => boolean
  ): Promise<AgentResult>;

  // Parallel execution
  async executeParallel(
    configs: AgentConfig[],
    tasks: Array<{ messages: AgentMessage[]; context?: unknown }>
  ): Promise<AgentResult[]>;

  // Cost management
  async estimateCost(operation: string): Promise<number>;
  getCurrentCost(): number;
  isWithinBudget(): boolean;
}
```

---

### 4.4 Agent Definitions

**Location:** `agents/pkf-init/`

#### `agents/pkf-init/docs-analyst.md`

```markdown
# Documentation Analyst Agent

You are a documentation analyst specializing in examining codebases and documentation structures for the Project Knowledge Framework (PKF).

## Core Responsibilities

1. **Repository Analysis**
   - Scan repository for all documentation files
   - Identify document types and patterns
   - Assess documentation quality and coverage
   - Detect gaps and inconsistencies

2. **Blueprint Creation**
   - Generate structured YAML blueprint of documentation
   - Classify documents by type (README, API docs, guides, etc.)
   - Identify frontmatter patterns
   - Recommend document type schemas

3. **Schema Design Collaboration**
   - Work with pkf-implementer to design schemas
   - Iterate on schema design based on feedback
   - Ensure all document types are covered
   - Validate schema against existing documentation

## Analysis Criteria

### Document Quality Assessment
- **Excellent**: Well-structured, complete frontmatter, consistent formatting
- **Good**: Mostly complete, minor formatting issues
- **Needs Refactoring**: Missing sections, inconsistent format
- **Poor**: Minimal content, no structure

### Schema Recommendations
Consider:
- Number of unique document types
- Frontmatter patterns across documents
- Common metadata fields
- Validation requirements (required fields, enums)
- Relationship between document types

## Output Format

Always output blueprints in this YAML structure:
[Blueprint schema as shown above]

## Iteration Guidelines

When collaborating with pkf-implementer:
1. Start with comprehensive initial proposal
2. Be receptive to feedback on schema complexity
3. Suggest alternative approaches when stuck
4. Converge within 5 iterations
5. Signal convergence clearly
```

#### `agents/pkf-init/pkf-implementer.md`

```markdown
# PKF Implementer Agent

You are a PKF implementation specialist with expertise in schema design, configuration, and PKF composition patterns.

## Core Responsibilities

1. **Schema Design Review**
   - Review schema proposals from docs-analyst
   - Validate against PKF standards
   - Ensure composition patterns are correct
   - Suggest improvements and edge case handling

2. **Implementation**
   - Generate pkf.config.yaml
   - Generate schemas.yaml (PKF Schema DSL)
   - Create directory structure
   - Initialize required files (registers, READMEs)
   - Set up validation configuration

3. **Migration Planning**
   - Break down migration into work packages
   - Generate worker instructions
   - Coordinate parallel workers
   - Validate migration results

## Schema Design Principles

1. **Composition Over Duplication**
   - Use `_extends` for shared properties
   - Create base schemas for common patterns
   - Avoid duplicate field definitions

2. **Validation First**
   - Define required fields clearly
   - Use enums for controlled vocabularies
   - Add patterns for string validation
   - Consider cross-field validation

3. **Maintainability**
   - Keep schemas simple
   - Document complex validation rules
   - Use descriptive property names
   - Version schemas appropriately

## Iteration Strategy

When reviewing docs-analyst proposals:
- Iteration 1: High-level feedback on structure
- Iteration 2-3: Detailed feedback on specific schemas
- Iteration 4: Edge cases and validation rules
- Iteration 5: Final approval or critical concerns

Signal convergence when:
- All document types have appropriate schemas
- Composition patterns are correct
- Validation rules are complete
- No unresolved concerns remain

## Output Formats

### pkf.config.yaml
[Example structure]

### schemas.yaml
[Example PKF Schema DSL]

### Worker Instructions
[Example worker instruction format]
```

#### `agents/pkf-init/docs-worker.md`

```markdown
# Documentation Worker Agent

You are a documentation worker specializing in migrating and generating documentation according to PKF schemas.

## Core Responsibilities

1. **Document Migration**
   - Transform existing docs to PKF format
   - Add required frontmatter
   - Reformat content to match schema
   - Fix structural issues

2. **Document Generation**
   - Generate new documentation from code analysis
   - Follow PKF templates
   - Ensure schema compliance
   - Maintain consistent quality

3. **Quality Assurance**
   - Validate output against schema
   - Check for completeness
   - Ensure proper formatting
   - Report issues clearly

## Migration Transformations

### Add Frontmatter
- Extract metadata from existing doc
- Map to schema properties
- Generate valid YAML frontmatter
- Preserve existing content

### Reformat Content
- Normalize heading hierarchy
- Fix code block formatting
- Update links to new paths
- Standardize terminology

### Structural Fixes
- Add missing sections
- Reorganize content
- Remove outdated information
- Improve readability

## Quality Standards

All output must:
- Validate against assigned schema
- Follow PKF formatting conventions
- Include complete frontmatter
- Use consistent terminology
- Have proper heading hierarchy
- Include working links

## Error Handling

If unable to complete task:
- Report specific issue
- Provide partial result if possible
- Suggest manual intervention steps
- Don't fail silently
```

---

### 4.5 SKILL.md for PKF

**Location:** `agents/pkf-init/SKILL.pkf-init.md`

```markdown
# PKF Initialization Skill

Use this skill when the user wants to implement PKF in their repository.

## When to Use

- User says "implement PKF" or "set up PKF"
- User wants to organize documentation with PKF
- User has existing docs and wants to migrate to PKF
- User is starting a new project and wants PKF structure

## How to Invoke

```bash
pkf init [options]
```

## Common Workflows

### New Project
```bash
pkf init --step implement
```
Creates fresh PKF structure without analysis.

### Existing Project (Interactive)
```bash
pkf init --interactive
```
Analyzes existing docs, designs schema with approval gates, implements PKF, migrates docs.

### Analysis Only
```bash
pkf init --step analyze --dry-run
```
Examines current documentation and suggests PKF schema without making changes.

## Options Reference

[Include CLI options from section 4.1]

## Troubleshooting

[Common issues and solutions]
```

---

## 5. Implementation Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Create `packages/pkf-init` package structure
- [ ] Implement WorkflowStateManager
- [ ] Implement AgentOrchestrator
- [ ] Set up basic CLI interface
- [ ] Add cost tracking

### Phase 2: Agents (Week 3-4)
- [ ] Write docs-analyst agent definition
- [ ] Write pkf-implementer agent definition
- [ ] Write docs-worker agent definition
- [ ] Implement blueprint schema
- [ ] Test agent communication

### Phase 3: Workflow (Week 5-6)
- [ ] Implement Stage 1: Analysis
- [ ] Implement Stage 2: Schema Design (iteration loop)
- [ ] Implement Stage 3: Implementation
- [ ] Add validation at each stage
- [ ] Implement checkpoint/resume

### Phase 4: Migration (Week 7-8)
- [ ] Implement Stage 4: Parallel migration
- [ ] Worker coordination system
- [ ] Migration validation
- [ ] Rollback mechanism
- [ ] Integration testing

### Phase 5: Polish (Week 9-10)
- [ ] Interactive mode with approval gates
- [ ] Dry-run mode
- [ ] Cost estimation
- [ ] Comprehensive error handling
- [ ] Documentation and examples
- [ ] End-to-end testing

---

## 6. Cost Estimation

### API Usage Breakdown

**Assumption:** Using Claude 3.5 Sonnet
- Input: $3 per million tokens
- Output: $15 per million tokens

**Typical Project Estimation:**

#### Small Project (<50 docs)
- Analysis: ~20K tokens in, ~10K tokens out = $0.21
- Schema Design (3 iterations): ~60K tokens in, ~30K tokens out = $0.63
- Implementation: ~15K tokens in, ~8K tokens out = $0.17
- Migration (2 workers): ~100K tokens in, ~50K tokens out = $1.05
- **Total: ~$2.06**

#### Medium Project (50-200 docs)
- Analysis: ~50K tokens in, ~25K tokens out = $0.53
- Schema Design (4 iterations): ~100K tokens in, ~50K tokens out = $1.05
- Implementation: ~25K tokens in, ~15K tokens out = $0.30
- Migration (5 workers): ~400K tokens in, ~200K tokens out = $4.20
- **Total: ~$6.08**

#### Large Project (200+ docs)
- Analysis: ~100K tokens in, ~50K tokens out = $1.05
- Schema Design (5 iterations): ~150K tokens in, ~75K tokens out = $1.58
- Implementation: ~40K tokens in, ~20K tokens out = $0.42
- Migration (10 workers): ~1M tokens in, ~500K tokens out = $10.50
- **Total: ~$13.55**

---

## 7. Risk Mitigation

### Risk: High API Costs
**Mitigation:**
- Budget limits with hard stops
- Cost estimation before execution
- Caching of agent responses
- Progressive execution (user can stop at any stage)

### Risk: Agent Hallucination
**Mitigation:**
- Validate all generated artifacts with pkf:validate
- Human approval gates in interactive mode
- Schema validation before implementation
- Test generation with fixtures

### Risk: Data Loss
**Mitigation:**
- Automatic backup (docs → docs.old)
- Atomic operations
- State persistence with rollback
- Validation before file operations

### Risk: Workflow Interruption
**Mitigation:**
- Checkpoint at each major step
- Resume capability
- Idempotent operations
- Clear state management

### Risk: Poor Schema Quality
**Mitigation:**
- Iterative refinement (2-5 iterations)
- PKF expert review (pkf-implementer)
- Validation against PKF standards
- Option to manually edit before implementation

---

## 8. Success Criteria

The feature is successful if:

1. **Usability**
   - User can run `pkf init` and get working PKF structure
   - Interactive mode provides clear guidance
   - Errors are actionable and helpful

2. **Quality**
   - Generated schemas are valid and comprehensive
   - Migrated docs maintain content integrity
   - Generated docs match PKF standards
   - Validation passes after completion

3. **Cost Effectiveness**
   - Typical project < $10 to initialize
   - Clear cost visibility before execution
   - Budget controls prevent runaway costs

4. **Reliability**
   - Can resume after interruption
   - Rollback works correctly
   - Handles edge cases gracefully
   - Success rate > 90% on diverse projects

5. **Adoption**
   - Reduces PKF setup time from hours to minutes
   - Increases PKF adoption rate
   - Positive user feedback

---

## 9. Design Decisions

### Decision 1: Agent Model Selection
**Decision:** Configurable per agent with smart defaults

**Implementation:**
```typescript
interface AgentConfig {
  name: string;
  instructions: string;
  model: 'haiku' | 'sonnet' | 'opus';  // Allow override
  temperature: number;
  maxTokens: number;
}

// Smart defaults
const DEFAULT_MODELS = {
  'docs-analyst': 'sonnet',      // Needs reasoning for quality assessment
  'pkf-implementer': 'sonnet',   // Complex schema design
  'docs-worker': 'haiku',        // Repetitive migration tasks
};
```

**CLI Configuration:**
```bash
# Use defaults (recommended)
pkf init

# Override specific agent
pkf init --model-analyst=opus --model-worker=haiku

# Use same model for all
pkf init --model=sonnet
```

**Rationale:**
- Different agents have different complexity needs
- Cost optimization: Use Haiku for simple tasks, Sonnet for complex
- Allow override for experimentation or quality requirements

---

### Decision 2: Validation Failures
**Decision:** Stop and prompt for user input interactively

**Implementation:**
```typescript
async function handleValidationFailure(
  stage: string,
  errors: ValidationError[]
): Promise<'retry' | 'skip' | 'abort'> {
  console.error(`\n❌ Validation failed at ${stage}:`);
  console.error(formatErrors(errors));
  console.error();

  const choice = await prompt({
    message: 'How would you like to proceed?',
    choices: [
      { value: 'retry', title: 'Retry (agent will fix issues)' },
      { value: 'skip', title: 'Skip validation (not recommended)' },
      { value: 'abort', title: 'Abort initialization' },
    ],
  });

  return choice;
}
```

**Validation Points:**
- After blueprint generation (schema valid?)
- After schema design (PKF compliant?)
- After implementation (pkf:validate passes?)
- After each document migration (frontmatter valid?)

**Rationale:**
- Prevents invalid artifacts from propagating
- User maintains control over quality
- Allows informed decisions when issues arise
- Educational: User learns what PKF expects

---

### Decision 3: Default Mode
**Decision:** Interactive with continuous progress output

**Implementation:**
```typescript
// Progress reporting throughout execution
class ProgressReporter {
  private spinner: Ora;

  stage(name: string) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Stage: ${chalk.bold.blue(name)}`);
    console.log('='.repeat(60) + '\n');
  }

  step(message: string) {
    console.log(chalk.gray(`→ ${message}`));
  }

  success(message: string) {
    console.log(chalk.green(`✓ ${message}`));
  }

  error(message: string) {
    console.error(chalk.red(`✗ ${message}`));
  }

  info(message: string) {
    console.log(chalk.blue(`ℹ ${message}`));
  }

  startTask(message: string) {
    this.spinner = ora(message).start();
  }

  completeTask(message: string) {
    this.spinner.succeed(message);
  }

  async approvalGate(
    stage: string,
    summary: string,
    details?: string
  ): Promise<boolean> {
    console.log(`\n${chalk.bold.yellow('Approval Required')}`);
    console.log(`Stage: ${stage}`);
    console.log(`\n${summary}`);
    if (details) {
      console.log(`\n${chalk.gray(details)}`);
    }

    const answer = await confirm({
      message: 'Proceed with this stage?',
      default: true,
    });

    return answer;
  }
}
```

**Example Output:**
```
============================================================
Stage: Analysis
============================================================

→ Scanning repository for documentation...
✓ Found 127 documentation files
→ Analyzing document structure...
✓ Identified 6 document types
→ Assessing documentation quality...
✓ Quality assessment complete
→ Generating blueprint...
✓ Blueprint generated: docs-blueprint.yaml

⚠ Approval Required
Stage: Analysis Complete

Blueprint Summary:
  - Document types: 6 (api-doc, guide, architecture, proposal, register, readme)
  - Total documents: 127
  - Quality: 45 excellent, 62 good, 15 needs-refactoring, 5 poor
  - Recommended schemas: 6 custom schemas
  - Estimated effort: Medium
  - Estimated cost: $6.50

Proceed with schema design? (Y/n)
```

**Rationale:**
- Users feel informed and in control
- Easy to abort if something looks wrong
- Progress visibility builds confidence
- Can run unattended with --yes flag if desired

---

### Decision 4: Worker Scaling
**Decision:** Auto-scale based on workload with configurable max

**Implementation:**
```typescript
interface WorkerScalingConfig {
  maxWorkers: number;         // User-specified limit (default: 10)
  minWorkers: number;         // Minimum to use (default: 1)
  optimalWorkers: number;     // Calculated based on workload
  scalingStrategy: 'conservative' | 'balanced' | 'aggressive';
}

function calculateOptimalWorkers(
  taskCount: number,
  complexity: 'simple' | 'medium' | 'complex',
  maxWorkers: number
): number {
  // Base calculation
  let optimal: number;

  if (complexity === 'simple') {
    // Many simple tasks -> scale up
    optimal = Math.min(Math.ceil(taskCount / 5), maxWorkers);
  } else if (complexity === 'medium') {
    // Moderate tasks -> balanced scaling
    optimal = Math.min(Math.ceil(taskCount / 10), maxWorkers);
  } else {
    // Complex tasks -> fewer workers for quality
    optimal = Math.min(Math.ceil(taskCount / 20), maxWorkers, 3);
  }

  // Ensure at least 1 worker
  return Math.max(1, optimal);
}

// Usage
const tasksToMigrate = 127;
const complexity = assessComplexity(tasks);
const maxWorkers = options.maxWorkers ?? 10;

const workerCount = calculateOptimalWorkers(
  tasksToMigrate,
  complexity,
  maxWorkers
);

console.log(`Scaling to ${workerCount} workers for ${tasksToMigrate} tasks`);
```

**CLI Configuration:**
```bash
# Auto-scale (default, max 10 workers)
pkf init

# Limit workers
pkf init --max-workers 3

# Single worker (sequential)
pkf init --max-workers 1

# Aggressive scaling
pkf init --max-workers 20
```

**Cost Consideration:**
```typescript
// Adjust worker count based on budget
if (state.maxCost) {
  const estimatedCostPerWorker = calculateWorkerCost(tasks);
  const maxAffordableWorkers = Math.floor(
    (state.maxCost - state.totalCost) / estimatedCostPerWorker
  );

  workerCount = Math.min(workerCount, maxAffordableWorkers);

  if (workerCount < 1) {
    throw new Error('Insufficient budget for migration');
  }
}
```

**Rationale:**
- Auto-scaling optimizes for speed vs. cost
- User can constrain for budget or system limits
- Complex tasks get fewer workers for quality
- Simple tasks can massively parallelize

---

## 10. Future Enhancements

### V2 Features
- **Incremental updates**: Re-analyze and suggest schema extensions
- **CI/CD integration**: Auto-validate docs in pipelines
- **Template library**: Pre-built schemas for common project types
- **GUI wizard**: Web-based initialization interface
- **Schema marketplace**: Share/discover schema designs
- **Multi-language support**: Analyze code in various languages
- **Smart suggestions**: ML-based document classification

### Advanced Capabilities
- **Automatic schema evolution**: Detect when schema needs updates
- **Documentation quality scoring**: Ongoing quality metrics
- **Auto-generation from code**: Keep docs in sync with code
- **Collaborative schema design**: Multiple stakeholders
- **Version control integration**: Git-aware migrations

---

## 11. Open Questions

1. **Caching Strategy**
   - How aggressively should we cache agent responses?
   - When does cache invalidation occur?
   - Cache per repository or global?

2. **Schema Versioning**
   - How do we handle schema evolution over time?
   - Migration path between schema versions?
   - Backward compatibility guarantees?

3. **Error Recovery Strategies**
   - What happens if agent produces invalid output?
   - How many retries before giving up?
   - Should we auto-correct common mistakes?

4. **Testing Strategy**
   - How to test multi-agent workflows?
   - Mock agents or real API calls in tests?
   - Test data for various project sizes?

5. **Internationalization**
   - Support for non-English documentation?
   - Multi-language repositories?
   - Language detection and handling?

---

---

## 12. Implementation Specifications

### Package Structure

```
packages/pkf-init/
├── src/
│   ├── cli.ts                 # CLI entry point
│   ├── commands/
│   │   ├── init.ts           # Main init command
│   │   ├── analyze.ts        # --step analyze
│   │   ├── design.ts         # --step design
│   │   ├── implement.ts      # --step implement
│   │   └── migrate.ts        # --step migrate
│   ├── agents/
│   │   ├── orchestrator.ts   # Agent execution & coordination
│   │   ├── cost-tracker.ts   # API cost tracking
│   │   └── models.ts         # Model configurations
│   ├── state/
│   │   ├── workflow-state.ts # State persistence
│   │   ├── checkpoint.ts     # Checkpoint management
│   │   └── resume.ts         # Resume logic
│   ├── stages/
│   │   ├── analysis.ts       # Stage 1: Analysis
│   │   ├── design.ts         # Stage 2: Schema design
│   │   ├── implementation.ts # Stage 3: Implementation
│   │   └── migration.ts      # Stage 4: Migration
│   ├── utils/
│   │   ├── progress.ts       # Progress reporting
│   │   ├── validation.ts     # Validation helpers
│   │   ├── file-ops.ts       # Safe file operations
│   │   └── prompts.ts        # User prompts
│   └── types.ts              # TypeScript types
├── agents/                    # Agent definitions
│   ├── docs-analyst.md
│   ├── pkf-implementer.md
│   └── docs-worker.md
├── templates/                 # Output templates
│   ├── blueprint.yaml
│   └── worker-instructions.yaml
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/             # Test repositories
├── package.json
├── tsconfig.json
└── README.md
```

### Key Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "prompts": "^2.4.2",
    "yaml": "^2.3.4",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/prompts": "^2.4.9",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

### Configuration Schema

```typescript
// pkf-init.config.ts (user's project)
export interface PKFInitConfig {
  // Agent model overrides
  models?: {
    analyst?: 'haiku' | 'sonnet' | 'opus';
    implementer?: 'haiku' | 'sonnet' | 'opus';
    worker?: 'haiku' | 'sonnet' | 'opus';
  };

  // Worker scaling
  workers?: {
    max?: number;
    strategy?: 'conservative' | 'balanced' | 'aggressive';
  };

  // Cost management
  budget?: {
    max?: number;
    warning?: number;
  };

  // Paths
  paths?: {
    docs?: string;
    backup?: string;
    output?: string;
  };

  // Validation
  validation?: {
    strict?: boolean;
    autoFix?: boolean;
  };

  // Exclusions
  exclude?: string[];  // Glob patterns to exclude
}
```

---

## 13. Success Metrics & Acceptance Criteria

### Functional Requirements

#### Must Have (V1)
- [ ] CLI successfully analyzes existing documentation
- [ ] Generates valid PKF schema from analysis
- [ ] Creates complete PKF directory structure
- [ ] Migrates existing docs to PKF format
- [ ] All generated artifacts pass `pkf:validate`
- [ ] Interactive mode with approval gates works
- [ ] Checkpoint/resume functionality works
- [ ] Cost tracking and budget limits work
- [ ] Backup mechanism prevents data loss

#### Should Have (V1.1)
- [ ] Dry-run mode with accurate cost estimates
- [ ] Step-by-step execution (--step flag)
- [ ] Auto-scaling workers based on workload
- [ ] Configurable agent models
- [ ] Comprehensive error messages
- [ ] Progress reporting with spinners

#### Nice to Have (V2)
- [ ] Schema evolution detection
- [ ] Incremental updates to existing PKF
- [ ] GUI wizard mode
- [ ] Pre-built schema templates
- [ ] Integration with git workflows

### Performance Requirements

- Analysis completes in < 2 minutes for 100 docs
- Schema design converges in ≤ 5 iterations
- Worker throughput: ≥ 10 docs/minute/worker
- Total initialization time: < 15 minutes for medium project

### Quality Requirements

- Generated schemas validate against PKF standards
- Migrated docs preserve content integrity (no data loss)
- Frontmatter accuracy ≥ 95%
- Validation pass rate ≥ 90% after migration
- User approval required for destructive operations

### Cost Requirements

- Small project (< 50 docs): ≤ $3
- Medium project (50-200 docs): ≤ $8
- Large project (200+ docs): ≤ $20
- Cost estimation accuracy: ±20%

### Reliability Requirements

- Success rate ≥ 90% across diverse projects
- Resume after interruption works 100% of time
- Rollback succeeds 100% of time
- No data loss in any scenario

---

## 14. Testing Strategy

### Unit Tests

```typescript
// Example unit tests
describe('WorkflowStateManager', () => {
  it('should save and load state', async () => {
    const state = { stage: 'analyzing', cost: 1.5 };
    await stateManager.save(state);
    const loaded = await stateManager.load();
    expect(loaded).toEqual(state);
  });

  it('should create checkpoints', async () => {
    await stateManager.checkpoint('design', { iteration: 3 });
    const state = await stateManager.load();
    expect(state.checkpoints).toHaveLength(1);
  });
});

describe('CostTracker', () => {
  it('should track API costs accurately', () => {
    tracker.recordUsage({ inputTokens: 1000, outputTokens: 500 });
    expect(tracker.getCurrentCost()).toBeCloseTo(0.0105);
  });

  it('should enforce budget limits', () => {
    tracker.setMaxCost(0.01);
    tracker.recordUsage({ inputTokens: 10000, outputTokens: 5000 });
    expect(tracker.isWithinBudget()).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('PKF Init Integration', () => {
  it('should analyze sample repository', async () => {
    const result = await runInit({
      step: 'analyze',
      path: './fixtures/sample-repo',
      dryRun: true,
    });

    expect(result.blueprint).toBeDefined();
    expect(result.blueprint.document_types).toHaveLength(4);
  });

  it('should complete full workflow on small project', async () => {
    const result = await runInit({
      path: './fixtures/small-project',
      yes: true,  // Non-interactive
      maxCost: 5,
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync('fixtures/small-project/docs')).toBe(true);
    expect(fs.existsSync('fixtures/small-project/pkf.config.yaml')).toBe(true);
  });

  it('should resume after interruption', async () => {
    // Start workflow
    const partial = await runInit({
      path: './fixtures/medium-project',
      interrupt: 'after-design',
    });

    // Resume
    const resumed = await runInit({
      path: './fixtures/medium-project',
      resume: true,
    });

    expect(resumed.success).toBe(true);
  });
});
```

### Test Fixtures

```
tests/fixtures/
├── empty-repo/           # No docs
├── small-project/        # < 50 docs, simple structure
├── medium-project/       # 50-200 docs, moderate complexity
├── large-project/        # 200+ docs, complex structure
├── messy-docs/          # Inconsistent formatting, missing frontmatter
├── multi-language/      # Mixed language docs
└── legacy-structure/    # Old doc system to migrate
```

---

## 15. Documentation Requirements

### User Documentation

1. **Quick Start Guide**
   - Installation
   - Basic usage
   - Common workflows

2. **CLI Reference**
   - All commands and options
   - Examples for each flag
   - Exit codes

3. **Agent Guide**
   - How agents work together
   - Model selection guide
   - Cost optimization tips

4. **Troubleshooting**
   - Common errors
   - Recovery procedures
   - FAQ

### Developer Documentation

1. **Architecture Overview**
   - System components
   - Data flow diagrams
   - State machine

2. **Contributing Guide**
   - Development setup
   - Testing procedures
   - Code standards

3. **API Reference**
   - All public APIs
   - TypeScript types
   - Usage examples

---

**Next Steps:**
1. ✅ Incorporate user decisions into architecture
2. 🔄 Peer review architecture specification
3. 📝 Iterate based on review feedback
4. ✅ Create detailed implementation specs
5. 🚀 Begin Phase 1 implementation
