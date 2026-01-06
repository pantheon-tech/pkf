/**
 * Reference Updater Utility
 * Handles parsing and updating markdown links when files are moved
 */
import type { CrossReference, BrokenLink } from '../types/index.js';
/**
 * Parsed markdown link
 */
export interface MarkdownLink {
    /** Full match including brackets and parentheses */
    fullMatch: string;
    /** Link text displayed */
    text: string;
    /** Link path/URL */
    path: string;
    /** Optional title attribute */
    title?: string;
    /** Start position in content */
    start: number;
    /** End position in content */
    end: number;
    /** Line number (1-indexed) */
    lineNumber: number;
    /** Column start (1-indexed) */
    columnStart: number;
    /** Whether this is an image link */
    isImage: boolean;
    /** Anchor/hash if present */
    anchor?: string;
}
/**
 * Link update result
 */
export interface LinkUpdate {
    /** Original link path */
    original: string;
    /** Updated link path */
    updated: string;
    /** Line number where update occurred */
    lineNumber: number;
    /** Column where link starts */
    columnStart: number;
    /** Column where link ends */
    columnEnd: number;
}
/**
 * Result of updating links in content
 */
export interface UpdateLinksResult {
    /** Updated content */
    content: string;
    /** List of updates made */
    updates: LinkUpdate[];
    /** Whether any updates were made */
    hasChanges: boolean;
}
/**
 * ReferenceUpdater - Parse and update markdown links
 */
export declare class ReferenceUpdater {
    /**
     * Regular expression for markdown links
     * Matches: [text](path) or [text](path "title") or ![alt](path)
     */
    private static readonly LINK_REGEX;
    /** Project root directory */
    private rootDir;
    /**
     * Create a new ReferenceUpdater
     * @param rootDir - Project root directory (optional, defaults to current directory)
     */
    constructor(rootDir?: string);
    /**
     * Find all markdown links in content
     *
     * @param content - Markdown content to parse
     * @returns Array of parsed links
     */
    findLinks(content: string): MarkdownLink[];
    /**
     * Check if a path is a relative file path (not URL or anchor-only)
     *
     * @param linkPath - Path to check
     * @returns true if relative file path
     */
    isRelativeFilePath(linkPath: string): boolean;
    /**
     * Calculate the new relative path when files move
     *
     * @param linkFromFile - File containing the link (old location)
     * @param linkToFile - File being linked to (old location)
     * @param newLinkFromFile - New location of file containing link
     * @param newLinkToFile - New location of file being linked to
     * @returns New relative path from newLinkFromFile to newLinkToFile
     */
    calculateNewPath(linkFromFile: string, linkToFile: string, newLinkFromFile: string, newLinkToFile: string): string;
    /**
     * Resolve a relative link to absolute path
     *
     * @param linkPath - Relative link path
     * @param fromFile - File containing the link
     * @param rootDir - Project root directory
     * @returns Resolved absolute path, or null if cannot resolve
     */
    resolveLink(linkPath: string, fromFile: string, rootDir: string): string | null;
    /**
     * Update all links in content based on path mapping
     *
     * @param content - Markdown content
     * @param fromFile - Current file path (relative to root)
     * @param pathMapping - Map of old paths to new paths
     * @param newFromFile - New path for the current file (if it's moving)
     * @returns Updated content and list of changes
     */
    updateLinks(content: string, fromFile: string, pathMapping: Map<string, string>, newFromFile?: string): UpdateLinksResult;
    /**
     * Build cross-reference list for a file
     *
     * @param content - File content
     * @param filePath - Path of the file (relative to root)
     * @param rootDir - Project root
     * @returns Array of cross-references
     */
    buildCrossReferences(content: string, filePath: string, rootDir: string): CrossReference[];
    /**
     * Validate all links in content
     *
     * @param content - Markdown content
     * @param filePath - Path of the file being validated
     * @param allFiles - Set of all existing file paths
     * @param rootDir - Project root directory
     * @returns Array of broken links
     */
    validateLinks(content: string, filePath: string, allFiles: Set<string>, rootDir: string): BrokenLink[];
    /**
     * Find a similar file path (for suggestions)
     *
     * @param targetPath - Path that wasn't found
     * @param allFiles - Set of all files
     * @returns Suggested similar file or undefined
     */
    private findSimilarFile;
}
export default ReferenceUpdater;
//# sourceMappingURL=reference-updater.d.ts.map