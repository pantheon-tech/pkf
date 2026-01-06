# PKF Init

AI-assisted PKF initialization for existing projects.

## Overview

`pkf-init` uses Claude AI to analyze your existing project documentation and automatically migrate it to the Project Knowledge Framework (PKF) structure. It performs four main stages:

1. **Analysis** - Scans your repository, discovers documentation files, and generates a blueprint
2. **Schema Design** - AI conversation to design custom PKF schemas based on your documentation patterns
3. **Implementation** - Creates PKF directory structure, configuration, and registers
4. **Migration** - Migrates existing documents with proper frontmatter and structure

The tool supports interactive mode with approval gates, dry-run mode for cost estimation, and the ability to resume interrupted runs.

## Installation

```bash
npm install pkf-init
```

Or use via `pkf-processor`:

```bash
npm install pkf-processor
pkf init
```

## Quick Start

```bash
# Interactive mode (recommended for first use)
pkf-init -i

# Dry-run to see cost and time estimate
pkf-init --dry-run

# Non-interactive with defaults
pkf-init

# Resume from a previous interrupted run
pkf-init --resume
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --interactive` | Run in interactive mode with approval gates at each stage | `false` |
| `--dry-run` | Show cost/time estimate without making changes | - |
| `--resume` | Resume from previous run state | - |
| `--step <step>` | Start from specific step: `analyzing`, `designing`, `implementing`, `migrating` | - |
| `--docs-path <path>` | Path to documentation directory | `docs` |
| `--max-cost <amount>` | Maximum cost in USD (budget limit) | `50` |
| `--workers <count>` | Number of parallel workers for migration | `3` |
| `--api-key <key>` | Anthropic API key (or use `ANTHROPIC_API_KEY` env) | - |
| `--api-tier <tier>` | API rate limit tier: `free`, `build1`, `build2`, `build3`, `build4` | `build1` |
| `--output <dir>` | Output directory for generated files | `.` |
| `--backup-dir <dir>` | Backup directory for existing docs | `.pkf-backup` |
| `--skip-backup` | Skip creating backup of existing documentation | - |
| `--force` | Force overwrite existing files and ignore warnings | - |
| `-v, --verbose` | Enable verbose output for debugging | - |

## Workflow Stages

### Stage 1: Analysis

The analysis stage scans your repository for documentation files and generates a blueprint YAML that describes:

- Current documentation structure
- Identified document types (guides, references, ADRs, etc.)
- Recommendations for PKF structure
- Migration plan for existing files

```bash
# Run only analysis stage
pkf-init --step analyzing
```

### Stage 2: Schema Design

Uses an AI conversation between two agents to design custom PKF schemas based on your documentation patterns. The agents:

- Review the blueprint from Stage 1
- Design a `schemas.yaml` file with document type definitions
- Include inheritance (base-doc with common fields)
- Add validation rules (required fields, enums, patterns)

The schema design supports up to 5 iterations and uses convergence detection to determine when the design is complete.

### Stage 3: Implementation

Creates the PKF structure in your project:

- Directory structure based on schema definitions
- `pkf.config.yaml` configuration file
- `schemas/schemas.yaml` with document type schemas
- Register files (TODO.md, ISSUES.md, CHANGELOG.md)

A backup of your existing `docs/` directory is created before making changes (unless `--skip-backup` is specified).

### Stage 4: Migration

Migrates existing documentation files to PKF format:

- Adds YAML frontmatter with proper metadata
- Moves files to appropriate locations
- Validates migrated documents against schemas
- Supports parallel processing for large codebases

## API Usage

For programmatic usage, import the stage classes directly:

```typescript
import {
  AnalysisStage,
  SchemaDesignStage,
  ImplementationStage,
  MigrationStage,
  WorkflowStateManager,
  ConfigLoader,
  AgentOrchestrator,
  CostTracker,
  RateLimiter,
  RequestQueue,
  Interactive,
} from 'pkf-init';

// Load configuration
const configLoader = new ConfigLoader({
  apiKey: process.env.ANTHROPIC_API_KEY,
  docsPath: 'docs',
  maxCost: 50,
});
const config = await configLoader.load();

// Initialize components
const stateManager = new WorkflowStateManager(config.rootDir);
const costTracker = new CostTracker(config.maxCost);
const rateLimiter = new RateLimiter(config.apiTier);
const requestQueue = new RequestQueue(rateLimiter);
const interactive = new Interactive(false); // non-interactive mode
const orchestrator = new AgentOrchestrator(/* ... */);

// Run analysis stage
const analysisStage = new AnalysisStage(
  orchestrator,
  stateManager,
  config,
  interactive
);
const analysisResult = await analysisStage.execute();

// Run schema design stage
const schemaDesignStage = new SchemaDesignStage(
  orchestrator,
  stateManager,
  config,
  interactive
);
const schemaResult = await schemaDesignStage.execute(analysisResult.blueprint);

// Run implementation stage
const implementationStage = new ImplementationStage(
  stateManager,
  config,
  interactive
);
const implResult = await implementationStage.execute(schemaResult.schemasYaml);

// Run migration stage
const migrationStage = new MigrationStage(
  orchestrator,
  stateManager,
  config,
  interactive,
  requestQueue
);
const migrationResult = await migrationStage.execute(
  analysisResult.blueprint,
  schemaResult.schemasYaml
);
```

### Exported Types

```typescript
import type {
  // Workflow types
  WorkflowState,
  WorkflowStage,
  InitOptions,
  LoadedConfig,

  // Stage result types
  AnalysisResult,
  DiscoveredDoc,
  SchemaDesignResult,
  ImplementationResult,
  StructurePreview,
  MigrationStageResult,

  // Migration types
  MigrationPlan,
  MigrationTask,
  MigrationResult,
  CostEstimate,
  ValidationSummary,
  RollbackResult,

  // API types
  ApiTier,
  ClaudeModel,
  AgentConfig,
  AgentResult,
} from 'pkf-init';
```

