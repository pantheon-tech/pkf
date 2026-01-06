/**
 * PKF Type-to-Directory Mapping
 *
 * Comprehensive mapping of document types to their PKF-compliant directories.
 * This module provides utilities for detecting document types from file paths,
 * resolving target directories, and managing document type schemas.
 *
 * @module type-mapper
 */

import * as path from 'path';

/**
 * Comprehensive PKF document type to directory mapping.
 * Maps all recognized document types to their target directories in the PKF structure.
 *
 * @example
 * ```typescript
 * const targetDir = PKF_TYPE_TO_DIRECTORY['guide'];
 * // Returns: 'docs/guides'
 * ```
 */
export const PKF_TYPE_TO_DIRECTORY: Record<string, string> = {
  // README types - stay at root or section roots
  'readme': '',
  'project-readme': '',

  // Guide types -> docs/guides/
  'guide': 'docs/guides',
  'guide-user': 'docs/guides',
  'guide-developer': 'docs/guides',
  'user-guide': 'docs/guides',
  'developer-guide': 'docs/guides',
  'getting-started': 'docs/guides',
  'installation-guide': 'docs/guides',
  'tutorial': 'docs/guides',
  'howto': 'docs/guides',
  'quickstart': 'docs/guides',
  'walkthrough': 'docs/guides',

  // API types -> docs/api/
  'api': 'docs/api',
  'api-reference': 'docs/api',
  'api-doc': 'docs/api',
  'openapi': 'docs/api',
  'rest-api': 'docs/api',
  'graphql-api': 'docs/api',

  // Architecture types -> docs/architecture/
  'architecture': 'docs/architecture',
  'design-doc': 'docs/architecture',
  'system-design': 'docs/architecture',
  'component-design': 'docs/architecture',

  // ADR types -> docs/architecture/decisions/
  'adr': 'docs/architecture/decisions',
  'decision-record': 'docs/architecture/decisions',

  // Specification types -> docs/framework/specifications/
  'spec': 'docs/framework/specifications',
  'specification': 'docs/framework/specifications',

  // Reference types -> docs/references/
  'reference': 'docs/references',

  // Proposal types -> docs/proposals/active/
  'proposal': 'docs/proposals/active',
  'rfc': 'docs/proposals/active',
  'enhancement': 'docs/proposals/active',

  // Register types -> docs/registers/
  'register': 'docs/registers',
  'todo': 'docs/registers',
  'issue': 'docs/registers',
  'issues': 'docs/registers',
  'changelog': 'docs/registers',

  // Config types -> docs/
  'config': 'docs',
  'configuration': 'docs',

  // Template types -> docs/framework/templates/
  'template': 'docs/framework/templates',

  // Example types -> docs/examples/
  'example': 'docs/examples',
  'sample': 'docs/examples',

  // Root-level files
  'contributing': '',
  'code-of-conduct': '',
  'license': '',

  // Research and notes
  'research': 'docs/research',
  'notes': 'docs/notes',

  // Implementation plans
  'implementation-plan': 'docs/implementation',
  'workstream': 'docs/implementation',

  // Fallback for unrecognized types
  'generic': 'docs',
  'other': 'docs',
};

/**
 * Patterns for detecting document types from file paths.
 * Patterns are evaluated in order, first match wins.
 */
