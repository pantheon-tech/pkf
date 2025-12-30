/**
 * PKF Issue Validator
 *
 * Validates ISSUES.md register files against the PKF issue-item schema.
 * Parses issue items, validates frontmatter, checks ID uniqueness, and validates
 * status/severity values.
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';
import {
  type ValidationResult,
  type ValidationIssue,
  type ValidationOptions,
  createEmptyResult,
  createIssue,
} from '../types/index.js';
import { fileExists, readTextFile, readJsonFile } from '../utils/index.js';
import { validateWithSchema } from '../utils/schema-utils.js';

/**
 * Parsed issue item from ISSUES.md
 */
export interface ParsedIssueItem {
  /** The issue ID (e.g., ISSUE-001) */
  id: string;
  /** The issue title from the heading */
  title: string;
  /** Line number where the issue starts */
  lineNumber: number;
  /** The parsed frontmatter/YAML data */
  frontmatter: Record<string, unknown>;
  /** Raw YAML content */
  rawYaml: string;
}

/**
 * Valid issue status values
 */
const VALID_STATUSES = ['open', 'investigating', 'in-progress', 'resolved', 'wontfix', 'duplicate'] as const;

/**
 * Valid severity values
 */
const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

/**
 * Issue ID pattern
 */
const ISSUE_ID_PATTERN = /^ISSUE-\d{3,}$/;

/**
 * Pattern to match issue headings (### ISSUE-XXX: Title)
 */
const ISSUE_HEADING_PATTERN = /^###\s+(ISSUE-\d{3,})(?::\s*(.*))?$/;

/**
 * Default schema path (relative to module location)
 */
function getDefaultSchemaPath(): string {
  // Resolve relative to this module
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // Go up from src/validators to package root, then to repo root, then to schemas
  return resolve(currentDir, '..', '..', '..', '..', 'schemas', 'issue-item.schema.json');
}

/**
 * Parse ISSUES.md content and extract individual issue items
 *
 * Looks for patterns like:
 * ### ISSUE-XXX: Title
 * ```yaml
 * frontmatter...
 * ```
 */
function parseIssueItems(
  content: string,
  filePath: string
): { issues: ParsedIssueItem[]; parseErrors: ValidationIssue[] } {
  const issues: ParsedIssueItem[] = [];
  const parseErrors: ValidationIssue[] = [];
  const lines = content.split('\n');

  let currentIssue: Partial<ParsedIssueItem> | null = null;
  let inYamlBlock = false;
  let yamlContent: string[] = [];
  let yamlStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const lineNumber = i + 1;

    // Check for issue heading
    const headingMatch = line.match(ISSUE_HEADING_PATTERN);
    if (headingMatch) {
      // Save previous issue if exists
      if (currentIssue && currentIssue.id) {
        issues.push(currentIssue as ParsedIssueItem);
      }

      const issueId = headingMatch[1] ?? '';
      currentIssue = {
        id: issueId,
        title: headingMatch[2]?.trim() || '',
        lineNumber,
        frontmatter: {},
        rawYaml: '',
      };
      continue;
    }

    // Track YAML blocks within an issue context
    if (currentIssue) {
      // Start of YAML block
      if (/^```ya?ml\s*$/.test(line)) {
        inYamlBlock = true;
        yamlContent = [];
        yamlStartLine = lineNumber;
        continue;
      }

      // End of YAML block
      if (inYamlBlock && /^```\s*$/.test(line)) {
        inYamlBlock = false;
        const rawYaml = yamlContent.join('\n');
        currentIssue.rawYaml = rawYaml;

        // Parse YAML content
        try {
          currentIssue.frontmatter = (parseYaml(rawYaml) as Record<string, unknown>) || {};
        } catch (error) {
          const issueId = currentIssue.id ?? 'unknown';
          parseErrors.push(
            createIssue(
              'YAML_PARSE_ERROR',
              `Failed to parse YAML for ${issueId}: ${error instanceof Error ? error.message : String(error)}`,
              'error',
              {
                filePath,
                line: yamlStartLine,
                value: rawYaml.substring(0, 100),
                suggestion: 'Check YAML syntax for errors',
              }
            )
          );
          currentIssue.frontmatter = {};
        }
        continue;
      }

      // Collect YAML content
      if (inYamlBlock) {
        yamlContent.push(line);
      }
    }
  }

  // Don't forget the last issue
  if (currentIssue && currentIssue.id) {
    issues.push(currentIssue as ParsedIssueItem);
  }

  return { issues, parseErrors };
}

/**
 * Validate ID uniqueness across all issues
 */
function validateIdUniqueness(
  issues: ParsedIssueItem[],
  filePath: string
): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const seenIds = new Map<string, number>();

  for (const issue of issues) {
    const existingLine = seenIds.get(issue.id);
    if (existingLine !== undefined) {
      errors.push(
        createIssue(
          'DUPLICATE_ID',
          `Duplicate issue ID '${issue.id}' found (first occurrence at line ${existingLine})`,
          'error',
          {
            filePath,
            line: issue.lineNumber,
            value: issue.id,
            suggestion: `Use a unique ID for this issue (e.g., increment the number)`,
          }
        )
      );
    } else {
      seenIds.set(issue.id, issue.lineNumber);
    }
  }

  return errors;
}

