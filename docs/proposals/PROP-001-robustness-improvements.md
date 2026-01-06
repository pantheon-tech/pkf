---
title: "PKF Robustness Improvements"
type: proposal
proposal-id: PROP-001
proposal-status: draft
created: 2026-01-02
updated: 2026-01-02
status: draft
author: Claude
tags:
  - enhancement
  - reliability
  - error-handling
  - validation
---

# PROP-001: PKF Robustness Improvements

## Summary

Enhance PKF init to prevent schema mapping errors, improve error visibility, and ensure cleaner migrations through better validation, testing, and self-healing mechanisms.

## Motivation

During migration of the CAOF project, we encountered several issues:

1. **Silent agent failures** - Agent conversation errors weren't visible, making debugging difficult
2. **Type-to-schema mismatch** - Blueprint used type names (e.g., `readme`, `guide-user`) that didn't match schema names (e.g., `base-doc`, `guide`)
3. **Incomplete cleanup** - Empty directories remained after file moves
4. **Late validation** - Schema mapping issues weren't detected until migration stage

These issues delayed the migration and required manual intervention. PKF should be more resilient and self-healing.

## Proposed Changes

### 1. Schema Design Stage Improvements

#### 1.1 Type Mapping Validation

**File**: `packages/pkf-init/src/stages/schema-design.ts`

Add validation that ensures all blueprint document types have corresponding schemas:

```typescript
/**
 * Validate that all document types in blueprint have schema mappings
 */
private validateTypeToSchemaMapping(
  blueprint: string,
  schemasYaml: string
): ValidationResult {
  const blueprintData = yaml.load(blueprint);
  const schemasData = yaml.load(schemasYaml);

  const documentTypes = new Set<string>();
  for (const doc of blueprintData.discovered_documents) {
    documentTypes.add(doc.type);
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const docType of documentTypes) {
    const schemaName = getSchemaForDocType(docType);

    if (!schemasData.schemas[schemaName]) {
      errors.push(
        `Document type "${docType}" maps to schema "${schemaName}" which is not defined`
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

**Impact**: Catches type-to-schema mismatches before migration starts.

#### 1.2 Schema Completeness Checker

Add a pre-migration validation step that:
- Lists all document types found in blueprint
- Shows which schema each maps to
- Identifies any missing schemas
- Suggests adding missing schema definitions

**Implementation**:
- New utility: `src/utils/schema-validator.ts`
- Run after schema design stage completes
- Block migration if critical schemas missing
- Provide clear error messages with remediation steps

### 2. Agent Orchestration Enhancements

#### 2.1 Improved Error Reporting

**File**: `packages/pkf-init/src/agents/orchestrator.ts`

✅ **Already implemented** - Added console.error logging for agent failures

**Additional enhancements**:

```typescript
// Add structured error logging
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
    logger.debug('Full error trace:', error);
  }

  // Write to debug log file for post-mortem analysis
  if (this.debugLogPath) {
    fs.appendFileSync(
      this.debugLogPath,
      `\n[${new Date().toISOString()}] ${agentName} iteration ${iteration}\n` +
      `Error: ${error}\n` +
      `Context: ${JSON.stringify(context, null, 2)}\n`
    );
  }
}
```

#### 2.2 Agent Output Validation

Add validation that agent outputs match expected format:

```typescript
/**
 * Validate agent output contains expected sections
 */
private validateAgentOutput(
  agentName: string,
  output: string,
  expectedMarkers: string[]
): { valid: boolean; missing: string[] } {
  const missing = expectedMarkers.filter(marker => !output.includes(marker));

  if (missing.length > 0) {
    logger.warn(
      `Agent ${agentName} output missing expected markers: ${missing.join(', ')}`
    );
  }

  return { valid: missing.length === 0, missing };
}
```

For `documentation-analyst-init`, expect:
- YAML code block with `version:` and `schemas:`
- OR `[TRIAGE-COMPLETE]` / `[BLUEPRINT-COMPLETE]` markers

### 3. Blueprint Analysis Improvements

#### 3.1 Document Type Normalization

**File**: `packages/pkf-init/agents/documentation-analyst-init.md`

Update agent instructions to use canonical type names:

```markdown
## Document Type Standards

When classifying documents, use these EXACT type names (do not invent new ones):

**Core Types** (map to base-doc):
- `readme` - Project/package README files

**Guide Types** (map to guide schema):
- `guide-user` - End-user guides, tutorials
- `guide-developer` - Developer guides, contributing docs

