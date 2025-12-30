/**
 * PKF Frontmatter Validator
 *
 * Validates YAML frontmatter blocks in markdown files against JSON schemas.
 * Supports both standard --- delimited frontmatter and ```yaml code blocks.
 */

import { parse as parseYaml } from 'yaml';
import {
  type ValidationResult,
  type ValidationOptions,
  type ValidationIssue,
  createEmptyResult,
  createIssue,
} from '../types/index.js';
import { fileExists, readTextFile, readJsonFile } from '../utils/index.js';
import { validateWithSchema } from '../utils/schema-utils.js';

/**
 * Result of extracting frontmatter from content
 */
export interface ExtractedFrontmatter {
  /** Parsed frontmatter data, or null if none found */
  data: Record<string, unknown> | null;
  /** Raw YAML string, or null if none found */
  raw: string | null;
  /** Line number where frontmatter starts (1-based) */
  line: number;
  /** The type of frontmatter block found */
  type: 'standard' | 'codeblock' | 'none';
}

/**
 * Options for frontmatter validation
 */
export interface FrontmatterValidationOptions extends ValidationOptions {
  /** Path to the JSON schema file for validation */
  schemaPath?: string;
  /** Inline schema object (takes precedence over schemaPath) */
  schema?: object;
  /** Whether to validate common fields even without a schema */
  validateCommonFields?: boolean;
  /** Required frontmatter fields */
  requiredFields?: string[];
  /** Expected document type (validates against 'type' field in frontmatter) */
  expectedType?: string;
  /** Whether to allow additional properties not defined in schema */
  allowAdditionalProperties?: boolean;
}

/**
 * Common frontmatter fields and their expected types/patterns
 */
const COMMON_FIELD_VALIDATORS: Record<
  string,
  {
    type: string;
    pattern?: RegExp;
    description: string;
    enumValues?: string[];
  }
> = {
  type: {
    type: 'string',
    description: 'Document type identifier',
  },
  title: {
    type: 'string',
    description: 'Document title',
  },
  version: {
    type: 'string',
    pattern: /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/,
    description: 'SemVer version string (e.g., 1.0.0)',
  },
  status: {
    type: 'string',
    enumValues: ['draft', 'review', 'approved', 'deprecated', 'archived', 'active', 'inactive'],
    description: 'Document status',
  },
  date: {
    type: 'string',
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    description: 'Date in YYYY-MM-DD format',
  },
  created: {
    type: 'string',
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    description: 'Creation date in YYYY-MM-DD format',
  },
  updated: {
    type: 'string',
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    description: 'Last updated date in YYYY-MM-DD format',
  },
  author: {
    type: 'string',
    description: 'Document author',
  },
  authors: {
    type: 'array',
    description: 'List of document authors',
  },
  tags: {
    type: 'array',
    description: 'Document tags',
  },
  labels: {
    type: 'array',
    description: 'Document labels',
  },
  description: {
    type: 'string',
    description: 'Document description',
  },
  id: {
    type: 'string',
    pattern: /^[A-Z]+-\d+$/,
    description: 'Document identifier (e.g., TODO-001, ADR-001)',
  },
  priority: {
    type: 'string',
    enumValues: ['critical', 'high', 'medium', 'low'],
    description: 'Priority level',
  },
  severity: {
    type: 'string',
    enumValues: ['critical', 'high', 'medium', 'low'],
    description: 'Severity level',
  },
};

/**
 * Extract YAML frontmatter from markdown content
 *
 * Supports two formats:
 * 1. Standard frontmatter: Content starting with --- delimiter
 * 2. YAML code block: ```yaml or ```yml at the start of the file
 *
 * @param content - The markdown content to extract frontmatter from
 * @returns Extracted frontmatter data, raw string, and line number
 */
export function extractFrontmatter(content: string): ExtractedFrontmatter {
  const lines = content.split('\n');

  // Try standard --- delimited frontmatter first
  const standardResult = extractStandardFrontmatter(lines);
  if (standardResult.data !== null) {
    return standardResult;
  }

  // Try ```yaml code block at the start
  const codeBlockResult = extractCodeBlockFrontmatter(lines);
  if (codeBlockResult.data !== null) {
    return codeBlockResult;
  }

  // No frontmatter found
  return {
    data: null,
    raw: null,
    line: 1,
    type: 'none',
  };
}

/**
 * Extract standard --- delimited frontmatter
 */
