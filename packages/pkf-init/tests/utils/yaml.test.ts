/**
 * Tests for secure YAML parsing utilities
 * Verifies that safe parsing prevents code execution attacks
 */

import { describe, it, expect } from 'vitest';
import { safeLoad, safeDump } from '../../src/utils/yaml.js';

describe('Secure YAML utilities', () => {
  describe('safeLoad', () => {
    it('should parse valid YAML objects', () => {
      const yaml = `
name: test-project
version: 1.0.0
config:
  enabled: true
  count: 42
`;
      const result = safeLoad(yaml);
      expect(result).toEqual({
        name: 'test-project',
        version: '1.0.0',
        config: {
          enabled: true,
          count: 42,
        },
      });
    });

    it('should parse arrays', () => {
      const yaml = `
items:
  - first
  - second
  - third
`;
      const result = safeLoad(yaml) as { items: string[] };
      expect(result.items).toEqual(['first', 'second', 'third']);
    });

    it('should parse nested structures', () => {
      const yaml = `
project:
  name: my-project
  paths:
    docs: docs
    schemas: schemas
  document_types:
    readme:
      path: README.md
      required: true
`;
      const result = safeLoad(yaml) as Record<string, unknown>;
      expect(result.project).toBeDefined();
      const project = result.project as Record<string, unknown>;
      expect(project.name).toBe('my-project');
      expect(project.paths).toBeDefined();
      expect(project.document_types).toBeDefined();
    });

    it('should handle empty strings', () => {
      const result = safeLoad('');
      expect(result).toBeUndefined();
    });

    it('should handle null values', () => {
      const yaml = 'value: null';
      const result = safeLoad(yaml) as { value: null };
      expect(result.value).toBeNull();
    });

    it('should throw on malformed YAML', () => {
      const yaml = `
name: test
value: [unclosed array
`;
      expect(() => safeLoad(yaml)).toThrow();
    });

    it('should prevent code execution with !!js/function', () => {
      const maliciousYaml = `
name: test
exploit: !!js/function >
  function() { return "executed"; }
`;
      // Should throw an error when trying to use !!js/function with JSON_SCHEMA
      expect(() => safeLoad(maliciousYaml)).toThrow();
    });

    it('should prevent code execution with !!js/undefined', () => {
      const maliciousYaml = `
name: test
exploit: !!js/undefined ''
`;
      expect(() => safeLoad(maliciousYaml)).toThrow();
    });

    it('should prevent arbitrary object construction', () => {
      const maliciousYaml = `
name: test
exploit: !<tag:yaml.org,2002:js/function> >
  function exploit() { return "pwned"; }
`;
      expect(() => safeLoad(maliciousYaml)).toThrow();
    });

    it('should allow standard YAML tags that map to JSON types', () => {
      const yaml = `
string: !!str hello
number: !!int 42
float: !!float 3.14
bool: !!bool true
null_value: !!null
`;
      const result = safeLoad(yaml) as Record<string, unknown>;
      expect(result.string).toBe('hello');
      expect(result.number).toBe(42);
      expect(result.float).toBe(3.14);
      expect(result.bool).toBe(true);
      expect(result.null_value).toBeNull();
    });

    it('should handle complex real-world PKF configuration', () => {
      const yaml = `
version: 1.0.0
project:
  name: test-project
  description: A test project
paths:
  docs: docs
  registers: docs/registers
  schemas: schemas
document_types:
  readme:
    path: README.md
    required: true
  todo:
    path: docs/registers/TODO.md
    schema: todo-item.schema.json
validation:
  strict: false
  required_frontmatter:
    - title
    - type
`;
      const result = safeLoad(yaml) as Record<string, unknown>;
      expect(result.version).toBe('1.0.0');
      expect(result.project).toBeDefined();
      expect(result.document_types).toBeDefined();
      expect(result.validation).toBeDefined();
    });
  });

  describe('safeDump', () => {
    it('should dump simple objects to YAML', () => {
      const obj = {
        name: 'test',
        value: 42,
        enabled: true,
      };
      const yaml = safeDump(obj);
      expect(yaml).toContain('name: test');
      expect(yaml).toContain('value: 42');
      expect(yaml).toContain('enabled: true');
    });

    it('should dump nested objects', () => {
      const obj = {
        project: {
          name: 'my-project',
          config: {
            enabled: true,
          },
        },
      };
      const yaml = safeDump(obj);
      expect(yaml).toContain('project:');
      expect(yaml).toContain('name: my-project');
      expect(yaml).toContain('config:');
      expect(yaml).toContain('enabled: true');
    });

    it('should dump arrays', () => {
      const obj = {
        items: ['first', 'second', 'third'],
      };
      const yaml = safeDump(obj);
      expect(yaml).toContain('items:');
      expect(yaml).toContain('- first');
      expect(yaml).toContain('- second');
      expect(yaml).toContain('- third');
    });

    it('should respect indent option', () => {
      const obj = {
        parent: {
          child: 'value',
        },
      };
      const yaml = safeDump(obj, { indent: 4 });
      // Should use 4 spaces for indentation
      expect(yaml).toMatch(/parent:\n {4}child: value/);
    });

    it('should respect lineWidth option', () => {
      const obj = {
        longValue: 'This is a very long string that should be wrapped when lineWidth is set',
      };
      const yaml = safeDump(obj, { lineWidth: 40 });
      // Verify it's valid YAML by parsing it back
      const parsed = safeLoad(yaml) as { longValue: string };
      expect(parsed.longValue).toBe(obj.longValue);
    });

    it('should handle null values', () => {
      const obj = {
        value: null,
      };
      const yaml = safeDump(obj);
      expect(yaml).toContain('value: null');
    });

    it('should not produce dangerous YAML tags', () => {
      const obj = {
        name: 'test',
        config: {
          value: 42,
        },
      };
      const yaml = safeDump(obj);
      // Should not contain any !!js/ tags
      expect(yaml).not.toContain('!!js/');
      expect(yaml).not.toContain('!<tag:yaml.org,2002:js/');
    });

    it('should round-trip with safeLoad', () => {
      const original = {
        version: '1.0.0',
        project: {
          name: 'test',
          config: {
            enabled: true,
            count: 42,
          },
        },
        items: ['a', 'b', 'c'],
      };
      const yaml = safeDump(original);
      const parsed = safeLoad(yaml);
      expect(parsed).toEqual(original);
    });
  });

  describe('security integration', () => {
    it('should safely handle untrusted YAML input', () => {
      const untrustedInputs = [
        // Attempt to use function constructor
        `exploit: !!js/function "function() { return process.env; }"`,
        // Attempt to use undefined
        `exploit: !!js/undefined ''`,
        // Attempt to use regexp
        `exploit: !!js/regexp /malicious/`,
        // Attempt arbitrary tag
        `exploit: !custom/tag value`,
      ];

      for (const yaml of untrustedInputs) {
        expect(() => safeLoad(yaml)).toThrow();
      }
    });

    it('should preserve data integrity while preventing exploits', () => {
      const safeYaml = `
version: 1.0.0
data:
  user_input: "!!js/function this looks suspicious but is just a string"
  safe_value: 42
`;
      const result = safeLoad(safeYaml) as Record<string, unknown>;
      const data = result.data as Record<string, unknown>;

      // The string should be treated as a plain string, not executed
      expect(data.user_input).toBe('!!js/function this looks suspicious but is just a string');
      expect(data.safe_value).toBe(42);
    });
  });
});
