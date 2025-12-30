/**
 * CHANGELOG.md Validator
 *
 * Validates CHANGELOG.md files against PKF standards including:
 * - Frontmatter schema validation (changelog-entry.schema.json)
 * - Semver format validation
 * - Date format validation
 * - Valid change types (added, changed, deprecated, removed, fixed, security)
 * - Reverse chronological order verification
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import {
  type ValidationResult,
  type ValidationOptions,
  type ValidationIssue,
  createEmptyResult,
  createIssue,
} from '../types/index.js';
import { fileExists, readJsonFile } from '../utils/file-utils.js';
import { validateWithSchema } from '../utils/schema-utils.js';

/**
 * Valid change type categories per Keep a Changelog specification
 */
const VALID_CHANGE_TYPES = [
  'added',
  'changed',
  'deprecated',
  'removed',
  'fixed',
  'security',
] as const;

type ChangeType = (typeof VALID_CHANGE_TYPES)[number];

/**
 * Parsed version entry from CHANGELOG.md
 */
interface ParsedVersionEntry {
  /** Raw header text (e.g., "[1.0.0] - 2025-12-24") */
  header: string;
  /** Version string (e.g., "1.0.0", "Unreleased") */
  version: string;
  /** Release date string (e.g., "2025-12-24") or null for Unreleased */
  date: string | null;
  /** Line number where the version header appears */
  line: number;
  /** Raw frontmatter YAML content if present */
  frontmatterYaml: string | null;
  /** Parsed frontmatter data */
  frontmatter: Record<string, unknown> | null;
  /** Change sections found (added, changed, etc.) */
  changeSections: Map<string, string[]>;
  /** Raw content of the version section */
  content: string;
}

/**
 * Semver regex pattern
 * Matches: major.minor.patch with optional prerelease and build metadata
 */
const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;

/**
 * Version header pattern in Keep a Changelog format
 * Matches: ## [version] - YYYY-MM-DD or ## [Unreleased]
 */
const VERSION_HEADER_PATTERN = /^##\s+\[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/;

/**
 * Change section header pattern
 * Matches: ### Added, ### Changed, etc.
 */
const CHANGE_SECTION_PATTERN = /^###\s+(\w+)/i;

/**
 * YAML code block pattern for embedded frontmatter
 */
const YAML_BLOCK_PATTERN = /```yaml\n([\s\S]*?)```/;

/**
 * Date format pattern (YYYY-MM-DD)
 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse semver string into components
 */
function parseSemver(
  version: string
): { major: number; minor: number; patch: number; prerelease: string | null } | null {
  const match = version.match(SEMVER_PATTERN);
  if (!match) return null;

  const majorStr = match[1];
  const minorStr = match[2];
  const patchStr = match[3];

  if (majorStr === undefined || minorStr === undefined || patchStr === undefined) {
    return null;
  }

  return {
    major: parseInt(majorStr, 10),
    minor: parseInt(minorStr, 10),
    patch: parseInt(patchStr, 10),
    prerelease: match[4] ?? null,
  };
}

/**
 * Compare two semver versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareSemver(a: string, b: string): number {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);

  // If either is unparseable, can't compare
  if (!parsedA || !parsedB) return 0;

  // Compare major.minor.patch
  if (parsedA.major !== parsedB.major) {
    return parsedA.major > parsedB.major ? 1 : -1;
  }
  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor > parsedB.minor ? 1 : -1;
  }
  if (parsedA.patch !== parsedB.patch) {
    return parsedA.patch > parsedB.patch ? 1 : -1;
  }

  // Prerelease versions have lower precedence
  if (parsedA.prerelease && !parsedB.prerelease) return -1;
  if (!parsedA.prerelease && parsedB.prerelease) return 1;

  // Both have prereleases, compare alphabetically
  if (parsedA.prerelease && parsedB.prerelease) {
    return parsedA.prerelease.localeCompare(parsedB.prerelease);
  }

  return 0;
}

/**
 * Compare two dates in YYYY-MM-DD format
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareDates(a: string, b: string): number {
  const dateA = new Date(a);
  const dateB = new Date(b);

  if (dateA < dateB) return -1;
  if (dateA > dateB) return 1;
  return 0;
}

/**
 * Validate a date string (YYYY-MM-DD format and valid date)
 */