const TYPE_DETECTION_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  // README files
  { pattern: /^readme\.md$/i, type: 'readme' },
  { pattern: /\/readme\.md$/i, type: 'readme' },

  // Changelog
  { pattern: /changelog\.md$/i, type: 'changelog' },
  { pattern: /changes\.md$/i, type: 'changelog' },
  { pattern: /history\.md$/i, type: 'changelog' },

  // Contributing
  { pattern: /contributing\.md$/i, type: 'contributing' },
  { pattern: /code[_-]of[_-]conduct\.md$/i, type: 'code-of-conduct' },

  // License
  { pattern: /license\.md$/i, type: 'license' },

  // ADRs
  { pattern: /adr[s]?\/.*\.md$/i, type: 'adr' },
  { pattern: /decisions?\/.*\.md$/i, type: 'adr' },
  { pattern: /ADR-\d+/i, type: 'adr' },

  // Proposals
  { pattern: /proposals?\/.*\.md$/i, type: 'proposal' },
  { pattern: /rfcs?\/.*\.md$/i, type: 'rfc' },
  { pattern: /PROP-\d+/i, type: 'proposal' },

  // API docs
  { pattern: /api[s]?\/.*\.md$/i, type: 'api-reference' },
  { pattern: /api[-_]?(reference|docs?)\.md$/i, type: 'api-reference' },

  // Architecture docs
  { pattern: /architecture\/.*\.md$/i, type: 'architecture' },
  { pattern: /design\/.*\.md$/i, type: 'architecture' },

  // Guides
  { pattern: /guides?\/.*\.md$/i, type: 'guide' },
  { pattern: /tutorials?\/.*\.md$/i, type: 'tutorial' },
  { pattern: /howto\/.*\.md$/i, type: 'howto' },
  { pattern: /getting[-_]?started\.md$/i, type: 'getting-started' },
  { pattern: /quickstart\.md$/i, type: 'quickstart' },

  // Examples
  { pattern: /examples?\/.*\.md$/i, type: 'example' },
  { pattern: /samples?\/.*\.md$/i, type: 'sample' },

  // Registers
  { pattern: /registers?\/.*\.md$/i, type: 'register' },
  { pattern: /todo\.md$/i, type: 'todo' },
  { pattern: /issues\.md$/i, type: 'issues' },

  // Templates
  { pattern: /templates?\/.*\.md$/i, type: 'template' },
  { pattern: /\.template\.md$/i, type: 'template' },

  // Specifications
  { pattern: /specifications?\/.*\.md$/i, type: 'specification' },
  { pattern: /specs?\/.*\.md$/i, type: 'spec' },

  // Research
  { pattern: /research\/.*\.md$/i, type: 'research' },

  // Implementation
  { pattern: /implementation\/.*\.md$/i, type: 'implementation-plan' },
  { pattern: /workstreams?\/.*\.md$/i, type: 'workstream' },
  { pattern: /ws-\d+.*\.md$/i, type: 'workstream' },
];

/**
 * Files that should remain at project root.
 * These files are standard project files that belong at the repository root.
 *
 * @example
 * ```typescript
 * ROOT_LEVEL_FILES.has('README.md') // true
 * ROOT_LEVEL_FILES.has('docs/guide.md') // false
 * ```
 */
export const ROOT_LEVEL_FILES = new Set([
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'LICENSE.md',
  'LICENSE',
  'CLAUDE.md',
  'RULES.md',
  'CONVENTIONS.md',
]);

/**
 * Files that should remain at package root (in monorepos).
 * These files are important for individual packages in a monorepo structure.
 *
 * @example
 * ```typescript
 * PACKAGE_ROOT_FILES.has('README.md') // true
 * ```
 */
export const PACKAGE_ROOT_FILES = new Set([
  'README.md',
  'CHANGELOG.md',
  'CLAUDE.md',
]);

/**
 * Detect document type from file path.
 *
 * Uses pattern matching and optional content analysis to determine
 * the document type. Patterns are evaluated first, then content-based
 * detection is applied if content is provided.
 *
 * @param filePath - Path to the file (relative or absolute)
 * @param content - Optional file content for additional hints
 * @returns Detected document type
 *
 * @example
 * ```typescript
 * detectDocumentType('docs/api/reference.md') // 'api-reference'
 * detectDocumentType('README.md') // 'readme'
 * detectDocumentType('unknown.md', '## API\n### Endpoints') // 'api-reference'
 * ```
 */
export function detectDocumentType(filePath: string, content?: string): string {
  const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');

  // Check against patterns
  for (const { pattern, type } of TYPE_DETECTION_PATTERNS) {
    if (pattern.test(normalizedPath)) {
      return type;
    }
  }

  // Content-based detection if content provided
  if (content) {
    const lowerContent = content.toLowerCase();

    // API documentation indicators
    if (lowerContent.includes('## api') ||
        lowerContent.includes('### endpoints') ||
        lowerContent.includes('## methods')) {
      return 'api-reference';
    }

    // Architecture indicators
    if (lowerContent.includes('## architecture') ||
        lowerContent.includes('## design') ||
        lowerContent.includes('## system overview')) {
      return 'architecture';
    }

    // Guide indicators
    if (lowerContent.includes('## getting started') ||
        lowerContent.includes('## installation') ||
        lowerContent.includes('## prerequisites')) {
      return 'guide';
    }
  }

  return 'generic';
}

/**
 * Resolve target path for a document.
 *
 * Determines the PKF-compliant target path for a document based on its type,
 * current location, and project structure (including monorepo support).
 *
 * @param sourcePath - Current path of the document (relative to project root)
 * @param docType - Document type
 * @param rootDir - Project root directory
 * @param _docsDir - Docs directory (usually 'docs', reserved for future use)
 * @returns Target path in PKF-compliant structure
 *
 * @example
 * ```typescript
 * resolveTargetPath('guide.md', 'guide', '/project', 'docs')
 * // Returns: 'docs/guides/guide.md'
 *
 * resolveTargetPath('README.md', 'readme', '/project', 'docs')
 * // Returns: 'README.md' (stays at root)
 * ```
 */
