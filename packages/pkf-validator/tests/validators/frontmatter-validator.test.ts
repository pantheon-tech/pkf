/**
 * Tests for the Frontmatter Validator
 *
 * Tests validation of YAML frontmatter blocks in markdown files against JSON schemas.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  extractFrontmatter,
  validateFrontmatter,
  validateFrontmatterContent,
  validateMultipleFrontmatter,
  createFrontmatterSchema,
} from '../../src/validators/index.js';

const testDir = join(tmpdir(), 'pkf-frontmatter-test-' + Date.now());
const fixturesDir = join(__dirname, '..', 'fixtures');
let markdownWithFrontmatter: string;

beforeAll(async () => {
  await mkdir(testDir, { recursive: true });
  markdownWithFrontmatter = await readFile(
    join(fixturesDir, 'markdown-with-frontmatter.md'),
    'utf-8'
  );
});

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('extractFrontmatter', () => {
  describe('Standard --- delimited frontmatter', () => {
    it('should extract frontmatter with --- delimiters', () => {
      const content = `---
title: Test Document
version: 1.0.0
---

# Document Content
`;
      const result = extractFrontmatter(content);

      expect(result.type).toBe('standard');
      expect(result.data).not.toBeNull();
      expect(result.data?.title).toBe('Test Document');
      expect(result.data?.version).toBe('1.0.0');
      expect(result.line).toBe(2);
    });

    it('should handle complex YAML structures', () => {
      const content = `---
title: Test
tags:
  - tag1
  - tag2
metadata:
  author: John
  date: 2025-01-15
---

Content here.
`;
      const result = extractFrontmatter(content);

      expect(result.data).not.toBeNull();
      expect(result.data?.tags).toEqual(['tag1', 'tag2']);
      expect(result.data?.metadata).toEqual({ author: 'John', date: '2025-01-15' });
    });

    it('should return empty object for empty frontmatter', () => {
      const content = `---
---

Content here.
`;
      const result = extractFrontmatter(content);

      expect(result.type).toBe('standard');
      expect(result.data).toEqual({});
    });

    it('should return null data for unclosed frontmatter', () => {
      const content = `---
title: Unclosed
no closing delimiter
`;
      const result = extractFrontmatter(content);

      expect(result.type).toBe('none');
      expect(result.data).toBeNull();
    });

    it('should handle frontmatter with special characters', () => {
      const content = `---
title: "Title with: colons"
description: "Has 'quotes' and \\"escaped\\""
---

Content.
`;
      const result = extractFrontmatter(content);

      expect(result.data?.title).toBe('Title with: colons');
    });
  });

  describe('YAML code block frontmatter', () => {
    it('should extract frontmatter from ```yaml code block', () => {
      const content = `\`\`\`yaml
title: Test Document
version: 1.0.0
\`\`\`

# Document Content
`;
      const result = extractFrontmatter(content);

      expect(result.type).toBe('codeblock');
      expect(result.data).not.toBeNull();
      expect(result.data?.title).toBe('Test Document');
      expect(result.data?.version).toBe('1.0.0');
    });

    it('should extract frontmatter from ```yml code block', () => {
      const content = `\`\`\`yml
type: todo-item
status: pending
\`\`\`

Content here.
`;
      const result = extractFrontmatter(content);

      expect(result.type).toBe('codeblock');
      expect(result.data?.type).toBe('todo-item');
      expect(result.data?.status).toBe('pending');
    });

    it('should handle empty lines before code block', () => {
      const content = `

\`\`\`yaml
title: Test
\`\`\`

Content.
`;
      const result = extractFrontmatter(content);

      expect(result.type).toBe('codeblock');
      expect(result.data?.title).toBe('Test');
    });

    it('should return null for unclosed code block', () => {
      const content = `\`\`\`yaml
title: Unclosed
`;
      const result = extractFrontmatter(content);

      expect(result.type).toBe('none');
      expect(result.data).toBeNull();
    });
  });

  describe('No frontmatter', () => {
    it('should return type none when no frontmatter found', () => {
      const content = `# Just a heading

Some content without frontmatter.
`;
      const result = extractFrontmatter(content);

      expect(result.type).toBe('none');
      expect(result.data).toBeNull();
      expect(result.raw).toBeNull();
    });

    it('should not treat mid-document code blocks as frontmatter', () => {
      const content = `# Document Title

Some intro text.

\`\`\`yaml
key: value
\`\`\`

More text.
`;
      const result = extractFrontmatter(content);

      // Code block is not at start, so no frontmatter
      expect(result.type).toBe('none');
      expect(result.data).toBeNull();
    });

    it('should not treat mid-document --- as frontmatter', () => {
      const content = `# Document Title

Some text here.

---

More text after separator.
`;
      const result = extractFrontmatter(content);

      expect(result.type).toBe('none');
      expect(result.data).toBeNull();
    });
  });

  describe('Invalid YAML handling', () => {
    it('should return type none when YAML parsing fails', () => {
      // Use YAML that will definitely fail to parse
      const content = `---
key: {unclosed
---

Content.
`;
      const result = extractFrontmatter(content);

      // When YAML parsing fails, the implementation returns type 'none'
      // because data is null and the condition in extractFrontmatter
      // only returns standardResult if data is not null
      expect(result.type).toBe('none');
      expect(result.data).toBeNull();
    });
  });

  describe('Fixture file parsing', () => {
    it('should extract frontmatter from the fixture file', () => {
      const result = extractFrontmatter(markdownWithFrontmatter);

      expect(result.type).toBe('standard');
      expect(result.data).not.toBeNull();
      expect(result.data?.type).toBe('todo-item');
      expect(result.data?.title).toBe('Implement new feature');
      expect(result.data?.version).toBe('1.0.0');
      expect(result.data?.status).toBe('active');
      expect(result.data?.tags).toEqual(['feature', 'backend']);
    });
  });
});

describe('validateFrontmatterContent', () => {
  it('should validate frontmatter against a schema', () => {
    const content = `---
type: document
title: Test
---

Content.
`;
    const schema = {
      type: 'object',
      required: ['type', 'title'],
      properties: {
        type: { type: 'string' },
        title: { type: 'string' },
      },
    };

    const result = validateFrontmatterContent(content, schema);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return errors for missing required fields', () => {
    const content = `---
title: Test
---

Content.
`;
    const schema = {
      type: 'object',
      required: ['type', 'title'],
      properties: {
        type: { type: 'string' },
        title: { type: 'string' },
      },
    };

    const result = validateFrontmatterContent(content, schema);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'REQUIRED_FIELD')).toBe(true);
  });

  it('should return errors for invalid type', () => {
    const content = `---
type: 123
title: Test
---

Content.
`;
    const schema = {
      type: 'object',
      properties: {
        type: { type: 'string' },
        title: { type: 'string' },
      },
    };

    const result = validateFrontmatterContent(content, schema);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_TYPE')).toBe(true);
  });

  it('should return warning when no frontmatter found', () => {
    const content = `# Just content

No frontmatter here.
`;
    const schema = {
      type: 'object',
      properties: {},
    };

    const result = validateFrontmatterContent(content, schema);

    expect(result.valid).toBe(true); // No errors, just warning
    expect(result.warnings.some(w => w.code === 'NO_FRONTMATTER')).toBe(true);
  });

  it('should return warning when invalid YAML syntax results in no frontmatter', () => {
    // Use YAML that will definitely fail to parse
    const content = `---
key: {unclosed
---

Content.
`;
    const schema = { type: 'object' };

    const result = validateFrontmatterContent(content, schema);

    // When YAML parsing fails, no frontmatter is detected (type is 'none')
    // so it's treated as "no frontmatter found" which is a warning, not an error
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.code === 'NO_FRONTMATTER')).toBe(true);
  });
});

describe('validateFrontmatter (file-based)', () => {
  it('should return error for non-existent file', async () => {
    const result = await validateFrontmatter('/nonexistent/file.md');

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'FILE_NOT_FOUND')).toBe(true);
  });

  it('should validate frontmatter from fixture file', async () => {
    const filePath = join(fixturesDir, 'markdown-with-frontmatter.md');
    const schema = createFrontmatterSchema('todo-item', ['type', 'title']);

    const result = await validateFrontmatter(filePath, { schema });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.info.some(i => i.code === 'FRONTMATTER_FOUND')).toBe(true);
  });

  it('should validate with inline schema', async () => {
    const filePath = join(testDir, 'inline-schema.md');
    await writeFile(filePath, `---
type: note
title: My Note
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      schema: {
        type: 'object',
        required: ['type', 'title'],
        properties: {
          type: { type: 'string' },
          title: { type: 'string', minLength: 1 },
        },
      },
    });

    expect(result.valid).toBe(true);
  });

  it('should check required fields option', async () => {
    const filePath = join(testDir, 'required-fields.md');
    await writeFile(filePath, `---
title: Test
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      requiredFields: ['type', 'version'],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.filter(e => e.code === 'REQUIRED_FIELD_MISSING')).toHaveLength(2);
  });

  it('should validate expected type', async () => {
    const filePath = join(testDir, 'expected-type.md');
    await writeFile(filePath, `---
type: wrong-type
title: Test
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      expectedType: 'correct-type',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'TYPE_MISMATCH')).toBe(true);
  });

  it('should error when expected type is missing', async () => {
    const filePath = join(testDir, 'missing-type.md');
    await writeFile(filePath, `---
title: Test
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      expectedType: 'some-type',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'TYPE_MISSING')).toBe(true);
  });

  it('should load schema from file path', async () => {
    // Create a schema file
    const schemaPath = join(testDir, 'test-schema.json');
    await writeFile(schemaPath, JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
      },
    }));

    const filePath = join(testDir, 'with-schema-path.md');
    await writeFile(filePath, `---
title: Test
---

Content.
`);

    const result = await validateFrontmatter(filePath, { schemaPath });

    expect(result.valid).toBe(true);
  });

  it('should error when schema file not found', async () => {
    const filePath = join(testDir, 'schema-not-found.md');
    await writeFile(filePath, `---
title: Test
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      schemaPath: '/nonexistent/schema.json',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'SCHEMA_NOT_FOUND')).toBe(true);
  });
});

describe('Common Field Validation', () => {
  it('should validate version format (SemVer)', async () => {
    const filePath = join(testDir, 'invalid-version.md');
    await writeFile(filePath, `---
title: Test
version: invalid-version
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      validateCommonFields: true,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_VERSION')).toBe(true);
  });

  it('should validate date format (YYYY-MM-DD)', async () => {
    const filePath = join(testDir, 'invalid-date.md');
    await writeFile(filePath, `---
title: Test
created: 2025/01/15
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      validateCommonFields: true,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e =>
      e.code === 'INVALID_FIELD_FORMAT' || e.code === 'INVALID_DATE'
    )).toBe(true);
  });

  it('should validate date is actually valid', async () => {
    const filePath = join(testDir, 'invalid-date-value.md');
    await writeFile(filePath, `---
title: Test
created: 2025-02-30
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      validateCommonFields: true,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_DATE')).toBe(true);
  });

  it('should warn when updated date is before created date', async () => {
    const filePath = join(testDir, 'date-order.md');
    await writeFile(filePath, `---
title: Test
created: 2025-01-20
updated: 2025-01-15
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      validateCommonFields: true,
      includeWarnings: true,
    });

    expect(result.warnings.some(w => w.code === 'DATE_ORDER_WARNING')).toBe(true);
  });

  it('should warn about empty important string fields', async () => {
    const filePath = join(testDir, 'empty-fields.md');
    await writeFile(filePath, `---
title: ""
description: ""
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      validateCommonFields: true,
      includeWarnings: true,
    });

    expect(result.warnings.some(w => w.code === 'EMPTY_FIELD')).toBe(true);
  });

  it('should warn about empty arrays', async () => {
    const filePath = join(testDir, 'empty-arrays.md');
    await writeFile(filePath, `---
title: Test
tags: []
labels: []
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      validateCommonFields: true,
      includeWarnings: true,
    });

    expect(result.warnings.filter(w => w.code === 'EMPTY_ARRAY').length).toBeGreaterThanOrEqual(1);
  });

  it('should warn about unknown status enum values', async () => {
    const filePath = join(testDir, 'unknown-status.md');
    await writeFile(filePath, `---
title: Test
status: unknown-status
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      validateCommonFields: true,
      includeWarnings: true,
    });

    expect(result.warnings.some(w => w.code === 'UNKNOWN_ENUM_VALUE')).toBe(true);
  });

  it('should validate field types', async () => {
    const filePath = join(testDir, 'invalid-field-type.md');
    await writeFile(filePath, `---
title: 123
tags: "not-an-array"
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      validateCommonFields: true,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_FIELD_TYPE')).toBe(true);
  });
});

describe('validateMultipleFrontmatter', () => {
  it('should validate multiple files', async () => {
    const file1 = join(testDir, 'multi1.md');
    const file2 = join(testDir, 'multi2.md');
    const file3 = join(testDir, 'multi3.md');

    await writeFile(file1, `---
type: doc
title: Doc 1
---
Content 1.
`);
    await writeFile(file2, `---
type: doc
title: Doc 2
---
Content 2.
`);
    await writeFile(file3, `---
type: doc
title: Doc 3
---
Content 3.
`);

    const result = await validateMultipleFrontmatter([file1, file2, file3], {
      schema: {
        type: 'object',
        required: ['type', 'title'],
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.itemCount).toBe(3);
  });

  it('should aggregate errors from multiple files', async () => {
    const file1 = join(testDir, 'error1.md');
    const file2 = join(testDir, 'error2.md');

    await writeFile(file1, `---
title: Missing type
---
Content.
`);
    await writeFile(file2, `---
type: doc
---
Content.
`);

    const result = await validateMultipleFrontmatter([file1, file2], {
      schema: {
        type: 'object',
        required: ['type', 'title'],
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(2); // One error from each file
  });
});

describe('createFrontmatterSchema', () => {
  it('should create a schema for a document type', () => {
    const schema = createFrontmatterSchema('todo-item', ['type', 'title', 'status']);

    expect(schema).toHaveProperty('$schema', 'http://json-schema.org/draft-07/schema#');
    expect(schema).toHaveProperty('$id', 'pkf-frontmatter-todo-item.schema.json');
    expect(schema).toHaveProperty('type', 'object');

    const schemaObj = schema as {
      required?: string[];
      properties?: Record<string, { const?: string }>;
    };
    expect(schemaObj.required).toContain('type');
    expect(schemaObj.required).toContain('title');
    expect(schemaObj.required).toContain('status');
    expect(schemaObj.properties?.type?.const).toBe('todo-item');
  });

  it('should include common properties', () => {
    const schema = createFrontmatterSchema('document') as {
      properties?: Record<string, unknown>;
    };

    expect(schema.properties).toHaveProperty('type');
    expect(schema.properties).toHaveProperty('title');
    expect(schema.properties).toHaveProperty('version');
    expect(schema.properties).toHaveProperty('status');
    expect(schema.properties).toHaveProperty('date');
    expect(schema.properties).toHaveProperty('created');
    expect(schema.properties).toHaveProperty('updated');
    expect(schema.properties).toHaveProperty('author');
    expect(schema.properties).toHaveProperty('authors');
    expect(schema.properties).toHaveProperty('description');
    expect(schema.properties).toHaveProperty('tags');
  });

  it('should allow additional properties', () => {
    const schema = createFrontmatterSchema('custom', ['type'], {
      customField: { type: 'string', description: 'A custom field' },
    }) as {
      properties?: Record<string, unknown>;
      additionalProperties?: boolean;
    };

    expect(schema.properties).toHaveProperty('customField');
    expect(schema.additionalProperties).toBe(true);
  });
});

describe('Multiple frontmatter blocks handling', () => {
  it('should only extract the first frontmatter block (standard)', () => {
    const content = `---
type: first
title: First Block
---

# Content

---
type: second
title: Second Block
---

More content.
`;
    const result = extractFrontmatter(content);

    expect(result.type).toBe('standard');
    expect(result.data?.type).toBe('first');
    expect(result.data?.title).toBe('First Block');
  });

  it('should not confuse horizontal rules with frontmatter delimiters', () => {
    const content = `---
type: document
title: Test
---

# Section 1

---

# Section 2

More content.
`;
    const result = extractFrontmatter(content);

    expect(result.type).toBe('standard');
    expect(result.data?.type).toBe('document');
  });
});

describe('Edge cases', () => {
  it('should handle frontmatter with only whitespace content', async () => {
    const filePath = join(testDir, 'whitespace-only.md');
    await writeFile(filePath, `---

---

Content.
`);

    const result = await validateFrontmatter(filePath);
    // Empty frontmatter is valid, just warns about no frontmatter data
    expect(result.valid).toBe(true);
  });

  it('should handle files with only frontmatter', async () => {
    const filePath = join(testDir, 'only-frontmatter.md');
    await writeFile(filePath, `---
type: test
title: Only Frontmatter
---
`);

    const result = await validateFrontmatter(filePath, {
      schema: {
        type: 'object',
        required: ['type', 'title'],
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
        },
      },
    });

    expect(result.valid).toBe(true);
  });

  it('should handle boolean values in frontmatter', async () => {
    const filePath = join(testDir, 'boolean-values.md');
    await writeFile(filePath, `---
type: test
title: Boolean Test
published: true
draft: false
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      schema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
          published: { type: 'boolean' },
          draft: { type: 'boolean' },
        },
      },
    });

    expect(result.valid).toBe(true);
  });

  it('should handle numeric values in frontmatter', async () => {
    const filePath = join(testDir, 'numeric-values.md');
    await writeFile(filePath, `---
type: test
title: Numeric Test
count: 42
rating: 4.5
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      schema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
          count: { type: 'number' },
          rating: { type: 'number' },
        },
      },
    });

    expect(result.valid).toBe(true);
  });

  it('should handle nested objects in frontmatter', async () => {
    const filePath = join(testDir, 'nested-objects.md');
    await writeFile(filePath, `---
type: test
title: Nested Test
metadata:
  created_by: John
  version: 1.0.0
---

Content.
`);

    const result = await validateFrontmatter(filePath, {
      schema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
          metadata: {
            type: 'object',
            properties: {
              created_by: { type: 'string' },
              version: { type: 'string' },
            },
          },
        },
      },
    });

    expect(result.valid).toBe(true);
  });

  it('should handle null values in frontmatter', async () => {
    const filePath = join(testDir, 'null-values.md');
    await writeFile(filePath, `---
type: test
title: Null Test
optional: ~
---

Content.
`);

    const result = extractFrontmatter(await readFile(filePath, 'utf-8'));

    expect(result.data?.optional).toBeNull();
  });

  it('should handle multiline strings in frontmatter', async () => {
    const filePath = join(testDir, 'multiline-strings.md');
    await writeFile(filePath, `---
type: test
title: Multiline Test
description: |
  This is a multiline
  description that spans
  multiple lines.
---

Content.
`);

    const result = extractFrontmatter(await readFile(filePath, 'utf-8'));

    expect(result.data?.description).toContain('multiline');
    expect(result.data?.description).toContain('\n');
  });
});