**API Types** (map to spec schema):
- `api-reference` - API documentation

**Architecture Types** (map to base-doc):
- `architecture` - Design documents, system architecture

**Register Types** (map to register schema):
- `changelog` - Version history
- `todo` - Task lists
- `issues` - Issue tracking

**Other Types** (map to base-doc):
- `template` - Document templates
- `example` - Usage examples
- `config` - Configuration documentation
- `reference` - Reference material

**IMPORTANT**: Use ONLY these exact type names. Do not create variations like:
- ❌ `user-guide` (use `guide-user`)
- ❌ `dev-guide` (use `guide-developer`)
- ❌ `api-doc` (use `api-reference`)
```

#### 3.2 Type Validation in Triage/Synthesis

Add validation step that warns about non-standard types:

```yaml
# In triage output
type_validation:
  unknown_types:
    - "user-guide"  # Should be "guide-user"
    - "api-doc"     # Should be "api-reference"
  suggestion: "Use canonical type names for better schema mapping"
```

### 4. Index File Management

#### 4.1 Automatic Index Update

**File**: `packages/pkf-init/src/utils/index-updater.ts`

Create a new utility to update INDEX files after migration:

```typescript
/**
 * Update INDEX and navigation files after migration
 */
export class IndexUpdater {
  private moveMap: Map<string, string>; // oldPath -> newPath

  constructor(migrations: MigrationResult[]) {
    this.moveMap = new Map();
    for (const result of migrations) {
      if (result.moved && result.task.sourcePath !== result.task.targetPath) {
        this.moveMap.set(result.task.sourcePath, result.task.targetPath);
      }
    }
  }

