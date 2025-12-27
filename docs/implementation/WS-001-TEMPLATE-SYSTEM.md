# WS-001: Template System Implementation Plan

**Workstream ID:** WS-001
**Name:** Template System
**Phase:** Core Framework (Phase 1)
**Status:** Draft
**Created:** 2025-12-27
**Architecture Reference:** PKF-ARCHITECTURE.md Section 8

---

## 1. Overview

The Template System enables consistent document creation by parsing YAML template definitions and generating markdown template files with variable substitution, frontmatter injection, and structured body sections.

### 1.1 Scope

**In Scope:**
- Template definition parsing from YAML (`templates.yaml`)
- Variable system with substitution (`{id}`, `{title}`, `{date}`, etc.)
- Variable escaping with double-braces (`{{id}}` produces `{id}`)
- Frontmatter injection with required fields and defaults
- Body structure generation with headings and placeholders
- Template file generation (`.template.md` output)

**Out of Scope:**
- Schema validation (WS-002: Schema System)
- Document filing (WS-004: Filing Agent)
- Runtime document creation from templates (user responsibility)

### 1.2 Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| YAML parser | External | `yaml` package for parsing |
| Schema System | Internal | Schema references via `forSchema` |
| Zod | External | Input validation |

### 1.3 Verified APIs

**yaml (v2.x):**
```typescript
import { parse } from 'yaml';
const data = parse(yamlString);
```

**Zod (v3.x):**
```typescript
import { z } from 'zod';
const schema = z.object({ ... });
const result = schema.safeParse(input);
```

---

## 2. Task Breakdown

### WS001-T001: Template Definition Schema

**Task ID:** WS001-T001
**Name:** Template Definition Zod Schema
**Description:** Define Zod schemas for template YAML structure validation
**Dependencies:** None
**Complexity:** M (2-4 hrs)

**File Structure:**
```
src/pkf-processor/
  template/
    schema.ts           # Template definition schemas
    index.ts            # Re-exports
```

**Implementation Pattern:**
```typescript
// schema.ts
import { z } from 'zod';

/**
 * Body section definition (heading with placeholder).
 */
export const BodySectionSchema = z.object({
  heading: z.string().min(1),
  level: z.number().int().min(1).max(6).default(2),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
});

/**
 * Frontmatter configuration for templates.
 */
export const FrontmatterConfigSchema = z.object({
  required: z.array(z.string()).default([]),
  defaults: z.record(z.unknown()).default({}),
});

/**
 * Register-style template item format.
 */
export const RegisterFormatSchema = z.object({
  header: z.string(),
  itemFormat: z.string(),
});

/**
 * Document template definition.
 */
export const TemplateDefinitionSchema = z.object({
  forSchema: z.string().min(1),
  filename: z.string().min(1),
  frontmatter: FrontmatterConfigSchema.optional(),
  body: z.array(BodySectionSchema).optional(),
  format: z.enum(['document', 'register']).default('document'),
  header: z.string().optional(),
  itemFormat: z.string().optional(),
});

/**
 * Templates file root structure.
 */
export const TemplatesFileSchema = z.object({
  templates: z.record(z.string(), TemplateDefinitionSchema),
});

export type BodySection = z.infer<typeof BodySectionSchema>;
export type FrontmatterConfig = z.infer<typeof FrontmatterConfigSchema>;
export type TemplateDefinition = z.infer<typeof TemplateDefinitionSchema>;
export type TemplatesFile = z.infer<typeof TemplatesFileSchema>;
```

**Acceptance Criteria:**
- [ ] Zod schema validates all template definition fields from Section 8.1
- [ ] Schema rejects invalid template definitions with clear error messages
- [ ] Type exports provided for all schema types
- [ ] Unit tests cover valid and invalid template definitions
- [ ] Test coverage >90%

---

### WS001-T002: Variable System

**Task ID:** WS001-T002
**Name:** Template Variable Substitution Engine
**Description:** Implement variable parsing, escaping, and substitution
**Dependencies:** None
**Complexity:** M (2-4 hrs)

**File Structure:**
```
src/pkf-processor/
  template/
    variables.ts        # Variable system implementation
    schema.ts           # (from T001)
    index.ts
```

