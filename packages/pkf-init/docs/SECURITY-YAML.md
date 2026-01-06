# Secure YAML Parsing

## Overview

As of version 1.0.1, pkf-init has implemented secure YAML parsing throughout the codebase to prevent potential code execution vulnerabilities. All YAML operations now use the `JSON_SCHEMA` mode from js-yaml, which only supports JSON-compatible types and blocks dangerous constructors.

## Security Improvement

### Before

```typescript
import * as yaml from 'js-yaml';

// Unsafe - allows arbitrary code execution
const data = yaml.load(untrustedInput);
```

### After

```typescript
import { safeLoad } from '../utils/yaml.js';

// Safe - prevents code execution
const data = safeLoad(untrustedInput);
```

## What Was Changed

### New Utility Module

Created `/packages/pkf-init/src/utils/yaml.ts` with two main functions:

- **`safeLoad(content: string): unknown`** - Safely parse YAML using JSON schema
- **`safeDump(data: unknown, options?): string`** - Safely serialize to YAML using JSON schema

### Updated Files

All YAML operations across the codebase were migrated to use the safe utilities:

**Source Files:**
- `src/generators/structure.ts` - 2 instances
- `src/generators/config.ts` - 2 instances (load + dump)
- `src/migration/planner.ts` - 1 instance
- `src/migration/worker.ts` - 5 instances (3 loads + 2 dumps)
- `src/utils/blueprint-summary.ts` - 1 instance
- `src/stages/analysis.ts` - 2 instances
- `src/config/pkf-config.ts` - 1 instance

**Test Files:**
- `tests/generators/config.test.ts` - 12 instances
- `tests/generators/registers.test.ts` - 1 instance
- `tests/integration/phase3.test.ts` - 7 instances

## Attack Vectors Prevented

The implementation prevents several types of YAML-based attacks:

### 1. Code Execution via `!!js/function`

```yaml
# This attack is now prevented
malicious: !!js/function >
  function() {
    require('child_process').exec('rm -rf /');
  }
```

### 2. Code Execution via `!!js/undefined`

```yaml
# This attack is now prevented
exploit: !!js/undefined ''
```

### 3. Arbitrary Object Construction

```yaml
# This attack is now prevented
evil: !<tag:yaml.org,2002:js/function> >
  function() { /* malicious code */ }
```

## Testing

Created comprehensive security tests in `tests/utils/yaml.test.ts` with 21 test cases:

- Valid YAML parsing (objects, arrays, nested structures)
- Prevention of `!!js/function` code execution
- Prevention of `!!js/undefined` attacks
- Prevention of arbitrary object construction
- Malformed YAML handling
- Round-trip serialization
- Real-world PKF configuration examples

All tests pass, verifying that:
1. Malicious YAML is rejected with errors
2. Safe YAML continues to work correctly
3. No functionality is lost

## Developer Guidelines

### When Adding YAML Operations

Always use the safe utilities:

```typescript
// DO: Use safe utilities
import { safeLoad, safeDump } from '../utils/yaml.js';

const config = safeLoad(yamlString);
const output = safeDump(configObject);

// DON'T: Use js-yaml directly
import * as yaml from 'js-yaml';
const config = yaml.load(yamlString); // Unsafe!
```

### Supported YAML Features

The `JSON_SCHEMA` mode supports all standard JSON types:

- Objects/maps
- Arrays/sequences
- Strings
- Numbers (integers and floats)
- Booleans
- Null values

### Unsupported Features

The following YAML features are intentionally blocked for security:

- Custom type constructors (`!!js/function`, `!!js/undefined`, etc.)
- Arbitrary tag definitions
- JavaScript-specific types
- Binary data types (use base64 strings instead)

## Performance Impact

The security improvement has minimal performance impact:

- Same underlying js-yaml parser
- Only schema option changes
- No additional overhead
- Maintains full test suite compatibility

## References

- [js-yaml Documentation](https://github.com/nodeca/js-yaml)
- [YAML Security Best Practices](https://github.com/yaml/yaml-spec/issues/127)
- [CWE-502: Deserialization of Untrusted Data](https://cwe.mitre.org/data/definitions/502.html)

## Version History

- **1.0.1** - Initial implementation of secure YAML parsing
  - Created `utils/yaml.ts` with safe utilities
  - Migrated all YAML operations to use safe parsing
  - Added comprehensive security tests
