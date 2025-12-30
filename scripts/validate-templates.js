#!/usr/bin/env node
/**
 * PKF Template Validation Script
 *
 * Validates templates for:
 * 1. Proper placeholder format ({{PLACEHOLDER_NAME}})
 * 2. No unreplaced placeholders in non-template files
 * 3. Template structure compliance
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Placeholder regex pattern
const PLACEHOLDER_PATTERN = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;

// Results tracking
let totalErrors = 0;
let totalWarnings = 0;
let totalChecks = 0;

/**
 * Walk directory recursively
 */
function* walkDir(dir, exclude = []) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);

    // Skip excluded paths
    if (exclude.some(ex => filePath.includes(ex))) {
      continue;
    }

    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      yield* walkDir(filePath, exclude);
    } else {
      yield filePath;
    }
  }
}

/**
 * Check if file is a template
 */
function isTemplate(filePath) {
  return filePath.includes('/templates/') && filePath.endsWith('.template.md');
}

/**
 * Validate template file
 */
function validateTemplate(filePath) {
  totalChecks++;

  const content = readFileSync(filePath, 'utf-8');
  const placeholders = [...content.matchAll(PLACEHOLDER_PATTERN)];

  if (placeholders.length === 0) {
    console.log(`${colors.yellow}⚠ WARNING${colors.reset}: ${filePath}`);
    console.log(`  Template has no placeholders`);
    totalWarnings++;
    return;
  }

  // Extract unique placeholders
  const uniquePlaceholders = [...new Set(placeholders.map(m => m[1]))];

  console.log(`${colors.green}✓ VALID${colors.reset}: ${filePath}`);
  console.log(`  Found ${uniquePlaceholders.length} unique placeholders`);

  // Check for common placeholder issues
  const issues = [];

  for (const placeholder of uniquePlaceholders) {
    // Check naming convention (uppercase with underscores)
    if (!/^[A-Z][A-Z0-9_]*$/.test(placeholder)) {
      issues.push(`Invalid placeholder name: {{${placeholder}}} (should be UPPERCASE_WITH_UNDERSCORES)`);
    }
  }

  if (issues.length > 0) {
    console.log(`${colors.yellow}  Issues:${colors.reset}`);
    issues.forEach(issue => console.log(`    - ${issue}`));
    totalWarnings++;
  }
}

/**
 * Check if file is likely documentation about templates
 * (and thus placeholders are intentional examples)
 */
function isTemplateDocumentation(filePath, content) {
  // Files that document the template system itself
  const templateDocPaths = [
    '/framework/specifications/',
    '/guides/IMPLEMENTATION-GUIDE.md',
    '/implementation/tracking/',
  ];

  if (templateDocPaths.some(path => filePath.includes(path))) {
    return true;
  }

  // Check if file is documenting template usage (has many placeholder references)
  const placeholderMentions = (content.match(/placeholder/gi) || []).length;
  const templateMentions = (content.match(/template/gi) || []).length;

  // If file talks a lot about templates/placeholders, it's likely documentation
  return placeholderMentions > 3 || templateMentions > 5;
}

/**
 * Check for unreplaced placeholders in non-template files
 */
function checkForUnreplacedPlaceholders(filePath) {
  totalChecks++;

  const content = readFileSync(filePath, 'utf-8');
  const placeholders = [...content.matchAll(PLACEHOLDER_PATTERN)];

  if (placeholders.length > 0) {
    // Check if this is template documentation
    if (isTemplateDocumentation(filePath, content)) {
      console.log(`${colors.blue}ℹ SKIP${colors.reset}: ${filePath}`);
      console.log(`  Skipping (appears to be template documentation)`);
      return;
    }

    console.log(`${colors.red}✗ ERROR${colors.reset}: ${filePath}`);
    console.log(`  Found ${placeholders.length} unreplaced placeholder(s):`);

    const uniquePlaceholders = [...new Set(placeholders.map(m => m[0]))];
    uniquePlaceholders.forEach(p => console.log(`    - ${p}`));

    totalErrors++;
  }
}

/**
 * Main validation function
 */
function main() {
  console.log('=== PKF Template Validation ===\n');

  const projectRoot = process.cwd();
  const excludePaths = [
    'node_modules',
    '.git',
    '.pkf',
    'package-lock.json',
  ];

  console.log('1. Validating template files...\n');

  let templateCount = 0;
  for (const filePath of walkDir(join(projectRoot, 'templates'))) {
    if (extname(filePath) === '.md' && isTemplate(filePath)) {
      validateTemplate(filePath);
      templateCount++;
    }
  }

  console.log(`\nValidated ${templateCount} template file(s)\n`);

  console.log('2. Checking for unreplaced placeholders in documentation...\n');

  let docCount = 0;
  const docPaths = ['docs', 'README.md', 'CLAUDE.md'];

  for (const docPath of docPaths) {
    const fullPath = join(projectRoot, docPath);

    try {
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        for (const filePath of walkDir(fullPath, excludePaths)) {
          if (extname(filePath) === '.md') {
            checkForUnreplacedPlaceholders(filePath);
            docCount++;
          }
        }
      } else if (stat.isFile() && extname(fullPath) === '.md') {
        checkForUnreplacedPlaceholders(fullPath);
        docCount++;
      }
    } catch (err) {
      // Path doesn't exist, skip
    }
  }

  console.log(`\nChecked ${docCount} documentation file(s)\n`);

  // Summary
  console.log('=== Summary ===');
  console.log(`Total checks: ${totalChecks}`);
  console.log(`${colors.green}Passed: ${totalChecks - totalErrors - totalWarnings}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${totalWarnings}${colors.reset}`);
  console.log(`${colors.red}Errors: ${totalErrors}${colors.reset}\n`);

  if (totalErrors > 0) {
    console.log(`${colors.red}Validation failed!${colors.reset}`);
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(`${colors.yellow}Validation passed with warnings${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.green}All validations passed!${colors.reset}`);
    process.exit(0);
  }
}

// Run main
main();