function isValidDate(dateStr: string): boolean {
  if (!DATE_PATTERN.test(dateStr)) return false;

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
 * Parse YAML content into an object
 */
async function parseYaml(content: string): Promise<Record<string, unknown>> {
  const { parse } = await import('yaml');
  return parse(content) as Record<string, unknown>;
}

/**
 * Parse CHANGELOG.md content into version entries
 */
async function parseChangelogContent(
  content: string,
  filePath: string
): Promise<{ entries: ParsedVersionEntry[]; issues: ValidationIssue[] }> {
  const lines = content.split('\n');
  const entries: ParsedVersionEntry[] = [];
  const issues: ValidationIssue[] = [];

  let currentEntry: ParsedVersionEntry | null = null;
  let currentSection: string | null = null;
  let sectionContent: string[] = [];
  let entryContentLines: string[] = [];
  let inYamlBlock = false;
  let yamlLines: string[] = [];

  const finalizeCurrentEntry = () => {
    if (currentEntry) {
      // Save last section
      if (currentSection && sectionContent.length > 0) {
        currentEntry.changeSections.set(currentSection.toLowerCase(), sectionContent);
      }
      currentEntry.content = entryContentLines.join('\n');
      entries.push(currentEntry);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const lineNumber = i + 1;

    // Track YAML code blocks
    if (line.trim() === '```yaml') {
      inYamlBlock = true;
      yamlLines = [];
      continue;
    }

    if (inYamlBlock && line.trim() === '```') {
      inYamlBlock = false;
      if (currentEntry && yamlLines.length > 0) {
        currentEntry.frontmatterYaml = yamlLines.join('\n');
        try {
          currentEntry.frontmatter = await parseYaml(currentEntry.frontmatterYaml);
        } catch (error) {
          issues.push(
            createIssue(
              'YAML_PARSE_ERROR',
              `Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
              'error',
              { filePath, line: lineNumber }
            )
          );
        }
      }
      continue;
    }

    if (inYamlBlock) {
      yamlLines.push(line);
      continue;
    }

    // Check for version header
    const versionMatch = line.match(VERSION_HEADER_PATTERN);
    if (versionMatch) {
      finalizeCurrentEntry();

      const version = versionMatch[1] ?? '';
      const date = versionMatch[2] ?? null;

      currentEntry = {
        header: line,
        version,
        date,
        line: lineNumber,
        frontmatterYaml: null,
        frontmatter: null,
        changeSections: new Map(),
        content: '',
      };
      currentSection = null;
      sectionContent = [];
      entryContentLines = [];
      continue;
    }

    // Check for change section header
    const sectionMatch = line.match(CHANGE_SECTION_PATTERN);
    if (sectionMatch && currentEntry) {
      // Save previous section
      if (currentSection && sectionContent.length > 0) {
        currentEntry.changeSections.set(currentSection.toLowerCase(), sectionContent);
      }
      currentSection = sectionMatch[1] ?? null;
      sectionContent = [];
      entryContentLines.push(line);
      continue;
    }

    // Collect section items (list items starting with -)
    if (currentSection && line.trim().startsWith('-')) {
      const item = line.trim().substring(1).trim();
      if (item) {
        sectionContent.push(item);
      }
    }

    if (currentEntry) {
      entryContentLines.push(line);
    }
  }

  // Finalize last entry
  finalizeCurrentEntry();

  return { entries, issues };
}

/**
 * Validate a single changelog entry
 */
async function validateEntry(
  entry: ParsedVersionEntry,
  schema: object,
  filePath: string,
  options: ValidationOptions
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const isUnreleased = entry.version.toLowerCase() === 'unreleased';

  // Validate version format
  if (!isUnreleased) {
    if (!SEMVER_PATTERN.test(entry.version)) {
      issues.push(
        createIssue(
          'INVALID_SEMVER',
          `Version "${entry.version}" is not a valid semantic version`,
          'error',
          {
            filePath,
            line: entry.line,
            value: entry.version,
            expected: 'major.minor.patch[-prerelease][+build]',
            suggestion: 'Use semantic versioning format (e.g., 1.0.0, 1.0.0-alpha.1)',
          }
        )
      );
    }
  }

  // Validate date presence and format for released versions
  if (!isUnreleased) {
    if (!entry.date) {
      issues.push(
        createIssue(
          'MISSING_DATE',
          `Released version ${entry.version} is missing a release date`,
          'error',
          {
            filePath,
            line: entry.line,
            suggestion: 'Add date in format: ## [version] - YYYY-MM-DD',
          }
        )
      );
    } else if (!isValidDate(entry.date)) {
      issues.push(
        createIssue(
          'INVALID_DATE',
          `Invalid date "${entry.date}" for version ${entry.version}`,
          'error',
          {
            filePath,
            line: entry.line,
            value: entry.date,
            expected: 'YYYY-MM-DD format with valid date',
            suggestion: 'Use a valid date in YYYY-MM-DD format',
          }
        )
      );
    }
  }

  // Validate change section types
  for (const [sectionType] of entry.changeSections) {
    const normalizedType = sectionType.toLowerCase();
    if (!VALID_CHANGE_TYPES.includes(normalizedType as ChangeType)) {
      issues.push(
        createIssue(
          'INVALID_CHANGE_TYPE',
          `Invalid change type "${sectionType}" in version ${entry.version}`,
          'warning',
          {
            filePath,
            line: entry.line,
            value: sectionType,
            expected: VALID_CHANGE_TYPES,
            suggestion: `Use one of: ${VALID_CHANGE_TYPES.join(', ')}`,
          }
        )
      );
    }
  }

  // Validate frontmatter against schema if present
  if (entry.frontmatter) {
    const schemaResult = validateWithSchema(entry.frontmatter, schema, filePath);
    if (!schemaResult.valid) {
      for (const issue of schemaResult.issues) {
        issue.line = entry.line;
        issues.push(issue);
      }
    }

    // Cross-validate frontmatter with header info
    const fmVersion = entry.frontmatter.version as string | undefined;
    const fmDate = entry.frontmatter.date as string | null | undefined;
    const fmStatus = entry.frontmatter.status as string | undefined;

    // Version mismatch check
    if (fmVersion && fmVersion.toLowerCase() !== entry.version.toLowerCase()) {
      issues.push(
        createIssue(
          'VERSION_MISMATCH',
          `Frontmatter version "${fmVersion}" does not match header version "${entry.version}"`,
          'error',
          {
            filePath,
            line: entry.line,
            suggestion: 'Ensure frontmatter version matches the section header version',
          }
        )
      );
    }

    // Date mismatch check
    if (entry.date && fmDate && fmDate !== entry.date) {
      issues.push(
        createIssue(
          'DATE_MISMATCH',
          `Frontmatter date "${fmDate}" does not match header date "${entry.date}"`,
          'error',
          {
            filePath,
            line: entry.line,
            suggestion: 'Ensure frontmatter date matches the section header date',
          }
        )
      );
    }

    // Status consistency check
    if (isUnreleased && fmStatus && fmStatus !== 'unreleased') {
      issues.push(
        createIssue(
          'STATUS_MISMATCH',
          `Unreleased section has status "${fmStatus}" instead of "unreleased"`,
          'error',
          {
            filePath,
            line: entry.line,
            suggestion: 'Set status to "unreleased" for unreleased versions',
          }
        )
      );
    }

    if (!isUnreleased && fmStatus && fmStatus !== 'released') {
      issues.push(
        createIssue(
          'STATUS_MISMATCH',
          `Released version ${entry.version} has status "${fmStatus}" instead of "released"`,
          'error',
          {
            filePath,
            line: entry.line,
            suggestion: 'Set status to "released" for released versions',
          }
        )
      );
    }
  } else if (options.strict) {
    // In strict mode, require frontmatter
    issues.push(
      createIssue(
        'MISSING_FRONTMATTER',
        `Version ${entry.version} is missing YAML frontmatter`,
        'warning',
        {
          filePath,
          line: entry.line,
          suggestion: 'Add YAML frontmatter block with version, type, status, and date fields',
        }
      )
    );
  }

  // Check for empty version with no changes
  const hasChanges = Array.from(entry.changeSections.values()).some(
    (items) => items.length > 0 && items.some((item) => item.trim() !== '')
  );
  if (!hasChanges && !isUnreleased) {
    issues.push(
      createIssue(
        'EMPTY_VERSION',
        `Version ${entry.version} has no documented changes`,
        'warning',
        {
          filePath,
          line: entry.line,
          suggestion: 'Add changes under Added, Changed, Fixed, etc. sections',
        }
      )
    );
  }

  return issues;
}

/**
 * Validate chronological order of entries
 * Entries should be in reverse chronological order (newest first)
 */
function validateChronologicalOrder(
  entries: ParsedVersionEntry[],
  filePath: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Filter out Unreleased entry for ordering checks
  const releasedEntries = entries.filter(
    (e) => e.version.toLowerCase() !== 'unreleased'
  );

  // Check that Unreleased is first if present
  const unreleasedEntry = entries.find(
    (e) => e.version.toLowerCase() === 'unreleased'
  );
  if (unreleasedEntry && entries.indexOf(unreleasedEntry) !== 0) {
    issues.push(
      createIssue(
        'UNRELEASED_NOT_FIRST',
        'Unreleased section should be the first version entry',
        'error',
        {
          filePath,
          line: unreleasedEntry.line,
          suggestion: 'Move the [Unreleased] section to the top of the version list',
        }
      )
    );
  }

  // Check version order (should be descending)
  for (let i = 0; i < releasedEntries.length - 1; i++) {
    const current = releasedEntries[i];
    const next = releasedEntries[i + 1];

    // Skip if either entry is undefined (shouldn't happen, but TypeScript needs this)
    if (!current || !next) continue;

    const versionComparison = compareSemver(current.version, next.version);
    if (versionComparison < 0) {
      issues.push(
        createIssue(
          'VERSION_ORDER',
          `Version ${current.version} appears before ${next.version} but should be after (newer versions first)`,
          'error',
          {
            filePath,
            line: current.line,
            suggestion:
              'Arrange versions in reverse chronological order (newest first)',
          }
        )
      );
    }

    // Check date order if both have dates
    if (current.date && next.date) {
      const dateComparison = compareDates(current.date, next.date);
      if (dateComparison < 0) {
        issues.push(
          createIssue(
            'DATE_ORDER',
            `Date ${current.date} (version ${current.version}) is earlier than ${next.date} (version ${next.version})`,
            'error',
            {
              filePath,
              line: current.line,
              suggestion:
                'Arrange versions in reverse chronological order by date',
            }
          )
        );
      }
    }
  }

  return issues;
}

/**
 * Load the changelog entry schema
 */
async function loadChangelogSchema(
  rootDir?: string
): Promise<object> {
  // Try to find schema in common locations
  const schemaPaths = [
    rootDir ? resolve(rootDir, 'schemas/changelog-entry.schema.json') : null,
    resolve(process.cwd(), 'schemas/changelog-entry.schema.json'),
    resolve(process.cwd(), '../../schemas/changelog-entry.schema.json'),
  ].filter((p): p is string => p !== null);

  for (const schemaPath of schemaPaths) {
    if (await fileExists(schemaPath)) {
      return readJsonFile(schemaPath);
    }
  }

  // Return a minimal fallback schema if none found
  return {
    type: 'object',
    required: ['version', 'type', 'status'],
    properties: {
      version: { type: 'string' },
      type: { type: 'string', const: 'changelog-entry' },
      status: { type: 'string', enum: ['unreleased', 'released'] },
      date: { type: ['string', 'null'] },
    },
  };
}

/**
 * Validate a CHANGELOG.md file
 *
 * @param changelogPath - Path to the CHANGELOG.md file
 * @param options - Validation options
 * @returns Validation result with all errors and warnings
 */
export async function validateChangelog(
  changelogPath: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const startTime = Date.now();
  const result = createEmptyResult();
  const resolvedPath = resolve(changelogPath);

  try {
    // Check file exists
    if (!(await fileExists(resolvedPath))) {
      result.errors.push(
        createIssue('FILE_NOT_FOUND', `Changelog file not found: ${resolvedPath}`, 'error', {
          filePath: resolvedPath,
        })
      );
      result.valid = false;
      result.duration = Date.now() - startTime;
      return result;
    }

    // Read file content
    const content = await readFile(resolvedPath, 'utf-8');

    // Load schema
    const schema = await loadChangelogSchema(options.rootDir);

    // Parse changelog content
    const { entries, issues: parseIssues } = await parseChangelogContent(
      content,
      resolvedPath
    );

    // Add parse issues
    for (const issue of parseIssues) {
      if (issue.severity === 'error') {
        result.errors.push(issue);
      } else if (issue.severity === 'warning') {
        result.warnings.push(issue);
      } else {
        result.info.push(issue);
      }
    }

    // Validate no entries found
    if (entries.length === 0) {
      result.warnings.push(
        createIssue(
          'NO_VERSIONS',
          'No version entries found in changelog',
          'warning',
          {
            filePath: resolvedPath,
            suggestion: 'Add version sections using format: ## [1.0.0] - YYYY-MM-DD',
          }
        )
      );
    }

    // Validate each entry
    for (const entry of entries) {
      const entryIssues = await validateEntry(entry, schema, resolvedPath, options);

      for (const issue of entryIssues) {
        if (issue.severity === 'error') {
          result.errors.push(issue);
        } else if (issue.severity === 'warning') {
          result.warnings.push(issue);
        } else {
          result.info.push(issue);
        }
      }

      // Check max errors limit
      if (options.maxErrors && result.errors.length >= options.maxErrors) {
        result.info.push(
          createIssue(
            'MAX_ERRORS_REACHED',
            `Stopped validation after reaching ${options.maxErrors} errors`,
            'info',
            { filePath: resolvedPath }
          )
        );
        break;
      }
    }

    // Validate chronological order
    const orderIssues = validateChronologicalOrder(entries, resolvedPath);
    for (const issue of orderIssues) {
      if (issue.severity === 'error') {
        result.errors.push(issue);
      } else if (issue.severity === 'warning') {
        result.warnings.push(issue);
      } else {
        result.info.push(issue);
      }
    }

    // Set final result
    result.valid = result.errors.length === 0;
    result.itemCount = entries.length;
    result.duration = Date.now() - startTime;

    // Filter results based on options
    if (!options.includeWarnings) {
      // Warnings are included by default, only remove if explicitly set to false
      if (options.includeWarnings === false) {
        result.warnings = [];
      }
    }
    if (!options.includeInfo && options.includeInfo !== undefined) {
      result.info = [];
    }

    return result;
  } catch (error) {
    result.errors.push(
      createIssue(
        'VALIDATION_ERROR',
        `Failed to validate changelog: ${error instanceof Error ? error.message : String(error)}`,
        'error',
        { filePath: resolvedPath }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
}

/**
 * Changelog Validator class implementing the Validator interface
 */
export const changelogValidator = {
  name: 'changelog-validator',
  description:
    'Validates CHANGELOG.md files against PKF standards including semver, dates, and change types',

  async validate(
    changelogPath: string,
    options?: ValidationOptions
  ): Promise<ValidationResult> {
    return validateChangelog(changelogPath, options);
  },
};

export default validateChangelog;
