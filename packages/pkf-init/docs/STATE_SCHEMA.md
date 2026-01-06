# State Schema Documentation

This document describes the state schema used by pkf-init and the migration system for handling version changes.

## Overview

The pkf-init workflow state is persisted to `.pkf-init-state.json` in the project root directory. This state file tracks the progress of the initialization workflow, including checkpoints, API usage, and stage-specific data.

## Current Version

**Current state version:** `1.0.0`

## State Schema

### WorkflowState Interface

```typescript
interface WorkflowState {
  // Version information
  version: string;                    // State schema version (semver)

  // Timestamps
  startedAt: string;                  // ISO 8601 timestamp when workflow started
  updatedAt: string;                  // ISO 8601 timestamp of last update

  // Workflow tracking
  currentStage: WorkflowStage;        // Current workflow stage
  checkpoints: Checkpoint[];          // Array of checkpoints

  // API usage tracking
  apiCallCount: number;               // Total number of API calls made
  totalCost: number;                  // Total cost in USD
  totalTokens: number;                // Total tokens used (input + output)
  maxCost?: number;                   // Optional maximum cost limit

  // Stage-specific state (optional)
  analysis?: AnalysisState;           // Analysis stage data
  design?: DesignState;               // Design stage data
  implementation?: ImplementationState; // Implementation stage data
  migration?: MigrationState;         // Migration stage data
}
```

### WorkflowStage Enum

```typescript
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

### Checkpoint Interface

```typescript
interface Checkpoint {
  stage: WorkflowStage;               // Stage when checkpoint was created
  timestamp: string;                  // ISO 8601 timestamp
  description: string;                // Human-readable description
  data?: Record<string, unknown>;     // Optional checkpoint-specific data
}
```

### Stage-Specific States

#### AnalysisState

```typescript
interface AnalysisState {
  complete: boolean;                  // Whether analysis is complete
  blueprint?: string;                 // Generated blueprint YAML
  discoveredDocs?: string[];          // List of discovered documentation files
  summary?: string;                   // Analysis summary
}
```

#### DesignState

```typescript
interface DesignState {
  complete: boolean;                  // Whether design is complete
  schemasYaml?: string;               // Generated schemas.yaml content
  iterations?: number;                // Number of conversation iterations
  convergenceReason?: string;         // Convergence reason if converged
}
```

#### ImplementationState

```typescript
interface ImplementationState {
  complete: boolean;                  // Whether implementation is complete
  createdDirs?: string[];             // Created directories
  createdFiles?: string[];            // Created files
  configContent?: string;             // Generated config content
}
```

#### MigrationState

```typescript
interface MigrationState {
  complete: boolean;                  // Whether migration is complete
  tasks?: MigrationTask[];            // Migration tasks
  completedCount?: number;            // Number of completed tasks
  totalCount?: number;                // Total number of tasks
}
```

## Version History

### Version 1.0.0 (Initial Release)

**Release Date:** 2025-01-05

**Initial schema includes:**
- Basic workflow tracking (version, timestamps, stage)
- Checkpoint system for progress tracking
- API usage tracking (calls, cost, tokens)
- Stage-specific state objects
- Support for resumable workflows

**Required Fields:**
- `version` - State schema version
- `startedAt` - Workflow start timestamp
- `updatedAt` - Last update timestamp
- `currentStage` - Current workflow stage
- `checkpoints` - Array of checkpoints
- `apiCallCount` - API call count
- `totalCost` - Total cost in USD
- `totalTokens` - Total tokens used

**Optional Fields:**
- `maxCost` - Maximum cost limit
- `analysis` - Analysis stage state
- `design` - Design stage state
- `implementation` - Implementation stage state
- `migration` - Migration stage state

## Migration System

### Overview

The migration system handles version changes in the state schema. When loading state from disk, the system:

1. Checks if the state has a version field
2. If no version exists, assumes it's legacy state (version 1.0.0)
3. Compares the state version with the current version
4. Applies necessary migrations to bring state to current version
5. Validates the migrated state before use

### Migration Functions

Migrations are defined as functions that transform state from one version to another:

```typescript
type StateMigrationFunction = (state: any) => any;
```

Each migration is registered with a key in the format: `from-version-to-target-version`

Example:
```typescript
'1.0.0-to-1.1.0': (oldState: any): any => {
  return {
    ...oldState,
    version: '1.1.0',
    // Add new fields or transform existing ones
  };
}
```

### Adding New Migrations

When the state schema changes:

1. **Update the version number** in `src/state/workflow-state.ts`
2. **Add a migration function** in `src/state/migration.ts`
3. **Document the changes** in this file
4. **Add tests** for the migration in `tests/state/migration.test.ts`

### Migration Rules

1. **No downgrades**: The system prevents downgrading to an older version
2. **Sequential application**: Migrations are applied in version order
3. **Validation required**: All migrated state must pass validation
4. **Preserve data**: Migrations should preserve all existing data
5. **Add defaults**: New required fields should have sensible defaults

### Example Migration Flow

```
Legacy State (no version)
  ↓
Apply: assume version 1.0.0
  ↓
State v1.0.0
  ↓
Apply: 1.0.0-to-1.1.0 migration
  ↓
State v1.1.0
  ↓
Apply: 1.1.0-to-1.2.0 migration
  ↓
State v1.2.0 (current)
  ↓
Validate schema
  ↓
Ready to use
```

## State Validation

The system validates state structure before saving and after migration:

### Validation Rules

1. State must be a non-null object
2. All required fields must be present
3. Field types must match expectations:
   - `version`: string
   - `startedAt`: string (ISO 8601)
   - `updatedAt`: string (ISO 8601)
   - `currentStage`: string (WorkflowStage enum value)
   - `checkpoints`: array
   - `apiCallCount`: number
   - `totalCost`: number
   - `totalTokens`: number

### Validation Errors

Invalid state will cause:
- **Load errors**: Migration fails if validation fails
- **Save errors**: Cannot save invalid state

## Best Practices

### For Users

1. **Don't manually edit** `.pkf-init-state.json`
2. **Back up state** before major version upgrades
3. **Check version compatibility** when sharing state files

### For Developers

1. **Always increment version** when changing schema
2. **Write migration functions** for all schema changes
3. **Test migrations thoroughly** with various state scenarios
4. **Document all changes** in this file
5. **Preserve backward compatibility** where possible

## File Location

**State file:** `.pkf-init-state.json` in project root

This file is:
- Created automatically when workflow starts
- Updated on each checkpoint
- Deleted on successful completion
- Used for resuming interrupted workflows

## Security Considerations

The state file may contain:
- File paths from your project
- API usage statistics
- Checkpoint descriptions

**Do not commit** `.pkf-init-state.json` to version control. It's already included in `.gitignore`.

## Troubleshooting

### "Cannot downgrade state" Error

**Cause:** Trying to use an older version of pkf-init with a state file from a newer version.

**Solution:** Upgrade pkf-init to the latest version or delete the state file and restart.

### "State validation failed" Error

**Cause:** State file is corrupted or has invalid structure.

**Solution:** Delete `.pkf-init-state.json` and restart the workflow.

### "No migration path found" Error

**Cause:** State version is too old and no migration path exists.

**Solution:** This indicates a gap in migration functions. Report as a bug.

## Future Versions

Future schema changes will be documented here as they are released.

### Planned Changes

(None currently planned)

---

**Last Updated:** 2025-01-05
**Current Version:** 1.0.0