function extractStandardFrontmatter(lines: string[]): ExtractedFrontmatter {
  // Check if content starts with ---
  if (lines.length === 0 || lines[0]?.trim() !== '---') {
    return { data: null, raw: null, line: 1, type: 'none' };
  }

  // Find the closing ---
  let endLine = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      endLine = i;
      break;
    }
  }

  if (endLine === -1) {
    // No closing delimiter found
    return { data: null, raw: null, line: 1, type: 'none' };
  }

  // Extract the YAML content (lines 1 to endLine-1, 0-indexed)
  const yamlLines = lines.slice(1, endLine);
  const rawYaml = yamlLines.join('\n');

  try {
    const data = parseYaml(rawYaml) as Record<string, unknown>;
    return {
      data: data || {},
      raw: rawYaml,
      line: 2, // Frontmatter content starts at line 2 (after ---)
      type: 'standard',
    };
  } catch {
    // Return with null data but indicate we found frontmatter structure
    return {
      data: null,
      raw: rawYaml,
      line: 2,
      type: 'standard',
    };
  }
}

/**
 * Extract frontmatter from ```yaml code block at the start of the file
 */
function extractCodeBlockFrontmatter(lines: string[]): ExtractedFrontmatter {
  // Skip empty lines at the start
  let startIndex = 0;
  while (startIndex < lines.length && lines[startIndex]?.trim() === '') {
    startIndex++;
  }

  // Check if content starts with ```yaml or ```yml
  const firstLine = lines[startIndex] || '';
  const yamlBlockPattern = /^```ya?ml\s*$/i;

  if (!yamlBlockPattern.test(firstLine)) {
    return { data: null, raw: null, line: 1, type: 'none' };
  }

  // Find the closing ```
  let endLine = -1;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '```') {
      endLine = i;
      break;
    }
  }

  if (endLine === -1) {
    // No closing delimiter found
    return { data: null, raw: null, line: startIndex + 1, type: 'none' };
  }

  // Extract the YAML content
  const yamlLines = lines.slice(startIndex + 1, endLine);
  const rawYaml = yamlLines.join('\n');

  try {
    const data = parseYaml(rawYaml) as Record<string, unknown>;
    return {
      data: data || {},
      raw: rawYaml,
      line: startIndex + 2, // Content starts after ```yaml line (1-based)
      type: 'codeblock',
    };
  } catch {
    return {
      data: null,
      raw: rawYaml,
      line: startIndex + 2,
      type: 'codeblock',
    };
  }
}

/**
 * Validate frontmatter content against a schema and common field rules
 *
 * @param content - The markdown content containing frontmatter
 * @param schema - JSON schema object to validate against
 * @param filePath - Optional file path for error reporting
 * @returns Validation result with errors, warnings, and info
 */
