/**
 * Tests for the TODO Validator
 *
 * Tests validation of TODO.md files including:
 * - Parsing TODO items from markdown
 * - ID format validation (TODO-XXX)
 * - ID uniqueness
 * - Date validation
 * - Schema validation of frontmatter
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { validateTodo } from '../../src/validators/index.js';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'pkf-todo-validator-test-' + Date.now());
const schemaPath = join(process.cwd(), '..', '..', 'schemas', 'todo-item.schema.json');

beforeAll(async () => {
  await mkdir(testDir, { recursive: true });
});

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('validateTodo', () => {
  describe('File existence checks', () => {
    it('should return error for non-existent file', async () => {
      const result = await validateTodo('/nonexistent/TODO.md');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('FILE_NOT_FOUND');
    });

    it('should return schema not found error when schema is missing', async () => {
      const todoPath = join(testDir, 'todo-no-schema.md');
      await writeFile(todoPath, '# TODO Register\n### TODO-001: Test');

      const result = await validateTodo(todoPath, {
        schemaPath: '/nonexistent/schema.json',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'SCHEMA_NOT_FOUND')).toBe(true);
    });
  });

  describe('Empty TODO file', () => {
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

    it('should not include info when includeInfo is false', async () => {
      const todoPath = join(testDir, 'empty-no-info.md');
      await writeFile(todoPath, '# TODO Register\n\nNo items here.\n');

      const result = await validateTodo(todoPath, {
        schemaPath,
        includeInfo: false,
      });

      expect(result.info).toHaveLength(0);
    });
  });

  describe('Valid TODO items', () => {
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

    it('should validate multiple valid TODO items', async () => {
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

    it('should accept all valid status values', async () => {
      const statuses = ['pending', 'in-progress', 'blocked', 'completed', 'cancelled'];

      for (const status of statuses) {
        const todoPath = join(testDir, `status-${status}.md`);
        const content = `# TODO

### TODO-001: Status Test

\`\`\`yaml
id: TODO-001
type: todo-item
status: ${status}
priority: medium
created: 2025-01-15
\`\`\`
`;
        await writeFile(todoPath, content);

        const result = await validateTodo(todoPath, { schemaPath });
        expect(result.valid).toBe(true);
      }
    });

    it('should accept all valid priority values', async () => {
      const priorities = ['critical', 'high', 'medium', 'low'];

      for (const priority of priorities) {
        const todoPath = join(testDir, `priority-${priority}.md`);
        const content = `# TODO

### TODO-001: Priority Test

\`\`\`yaml
id: TODO-001
type: todo-item
status: pending
priority: ${priority}
created: 2025-01-15
\`\`\`
`;
        await writeFile(todoPath, content);

        const result = await validateTodo(todoPath, { schemaPath });
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('ID format validation', () => {
    it('should accept valid ID formats', async () => {
      const todoPath = join(testDir, 'valid-ids.md');
      const content = `# TODO

### TODO-001: Three digit

\`\`\`yaml
id: TODO-001
type: todo-item
status: pending
priority: medium
created: 2025-01-15
\`\`\`

### TODO-0001: Four digit

\`\`\`yaml
id: TODO-0001
type: todo-item
status: pending
priority: medium
created: 2025-01-15
\`\`\`

### TODO-12345: Five digit

\`\`\`yaml
id: TODO-12345
type: todo-item
status: pending
priority: medium
created: 2025-01-15
\`\`\`
`;
      await writeFile(todoPath, content);

      const result = await validateTodo(todoPath, { schemaPath });
      expect(result.valid).toBe(true);
    });
  });

  describe('ID uniqueness validation', () => {
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

    it('should include first occurrence line number in duplicate error', async () => {
      const todoPath = join(testDir, 'dup-line-info.md');
      const content = `# TODO

### TODO-001: First

\`\`\`yaml
id: TODO-001
type: todo-item
status: pending
priority: medium
created: 2025-01-15
\`\`\`

### TODO-001: Second

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
      const dupError = result.errors.find(e => e.code === 'DUPLICATE_ID');

      expect(dupError).toBeDefined();
      expect(dupError?.message).toContain('first seen at line');
    });
  });

  describe('Date validation', () => {
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
      expect(result.errors.some(e =>
        e.code === 'INVALID_FORMAT' || e.code === 'INVALID_DATE'
      )).toBe(true);
    });

    it('should detect semantically invalid dates', async () => {
      const todoPath = join(testDir, 'invalid-semantic-date.md');
      const content = `# TODO

### TODO-001: Invalid Semantic Date

\`\`\`yaml
id: TODO-001
type: todo-item
status: pending
priority: medium
created: 2025-02-30
\`\`\`
`;
      await writeFile(todoPath, content);

      const result = await validateTodo(todoPath, { schemaPath, validateDates: true });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_DATE')).toBe(true);
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

    it('should skip date validation when validateDates is false', async () => {
      const todoPath = join(testDir, 'skip-date-validation.md');
      const content = `# TODO

### TODO-001: Skip Date Validation

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

      const result = await validateTodo(todoPath, { schemaPath, validateDates: false });

      expect(result.warnings.filter(w => w.code === 'DATE_LOGIC_ERROR')).toHaveLength(0);
    });
  });

  describe('Schema validation', () => {
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

    it('should validate type field is "todo-item"', async () => {
      const todoPath = join(testDir, 'wrong-type.md');
      const content = `# TODO

### TODO-001: Wrong Type

\`\`\`yaml
id: TODO-001
type: wrong-type
status: pending
priority: medium
created: 2025-01-15
\`\`\`
`;
      await writeFile(todoPath, content);

      const result = await validateTodo(todoPath, { schemaPath });

      expect(result.valid).toBe(false);
    });
  });

  describe('Dependency validation', () => {
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

    it('should warn about orphaned blocks references', async () => {
      const todoPath = join(testDir, 'orphaned-blocks.md');
      const content = `# TODO

### TODO-001: Has Blocks

\`\`\`yaml
id: TODO-001
type: todo-item
status: pending
priority: medium
created: 2025-01-15
blocks:
  - TODO-999
\`\`\`
`;
      await writeFile(todoPath, content);

      const result = await validateTodo(todoPath, { schemaPath, checkDependencies: true });

      expect(result.warnings.some(w => w.code === 'ORPHANED_DEPENDENCY')).toBe(true);
    });

    it('should not warn when dependencies exist', async () => {
      const todoPath = join(testDir, 'valid-deps.md');
      const content = `# TODO

### TODO-001: First

\`\`\`yaml
id: TODO-001
type: todo-item
status: pending
priority: medium
created: 2025-01-15
\`\`\`

### TODO-002: Second

\`\`\`yaml
id: TODO-002
type: todo-item
status: pending
priority: medium
created: 2025-01-15
depends_on:
  - TODO-001
\`\`\`
`;
      await writeFile(todoPath, content);

      const result = await validateTodo(todoPath, { schemaPath, checkDependencies: true });

      expect(result.warnings.filter(w => w.code === 'ORPHANED_DEPENDENCY')).toHaveLength(0);
    });

    it('should skip dependency check when checkDependencies is false', async () => {
      const todoPath = join(testDir, 'skip-dep-check.md');
      const content = `# TODO

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

      const result = await validateTodo(todoPath, { schemaPath, checkDependencies: false });

      expect(result.warnings.filter(w => w.code === 'ORPHANED_DEPENDENCY')).toHaveLength(0);
    });
  });

  describe('YAML parsing errors', () => {
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

    it('should continue validating after YAML parse error', async () => {
      const todoPath = join(testDir, 'yaml-error-continue.md');
      const content = `# TODO

### TODO-001: YAML Error

\`\`\`yaml
id: [bad
\`\`\`

### TODO-002: Valid Item

\`\`\`yaml
id: TODO-002
type: todo-item
status: pending
priority: medium
created: 2025-01-15
\`\`\`
`;
      await writeFile(todoPath, content);

      const result = await validateTodo(todoPath, { schemaPath });

      expect(result.itemCount).toBe(2);
    });
  });

  describe('Max errors option', () => {
    it('should respect maxErrors option', async () => {
      const todoPath = join(testDir, 'max-errors-TODO.md');
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

      const result = await validateTodo(todoPath, { schemaPath, maxErrors: 2 });

      expect(result.errors.length).toBe(2);
      expect(result.warnings.some(w => w.code === 'MAX_ERRORS_REACHED')).toBe(true);
    });
  });

  describe('Duration tracking', () => {
    it('should track validation duration', async () => {
      const todoPath = join(testDir, 'duration-test.md');
      const content = `# TODO

### TODO-001: Test

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

      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Fixture file validation', () => {
    it('should validate the fixture file successfully', async () => {
      const fixturePath = join(process.cwd(), 'tests', 'fixtures', 'valid-todo.md');

      const result = await validateTodo(fixturePath, { schemaPath });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.itemCount).toBe(3);
    });
  });
});