**Implementation Pattern:**
```typescript
// variables.ts
import type { Result } from '@pkf/utils';

/**
 * Standard template variables per Architecture Section 8.2.
 */
export interface TemplateVariables {
  id: string;
  title: string;
  status: string;
  created: string;     // YYYY-MM-DD
  updated: string;     // YYYY-MM-DD
  slug: string;        // URL-friendly title
  nn: string;          // Zero-padded 2 digits
  nnn: string;         // Zero-padded 3 digits
  date: string;        // Current date YYYY-MM-DD
  author: string;
  [key: string]: string;
}

/**
 * Variable pattern: single braces {var} for substitution.
 * Escape pattern: double braces {{var}} produces literal {var}.
 *
 * Processing order (per Section 8.2.1):
 * 1. Replace {{ with temporary placeholder
 * 2. Replace }} with temporary placeholder
 * 3. Substitute {variable} patterns
 * 4. Restore {{ -> { and }} -> }
 */
const ESCAPE_OPEN = '\x00BRACE_OPEN\x00';
const ESCAPE_CLOSE = '\x00BRACE_CLOSE\x00';
const VARIABLE_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

/**
 * Substitute variables in template string.
 *
 * @example
 * substituteVariables('ID: {id}, Pattern: {{id}}', { id: 'P01' })
 * // Returns: 'ID: P01, Pattern: {id}'
 */
export function substituteVariables(
  template: string,
  variables: Partial<TemplateVariables>
): Result<string, SubstitutionError> {
  // Step 1: Escape double braces
  let result = template
    .replace(/\{\{/g, ESCAPE_OPEN)
    .replace(/\}\}/g, ESCAPE_CLOSE);

  // Step 2: Track unknown variables
  const unknownVars: string[] = [];

  // Step 3: Substitute known variables
  result = result.replace(VARIABLE_PATTERN, (match, varName) => {
    if (varName in variables && variables[varName] !== undefined) {
      return String(variables[varName]);
    }
    unknownVars.push(varName);
    return match; // Keep unsubstituted
  });

  // Step 4: Restore escaped braces
  result = result
    .replace(new RegExp(ESCAPE_OPEN, 'g'), '{')
    .replace(new RegExp(ESCAPE_CLOSE, 'g'), '}');

  if (unknownVars.length > 0) {
    return {
      success: false,
      error: {
        type: 'unknown_variables',
        variables: unknownVars,
        message: `Unknown variables: ${unknownVars.join(', ')}`,
      },
    };
  }

  return { success: true, data: result };
}

/**
 * Extract variable names from template string.
 */
export function extractVariables(template: string): string[] {
  const escaped = template
    .replace(/\{\{/g, '')
    .replace(/\}\}/g, '');

  const matches = escaped.matchAll(VARIABLE_PATTERN);
  return [...new Set([...matches].map(m => m[1]))];
}

/**
 * Generate zero-padded number.
 */
export function padNumber(num: number, digits: number): string {
  return String(num).padStart(digits, '0');
}

/**
 * Generate URL-friendly slug from title.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface SubstitutionError {
  type: 'unknown_variables';
  variables: string[];
  message: string;
}
```

**Template Input/Output Examples:**

| Input | Variables | Output |
|-------|-----------|--------|
| `{id}` | `{ id: 'P01' }` | `P01` |
| `{{id}}` | `{ id: 'P01' }` | `{id}` |
| `{id}: {{id}}` | `{ id: 'P01' }` | `P01: {id}` |
| `{{{{` | `{}` | `{{` |
| `{unknown}` | `{}` | Error: unknown_variables |

**Acceptance Criteria:**
- [ ] `substituteVariables()` handles all standard variables from Section 8.2
- [ ] Double-brace escaping per Section 8.2.1 works correctly
- [ ] Unknown variables return Result error with variable list
- [ ] `extractVariables()` returns unique variable names
- [ ] `slugify()` produces valid URL-friendly strings
- [ ] `padNumber()` handles nn (2 digits) and nnn (3 digits)
- [ ] Unit tests for all escape and substitution scenarios
- [ ] Test coverage >90%

---

### WS001-T003: Template Parser

**Task ID:** WS001-T003
**Name:** YAML Template Definition Parser
**Description:** Parse templates.yaml and validate against schema
**Dependencies:** WS001-T001
**Complexity:** S (1-2 hrs)