export function validateFrontmatterContent(
  content: string,
  schema: object,
  filePath?: string
): ValidationResult {
  const result = createEmptyResult();
  const startTime = Date.now();

  // Extract frontmatter
  const extracted = extractFrontmatter(content);

  if (extracted.data === null) {
    if (extracted.raw !== null) {
      // We found frontmatter structure but failed to parse it
      result.errors.push(
        createIssue(
          'FRONTMATTER_PARSE_ERROR',
          'Failed to parse YAML frontmatter',
          'error',
          {
            filePath,
            line: extracted.line,
            suggestion: 'Check YAML syntax for errors',
          }
        )
      );
    } else {
      // No frontmatter found
      result.warnings.push(
        createIssue(
          'NO_FRONTMATTER',
          'No frontmatter found in document',
          'warning',
          {
            filePath,
            suggestion: 'Add frontmatter at the start of the document using --- delimiters',
          }
        )
      );
    }

    result.valid = result.errors.length === 0;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Validate against schema
  const schemaResult = validateWithSchema(extracted.data, schema, filePath);

  if (!schemaResult.valid) {
    // Add line information to schema errors
    for (const issue of schemaResult.issues) {
      result.errors.push({
        ...issue,
        line: issue.line ?? extracted.line,
      });
    }
  }

  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;
  result.itemCount = 1;

  return result;
}

/**
 * Validate a markdown file's frontmatter
 *
 * @param filePath - Path to the markdown file
 * @param options - Validation options
 * @returns Validation result with errors, warnings, and info
 */
export async function validateFrontmatter(
  filePath: string,
  options: FrontmatterValidationOptions = {}
): Promise<ValidationResult> {
  const startTime = Date.now();
  const result = createEmptyResult();

  const {
    schemaPath,
    schema: inlineSchema,
    validateCommonFields = true,
    requiredFields = [],
    expectedType,
    includeWarnings = true,
    includeInfo = true,
  } = options;

  // Check if file exists
  if (!(await fileExists(filePath))) {
    result.errors.push(
      createIssue('FILE_NOT_FOUND', `File not found: ${filePath}`, 'error', {
        filePath,
      })
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Read file content
  let content: string;
  try {
    content = await readTextFile(filePath);
  } catch (error) {
    result.errors.push(
      createIssue(
        'FILE_READ_ERROR',
        `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
        'error',
        { filePath }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Extract frontmatter
  const extracted = extractFrontmatter(content);

  if (extracted.data === null) {
    if (extracted.raw !== null) {
      // Found structure but failed to parse
      result.errors.push(
        createIssue(
          'FRONTMATTER_PARSE_ERROR',
          'Failed to parse YAML frontmatter',
          'error',
          {
            filePath,
            line: extracted.line,
            suggestion: 'Check YAML syntax for errors',
          }
        )
      );
    } else {
      // No frontmatter found
      if (requiredFields.length > 0 || inlineSchema || schemaPath) {
        result.errors.push(
          createIssue(
            'NO_FRONTMATTER',
            'Document is missing required frontmatter',
            'error',
            {
              filePath,
              suggestion: 'Add frontmatter at the start of the document using --- delimiters',
            }
          )
        );
      } else if (includeWarnings) {
        result.warnings.push(
          createIssue(
            'NO_FRONTMATTER',
            'No frontmatter found in document',
            'warning',
            {
              filePath,
              suggestion: 'Consider adding frontmatter for better document organization',
            }
          )
        );
      }
    }

    result.valid = result.errors.length === 0;
    result.duration = Date.now() - startTime;
    return result;
  }

  const frontmatterData = extracted.data;

  // Report frontmatter type found
  if (includeInfo) {
    result.info.push(
      createIssue(
        'FRONTMATTER_FOUND',
        `Found ${extracted.type} frontmatter starting at line ${extracted.line}`,
        'info',
        { filePath, line: extracted.line }
      )
    );
  }

  // Load and validate against schema if provided
  let schema: object | null = null;

  if (inlineSchema) {
    schema = inlineSchema;
  } else if (schemaPath) {
    if (!(await fileExists(schemaPath))) {
      result.errors.push(
        createIssue(
          'SCHEMA_NOT_FOUND',
          `Schema file not found: ${schemaPath}`,
          'error',
          {
            filePath: schemaPath,
            suggestion: 'Ensure the schema file exists at the specified path',
          }
        )
      );
    } else {
      try {
        schema = await readJsonFile<object>(schemaPath);
      } catch (error) {
        result.errors.push(
          createIssue(
            'SCHEMA_LOAD_ERROR',
            `Failed to load schema: ${error instanceof Error ? error.message : String(error)}`,
            'error',
            { filePath: schemaPath }
          )
        );
      }
    }
  }

  // Validate against schema
  if (schema) {
    const schemaResult = validateWithSchema(frontmatterData, schema, filePath);

    if (!schemaResult.valid) {
      for (const issue of schemaResult.issues) {
        result.errors.push({
          ...issue,
          line: issue.line ?? extracted.line,
        });
      }
    }
  }

  // Check required fields
  for (const field of requiredFields) {
    if (!(field in frontmatterData)) {
      result.errors.push(
        createIssue(
          'REQUIRED_FIELD_MISSING',
          `Required frontmatter field '${field}' is missing`,
          'error',
          {
            filePath,
            line: extracted.line,
            suggestion: `Add the '${field}' field to the frontmatter`,
          }
        )
      );
    }
  }

  // Check expected type
  if (expectedType && frontmatterData.type !== expectedType) {
    if (!frontmatterData.type) {
      result.errors.push(
        createIssue(
          'TYPE_MISSING',
          `Document is missing 'type' field, expected '${expectedType}'`,
          'error',
          {
            filePath,
            line: extracted.line,
            suggestion: `Add 'type: ${expectedType}' to the frontmatter`,
          }
        )
      );
    } else {
      result.errors.push(
        createIssue(
          'TYPE_MISMATCH',
          `Document type '${frontmatterData.type}' does not match expected type '${expectedType}'`,
          'error',
          {
            filePath,
            line: extracted.line,
            value: frontmatterData.type,
            expected: expectedType,
          }
        )
      );
    }
  }

  // Validate common fields
  if (validateCommonFields && !schema) {
    const commonFieldIssues = validateCommonFrontmatterFields(
      frontmatterData,
      filePath,
      extracted.line,
      includeWarnings
    );
    categorizeIssues(commonFieldIssues, result);
  }

  // Additional semantic validations
  const semanticIssues = validateSemanticRules(
    frontmatterData,
    filePath,
    extracted.line,
    includeWarnings
  );
  categorizeIssues(semanticIssues, result);

  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;
  result.itemCount = 1;

  return result;
}

/**
 * Validate common frontmatter fields against expected types and patterns
 */
function validateCommonFrontmatterFields(
  data: Record<string, unknown>,
  filePath: string | undefined,
  line: number,
  includeWarnings: boolean
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [field, value] of Object.entries(data)) {
    const validator = COMMON_FIELD_VALIDATORS[field];
    if (!validator) {
      continue; // Skip unknown fields in common validation
    }

    // Type check
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== validator.type) {
      issues.push(
        createIssue(
          'INVALID_FIELD_TYPE',
          `Field '${field}' should be ${validator.type}, got ${actualType}`,
          'error',
          {
            filePath,
            line,
            value,
            expected: validator.type,
            suggestion: validator.description,
          }
        )
      );
      continue;
    }

    // Pattern check for strings
    if (validator.pattern && typeof value === 'string') {
      if (!validator.pattern.test(value)) {
        issues.push(
          createIssue(
            'INVALID_FIELD_FORMAT',
            `Field '${field}' does not match expected format: ${validator.description}`,
            'error',
            {
              filePath,
              line,
              value,
              expected: validator.pattern.source,
              suggestion: validator.description,
            }
          )
        );
      }
    }

    // Enum check
    if (validator.enumValues && typeof value === 'string') {
      if (!validator.enumValues.includes(value)) {
        if (includeWarnings) {
          issues.push(
            createIssue(
              'UNKNOWN_ENUM_VALUE',
              `Field '${field}' has unexpected value '${value}'. Common values: ${validator.enumValues.join(', ')}`,
              'warning',
              {
                filePath,
                line,
                value,
                expected: validator.enumValues,
                suggestion: `Consider using one of: ${validator.enumValues.join(', ')}`,
              }
            )
          );
        }
      }
    }
  }

  return issues;
}

/**
 * Validate semantic rules across frontmatter fields
 */
function validateSemanticRules(
  data: Record<string, unknown>,
  filePath: string | undefined,
  line: number,
  includeWarnings: boolean
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check date ordering: created <= updated
  const created = data.created as string | undefined;
  const updated = data.updated as string | undefined;

  if (created && updated && isValidDateFormat(created) && isValidDateFormat(updated)) {
    if (updated < created) {
      if (includeWarnings) {
        issues.push(
          createIssue(
            'DATE_ORDER_WARNING',
            `'updated' date (${updated}) is before 'created' date (${created})`,
            'warning',
            {
              filePath,
              line,
              value: { created, updated },
              suggestion: 'Update the dates so that updated >= created',
            }
          )
        );
      }
    }
  }

  // Check date ordering: date <= updated (if both present)
  const date = data.date as string | undefined;
  if (date && updated && isValidDateFormat(date) && isValidDateFormat(updated)) {
    if (updated < date) {
      if (includeWarnings) {
        issues.push(
          createIssue(
            'DATE_ORDER_WARNING',
            `'updated' date (${updated}) is before 'date' field (${date})`,
            'warning',
            {
              filePath,
              line,
              value: { date, updated },
              suggestion: 'Check if the dates are correct',
            }
          )
        );
      }
    }
  }

  // Check for empty required-like fields
  const importantStringFields = ['title', 'description', 'author', 'type'];
  for (const field of importantStringFields) {
    const value = data[field];
    if (typeof value === 'string' && value.trim() === '') {
      if (includeWarnings) {
        issues.push(
          createIssue(
            'EMPTY_FIELD',
            `Field '${field}' is empty`,
            'warning',
            {
              filePath,
              line,
              value,
              suggestion: `Provide a meaningful value for '${field}' or remove the field`,
            }
          )
        );
      }
    }
  }

  // Check for empty arrays
  const arrayFields = ['tags', 'labels', 'authors'];
  for (const field of arrayFields) {
    const value = data[field];
    if (Array.isArray(value) && value.length === 0) {
      if (includeWarnings) {
        issues.push(
          createIssue(
            'EMPTY_ARRAY',
            `Field '${field}' is an empty array`,
            'warning',
            {
              filePath,
              line,
              suggestion: `Add items to '${field}' or remove the field`,
            }
          )
        );
      }
    }
  }

  // Validate version is valid semver if present
  const version = data.version;
  if (typeof version === 'string') {
    if (!/^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(version)) {
      issues.push(
        createIssue(
          'INVALID_VERSION',
          `Version '${version}' is not a valid SemVer string`,
          'error',
          {
            filePath,
            line,
            value: version,
            expected: 'SemVer format (e.g., 1.0.0, 1.0.0-alpha.1)',
            suggestion: 'Use SemVer format: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]',
          }
        )
      );
    }
  }

  // Validate dates are real dates
  const dateFields = ['date', 'created', 'updated'];
  for (const field of dateFields) {
    const value = data[field];
    if (typeof value === 'string') {
      if (!isValidDate(value)) {
        issues.push(
          createIssue(
            'INVALID_DATE',
            `Field '${field}' contains invalid date: ${value}`,
            'error',
            {
              filePath,
              line,
              value,
              expected: 'YYYY-MM-DD format with valid date values',
              suggestion: 'Use a valid date in YYYY-MM-DD format (e.g., 2025-01-15)',
            }
          )
        );
      }
    }
  }

  return issues;
}

/**
 * Check if a string matches YYYY-MM-DD format
 */
function isValidDateFormat(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * Check if a date string is a valid date
 */
function isValidDate(dateStr: string): boolean {
  if (!isValidDateFormat(dateStr)) {
    return false;
  }

  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }

  // Check valid ranges
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  // Check actual date validity
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Categorize issues into the result object by severity
 */
function categorizeIssues(
  issues: ValidationIssue[],
  result: ValidationResult
): void {
  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        result.errors.push(issue);
        break;
      case 'warning':
        result.warnings.push(issue);
        break;
      case 'info':
        result.info.push(issue);
        break;
    }
  }
}

/**
 * Batch validate multiple files' frontmatter
 *
 * @param filePaths - Array of file paths to validate
 * @param options - Validation options (applied to all files)
 * @returns Aggregated validation result
 */
export async function validateMultipleFrontmatter(
  filePaths: string[],
  options: FrontmatterValidationOptions = {}
): Promise<ValidationResult> {
  const startTime = Date.now();
  const result = createEmptyResult();

  for (const filePath of filePaths) {
    const fileResult = await validateFrontmatter(filePath, options);

    result.errors.push(...fileResult.errors);
    result.warnings.push(...fileResult.warnings);
    result.info.push(...fileResult.info);

    if (fileResult.itemCount) {
      result.itemCount = (result.itemCount ?? 0) + fileResult.itemCount;
    }
  }

  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;

  return result;
}

/**
 * Create a frontmatter schema for a specific document type
 *
 * @param docType - The document type name
 * @param requiredFields - Fields required for this document type
 * @param additionalProperties - Additional schema properties
 * @returns JSON Schema object
 */
export function createFrontmatterSchema(
  docType: string,
  requiredFields: string[] = ['type', 'title'],
  additionalProperties: Record<string, object> = {}
): object {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `pkf-frontmatter-${docType}.schema.json`,
    type: 'object',
    required: requiredFields,
    properties: {
      type: {
        type: 'string',
        const: docType,
        description: 'Document type identifier',
      },
      title: {
        type: 'string',
        minLength: 1,
        description: 'Document title',
      },
      version: {
        type: 'string',
        pattern: '^\\d+\\.\\d+\\.\\d+(-[\\w.]+)?(\\+[\\w.]+)?$',
        description: 'SemVer version string',
      },
      status: {
        type: 'string',
        enum: ['draft', 'review', 'approved', 'deprecated', 'archived', 'active', 'inactive'],
        description: 'Document status',
      },
      date: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'Date in YYYY-MM-DD format',
      },
      created: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'Creation date',
      },
      updated: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'Last update date',
      },
      author: {
        type: 'string',
        description: 'Document author',
      },
      authors: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of authors',
      },
      description: {
        type: 'string',
        description: 'Document description',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Document tags',
      },
      ...additionalProperties,
    },
    additionalProperties: true,
  };
}

export default validateFrontmatter;