  /**
   * Find and update all INDEX files
   */
  async updateAllIndexes(docsDir: string): Promise<{
    updated: string[];
    errors: Array<{ file: string; error: string }>;
  }> {
    const indexFiles = await this.findIndexFiles(docsDir);
    const updated: string[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    for (const indexFile of indexFiles) {
      try {
        const wasUpdated = await this.updateIndexFile(indexFile);
        if (wasUpdated) {
          updated.push(indexFile);
        }
      } catch (error) {
        errors.push({
          file: indexFile,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { updated, errors };
  }

  /**
   * Find INDEX files in the documentation tree
   */
  private async findIndexFiles(docsDir: string): Promise<string[]> {
    const patterns = [
      '**/INDEX.md',
      '**/00-INDEX.md',
      '**/index.md',
      '**/README.md', // READMEs often serve as indexes
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: docsDir, absolute: true });
      files.push(...matches);
    }

    return [...new Set(files)]; // Deduplicate
  }

  /**
   * Update links in an index file
   */
  private async updateIndexFile(indexPath: string): Promise<boolean> {
    const content = await fs.readFile(indexPath, 'utf-8');
    const indexDir = path.dirname(indexPath);
    let updated = false;
    let newContent = content;

    // Find all markdown links: [text](path)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const [fullMatch, linkText, linkPath] = match;

      // Skip external links
      if (linkPath.startsWith('http://') || linkPath.startsWith('https://')) {
        continue;
      }

      // Resolve the absolute path this link points to
      const absoluteLinkTarget = path.resolve(indexDir, linkPath);

      // Check if this file was moved
      for (const [oldPath, newPath] of this.moveMap.entries()) {
        const absoluteOldPath = path.resolve(process.cwd(), oldPath);

        if (absoluteLinkTarget === absoluteOldPath) {
          // Calculate new relative path from index to new location
          const absoluteNewPath = path.resolve(process.cwd(), newPath);
          const newRelativePath = path.relative(indexDir, absoluteNewPath);

          // Replace the link
          const newLink = `[${linkText}](${newRelativePath})`;
          newContent = newContent.replace(fullMatch, newLink);
          updated = true;

          logger.debug(
            `Updated link in ${indexPath}: ${linkPath} -> ${newRelativePath}`
          );
        }
      }
    }

    if (updated) {
      await fs.writeFile(indexPath, newContent, 'utf-8');
    }

    return updated;
  }

  /**
   * Detect broken links in an index file
   */
  async detectBrokenLinks(indexPath: string): Promise<string[]> {
    const content = await fs.readFile(indexPath, 'utf-8');
    const indexDir = path.dirname(indexPath);
    const brokenLinks: string[] = [];

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const linkPath = match[2];

      // Skip external links and anchors
      if (
        linkPath.startsWith('http://') ||
        linkPath.startsWith('https://') ||
        linkPath.startsWith('#')
      ) {
        continue;
      }

      // Check if file exists
      const absolutePath = path.resolve(indexDir, linkPath);
      try {
        await fs.access(absolutePath);
      } catch {
        brokenLinks.push(linkPath);
      }
    }

    return brokenLinks;
  }
}
```

#### 4.2 Index Validation Report

Add a post-migration validation step that checks INDEX files:

```typescript
/**
 * Validate all INDEX files have correct links
 */
async function validateIndexFiles(docsDir: string): Promise<ValidationReport> {
  const updater = new IndexUpdater([]);
  const indexFiles = await updater.findIndexFiles(docsDir);

  const report: ValidationReport = {
    totalIndexFiles: indexFiles.length,
    filesWithBrokenLinks: [],
    totalBrokenLinks: 0,
  };

  for (const indexFile of indexFiles) {
    const brokenLinks = await updater.detectBrokenLinks(indexFile);

    if (brokenLinks.length > 0) {
      report.filesWithBrokenLinks.push({
        file: path.relative(docsDir, indexFile),
        brokenLinks,
      });
      report.totalBrokenLinks += brokenLinks.length;
    }
  }

  return report;
}
```

#### 4.3 Integration with Migration Stage

Update `MigrationStage.execute()` to include index updates:

```typescript
// After all migrations complete
logger.info('Updating INDEX files...');
const indexUpdater = new IndexUpdater(results);
const indexResult = await indexUpdater.updateAllIndexes(this.config.docsDir);

logger.info(`Updated ${indexResult.updated.length} INDEX files`);

if (indexResult.errors.length > 0) {
  logger.warn(`Failed to update ${indexResult.errors.length} INDEX files:`);
  for (const error of indexResult.errors) {
    logger.warn(`  • ${error.file}: ${error.error}`);
  }
}

// Validate INDEX files
const validation = await validateIndexFiles(this.config.docsDir);
if (validation.filesWithBrokenLinks.length > 0) {
  logger.warn(`Found ${validation.totalBrokenLinks} broken links in INDEX files:`);
  for (const file of validation.filesWithBrokenLinks) {
    logger.warn(`  • ${file.file}: ${file.brokenLinks.length} broken links`);
  }
}
```

### 5. Migration Stage Enhancements

#### 5.1 Pre-Migration Validation

**File**: `packages/pkf-init/src/stages/migration.ts`

Add comprehensive pre-flight checks:

```typescript
/**
 * Run pre-migration validation checks
 */
private async preMigrationValidation(
  blueprint: string,
  schemasYaml: string
): Promise<ValidationResult> {
  const checks = [
    this.validateSchemaMapping(blueprint, schemasYaml),
    this.validateTargetPaths(blueprint),
    this.validateDiskSpace(),
    this.validateBackupDirectory(),
    this.validateFilePermissions(),
  ];

  const results = await Promise.all(checks);

  const errors = results.flatMap(r => r.errors);
  const warnings = results.flatMap(r => r.warnings);

  if (errors.length > 0) {
    this.ui.log('❌ Pre-migration validation failed:');
    errors.forEach(e => this.ui.log(`  • ${e}`));
    return { valid: false, errors, warnings };
  }

  if (warnings.length > 0) {
    this.ui.log('⚠️  Pre-migration warnings:');
    warnings.forEach(w => this.ui.log(`  • ${w}`));
  }

  return { valid: true, errors: [], warnings };
}
```

#### 4.2 Enhanced Cleanup

**File**: `packages/pkf-init/src/utils/cleanup.ts`

Improve empty directory removal:

```typescript
/**
 * Recursively remove empty directories
 * More aggressive than current implementation
 */
export async function removeEmptyDirectories(
  rootDir: string,
  options: {
    dryRun?: boolean;
    excludePatterns?: RegExp[];
    maxDepth?: number;
  } = {}
): Promise<{ removed: string[]; skipped: string[] }> {
  const removed: string[] = [];
  const skipped: string[] = [];

  const removeEmptyDirs = async (dir: string, depth: number = 0): Promise<boolean> => {
    if (options.maxDepth && depth > options.maxDepth) {
      return false;
    }

    // Check exclude patterns
    if (options.excludePatterns?.some(p => p.test(dir))) {
      skipped.push(dir);
      return false;
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });

    // Recursively process subdirectories
    let hasContent = false;
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subdirPath = path.join(dir, entry.name);
        const subdirHasContent = await removeEmptyDirs(subdirPath, depth + 1);
        hasContent = hasContent || subdirHasContent;
      } else {
        hasContent = true; // Has files
      }
    }

    // Remove if empty
    if (!hasContent) {
      if (options.dryRun) {
        removed.push(dir);
      } else {
        await fs.rmdir(dir);
        removed.push(dir);
        logger.debug(`Removed empty directory: ${dir}`);
      }
      return false; // Directory was removed, parent should check if it's empty too
    }

    return true; // Directory has content
  };

  await removeEmptyDirs(rootDir);

  return { removed, skipped };
}
```

Run this recursively multiple times until no more empty directories found.

### 5. Testing & Quality Assurance

#### 5.1 Integration Tests

**File**: `packages/pkf-init/tests/integration/type-mapping.test.ts`

Add comprehensive test coverage:

```typescript
describe('Type-to-Schema Mapping', () => {
  it('should map all common document types to schemas', () => {
    const types = [
      'readme', 'guide-user', 'guide-developer', 'api-reference',
      'architecture', 'adr', 'changelog', 'template', 'example'
    ];

    for (const type of types) {
      const schemaName = getSchemaForDocType(type);
      expect(schemaName).toBeTruthy();
      expect(['base-doc', 'guide', 'spec', 'adr', 'register', 'proposal'])
        .toContain(schemaName);
    }
  });

  it('should handle type variations and normalize them', () => {
    expect(getSchemaForDocType('user-guide')).toBe('guide');
    expect(getSchemaForDocType('guide-user')).toBe('guide');
    expect(getSchemaForDocType('api-doc')).toBe('spec');
    expect(getSchemaForDocType('api-reference')).toBe('spec');
  });

  it('should fall back to base-doc for unknown types', () => {
    expect(getSchemaForDocType('unknown-type')).toBe('base-doc');
    expect(getSchemaForDocType('custom')).toBe('base-doc');
  });
});
```

#### 5.2 Schema Design Stage Tests

**File**: `packages/pkf-init/tests/integration/schema-design.test.ts`

```typescript
describe('Schema Design Stage', () => {
  it('should validate all blueprint types have schema mappings', async () => {
    const blueprint = createTestBlueprint({
      documents: [
        { type: 'readme', path: 'README.md' },
        { type: 'guide-user', path: 'docs/guide.md' },
        { type: 'unknown-custom-type', path: 'docs/custom.md' },
      ]
    });

    const validation = await validateSchemaMapping(blueprint, baseSchemaYaml);

    expect(validation.valid).toBe(true);
    // unknown-custom-type should fall back to base-doc
  });

  it('should detect missing schemas and fail gracefully', async () => {
    const blueprint = createTestBlueprint({
      documents: [
        { type: 'custom-type-needing-schema', path: 'docs/custom.md' },
      ]
    });

    const incompleteSchemasYaml = `
version: "1.0"
schemas:
  guide: { ... }
    `;

    const validation = await validateSchemaMapping(blueprint, incompleteSchemasYaml);

    // Should still pass because custom-type-needing-schema maps to base-doc
    // But if base-doc is missing, it should fail
  });
});
```

#### 5.3 End-to-End Migration Test

**File**: `packages/pkf-init/tests/integration/full-migration.test.ts`

Test complete workflow with various document type combinations.

### 6. Documentation Enhancements

#### 6.1 Troubleshooting Guide

**File**: `docs/guides/troubleshooting.md`

Create comprehensive troubleshooting guide:

```markdown
# PKF Init Troubleshooting