## Configuration

### PKF Configuration File

You can create a `pkf-config.yaml` file to customize pkf-init behavior. Pass it with the `-c` or `--config` flag:

```bash
pkf-init -c pkf-config.yaml
```

**Example configuration:**

```yaml
# Analysis stage configuration
analysis:
  maxParallelInspections: 3  # Number of parallel document inspections

# Orchestration configuration
orchestration:
  maxIterations: 5  # Maximum iterations for agent conversations

# Planning configuration
planning:
  avgOutputTokensPerDoc: 1000  # Average output tokens per document for cost estimation

# API client configuration
api:
  maxRetries: 3        # Maximum retry attempts for failed API calls
  retryDelayMs: 1000   # Delay between retries in milliseconds
  timeout: 1800000     # API request timeout in milliseconds (30 minutes default, 0 = no timeout)
```

All configuration options can also be overridden via environment variables (see below).

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | API key for Claude (required unless passed via `--api-key`) | - |
| `PKF_MAX_PARALLEL_INSPECTIONS` | Maximum parallel document inspections | `3` |
| `PKF_MAX_ITERATIONS` | Maximum agent conversation iterations | `5` |
| `PKF_AVG_OUTPUT_TOKENS_PER_DOC` | Average output tokens per document | `1000` |
| `PKF_MAX_RETRIES` | Maximum retry attempts | `3` |
| `PKF_RETRY_DELAY_MS` | Retry delay in milliseconds | `1000` |
| `PKF_API_TIMEOUT` | API timeout in milliseconds (0 = no timeout) | `1800000` (30 min) |

### State Files

`pkf-init` creates the following state files:

| File | Purpose |
|------|---------|
| `.pkf-init-state.json` | Workflow state for resume functionality |
| `.pkf-init.lock` | Lock file to prevent concurrent runs |
| `.pkf-backup/` | Backup directory for existing documentation |

## Cost Estimation

`pkf-init` uses Claude AI and incurs API costs. Typical cost breakdown:

| Stage | Estimated Cost |
|-------|----------------|
| Analysis | $0.01 - $0.05 |
| Schema Design | $0.05 - $0.15 |
| Implementation | $0.00 (no AI calls) |
| Migration | ~$0.01 per document |

**Total estimated cost:** $0.10 - $0.50 for a typical project with 10-20 documents.

Use `--dry-run` to get a cost estimate before running:

```bash
pkf-init --dry-run
```

Set a budget limit to prevent unexpected costs:

```bash
pkf-init --max-cost 5  # Limit to $5 USD
```

### Model Pricing (as of January 2025)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Claude Sonnet 4 | $3.00 | $15.00 |
| Claude Haiku 3.5 | $0.80 | $4.00 |
| Claude Opus 4 | $15.00 | $75.00 |

## API Rate Limits

The tool respects Anthropic API rate limits based on your tier:

| Tier | Requests/min | Tokens/min |
|------|--------------|------------|
| `free` | 5 | 20,000 |
| `build1` | 50 | 40,000 |
| `build2` | 50 | 80,000 |
| `build3` | 50 | 160,000 |
| `build4` | 50 | 400,000 |

Specify your tier with `--api-tier`:

```bash
pkf-init --api-tier build2
```

## Troubleshooting

### Rate Limiting

If you encounter rate limit errors:

1. Reduce parallel workers: `--workers 1`
2. Use a higher API tier if available: `--api-tier build2`
3. Wait and resume: `pkf-init --resume`

### Resuming Interrupted Runs

If initialization is interrupted (network error, timeout, etc.):

```bash
# Resume from last checkpoint
pkf-init --resume

# Or start from a specific stage
pkf-init --step implementing --resume
```

The workflow state is saved to `.pkf-init-state.json` after each stage checkpoint.

### Rollback

If you need to undo PKF initialization:

```typescript
import { RollbackManager, WorkflowStateManager, ConfigLoader } from 'pkf-init';

const configLoader = new ConfigLoader({});
const config = await configLoader.load();
const stateManager = new WorkflowStateManager(config.rootDir);

const rollbackManager = new RollbackManager(config, stateManager);

// Get latest backup
const backupPath = await rollbackManager.getLatestBackup();

if (backupPath) {
  // Perform rollback
  const result = await rollbackManager.rollback(backupPath);
  console.log(`Restored ${result.restoredFiles.length} files`);
}
```

### Common Issues

**"Budget exceeded" error**
- Increase the budget limit: `--max-cost 100`
- Use `--dry-run` first to estimate costs

**"Lock file exists" error**
- Another instance may be running
- Remove `.pkf-init.lock` if you're sure no other instance is running

**"No documentation files found"**
- Check your `--docs-path` setting
- Ensure markdown files exist in the specified directory

**Schema validation failures**
- Run in interactive mode to review and edit schemas: `--interactive`
- Check the generated `schemas.yaml` for syntax errors

**"Streaming is strongly recommended for operations that may take longer than 10 minutes"**
- This error occurs when long-running agent conversations exceed the API timeout
- The default timeout is 30 minutes, which should be sufficient for most projects
- To increase the timeout, create a `pkf-config.yaml` file with:
  ```yaml
  api:
    timeout: 3600000  # 60 minutes in milliseconds, 0 for no timeout
  ```
- Then run with: `pkf-init -c pkf-config.yaml`
- Or set the environment variable: `export PKF_API_TIMEOUT=3600000`

## Requirements

- Node.js >= 18.0.0
- Anthropic API key with sufficient credits

## License

MIT