**File Structure:**
```
src/pkf-processor/
  template/
    parser.ts           # YAML parsing and validation
    schema.ts           # (from T001)
    variables.ts        # (from T002)
    index.ts
```

**Implementation Pattern:**
```typescript
// parser.ts
import { parse as parseYaml } from 'yaml';
import { TemplatesFileSchema, type TemplatesFile, type TemplateDefinition } from './schema';
import type { Result } from '@pkf/utils';

export interface ParseError {
  type: 'yaml_syntax' | 'validation_failed';
  message: string;
  line?: number;
  details?: unknown;
}

/**
 * Parse templates.yaml file content.
 */
export function parseTemplatesFile(
  yamlContent: string
): Result<TemplatesFile, ParseError> {
  // Step 1: Parse YAML
  let parsed: unknown;
  try {
    parsed = parseYaml(yamlContent);
  } catch (err) {
    return {
      success: false,
      error: {
        type: 'yaml_syntax',
        message: err instanceof Error ? err.message : 'Invalid YAML syntax',
        line: (err as { mark?: { line?: number } })?.mark?.line,
      },
    };
  }

  // Step 2: Validate against schema
  const result = TemplatesFileSchema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error: {
        type: 'validation_failed',
        message: 'Template definition validation failed',
        details: result.error.issues,
      },
    };
  }

  return { success: true, data: result.data };
}

/**
 * Get template by name from parsed templates file.
 */
export function getTemplate(
  templates: TemplatesFile,
  templateName: string
): Result<TemplateDefinition, { type: 'not_found'; name: string }> {
  const template = templates.templates[templateName];
  if (!template) {
    return {
      success: false,
      error: { type: 'not_found', name: templateName },
    };
  }
  return { success: true, data: template };
}

/**
 * List all template names.
 */
export function listTemplateNames(templates: TemplatesFile): string[] {
  return Object.keys(templates.templates);
}
```

**Template Input/Output Examples:**

**Input (templates.yaml):**
```yaml
templates:
  proposal-template:
    forSchema: proposal
    filename: "PROPOSAL-TEMPLATE.md"
    frontmatter:
      required: [id, title, status, created]
      defaults:
        status: draft
    body:
      - heading: "Summary"
        level: 2
        required: true
        placeholder: "Brief description"
```

**Output (parsed):**
```typescript
{
  templates: {
    'proposal-template': {
      forSchema: 'proposal',
      filename: 'PROPOSAL-TEMPLATE.md',
      frontmatter: {
        required: ['id', 'title', 'status', 'created'],
        defaults: { status: 'draft' }
      },
      body: [{
        heading: 'Summary',
        level: 2,
        required: true,
        placeholder: 'Brief description'
      }],
      format: 'document'
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Parses valid templates.yaml per Section 8.1 format
- [ ] Returns structured error for invalid YAML syntax with line number
- [ ] Returns structured error for schema validation failures
- [ ] `getTemplate()` retrieves template by name
- [ ] `listTemplateNames()` returns all template names
- [ ] Unit tests for valid and invalid YAML inputs
- [ ] Test coverage >90%

---

### WS001-T004: Frontmatter Generator

**Task ID:** WS001-T004
**Name:** YAML Frontmatter Generator
**Description:** Generate YAML frontmatter from template config and variables
**Dependencies:** WS001-T001, WS001-T002
**Complexity:** M (2-4 hrs)

**File Structure:**
```
src/pkf-processor/
  template/
    frontmatter.ts      # Frontmatter generation
    schema.ts           # (from T001)
    variables.ts        # (from T002)
    parser.ts           # (from T003)
    index.ts
```

**Implementation Pattern:**
```typescript
// frontmatter.ts
import { stringify as stringifyYaml } from 'yaml';
import type { FrontmatterConfig, TemplateDefinition } from './schema';
import { substituteVariables, type TemplateVariables } from './variables';
import type { Result } from '@pkf/utils';

export interface FrontmatterError {
  type: 'missing_required' | 'substitution_failed';
  message: string;
  fields?: string[];
}

/**
 * Generate YAML frontmatter block.
 *
 * @param template - Template definition with frontmatter config
 * @param variables - Variables to substitute (optional for template mode)
 * @param mode - 'template' keeps placeholders, 'document' requires all values
 */