## Schema Mapping Errors

**Error**: `No schema found for document type: readme`

**Cause**: Document type in blueprint doesn't match any schema name.

**Solution**:
1. Check `DOC_TYPE_TO_SCHEMA` mapping in `src/utils/type-mapping.ts`
2. Verify the schema exists in `schemas.yaml`
3. Types are mapped as follows:
   - `readme` → `base-doc`
   - `guide-user`, `guide-developer` → `guide`
   - `api-reference` → `spec`
   - `changelog` → `register`

**Prevention**: Run schema validation before migration starts.

## Agent Conversation Failures

**Error**: `Agent documentation-analyst-init failed: ...`

**Debugging**:
1. Check agent output in debug logs (`.pkf-debug-*.txt`)
2. Verify agent definition exists in `agents/` directory
3. Check API credentials and rate limits
4. Review agent instructions for correctness

**Common causes**:
- API timeout or rate limiting
- Invalid agent configuration
- Missing tools in agent definition
- Incorrect prompt format
```

#### 6.2 Schema Design Best Practices

**File**: `docs/guides/schema-design-guide.md`

Document the schema design process and common patterns.

### 7. Self-Healing Mechanisms

#### 7.1 Automatic Type Correction

Add fuzzy matching for common type variations:

```typescript
/**
 * Suggest corrections for non-standard type names
 */
