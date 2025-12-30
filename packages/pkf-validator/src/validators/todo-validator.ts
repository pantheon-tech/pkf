/**
 * PKF TODO Register Validator
 *
 * Validates TODO.md files against the PKF TODO item schema.
 * Parses TODO items from markdown, validates frontmatter against schema,
 * and checks for ID uniqueness and valid date formats.
 */

import { parse as parseYaml } from 'yaml';
import {
  createEmptyResult,
  createIssue,
  type ValidationResult,
  type ValidationOptions,
} from '../types/index.js';
import { fileExists, readTextFile, readJsonFile } from '../utils/index.js';
import { validateWithSchema } from '../utils/schema-utils.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Represents a parsed TODO item from the markdown file
 */
interface ParsedTodoItem {
  /** The raw YAML content of the frontmatter */
  rawYaml: string;
  /** Parsed frontmatter data */
  data: Record<string, unknown>;
  /** Line number where the item starts */
  startLine: number;
  /** Line number where the YAML block starts */
  yamlStartLine: number;
  /** The TODO header text */
  headerText: string;
}

/**
 * Get the default TODO schema path
 */
function getDefaultSchemaPath(): string {
  // Try to resolve relative to this module
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // Go up from src/validators to package root, then to repo root, then to schemas
  return resolve(currentDir, '..', '..', '..', '..', 'schemas', 'todo-item.schema.json');
}

/**
 * Parse TODO items from markdown content
 *
 * Looks for patterns like:
 * ### TODO-XXX: Title
 * ```yaml
 * frontmatter...
 * ```
 */
function parseTodoItems(content: string, filePath: string): ParsedTodoItem[] {
  const items: ParsedTodoItem[] = [];
  // Normalize line endings and split
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedContent.split('\n');

  // Pattern to match TODO headers (### TODO-XXX: Title)
  const headerPattern = /^###\s+(TODO-\d{3,})(?::\s*(.*))?$/;
  // Pattern to match code block start with yaml
  const yamlBlockStart = /^```ya?ml\s*$/;
  const yamlBlockEnd = /^```\s*$/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) {
      i++;
      continue;
    }
    const headerMatch = line.match(headerPattern);

    if (headerMatch) {
      const todoId = headerMatch[1];
      const title = headerMatch[2] || '';
      const headerLine = i + 1; // 1-based line number

      // Look for YAML block after the header
      let j = i + 1;

      // Skip empty lines
      while (j < lines.length && (lines[j]?.trim() ?? '') === '') {
        j++;
      }

      // Check if we found a YAML block
      const currentLine = lines[j];
      if (j < lines.length && currentLine !== undefined && yamlBlockStart.test(currentLine)) {
        const yamlStartLine = j + 1; // 1-based line number
        j++; // Move past the ```yaml line

        // Collect YAML content until closing ```
        const yamlLines: string[] = [];
        while (j < lines.length) {
          const yamlLine = lines[j];
          if (yamlLine === undefined || yamlBlockEnd.test(yamlLine)) {
            break;
          }
          yamlLines.push(yamlLine);
          j++;
        }

        const rawYaml = yamlLines.join('\n');

        // Parse the YAML
        try {
          const data = parseYaml(rawYaml) as Record<string, unknown>;
          items.push({
            rawYaml,
            data: data || {},
            startLine: headerLine,
            yamlStartLine,
            headerText: `${todoId}${title ? ': ' + title : ''}`,
          });
        } catch (error) {
          // We'll add a parsing error but still track the item location
          items.push({
            rawYaml,
            data: { _parseError: error instanceof Error ? error.message : String(error) },
            startLine: headerLine,
            yamlStartLine,
            headerText: `${todoId}${title ? ': ' + title : ''}`,
          });
        }

        i = j + 1; // Move past the closing ```
        continue;
      }
    }

    i++;
  }

  return items;
}