/**
 * Validate ID format
 */
function validateIdFormat(
  issue: ParsedIssueItem,
  filePath: string
): ValidationIssue[] {
  const errors: ValidationIssue[] = [];

  // Check heading ID format
  if (!ISSUE_ID_PATTERN.test(issue.id)) {
    errors.push(
      createIssue(
        'INVALID_ID_FORMAT',
        `Invalid issue ID format '${issue.id}': must match pattern ISSUE-XXX (e.g., ISSUE-001)`,
        'error',
        {
          filePath,
          line: issue.lineNumber,
          value: issue.id,
          expected: 'ISSUE-XXX where XXX is 3+ digits',
          suggestion: 'Use format ISSUE-001, ISSUE-002, etc.',
        }
      )
    );
  }

  // Check if frontmatter ID matches heading ID
  const frontmatterId = issue.frontmatter.id;
  if (frontmatterId && frontmatterId !== issue.id) {
    errors.push(
      createIssue(
        'ID_MISMATCH',
        `Issue heading ID '${issue.id}' does not match frontmatter ID '${frontmatterId}'`,
        'error',
        {
          filePath,
          line: issue.lineNumber,
          value: frontmatterId,
          expected: issue.id,
          suggestion: `Update frontmatter 'id' to match heading: ${issue.id}`,
        }
      )
    );
  }

  return errors;
}

/**
 * Validate issue status value
 */
function validateStatus(
  issue: ParsedIssueItem,
  filePath: string
): ValidationIssue[] {
  const warnings: ValidationIssue[] = [];
  const status = issue.frontmatter.status;

  if (status && typeof status === 'string') {
    if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      warnings.push(
        createIssue(
          'INVALID_STATUS',
          `Invalid status '${status}' for issue ${issue.id}`,
          'warning',
          {
            filePath,
            line: issue.lineNumber,
            value: status,
            expected: VALID_STATUSES,
            suggestion: `Use one of: ${VALID_STATUSES.join(', ')}`,
          }
        )
      );
    }
  }

  return warnings;
}

/**
 * Validate issue severity value
 */
function validateSeverity(
  issue: ParsedIssueItem,
  filePath: string
): ValidationIssue[] {
  const warnings: ValidationIssue[] = [];
  const severity = issue.frontmatter.severity;

  if (severity && typeof severity === 'string') {
    if (!VALID_SEVERITIES.includes(severity as typeof VALID_SEVERITIES[number])) {
      warnings.push(
        createIssue(
          'INVALID_SEVERITY',
          `Invalid severity '${severity}' for issue ${issue.id}`,
          'warning',
          {
            filePath,
            line: issue.lineNumber,
            value: severity,
            expected: VALID_SEVERITIES,
            suggestion: `Use one of: ${VALID_SEVERITIES.join(', ')}`,
          }
        )
      );
    }
  }

  return warnings;
}

/**
 * Check for missing frontmatter
 */
function validateHasFrontmatter(
  issue: ParsedIssueItem,
  filePath: string
): ValidationIssue[] {
  const warnings: ValidationIssue[] = [];

  if (!issue.rawYaml || Object.keys(issue.frontmatter).length === 0) {
    warnings.push(
      createIssue(
        'MISSING_FRONTMATTER',
        `Issue ${issue.id} has no YAML frontmatter block`,
        'warning',
        {
          filePath,
          line: issue.lineNumber,
          suggestion: 'Add a YAML code block with issue metadata after the heading',
        }
      )
    );
  }

  return warnings;
}

/**
 * Validate related issue references
 */
function validateRelatedIssues(
  issue: ParsedIssueItem,
  allIssueIds: Set<string>,
  filePath: string
): ValidationIssue[] {
  const warnings: ValidationIssue[] = [];
  const relatedIssues = issue.frontmatter.related_issues;

  if (Array.isArray(relatedIssues)) {
    for (const relatedId of relatedIssues) {
      if (typeof relatedId === 'string') {
        // Check format
        if (!ISSUE_ID_PATTERN.test(relatedId)) {
          warnings.push(
            createIssue(
              'INVALID_RELATED_ID_FORMAT',
              `Invalid related issue ID format '${relatedId}' in issue ${issue.id}`,
              'warning',
              {
                filePath,
                line: issue.lineNumber,
                value: relatedId,
                suggestion: 'Use format ISSUE-XXX',
              }
            )
          );
        }

        // Check self-reference
        if (relatedId === issue.id) {
          warnings.push(
            createIssue(
              'SELF_REFERENCE',
              `Issue ${issue.id} references itself in related_issues`,
              'warning',
              {
                filePath,
                line: issue.lineNumber,
                suggestion: 'Remove self-reference from related_issues',
              }
            )
          );
        }
      }
    }
  }

  return warnings;
}