export function generateFrontmatter(
  template: TemplateDefinition,
  variables: Partial<TemplateVariables> = {},
  mode: 'template' | 'document' = 'template'
): Result<string, FrontmatterError> {
  const config = template.frontmatter ?? { required: [], defaults: {} };
  const frontmatter: Record<string, unknown> = {};

  // Apply defaults first
  for (const [key, value] of Object.entries(config.defaults)) {
    frontmatter[key] = value;
  }

  // Add required fields
  for (const field of config.required) {
    if (mode === 'template') {
      // Template mode: use placeholder if no value
      frontmatter[field] = variables[field] ?? `{${field}}`;
    } else {
      // Document mode: require actual value
      if (!(field in variables) || variables[field] === undefined) {
        return {
          success: false,
          error: {
            type: 'missing_required',
            message: `Missing required field: ${field}`,
            fields: [field],
          },
        };
      }
      frontmatter[field] = variables[field];
    }
  }

  // Override with provided variables
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      frontmatter[key] = value;
    }
  }

  // Generate YAML block
  const yamlContent = stringifyYaml(frontmatter, {
    indent: 2,
    lineWidth: 0,  // No line wrapping
  });

  return {
    success: true,
    data: `---\n${yamlContent}---\n`,
  };
}

/**
 * Validate frontmatter against required fields.
 */
export function validateFrontmatter(
  frontmatter: Record<string, unknown>,
  config: FrontmatterConfig
): Result<void, FrontmatterError> {
  const missing: string[] = [];

  for (const field of config.required) {
    if (!(field in frontmatter) || frontmatter[field] === undefined) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return {
      success: false,
      error: {
        type: 'missing_required',
        message: `Missing required fields: ${missing.join(', ')}`,
        fields: missing,
      },
    };
  }

  return { success: true, data: undefined };
}
```

**Template Input/Output Examples:**

**Input:**
```typescript
generateFrontmatter(
  {
    forSchema: 'proposal',
    filename: 'PROPOSAL-TEMPLATE.md',
    frontmatter: {
      required: ['id', 'title', 'status', 'created'],
      defaults: { status: 'draft' }
    }
  },
  { date: '2025-12-27' },
  'template'
);
```

**Output:**
```yaml
---
status: draft
id: "{id}"
title: "{title}"
created: "{created}"
---
```

**Acceptance Criteria:**
- [ ] Generates valid YAML frontmatter blocks
- [ ] Applies defaults from template definition
- [ ] Required fields use `{field}` placeholder in template mode
- [ ] Document mode requires all required fields present
- [ ] Validates frontmatter against required fields
- [ ] Unit tests for template and document modes
- [ ] Test coverage >90%

---

### WS001-T005: Body Structure Generator

**Task ID:** WS001-T005
**Name:** Markdown Body Structure Generator
**Description:** Generate markdown body with headings and placeholders
**Dependencies:** WS001-T001, WS001-T002
**Complexity:** M (2-4 hrs)

**File Structure:**
```
src/pkf-processor/
  template/
    body.ts             # Body structure generation
    schema.ts           # (from T001)
    variables.ts        # (from T002)
    parser.ts           # (from T003)
    frontmatter.ts      # (from T004)
    index.ts
```

**Implementation Pattern:**
```typescript
// body.ts
import type { BodySection, TemplateDefinition } from './schema';
import { substituteVariables, type TemplateVariables } from './variables';
import type { Result } from '@pkf/utils';

/**
 * Generate markdown body from template body sections.
 */
export function generateBody(
  template: TemplateDefinition,
  variables: Partial<TemplateVariables> = {}
): Result<string, { type: 'invalid_template'; message: string }> {
  // Handle register format
  if (template.format === 'register') {
    return generateRegisterBody(template, variables);
  }

  // Handle document format
  return generateDocumentBody(template, variables);
}

/**
 * Generate document-style body with heading sections.
 */