export function resolveTargetPath(
  sourcePath: string,
  docType: string,
  _rootDir: string,
  _docsDir: string = 'docs'
): string {
  const fileName = path.basename(sourcePath);
  const normalizedType = docType.toLowerCase().replace(/[_\s]+/g, '-');

  // Check if file is in a package directory (monorepo support) first
  const pathParts = sourcePath.split(path.sep);
  const packagesIndex = pathParts.findIndex(p => p === 'packages' || p === 'libs');
  if (packagesIndex >= 0 && packagesIndex < pathParts.length - 2) {
    const packageName = pathParts[packagesIndex + 1];
    const packagesDir = pathParts[packagesIndex];
    if (packageName && packagesDir && PACKAGE_ROOT_FILES.has(fileName)) {
      return path.join(packagesDir, packageName, fileName);
    }
  }

  // Check if file should stay at root
  if (ROOT_LEVEL_FILES.has(fileName)) {
    return fileName;
  }

  // Get target directory from mapping
  const targetDir = PKF_TYPE_TO_DIRECTORY[normalizedType] || PKF_TYPE_TO_DIRECTORY['generic'];

  // If target directory is empty, file goes to root
  if (!targetDir) {
    return fileName;
  }

  // Preserve subdirectory structure for certain types
  if (normalizedType === 'example' || normalizedType === 'sample') {
    // Examples often have subdirectory structure worth preserving
    const docsIndex = sourcePath.toLowerCase().indexOf('examples');
    if (docsIndex >= 0) {
      const subPath = sourcePath.substring(docsIndex + 'examples'.length + 1);
      return path.join('docs/examples', subPath || fileName);
    }
  }

  return path.join(targetDir, fileName);
}

/**
 * Get all directories that need to be created for a set of document types.
 *
 * Analyzes a set of document types and returns all directories (including
 * parent directories) that need to be created to support those types.
 *
 * @param docTypes - Set of document types found in the project
 * @returns Array of directory paths to create, sorted alphabetically
 *
 * @example
 * ```typescript
 * getRequiredDirectories(new Set(['guide', 'api-reference']))
 * // Returns: ['docs', 'docs/api', 'docs/guides', 'docs/registers']
 * ```
 */
export function getRequiredDirectories(docTypes: Set<string>): string[] {
  const dirs = new Set<string>();

  // Always create base directories
  dirs.add('docs');
  dirs.add('docs/registers');

  // Add directories based on document types
  for (const docType of docTypes) {
    const normalizedType = docType.toLowerCase().replace(/[_\s]+/g, '-');
    const targetDir = PKF_TYPE_TO_DIRECTORY[normalizedType];

    if (targetDir) {
      // Add the directory and all parent directories
      const parts = targetDir.split('/');
      let currentPath = '';
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        dirs.add(currentPath);
      }
    }
  }

  return Array.from(dirs).sort();
}

/**
 * Check if a path should be excluded from reorganization.
 *
 * Determines whether a file path should be skipped during documentation
 * reorganization. Excludes common build artifacts, dependencies, and
 * temporary directories.
 *
 * @param filePath - Path to check
 * @returns true if the path should be excluded, false otherwise
 *
 * @example
 * ```typescript
 * shouldExcludeFromReorganization('node_modules/pkg/readme.md') // true
 * shouldExcludeFromReorganization('docs/guide.md') // false
 * shouldExcludeFromReorganization('dist/index.js') // true
 * ```
 */
export function shouldExcludeFromReorganization(filePath: string): boolean {
  const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');

  // Exclude node_modules, .git, etc.
  const excludePatterns = [
    /node_modules\//,
    /\.git\//,
    /\.next\//,
    /\.nuxt\//,
    /dist\//,
    /build\//,
    /coverage\//,
    /\.cache\//,
    /\.turbo\//,
    /vendor\//,
    /__pycache__\//,
    /\.venv\//,
    /venv\//,
    /\.pkf-backup\//,
  ];

  return excludePatterns.some(pattern => pattern.test(normalizedPath));
}

/**
 * Normalize a document type to its canonical form.
 *
 * Converts document types to a standardized format and resolves common
 * aliases to their canonical types.
 *
 * @param docType - Document type to normalize
 * @returns Normalized document type
 *
 * @example
 * ```typescript
 * normalizeDocType('User Guide') // 'guide-user'
 * normalizeDocType('API_DOCS') // 'api-reference'
 * normalizeDocType('decision') // 'adr'
 * ```
 */