/**
 * Main validation function for ISSUES.md
 *
 * @param issuesPath - Path to the ISSUES.md file
 * @param options - Validation options
 * @returns Validation result with errors and warnings
 */
export async function validateIssues(
  issuesPath: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const startTime = Date.now();
  const result = createEmptyResult();
  const resolvedPath = resolve(issuesPath);

  // Check if file exists
  if (!(await fileExists(resolvedPath))) {
    result.errors.push(
      createIssue(
        'FILE_NOT_FOUND',
        `ISSUES.md file not found at: ${resolvedPath}`,
        'error',
        {
          filePath: resolvedPath,
          suggestion: 'Create an ISSUES.md file or check the path',
        }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Read and parse the file
  let content: string;
  try {
    content = await readTextFile(resolvedPath);
  } catch (error) {
    result.errors.push(
      createIssue(
        'FILE_READ_ERROR',
        `Failed to read ISSUES.md: ${error instanceof Error ? error.message : String(error)}`,
        'error',
        {
          filePath: resolvedPath,
        }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Parse issues from content
  const { issues, parseErrors } = parseIssueItems(content, resolvedPath);
  result.errors.push(...parseErrors);

  // If no issues found, return early with info message
  if (issues.length === 0) {
    result.info.push(
      createIssue(
        'NO_ISSUES_FOUND',
        'No issue items found in ISSUES.md',
        'info',
        {
          filePath: resolvedPath,
          suggestion: 'Add issues using ### ISSUE-XXX: Title format',
        }
      )
    );
    result.valid = result.errors.length === 0;
    result.duration = Date.now() - startTime;
    result.itemCount = 0;
    return result;
  }

  // Load schema for validation
  let schema: object | null = null;
  const schemaPath = getDefaultSchemaPath();

  try {
    if (await fileExists(schemaPath)) {
      schema = await readJsonFile<object>(schemaPath);
    }
  } catch (error) {
    result.warnings.push(
      createIssue(
        'SCHEMA_LOAD_ERROR',
        `Could not load issue schema: ${error instanceof Error ? error.message : String(error)}`,
        'warning',
        {
          filePath: schemaPath,
          suggestion: 'Schema validation will be skipped',
        }
      )
    );
  }

  // Collect all issue IDs for cross-reference validation
  const allIssueIds = new Set(issues.map((i) => i.id));

  // Validate ID uniqueness first
  result.errors.push(...validateIdUniqueness(issues, resolvedPath));

  // Validate each issue
  for (const issue of issues) {
    // Validate ID format
    result.errors.push(...validateIdFormat(issue, resolvedPath));

    // Check for missing frontmatter
    const frontmatterWarnings = validateHasFrontmatter(issue, resolvedPath);
    if (options.includeWarnings !== false) {
      result.warnings.push(...frontmatterWarnings);
    }

    // Skip further validation if no frontmatter
    if (Object.keys(issue.frontmatter).length === 0) {
      continue;
    }

    // Validate against schema if available
    if (schema) {
      const schemaResult = validateWithSchema(issue.frontmatter, schema, resolvedPath);
      if (!schemaResult.valid) {
        // Add issue context to error messages
        for (const err of schemaResult.issues) {
          result.errors.push({
            ...err,
            message: `[${issue.id}] ${err.message}`,
            line: issue.lineNumber,
          });
        }
      }
    }

    // Validate status (even without schema)
    const statusWarnings = validateStatus(issue, resolvedPath);
    if (options.includeWarnings !== false) {
      result.warnings.push(...statusWarnings);
    }

    // Validate severity (even without schema)
    const severityWarnings = validateSeverity(issue, resolvedPath);
    if (options.includeWarnings !== false) {
      result.warnings.push(...severityWarnings);
    }

    // Validate related issues
    const relatedWarnings = validateRelatedIssues(issue, allIssueIds, resolvedPath);
    if (options.includeWarnings !== false) {
      result.warnings.push(...relatedWarnings);
    }

    // Check for max errors
    if (options.maxErrors && result.errors.length >= options.maxErrors) {
      result.warnings.push(
        createIssue(
          'MAX_ERRORS_REACHED',
          `Maximum error count (${options.maxErrors}) reached, stopping validation`,
          'warning',
          {
            filePath: resolvedPath,
          }
        )
      );
      break;
    }
  }

  // Set final result
  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;
  result.itemCount = issues.length;

  return result;
}

/**
 * Export the parsed issues for use by other validators/tools
 */
export async function parseIssues(issuesPath: string): Promise<ParsedIssueItem[]> {
  const resolvedPath = resolve(issuesPath);

  if (!(await fileExists(resolvedPath))) {
    return [];
  }

  const content = await readTextFile(resolvedPath);
  const { issues } = parseIssueItems(content, resolvedPath);
  return issues;
}

/**
 * Default export for convenience
 */
export default validateIssues;