function generateDocumentBody(
  template: TemplateDefinition,
  variables: Partial<TemplateVariables>
): Result<string, { type: 'invalid_template'; message: string }> {
  const sections = template.body ?? [];
  const lines: string[] = [];

  for (const section of sections) {
    // Generate heading
    const headingPrefix = '#'.repeat(section.level);
    lines.push(`${headingPrefix} ${section.heading}`);
    lines.push('');

    // Generate placeholder or content
    if (section.placeholder) {
      const substituted = substituteVariables(section.placeholder, variables);
      if (substituted.success) {
        lines.push(`> ${substituted.data}`);
      } else {
        lines.push(`> ${section.placeholder}`);
      }
    } else {
      lines.push('<!-- Content here -->');
    }

    // Add required indicator
    if (section.required) {
      lines.push('');
      lines.push('<!-- REQUIRED SECTION -->');
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return { success: true, data: lines.join('\n') };
}

/**
 * Generate register-style body with header and item format.
 */
function generateRegisterBody(
  template: TemplateDefinition,
  variables: Partial<TemplateVariables>
): Result<string, { type: 'invalid_template'; message: string }> {
  if (!template.header) {
    return {
      success: false,
      error: {
        type: 'invalid_template',
        message: 'Register format requires header field',
      },
    };
  }

  const lines: string[] = [];

  // Add header
  const headerResult = substituteVariables(template.header, variables);
  lines.push(headerResult.success ? headerResult.data : template.header);
  lines.push('');

  // Add item format as example
  if (template.itemFormat) {
    lines.push('<!-- Item Format Template -->');
    lines.push('<!--');
    lines.push(template.itemFormat);
    lines.push('-->');
    lines.push('');
  }

  return { success: true, data: lines.join('\n') };
}

/**
 * Get required sections from template.
 */
export function getRequiredSections(template: TemplateDefinition): string[] {
  return (template.body ?? [])
    .filter(section => section.required)
    .map(section => section.heading);
}
```

**Template Input/Output Examples:**

**Input:**
```typescript
generateBody({
  forSchema: 'proposal',
  filename: 'PROPOSAL-TEMPLATE.md',
  body: [
    { heading: 'Summary', level: 2, required: true, placeholder: 'Brief description' },
    { heading: 'Motivation', level: 2, required: true, placeholder: 'Why is this needed?' },
    { heading: 'References', level: 2, required: false }
  ]
});
```

**Output:**
```markdown
## Summary

> Brief description

<!-- REQUIRED SECTION -->

---

## Motivation

> Why is this needed?

<!-- REQUIRED SECTION -->

---

## References

<!-- Content here -->

---
```

**Acceptance Criteria:**
- [ ] Generates heading structure with correct levels (## for level 2, etc.)
- [ ] Includes placeholder text as blockquote
- [ ] Marks required sections with comment
- [ ] Handles register format with header and itemFormat
- [ ] `getRequiredSections()` returns list of required heading names
- [ ] Unit tests for document and register formats
- [ ] Test coverage >90%

---

### WS001-T006: Template Generator

**Task ID:** WS001-T006
**Name:** Complete Template File Generator
**Description:** Orchestrate frontmatter and body generation into complete template files
**Dependencies:** WS001-T003, WS001-T004, WS001-T005
**Complexity:** M (2-4 hrs)

**File Structure:**
```
src/pkf-processor/
  template/
    generator.ts        # Template file generation orchestration
    schema.ts           # (from T001)
    variables.ts        # (from T002)
    parser.ts           # (from T003)
    frontmatter.ts      # (from T004)
    body.ts             # (from T005)
    index.ts
```

**Implementation Pattern:**
```typescript
// generator.ts
import type { TemplateDefinition, TemplatesFile } from './schema';
import { generateFrontmatter } from './frontmatter';
import { generateBody } from './body';
import { substituteVariables, type TemplateVariables } from './variables';
import type { Result } from '@pkf/utils';

export interface GeneratedTemplate {
  filename: string;
  content: string;
  forSchema: string;
  requiredSections: string[];
}

export interface GenerateError {
  type: 'frontmatter_failed' | 'body_failed' | 'template_not_found';
  message: string;
  templateName?: string;
  details?: unknown;
}

/**
 * Generate a complete template file from definition.
 */
export function generateTemplate(
  template: TemplateDefinition,
  options: {
    variables?: Partial<TemplateVariables>;
    mode?: 'template' | 'document';
    includeMetadata?: boolean;
  } = {}
): Result<GeneratedTemplate, GenerateError> {
  const {
    variables = {},
    mode = 'template',
    includeMetadata = true,
  } = options;

  const parts: string[] = [];

  // Generate frontmatter
  const frontmatterResult = generateFrontmatter(template, variables, mode);
  if (!frontmatterResult.success) {
    return {
      success: false,
      error: {
        type: 'frontmatter_failed',
        message: frontmatterResult.error.message,
        details: frontmatterResult.error,
      },
    };
  }
  parts.push(frontmatterResult.data);

  // Generate body
  const bodyResult = generateBody(template, variables);
  if (!bodyResult.success) {
    return {
      success: false,
      error: {
        type: 'body_failed',
        message: bodyResult.error.message,
        details: bodyResult.error,
      },
    };
  }
  parts.push(bodyResult.data);

  // Add metadata footer
  if (includeMetadata) {
    parts.push('\n---\n');
    parts.push(`**Template:** ${template.filename}`);
    parts.push(`**Schema:** ${template.forSchema}`);
    parts.push(`**Generated:** ${new Date().toISOString().split('T')[0]}`);
    parts.push('');
  }

  return {
    success: true,
    data: {
      filename: template.filename,
      content: parts.join('\n'),
      forSchema: template.forSchema,
      requiredSections: (template.body ?? [])
        .filter(s => s.required)
        .map(s => s.heading),
    },
  };
}

/**
 * Generate all templates from templates file.
 */
export function generateAllTemplates(
  templatesFile: TemplatesFile,
  options: {
    variables?: Partial<TemplateVariables>;
    mode?: 'template' | 'document';
  } = {}
): Map<string, Result<GeneratedTemplate, GenerateError>> {
  const results = new Map<string, Result<GeneratedTemplate, GenerateError>>();

  for (const [name, template] of Object.entries(templatesFile.templates)) {
    results.set(name, generateTemplate(template, options));
  }

  return results;
}

/**
 * Generate template by name from templates file.
 */
export function generateTemplateByName(
  templatesFile: TemplatesFile,
  templateName: string,
  options: {
    variables?: Partial<TemplateVariables>;
    mode?: 'template' | 'document';
  } = {}
): Result<GeneratedTemplate, GenerateError> {
  const template = templatesFile.templates[templateName];
  if (!template) {
    return {
      success: false,
      error: {
        type: 'template_not_found',
        message: `Template not found: ${templateName}`,
        templateName,
      },
    };
  }

  return generateTemplate(template, options);
}
```

**Template Input/Output Examples:**

**Input:**
```yaml
# templates.yaml
templates:
  proposal-template:
    forSchema: proposal
    filename: "PROPOSAL-TEMPLATE.md"
    frontmatter:
      required: [id, title, status, created]
      defaults:
        status: draft
    body:
      - heading: "Summary"
        level: 2
        required: true
        placeholder: "Brief description"
      - heading: "Motivation"
        level: 2
        required: true
        placeholder: "Why is this needed?"
```

**Output (PROPOSAL-TEMPLATE.md):**
```markdown
---
status: draft
id: "{id}"
title: "{title}"
created: "{created}"
---

## Summary

> Brief description

<!-- REQUIRED SECTION -->

---

## Motivation

> Why is this needed?

<!-- REQUIRED SECTION -->

---

**Template:** PROPOSAL-TEMPLATE.md
**Schema:** proposal
**Generated:** 2025-12-27
```

**Acceptance Criteria:**
- [ ] Combines frontmatter and body into complete template file
- [ ] Generates all templates from templates.yaml
- [ ] Returns GeneratedTemplate with filename, content, forSchema, requiredSections
- [ ] Includes optional metadata footer
- [ ] `generateTemplateByName()` retrieves and generates by name
- [ ] `generateAllTemplates()` generates all templates in file
- [ ] Unit tests for complete template generation
- [ ] Integration test with full templates.yaml example
- [ ] Test coverage >90%

---

### WS001-T007: Template Writer

**Task ID:** WS001-T007
**Name:** File System Template Writer
**Description:** Write generated templates to disk with proper paths
**Dependencies:** WS001-T006
**Complexity:** S (1-2 hrs)

**File Structure:**
```
src/pkf-processor/
  template/
    writer.ts           # File system operations
    generator.ts        # (from T006)
    ...
    index.ts
```

**Implementation Pattern:**
```typescript
// writer.ts
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { GeneratedTemplate } from './generator';
import type { Result } from '@pkf/utils';

export interface WriteError {
  type: 'write_failed' | 'mkdir_failed';
  message: string;
  path: string;
  cause?: Error;
}

export interface WriteResult {
  path: string;
  written: boolean;
  bytes: number;
}

/**
 * Write generated template to file system.
 */
export async function writeTemplate(
  template: GeneratedTemplate,
  outputDir: string,
  options: {
    overwrite?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<Result<WriteResult, WriteError>> {
  const { overwrite = false, dryRun = false } = options;
  const outputPath = join(outputDir, template.filename);

  // Ensure directory exists
  try {
    await mkdir(dirname(outputPath), { recursive: true });
  } catch (err) {
    return {
      success: false,
      error: {
        type: 'mkdir_failed',
        message: `Failed to create directory: ${dirname(outputPath)}`,
        path: dirname(outputPath),
        cause: err instanceof Error ? err : undefined,
      },
    };
  }

  // Dry run mode
  if (dryRun) {
    return {
      success: true,
      data: {
        path: outputPath,
        written: false,
        bytes: Buffer.byteLength(template.content, 'utf8'),
      },
    };
  }

  // Write file
  try {
    await writeFile(outputPath, template.content, {
      encoding: 'utf8',
      flag: overwrite ? 'w' : 'wx',  // wx fails if file exists
    });
  } catch (err) {
    return {
      success: false,
      error: {
        type: 'write_failed',
        message: `Failed to write template: ${outputPath}`,
        path: outputPath,
        cause: err instanceof Error ? err : undefined,
      },
    };
  }

  return {
    success: true,
    data: {
      path: outputPath,
      written: true,
      bytes: Buffer.byteLength(template.content, 'utf8'),
    },
  };
}

/**
 * Write multiple templates to file system.
 */
export async function writeTemplates(
  templates: GeneratedTemplate[],
  outputDir: string,
  options: {
    overwrite?: boolean;
    dryRun?: boolean;
    stopOnError?: boolean;
  } = {}
): Promise<{
  successful: WriteResult[];
  failed: Array<{ template: GeneratedTemplate; error: WriteError }>;
}> {
  const { stopOnError = false, ...writeOptions } = options;
  const successful: WriteResult[] = [];
  const failed: Array<{ template: GeneratedTemplate; error: WriteError }> = [];

  for (const template of templates) {
    const result = await writeTemplate(template, outputDir, writeOptions);
    if (result.success) {
      successful.push(result.data);
    } else {
      failed.push({ template, error: result.error });
      if (stopOnError) break;
    }
  }

  return { successful, failed };
}
```

**Acceptance Criteria:**
- [ ] Writes template content to specified output directory
- [ ] Creates parent directories if needed
- [ ] Respects overwrite flag (default: fail if exists)
- [ ] Dry run mode returns path without writing
- [ ] `writeTemplates()` handles batch operations
- [ ] Returns WriteResult with path, written flag, bytes
- [ ] Unit tests with mock file system
- [ ] Test coverage >90%

---

### WS001-T008: Module Index and Integration

**Task ID:** WS001-T008
**Name:** Template Module Public API
**Description:** Create module index with public exports and integration tests
**Dependencies:** WS001-T001 through WS001-T007
**Complexity:** S (1-2 hrs)

**File Structure:**
```
src/pkf-processor/
  template/
    index.ts            # Public API exports
    schema.ts
    variables.ts
    parser.ts
    frontmatter.ts
    body.ts
    generator.ts
    writer.ts
  index.ts              # Package root (re-exports template/)
```

**Implementation Pattern:**
```typescript
// template/index.ts

// Schema exports
export {
  TemplateDefinitionSchema,
  TemplatesFileSchema,
  BodySectionSchema,
  FrontmatterConfigSchema,
  type TemplateDefinition,
  type TemplatesFile,
  type BodySection,
  type FrontmatterConfig,
} from './schema';

// Variable exports
export {
  substituteVariables,
  extractVariables,
  padNumber,
  slugify,
  type TemplateVariables,
  type SubstitutionError,
} from './variables';

// Parser exports
export {
  parseTemplatesFile,
  getTemplate,
  listTemplateNames,
  type ParseError,
} from './parser';

// Frontmatter exports
export {
  generateFrontmatter,
  validateFrontmatter,
  type FrontmatterError,
} from './frontmatter';

// Body exports
export {
  generateBody,
  getRequiredSections,
} from './body';

// Generator exports
export {
  generateTemplate,
  generateAllTemplates,
  generateTemplateByName,
  type GeneratedTemplate,
  type GenerateError,
} from './generator';

// Writer exports
export {
  writeTemplate,
  writeTemplates,
  type WriteError,
  type WriteResult,
} from './writer';
```

**Acceptance Criteria:**
- [ ] All public types and functions exported from index.ts
- [ ] No internal implementation details exposed
- [ ] Integration test: parse templates.yaml, generate all templates, write to disk
- [ ] Integration test: full variable substitution pipeline
- [ ] Test coverage >90% for entire template module
- [ ] No circular dependencies within module

---

## 3. Dependency Graph

```
WS001-T001 (Schema)
     │
     ├─────────────────────────────┐
     │                             │
     v                             v
WS001-T002 (Variables)       WS001-T003 (Parser)
     │                             │
     ├─────────┬───────────────────┤
     │         │                   │
     v         v                   │
WS001-T004  WS001-T005             │
(Frontmatter) (Body)               │
     │         │                   │
     └────┬────┘                   │
          │                        │
          v                        │
     WS001-T006 (Generator) <──────┘
          │
          v
     WS001-T007 (Writer)
          │
          v
     WS001-T008 (Index)
```

**Parallelization Opportunities:**
- T001, T002, T003 can run in parallel (no mutual dependencies)
- T004, T005 can run in parallel after T001, T002 complete
- T006, T007, T008 are sequential

---

## 4. Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| YAML parsing edge cases | Medium | Medium | Comprehensive test suite with malformed YAML |
| Variable collision with content | Low | Medium | Clear escape syntax documented |
| File system permission errors | Low | High | Clear error messages, dry-run mode |
| Schema evolution breaks templates | Medium | Medium | Version templates, migration guide |

---

## 5. Implementation Notes

### 5.1 Pattern: Result Type Usage

All functions returning potential errors use the Result pattern:

```typescript
type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };
```

### 5.2 Pattern: Variable Naming

Per Architecture Section 8.2, standard variables are:

| Variable | Type | Example |
|----------|------|---------|
| `{id}` | string | `P01`, `TODO-001` |
| `{title}` | string | `My Proposal` |
| `{status}` | string | `draft` |
| `{created}` | date | `2025-12-27` |
| `{updated}` | date | `2025-12-27` |
| `{slug}` | string | `my-proposal` |
| `{nn}` | string | `01` (2 digits) |
| `{nnn}` | string | `001` (3 digits) |
| `{date}` | date | `2025-12-27` |
| `{author}` | string | `developer` |

### 5.3 Pattern: Escaping Rules

Per Architecture Section 8.2.1:

| Input | Output | Rule |
|-------|--------|------|
| `{var}` | value of var | Substitution |
| `{{var}}` | `{var}` | Escaped |
| `{{` | `{` | Literal brace |
| `}}` | `}` | Literal brace |

---

## 6. Acceptance Criteria Summary

**Workstream Complete When:**

- [ ] All 8 tasks have passing acceptance criteria
- [ ] Integration test: Parse templates.yaml and generate all templates
- [ ] Integration test: Variable substitution with escaping
- [ ] Test coverage >90% for template module
- [ ] No circular dependencies
- [ ] Documentation in module README
- [ ] Types exported for downstream consumers

---

## 7. Estimated Timeline

| Task | Complexity | Estimate |
|------|------------|----------|
| WS001-T001 | M | 2-4 hrs |
| WS001-T002 | M | 2-4 hrs |
| WS001-T003 | S | 1-2 hrs |
| WS001-T004 | M | 2-4 hrs |
| WS001-T005 | M | 2-4 hrs |
| WS001-T006 | M | 2-4 hrs |
| WS001-T007 | S | 1-2 hrs |
| WS001-T008 | S | 1-2 hrs |

**Total Estimate:** 13-26 hours (2-3 days)

---

**Document Version:** 1.0.0
**Created:** 2025-12-27
**Status:** Ready for Review