/**
 * Validate date string format (YYYY-MM-DD) and check if it's a valid date
 */
function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }

  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Options for TODO validation
 */
export interface TodoValidationOptions extends ValidationOptions {
  /** Path to the TODO item schema. If not provided, uses default. */
  schemaPath?: string;
  /** Whether to validate date values are semantically valid */
  validateDates?: boolean;
  /** Whether to check for orphaned dependencies (references to non-existent TODOs) */
  checkDependencies?: boolean;
}

/**
 * Validate a TODO.md file
 *
 * @param todoPath - Path to the TODO.md file
 * @param options - Validation options
 * @returns Validation result with errors, warnings, and info messages
 */
export async function validateTodo(
  todoPath: string,
  options: TodoValidationOptions = {}
): Promise<ValidationResult> {
  const startTime = Date.now();
  const result = createEmptyResult();

  const {
    schemaPath = getDefaultSchemaPath(),
    validateDates = true,
    checkDependencies = true,
    includeWarnings = true,
    includeInfo = true,
    maxErrors,
  } = options;

  // Check if file exists
  if (!(await fileExists(todoPath))) {
    result.errors.push(
      createIssue('FILE_NOT_FOUND', `TODO file not found: ${todoPath}`, 'error', {
        filePath: todoPath,
      })
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Load schema
  let schema: Record<string, unknown>;
  try {
    if (!(await fileExists(schemaPath))) {
      result.errors.push(
        createIssue('SCHEMA_NOT_FOUND', `TODO schema not found: ${schemaPath}`, 'error', {
          filePath: schemaPath,
          suggestion: 'Ensure todo-item.schema.json exists in the schemas directory',
        })
      );
      result.valid = false;
      result.duration = Date.now() - startTime;
      return result;
    }
    schema = await readJsonFile<Record<string, unknown>>(schemaPath);
  } catch (error) {
    result.errors.push(
      createIssue(
        'SCHEMA_LOAD_ERROR',
        `Failed to load TODO schema: ${error instanceof Error ? error.message : String(error)}`,
        'error',
        { filePath: schemaPath }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Read and parse TODO file
  let content: string;
  try {
    content = await readTextFile(todoPath);
  } catch (error) {
    result.errors.push(
      createIssue(
        'FILE_READ_ERROR',
        `Failed to read TODO file: ${error instanceof Error ? error.message : String(error)}`,
        'error',
        { filePath: todoPath }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Parse TODO items
  const items = parseTodoItems(content, todoPath);

  if (items.length === 0) {
    if (includeInfo) {
      result.info.push(
        createIssue('NO_TODO_ITEMS', 'No TODO items found in the file', 'info', {
          filePath: todoPath,
        })
      );
    }
    result.duration = Date.now() - startTime;
    result.itemCount = 0;
    return result;
  }

  // Track IDs for uniqueness check
  const seenIds = new Map<string, number>(); // id -> first occurrence line number
  const allIds = new Set<string>();

  // Validate each item
  for (const item of items) {
    // Check for early termination on maxErrors
    if (maxErrors !== undefined && result.errors.length >= maxErrors) {
      if (includeWarnings) {
        result.warnings.push(
          createIssue(
            'MAX_ERRORS_REACHED',
            `Maximum error count (${maxErrors}) reached, stopping validation`,
            'warning',
            { filePath: todoPath }
          )
        );
      }
      break;
    }

    // Check for YAML parsing errors
    if (item.data._parseError) {
      result.errors.push(
        createIssue(
          'YAML_PARSE_ERROR',
          `Failed to parse YAML for ${item.headerText}: ${item.data._parseError}`,
          'error',
          {
            filePath: todoPath,
            line: item.yamlStartLine,
          }
        )
      );
      continue;
    }

    const itemId = item.data.id as string | undefined;

    // Check ID uniqueness
    if (itemId) {
      allIds.add(itemId);

      if (seenIds.has(itemId)) {
        result.errors.push(
          createIssue(
            'DUPLICATE_ID',
            `Duplicate TODO ID: ${itemId} (first seen at line ${seenIds.get(itemId)})`,
            'error',
            {
              filePath: todoPath,
              line: item.startLine,
              value: itemId,
              suggestion: `Use a unique ID for this TODO item`,
            }
          )
        );
      } else {
        seenIds.set(itemId, item.startLine);
      }
    }

    // Validate against schema
    const schemaResult = validateWithSchema(item.data, schema, todoPath);

    if (!schemaResult.valid) {
      // Add line information to schema errors
      for (const issue of schemaResult.issues) {
        result.errors.push({
          ...issue,
          line: item.yamlStartLine,
          message: `[${itemId || item.headerText}] ${issue.message}`,
        });
      }
    }

    // Additional date validation
    if (validateDates) {
      const dateFields = ['created', 'updated', 'due_date'] as const;

      for (const field of dateFields) {
        const value = item.data[field];
        if (typeof value === 'string') {
          if (!isValidDate(value)) {
            result.errors.push(
              createIssue(
                'INVALID_DATE',
                `[${itemId || item.headerText}] Invalid date value for '${field}': ${value}`,
                'error',
                {
                  filePath: todoPath,
                  line: item.yamlStartLine,
                  value,
                  expected: 'YYYY-MM-DD format with valid date',
                  suggestion: `Use a valid date in YYYY-MM-DD format (e.g., 2025-01-15)`,
                }
              )
            );
          }
        }
      }

      // Check date logic: updated should be >= created
      const created = item.data.created as string | undefined;
      const updated = item.data.updated as string | undefined;

      if (created && updated && isValidDate(created) && isValidDate(updated)) {
        if (updated < created) {
          if (includeWarnings) {
            result.warnings.push(
              createIssue(
                'DATE_LOGIC_ERROR',
                `[${itemId || item.headerText}] 'updated' date (${updated}) is before 'created' date (${created})`,
                'warning',
                {
                  filePath: todoPath,
                  line: item.yamlStartLine,
                  value: { created, updated },
                  suggestion: `Update the 'updated' date to be on or after the 'created' date`,
                }
              )
            );
          }
        }
      }
    }
  }

  // Check for orphaned dependencies
  if (checkDependencies) {
    for (const item of items) {
      if (item.data._parseError) continue;

      const itemId = item.data.id as string;
      const dependsOn = item.data.depends_on as string[] | undefined;
      const blocks = item.data.blocks as string[] | undefined;

      // Check depends_on references
      if (Array.isArray(dependsOn)) {
        for (const depId of dependsOn) {
          if (!allIds.has(depId)) {
            if (includeWarnings) {
              result.warnings.push(
                createIssue(
                  'ORPHANED_DEPENDENCY',
                  `[${itemId}] References non-existent TODO in 'depends_on': ${depId}`,
                  'warning',
                  {
                    filePath: todoPath,
                    line: item.yamlStartLine,
                    value: depId,
                    suggestion: `Remove the reference or ensure ${depId} exists`,
                  }
                )
              );
            }
          }
        }
      }

      // Check blocks references
      if (Array.isArray(blocks)) {
        for (const blockId of blocks) {
          if (!allIds.has(blockId)) {
            if (includeWarnings) {
              result.warnings.push(
                createIssue(
                  'ORPHANED_DEPENDENCY',
                  `[${itemId}] References non-existent TODO in 'blocks': ${blockId}`,
                  'warning',
                  {
                    filePath: todoPath,
                    line: item.yamlStartLine,
                    value: blockId,
                    suggestion: `Remove the reference or ensure ${blockId} exists`,
                  }
                )
              );
            }
          }
        }
      }
    }
  }

  // Set final result properties
  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;
  result.itemCount = items.length;

  return result;
}

/**
 * Default export for convenience
 */
export default validateTodo;
