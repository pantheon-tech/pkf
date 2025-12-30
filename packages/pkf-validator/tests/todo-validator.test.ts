/**
 * Tests for the TODO validator
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { validateTodo } from '../src/validators/todo-validator.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'pkf-validator-test-' + Date.now());
const schemaPath = join(process.cwd(), '..', '..', 'schemas', 'todo-item.schema.json');

beforeAll(async () => {
  await mkdir(testDir, { recursive: true });
});

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('validateTodo', () => {
  it('should return error for non-existent file', async () => {
    const result = await validateTodo('/nonexistent/TODO.md');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.code).toBe('FILE_NOT_FOUND');
  });

  it('should return info when no TODO items found', async () => {
    const todoPath = join(testDir, 'empty-TODO.md');
    await writeFile(todoPath, '# TODO Register\n\nNo items here.\n');

    const result = await validateTodo(todoPath, { schemaPath });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.info).toHaveLength(1);
    expect(result.info[0]?.code).toBe('NO_TODO_ITEMS');
    expect(result.itemCount).toBe(0);
  });

  it('should validate a valid TODO item', async () => {
    const todoPath = join(testDir, 'valid-TODO.md');
    const content = `# TODO Register

### TODO-001: Test Task

\`\`\`yaml
id: TODO-001
type: todo-item
status: pending
priority: medium
created: 2025-01-15
\`\`\`
`;
    await writeFile(todoPath, content);

    const result = await validateTodo(todoPath, { schemaPath });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.itemCount).toBe(1);
  });

  it('should detect duplicate IDs', async () => {
    const todoPath = join(testDir, 'duplicate-TODO.md');
    const content = `# TODO Register

### TODO-001: First Task

\`\`\`yaml
id: TODO-001
type: todo-item
status: pending
priority: medium
created: 2025-01-15
\`\`\`

### TODO-001: Duplicate Task

\`\`\`yaml
id: TODO-001
type: todo-item
status: pending
priority: medium
created: 2025-01-16
\`\`\`
`;
    await writeFile(todoPath, content);

    const result = await validateTodo(todoPath, { schemaPath });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'DUPLICATE_ID')).toBe(true);
  });

  it('should detect invalid status values', async () => {
    const todoPath = join(testDir, 'invalid-status-TODO.md');
    const content = `# TODO Register

### TODO-001: Invalid Status

\`\`\`yaml
id: TODO-001
type: todo-item
status: invalid-status
priority: medium
created: 2025-01-15
\`\`\`
`;
    await writeFile(todoPath, content);

    const result = await validateTodo(todoPath, { schemaPath });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_ENUM')).toBe(true);
  });

  it('should detect invalid date format', async () => {
    const todoPath = join(testDir, 'invalid-date-TODO.md');
    const content = `# TODO Register

### TODO-001: Invalid Date

\`\`\`yaml
id: TODO-001
type: todo-item
status: pending
priority: medium
created: 2025/01/15
\`\`\`
`;
    await writeFile(todoPath, content);

    const result = await validateTodo(todoPath, { schemaPath });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_FORMAT' || e.code === 'INVALID_DATE')).toBe(true);
  });

  it('should detect missing required fields', async () => {
    const todoPath = join(testDir, 'missing-fields-TODO.md');
    const content = `# TODO Register

### TODO-001: Missing Fields

\`\`\`yaml
id: TODO-001
status: pending
\`\`\`
`;
    await writeFile(todoPath, content);

    const result = await validateTodo(todoPath, { schemaPath });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'REQUIRED_FIELD')).toBe(true);
  });

  it('should warn about orphaned dependencies', async () => {
    const todoPath = join(testDir, 'orphaned-dep-TODO.md');
    const content = `# TODO Register

### TODO-001: Has Dependency

\`\`\`yaml
id: TODO-001
type: todo-item
status: pending
priority: medium
created: 2025-01-15
depends_on:
  - TODO-999
\`\`\`
`;
    await writeFile(todoPath, content);

    const result = await validateTodo(todoPath, { schemaPath, checkDependencies: true });
    expect(result.valid).toBe(true); // warnings don't make it invalid
    expect(result.warnings.some(w => w.code === 'ORPHANED_DEPENDENCY')).toBe(true);
  });

  it('should warn about updated date before created date', async () => {
    const todoPath = join(testDir, 'date-logic-TODO.md');
    const content = `# TODO Register

### TODO-001: Date Logic Error

\`\`\`yaml
id: TODO-001
type: todo-item
status: pending
priority: medium
created: 2025-01-20
updated: 2025-01-15
\`\`\`
`;
    await writeFile(todoPath, content);

    const result = await validateTodo(todoPath, { schemaPath, validateDates: true });
    expect(result.valid).toBe(true); // warnings don't make it invalid
    expect(result.warnings.some(w => w.code === 'DATE_LOGIC_ERROR')).toBe(true);
  });

  it('should handle YAML parse errors gracefully', async () => {
    const todoPath = join(testDir, 'yaml-error-TODO.md');
    const content = `# TODO Register

### TODO-001: YAML Error

\`\`\`yaml
id: [unterminated
\`\`\`
`;
    await writeFile(todoPath, content);

    const result = await validateTodo(todoPath, { schemaPath });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'YAML_PARSE_ERROR')).toBe(true);
  });

  it('should respect maxErrors option', async () => {
    const todoPath = join(testDir, 'max-errors-TODO.md');
    // Each TODO item here is missing required fields (type, priority, created)
    // plus has an invalid status, so each item generates multiple errors
    // With maxErrors=2, we should stop after processing enough items
    // to reach or exceed 2 errors
    const content = `# TODO Register

### TODO-001: Error 1

\`\`\`yaml
id: TODO-001
type: todo-item
status: invalid
priority: medium
created: 2025-01-15
\`\`\`

### TODO-002: Error 2

\`\`\`yaml
id: TODO-002
type: todo-item
status: invalid
priority: medium
created: 2025-01-15
\`\`\`

### TODO-003: Error 3

\`\`\`yaml
id: TODO-003
type: todo-item
status: invalid
priority: medium
created: 2025-01-15
\`\`\`
`;
    await writeFile(todoPath, content);

    // With maxErrors=2, after processing TODO-001 and TODO-002 (each has 1 error),
    // we reach the limit and should stop before processing TODO-003
    const result = await validateTodo(todoPath, { schemaPath, maxErrors: 2 });
    // We should have stopped after reaching 2 errors
    expect(result.errors.length).toBe(2);
    expect(result.warnings.some(w => w.code === 'MAX_ERRORS_REACHED')).toBe(true);
  });

  it('should validate multiple TODO items correctly', async () => {
    const todoPath = join(testDir, 'multi-TODO.md');
    const content = `# TODO Register

### TODO-001: First Task

\`\`\`yaml
id: TODO-001
type: todo-item
status: pending
priority: high
created: 2025-01-15
\`\`\`

---

### TODO-002: Second Task

\`\`\`yaml
id: TODO-002
type: todo-item
status: in-progress
priority: medium
created: 2025-01-16
depends_on:
  - TODO-001
\`\`\`

---

### TODO-003: Third Task

\`\`\`yaml
id: TODO-003
type: todo-item
status: completed
priority: low
created: 2025-01-17
updated: 2025-01-18
\`\`\`
`;
    await writeFile(todoPath, content);

    const result = await validateTodo(todoPath, { schemaPath });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.itemCount).toBe(3);
  });
});