export function normalizeDocType(docType: string): string {
  const normalized = docType.toLowerCase().replace(/[_\s]+/g, '-');

  // Map common variations to canonical types
  const typeAliases: Record<string, string> = {
    'user-guide': 'guide-user',
    'developer-guide': 'guide-developer',
    'dev-guide': 'guide-developer',
    'api-docs': 'api-reference',
    'api-doc': 'api-reference',
    'decision': 'adr',
    'arch-decision': 'adr',
    'todo-list': 'todo',
    'issue-tracker': 'issues',
    'changelog-entry': 'changelog',
  };

  return typeAliases[normalized] || normalized;
}

/**
 * Map document types to PKF schema names.
 *
 * This mapping connects blueprint document types to actual schema definitions
 * that can be used for validation.
 *
 * @example
 * ```typescript
 * DOC_TYPE_TO_SCHEMA['guide'] // 'guide'
 * DOC_TYPE_TO_SCHEMA['api-reference'] // 'spec'
 * DOC_TYPE_TO_SCHEMA['readme'] // 'base-doc'
 * ```
 */
export const DOC_TYPE_TO_SCHEMA: Record<string, string> = {
  // README files → base-doc
  'readme': 'base-doc',
  'project-readme': 'base-doc',

  // Guide types → guide
  'guide': 'guide',
  'guide-user': 'guide',
  'guide-developer': 'guide',
  'user-guide': 'guide',
  'developer-guide': 'guide',
  'getting-started': 'guide',
  'installation-guide': 'guide',
  'tutorial': 'guide',
  'howto': 'guide',
  'quickstart': 'guide',
  'walkthrough': 'guide',

  // API types → spec
  'api': 'spec',
  'api-reference': 'spec',
  'api-doc': 'spec',
  'openapi': 'spec',
  'rest-api': 'spec',
  'graphql-api': 'spec',

  // Architecture types → base-doc (or custom architecture schema if defined)
  'architecture': 'base-doc',
  'design-doc': 'base-doc',
  'system-design': 'base-doc',
  'component-design': 'base-doc',

  // ADR types → adr
  'adr': 'adr',
  'decision-record': 'adr',

  // Specification types → spec
  'spec': 'spec',
  'specification': 'spec',

  // Reference types → base-doc
  'reference': 'base-doc',

  // Proposal types → proposal (if defined) or base-doc
  'proposal': 'proposal',
  'rfc': 'proposal',
  'enhancement': 'proposal',

  // Register types → register
  'register': 'register',
  'todo': 'register',
  'issue': 'register',
  'issues': 'register',
  'changelog': 'register',

  // Config types → base-doc
  'config': 'base-doc',
  'configuration': 'base-doc',

  // Template types → base-doc
  'template': 'base-doc',

  // Example types → base-doc
  'example': 'base-doc',
  'sample': 'base-doc',

  // Root-level files → base-doc
  'contributing': 'base-doc',
  'code-of-conduct': 'base-doc',
  'license': 'base-doc',

  // Research and notes → base-doc
  'research': 'base-doc',
  'notes': 'base-doc',

  // Implementation plans → base-doc
  'implementation-plan': 'base-doc',
  'workstream': 'base-doc',

  // Fallback
  'generic': 'base-doc',
  'other': 'base-doc',
};

/**
 * Get schema name for a document type.
 *
 * Resolves the appropriate schema name for a given document type,
 * falling back to 'base-doc' if no specific mapping exists.
 *
 * @param docType - Document type
 * @returns Schema name to use for validation
 *
 * @example
 * ```typescript
 * getSchemaForDocType('guide') // 'guide'
 * getSchemaForDocType('user-guide') // 'guide' (after normalization)
 * getSchemaForDocType('unknown') // 'base-doc' (fallback)
 * ```
 */
export function getSchemaForDocType(docType: string): string {
  const normalized = normalizeDocType(docType);
  return DOC_TYPE_TO_SCHEMA[normalized] || 'base-doc';
}

/**
 * Default export containing all main exports for convenience.
 */
export default {
  PKF_TYPE_TO_DIRECTORY,
  DOC_TYPE_TO_SCHEMA,
  detectDocumentType,
  resolveTargetPath,
  getRequiredDirectories,
  shouldExcludeFromReorganization,
  normalizeDocType,
  getSchemaForDocType,
  ROOT_LEVEL_FILES,
  PACKAGE_ROOT_FILES,
};