export function suggestTypeCorrection(type: string): {
  suggestion?: string;
  confidence: number;
} {
  const suggestions: Record<string, string> = {
    'user-guide': 'guide-user',
    'developer-guide': 'guide-developer',
    'dev-guide': 'guide-developer',
    'api-doc': 'api-reference',
    'api-docs': 'api-reference',
    'decision': 'adr',
    'decision-record': 'adr',
  };

  const normalized = type.toLowerCase().replace(/[_\s]+/g, '-');

  if (suggestions[normalized]) {
    return { suggestion: suggestions[normalized], confidence: 1.0 };
  }

  // Fuzzy matching for typos
  // ... implement Levenshtein distance or similar

  return { confidence: 0 };
}
```

#### 7.2 Schema Auto-Generation

If a document type has no schema mapping, offer to generate one:

```typescript
/**
 * Generate a basic schema for an unknown document type
 */
function generateSchemaForType(docType: string): string {
  return `
  ${docType}:
    _extends: base-doc
    _description: "Auto-generated schema for ${docType} documents"
    properties:
      # Add custom properties as needed
  `;
}
```

### 8. Monitoring & Metrics

#### 8.1 Migration Statistics

Enhance reporting to show:
- Types encountered vs types with schemas
- Success rate per document type
- Common failure patterns
- Performance metrics (time per document type)

```typescript
interface MigrationStatistics {
  documentTypes: Map<string, {
    total: number;
    succeeded: number;
    failed: number;
    avgTime: number;
    errors: string[];
  }>;
  schemaUsage: Map<string, number>;
  unmappedTypes: string[];
}
```

#### 8.2 Health Check Command

Add `pkf-init --health-check` command:
- Validates agent definitions
- Checks schema completeness
- Tests API connectivity
- Verifies directory structure

## Implementation Plan

### Phase 1: Critical Fixes (Week 1)
- [x] Type-to-schema mapping (COMPLETED)
- [x] Error logging improvements (COMPLETED)
- [ ] Index file updater utility
- [ ] Pre-migration validation
- [ ] Schema mapping validation

### Phase 2: Testing & Documentation (Week 2)
- [ ] Integration tests for type mapping
- [ ] Schema design stage tests
- [ ] Troubleshooting guide
- [ ] Schema design best practices

### Phase 3: Self-Healing (Week 3)
- [ ] Type correction suggestions
- [ ] Auto-generated schemas
- [ ] Enhanced cleanup
- [ ] Fuzzy matching

### Phase 4: Monitoring (Week 4)
- [ ] Migration statistics
- [ ] Health check command
- [ ] Performance metrics
- [ ] Agent output validation

## Success Criteria

1. **Zero schema mapping errors** - All standard document types map to schemas
2. **Visible errors** - Agent failures show clear error messages with context
3. **Clean migrations** - No empty directories or orphaned files remain
4. **Updated navigation** - INDEX files and READMEs have correct links after migration
5. **Early detection** - Problems caught in analysis/design stages, not migration
6. **Self-documenting** - Clear error messages guide users to solutions
7. **Zero broken links** - All internal documentation links remain valid

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes to agent protocols | High | Maintain backward compatibility, version agent definitions |
| Performance impact from validation | Medium | Make validation optional with `--skip-validation` flag |
| False positives in type suggestions | Low | Use confidence scores, require user confirmation |

## Alternatives Considered

### 1. Strict Type Enforcement

**Rejected**: Too rigid, doesn't account for project-specific types.

**Better**: Flexible mapping with fallback to base-doc.

### 2. AI-Generated Schema Completion

**Deferred**: Requires LLM call for each unknown type, increases cost.

**Better**: Start with comprehensive manual mapping, add AI as enhancement.

### 3. Post-Migration Cleanup as Separate Command

**Rejected**: Should be part of migration to ensure consistency.

**Better**: Enhanced cleanup as part of migration with retry logic.

## References

- [PKF Specification](../framework/specifications/PKF-SPECIFICATION.md)
- [Type Mapping Utility](../../packages/pkf-init/src/utils/type-mapping.ts)
- [Schema Design Stage](../../packages/pkf-init/src/stages/schema-design.ts)

## Changelog

- 2026-01-02: Initial proposal draft
