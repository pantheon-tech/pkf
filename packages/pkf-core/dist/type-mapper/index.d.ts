/**
 * PKF Type-to-Directory Mapping
 *
 * Comprehensive mapping of document types to their PKF-compliant directories.
 * This module provides utilities for detecting document types from file paths,
 * resolving target directories, and managing document type schemas.
 *
 * @module type-mapper
 */
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
export declare const PKF_TYPE_TO_DIRECTORY: Record<string, string>;
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
export declare const ROOT_LEVEL_FILES: Set<string>;
/**
 * Files that should remain at package root (in monorepos).
 * These files are important for individual packages in a monorepo structure.
 *
 * @example
 * ```typescript
 * PACKAGE_ROOT_FILES.has('README.md') // true
 * ```
 */
export declare const PACKAGE_ROOT_FILES: Set<string>;
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
export declare function detectDocumentType(filePath: string, content?: string): string;
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
export declare function resolveTargetPath(sourcePath: string, docType: string, _rootDir: string, _docsDir?: string): string;
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
export declare function getRequiredDirectories(docTypes: Set<string>): string[];
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
export declare function shouldExcludeFromReorganization(filePath: string): boolean;
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
export declare function normalizeDocType(docType: string): string;
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
export declare const DOC_TYPE_TO_SCHEMA: Record<string, string>;
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
export declare function getSchemaForDocType(docType: string): string;
/**
 * Default export containing all main exports for convenience.
 */
declare const _default: {
    PKF_TYPE_TO_DIRECTORY: Record<string, string>;
    DOC_TYPE_TO_SCHEMA: Record<string, string>;
    detectDocumentType: typeof detectDocumentType;
    resolveTargetPath: typeof resolveTargetPath;
    getRequiredDirectories: typeof getRequiredDirectories;
    shouldExcludeFromReorganization: typeof shouldExcludeFromReorganization;
    normalizeDocType: typeof normalizeDocType;
    getSchemaForDocType: typeof getSchemaForDocType;
    ROOT_LEVEL_FILES: Set<string>;
    PACKAGE_ROOT_FILES: Set<string>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map