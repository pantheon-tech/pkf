/**
 * PKF Validator
 * Main entry point for validation functions
 */

export * from './types/index.js';
export * from './validators/index.js';
export * from './parsers/index.js';

import {
  type ValidationResult,
  type ValidationOptions,
  createEmptyResult,
  mergeResults,
} from './types/index.js';
import { validateConfig } from './validators/config-validator.js';
import { validateTodo } from './validators/todo-validator.js';
import { validateIssues } from './validators/issue-validator.js';
import { validateChangelog } from './validators/changelog-validator.js';
import { fileExists, getRegistersPath } from './utils/file-utils.js';
import { join } from 'path';

/**
 * Options for validateAll
 */
export interface ValidateAllOptions extends ValidationOptions {
  /** Skip config validation */
  skipConfig?: boolean;
  /** Skip TODO validation */
  skipTodo?: boolean;
  /** Skip Issues validation */
  skipIssues?: boolean;
  /** Skip Changelog validation */
  skipChangelog?: boolean;
}

/**
 * Run all validators
 */
export async function validateAll(
  options: ValidateAllOptions = {}
): Promise<ValidationResult> {
  const startTime = Date.now();
  const rootDir = options.rootDir || process.cwd();
  const registersPath = getRegistersPath(rootDir);

  const results: ValidationResult[] = [];
  let itemCount = 0;

  // Validate config
  if (!options.skipConfig) {
    const configPath = join(rootDir, 'pkf.config.yaml');
    if (await fileExists(configPath)) {
      const configResult = await validateConfig({ ...options, rootDir });
      results.push(configResult);
      itemCount++;
    }
  }

  // Validate TODO
  if (!options.skipTodo) {
    const todoPath = join(registersPath, 'TODO.md');
    if (await fileExists(todoPath)) {
      const todoResult = await validateTodo(todoPath, options);
      results.push(todoResult);
      itemCount += todoResult.itemCount ?? 1;
    }
  }

  // Validate Issues
  if (!options.skipIssues) {
    const issuesPath = join(registersPath, 'ISSUES.md');
    if (await fileExists(issuesPath)) {
      const issuesResult = await validateIssues(issuesPath, options);
      results.push(issuesResult);
      itemCount += issuesResult.itemCount ?? 1;
    }
  }

  // Validate Changelog
  if (!options.skipChangelog) {
    const changelogPath = join(registersPath, 'CHANGELOG.md');
    if (await fileExists(changelogPath)) {
      const changelogResult = await validateChangelog(changelogPath, options);
      results.push(changelogResult);
      itemCount += changelogResult.itemCount ?? 1;
    }
  }

  // Merge all results
  const merged = results.length > 0 ? mergeResults(...results) : createEmptyResult();
  merged.duration = Date.now() - startTime;
  merged.itemCount = itemCount;

  return merged;
}
