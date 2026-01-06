# pkf-core Stability Contract and Versioning Policy

**Package:** @pantheon-tech/pkf-core
**Current Version:** 0.1.0 (design phase)
**Status:** Pre-release
**Last Updated:** 2026-01-05

## Table of Contents

1. [Versioning Policy](#versioning-policy)
2. [API Stability Levels](#api-stability-levels)
3. [Deprecation Policy](#deprecation-policy)
4. [Breaking Changes](#breaking-changes)
5. [Compatibility Matrix](#compatibility-matrix)
6. [Migration Support](#migration-support)

---

## Versioning Policy

pkf-core follows [Semantic Versioning 2.0.0](https://semver.org/) with strict guarantees.

### Version Format: MAJOR.MINOR.PATCH

#### MAJOR Version (Breaking Changes)

Incremented when making incompatible API changes:

- **Function signature changes** (parameter types, return types)
- **Removed exports** (functions, interfaces, types)
- **Behavioral changes** that break existing code
- **Minimum runtime version** changes (Node.js, TypeScript)

**Examples:**
- Removing a public function
- Changing a function to return `Promise` instead of synchronous value
- Changing interface required fields
- Removing module subpath exports

#### MINOR Version (New Features)

Incremented when adding backwards-compatible functionality:

- **New functions** or modules
- **New optional parameters** (with defaults)
- **New fields** in result types (that consumers can ignore)
- **New subpath exports**

**Examples:**
- Adding a new module `@pantheon-tech/pkf-core/analytics`
- Adding optional `timeout` parameter to existing function
- Adding new field `estimatedDuration` to scan result

#### PATCH Version (Bug Fixes)

Incremented for backwards-compatible bug fixes:

- **Bug fixes** that don't change public API
- **Performance improvements** without API changes
- **Documentation updates**
- **Internal refactoring** with identical behavior

**Examples:**
- Fixing incorrect path resolution
- Improving YAML parsing error messages
- Optimizing schema caching logic

### Pre-release Versions

Before 1.0.0, pkf-core is in **pre-release**:

- **0.x.x versions:** API may change in MINOR versions
- **0.0.x versions:** API may change in PATCH versions (development phase)
- Breaking changes will be documented in CHANGELOG.md
- Migration guides provided for significant changes

### Post-1.0.0 Guarantees

After 1.0.0 release:

- **MAJOR version changes only** for breaking changes
- **Minimum 2 minor versions** of deprecation warnings before removal
- **Comprehensive migration guides** for all breaking changes
- **Security patches** backported to previous MAJOR version for 12 months

---

## API Stability Levels

Each exported API is marked with a stability level.

### Stable

**Guarantee:** Will not change without MAJOR version bump

**Marking:** No special annotation (default for documented APIs)

**Applies to:**
- All core modules (type-mapper, schema, templates, frontmatter, scanner)
- All documented types and interfaces
- All exported functions in public API reference

**Example:**
```typescript
/**
 * Detect document type from file path
 *
 * @stable
 */
export function detectDocumentType(filePath: string): DocumentType;
```

### Beta

**Guarantee:** May change in MINOR versions with deprecation warnings

**Marking:** `@beta` JSDoc tag

**Applies to:**
- Newly introduced features in MINOR releases
- Experimental optimizations
- APIs under active development

**Migration Path:** Beta APIs promoted to Stable after 2 minor releases without changes

**Example:**
```typescript
/**
 * Stream documents for large repositories
 *
 * @beta This API is experimental and may change
 */
export function* streamDocuments(options: ScannerOptions): AsyncIterable<PKFDocument>;
```

### Experimental

**Guarantee:** May change without warning (not covered by semver)

**Marking:** `@experimental` JSDoc tag and separate subpath export

**Applies to:**
- Proof-of-concept features
- Performance experiments
- Research implementations

**Migration Path:** May be removed or promoted to Beta

**Example:**
```typescript
/**
 * Machine learning-based type detection
 *
 * @experimental This API is highly unstable and may be removed
 */
export function mlDetectDocumentType(content: string): DocumentType;
```

### Internal

**Guarantee:** No stability guarantee (may change at any time)

**Marking:** Not exported from package entry points

**Applies to:**
- Implementation details
- Helper functions
- Internal classes

**Note:** If you import from internal modules, you're on your own!

---

## Deprecation Policy

### Deprecation Process

1. **Announcement** in release notes and CHANGELOG
2. **JSDoc annotation** with `@deprecated` tag and migration path
3. **Runtime warning** on first use (non-intrusive)
4. **Support period** of minimum 2 minor versions
5. **Removal** in next MAJOR version

### Deprecation Example

```typescript
/**
 * Validate document against schema
 *
 * @deprecated Use validateDocument() from schema module instead.
 * This function will be removed in v2.0.0.
 *
 * Migration:
 * ```typescript
 * // Old
 * import { validate } from '@pantheon-tech/pkf-core';
 * const result = validate(doc, schema);
 *
 * // New
 * import { validateDocument } from '@pantheon-tech/pkf-core/schema';
 * const result = validateDocument(doc, schema);
 * ```
 */
export function validate(doc: PKFDocument, schema: PKFSchema): ValidationResult {
  console.warn('[pkf-core] validate() is deprecated. Use validateDocument() from schema module.');
  return validateDocument(doc, schema);
}
```

### Deprecation Timeline

| Version | Action |
|---------|--------|
| 1.3.0 | API deprecated, warning added |
| 1.4.0 | Deprecation notice continues |
| 1.5.0 | Final warning (removal in next major) |
| 2.0.0 | API removed |

### Suppressing Deprecation Warnings

```typescript
// Disable all deprecation warnings (not recommended)
process.env.PKF_CORE_NO_DEPRECATION_WARNINGS = 'true';

// Or selectively disable
process.env.PKF_CORE_SILENCE_DEPRECATIONS = 'validate,oldSchemaLoader';
```

---

## Breaking Changes

### Definition of Breaking Change

A change is **breaking** if it could cause:

1. **Compilation errors** in TypeScript code
2. **Runtime errors** in previously working code
3. **Behavioral changes** that violate documented guarantees
4. **Required migration** for existing code to continue working

### Non-Breaking Changes (Safe in MINOR versions)

- Adding new optional parameters with defaults
- Adding new fields to result types
- Adding new error codes (if error handling is generic)
- Relaxing validation rules
- Performance improvements with identical behavior
- Bug fixes that restore documented behavior

### Examples

**Breaking (requires MAJOR version):**

```typescript
// v1.0.0
export function scan(rootDir: string): Promise<ScanResult>;

// v2.0.0 - BREAKING: changed parameter type
export function scan(options: ScannerOptions): Promise<ScanResult>;
```

**Non-breaking (allowed in MINOR version):**

```typescript
// v1.0.0
export function scan(rootDir: string): Promise<ScanResult>;

// v1.1.0 - OK: added optional parameter with default
export function scan(rootDir: string, options?: ScannerOptions): Promise<ScanResult>;
```

---

## Compatibility Matrix

### pkf-init and pkf-mcp-server Compatibility

| pkf-init | pkf-mcp-server | pkf-core | Status |
|----------|----------------|----------|--------|
| 1.0.x    | N/A            | N/A      | Current (no pkf-core yet) |
| 2.0.x    | 1.0.x          | ^1.0.0   | Planned (after refactor) |
| 2.1.x    | 1.1.x          | ^1.0.0   | Compatible |
| 3.0.x    | 2.0.x          | ^2.0.0   | Future (pkf-core v2) |

### Runtime Compatibility

| pkf-core | Node.js | TypeScript | js-yaml |
|----------|---------|------------|---------|
| 0.x      | >= 18.0 | >= 5.0     | ^4.1.0  |
| 1.x      | >= 18.0 | >= 5.0     | ^4.1.0  |
| 2.x      | >= 20.0 | >= 5.3     | ^5.0.0  |

### Peer Dependency Policy

**js-yaml** is a peer dependency:

```json
{
  "peerDependencies": {
    "js-yaml": "^4.1.0"
  },
  "peerDependenciesMeta": {
    "js-yaml": {
      "optional": false
    }
  }
}
```

**Why peer dependency?**
- Consumers may already have js-yaml installed
- Prevents duplicate installations
- Allows consumers to patch if needed

---

## Migration Support

### Migration Guides

For each MAJOR version, we provide:

1. **Migration guide document** (`docs/migration/v1-to-v2.md`)
2. **Automated codemod** (where possible)
3. **Side-by-side examples** (old vs new)
4. **Timeline** for migration (suggested schedule)

### Codemod Example

```bash
# Automated migration from v1 to v2
npx @pantheon-tech/pkf-core-codemod v1-to-v2 ./src
```

### Parallel Installation

During migration, install both versions:

```json
{
  "dependencies": {
    "@pantheon-tech/pkf-core": "^2.0.0",
    "@pantheon-tech/pkf-core-v1": "npm:@pantheon-tech/pkf-core@^1.0.0"
  }
}
```

### Feature Flags

Some breaking changes may be opt-in via feature flags:

```typescript
import { createScanner } from '@pantheon-tech/pkf-core/scanner';

// v2.0.0 with v1 behavior
const scanner = createScanner({
  rootDir: '.',
  featureFlags: {
    useV1Patterns: true
  }
});
```

---

## Version Release Cadence

### Pre-1.0.0 (Current)

- **MINOR releases:** Every 2-4 weeks (as features complete)
- **PATCH releases:** As needed for critical bugs
- **MAJOR (0.x → 1.0):** When API is stable and battle-tested

### Post-1.0.0

- **MAJOR releases:** Every 12-18 months
- **MINOR releases:** Every 4-6 weeks
- **PATCH releases:** As needed (typically weekly for active fixes)

### Long-Term Support (LTS)

After 1.0.0, each MAJOR version receives:

- **Active support:** 18 months (all bug fixes and features)
- **Maintenance mode:** 12 months (security and critical bugs only)
- **End of life:** Announced 6 months in advance

Example timeline for v1.0.0 released Jan 2026:

| Period | End Date | Support Level |
|--------|----------|---------------|
| Active | Jun 2027 | Full support |
| Maintenance | Jun 2028 | Security patches only |
| EOL | Jul 2028 | No support |

---

## Semantic Versioning Exceptions

### Security Patches

Security fixes may be backported to older MINOR versions:

- v1.5.3 (current)
- v1.4.8 (security patch)
- v1.3.12 (security patch)

### Critical Bugs

Critical bugs affecting data integrity may require emergency PATCH releases with behavioral changes, documented as exceptions.

---

## Questions and Clarifications

### FAQ

**Q: Can I rely on pre-1.0.0 versions in production?**

A: Pre-1.0.0 is production-ready but API may change. Pin exact versions and review CHANGELOG before upgrading.

**Q: What if a bug fix changes behavior?**

A: If the new behavior matches documentation, it's a PATCH. If documentation was wrong, it may be MINOR (with deprecation).

**Q: Can I request a feature be backported?**

A: Features are not backported to older MAJOR versions. Security fixes and critical bugs only.

**Q: How do I report a breaking change?**

A: Open an issue with "Breaking Change" label. We'll evaluate and document appropriately.

---

## Commitment

The pkf-core team commits to:

1. ✅ **Clear communication** of all breaking changes
2. ✅ **Comprehensive documentation** for every release
3. ✅ **Migration support** for major version transitions
4. ✅ **Timely security patches** for supported versions
5. ✅ **Community feedback** incorporation in versioning decisions

---

**Related Documents:**
- [API Design](./pkf-core-api.md)
- CHANGELOG (future - not yet created)
- Migration Guides (future - not yet created)
