/**
 * Reference Updater Utility
 * Handles parsing and updating markdown links when files are moved
 */

import * as path from 'path';
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
export class ReferenceUpdater {
  /**
   * Regular expression for markdown links
   * Matches: [text](path) or [text](path "title") or ![alt](path)
   */
  private static readonly LINK_REGEX = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;

  /** Project root directory */
  private rootDir: string;

  /**
   * Create a new ReferenceUpdater
   * @param rootDir - Project root directory (optional, defaults to current directory)
   */
  constructor(rootDir: string = '.') {
    this.rootDir = rootDir;
  }

  /**
   * Find all markdown links in content
   *
   * @param content - Markdown content to parse
   * @returns Array of parsed links
   */
  findLinks(content: string): MarkdownLink[] {
    const links: MarkdownLink[] = [];
    const lines = content.split('\n');

    // Track position for line/column calculation
    let currentPos = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineStart = currentPos;

      // Reset regex state
      ReferenceUpdater.LINK_REGEX.lastIndex = 0;

      let match;
      while ((match = ReferenceUpdater.LINK_REGEX.exec(line)) !== null) {
        const isImage = match[1] === '!';
        const text = match[2];
        let linkPath = match[3];
        const title = match[4];

        // Check for anchor
        let anchor: string | undefined;
        const anchorIndex = linkPath.indexOf('#');
        if (anchorIndex > 0) {
          anchor = linkPath.substring(anchorIndex);
          linkPath = linkPath.substring(0, anchorIndex);
        } else if (anchorIndex === 0) {
          // Pure anchor link (e.g., #section)
          anchor = linkPath;
          linkPath = '';
        }

        links.push({
          fullMatch: match[0],
          text,
          path: linkPath,
          title,
          start: lineStart + match.index,
          end: lineStart + match.index + match[0].length,
          lineNumber: lineIndex + 1,
          columnStart: match.index + 1,
          isImage,
          anchor,
        });
      }

      currentPos += line.length + 1; // +1 for newline
    }

    return links;
  }

  /**
   * Check if a path is a relative file path (not URL or anchor-only)
   *
   * @param linkPath - Path to check
   * @returns true if relative file path
   */
  isRelativeFilePath(linkPath: string): boolean {
    if (!linkPath) return false;

    // Skip URLs
    if (linkPath.startsWith('http://') ||
        linkPath.startsWith('https://') ||
        linkPath.startsWith('mailto:') ||
        linkPath.startsWith('tel:') ||
        linkPath.startsWith('data:') ||
        linkPath.startsWith('//')) {
      return false;
    }

    // Skip pure anchors
    if (linkPath.startsWith('#')) {
      return false;
    }

    // Skip absolute paths (Unix or Windows)
    if (linkPath.startsWith('/') || /^[A-Za-z]:/.test(linkPath)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate the new relative path when files move
   *
   * @param linkFromFile - File containing the link (old location)
   * @param linkToFile - File being linked to (old location)
   * @param newLinkFromFile - New location of file containing link
   * @param newLinkToFile - New location of file being linked to
   * @returns New relative path from newLinkFromFile to newLinkToFile
   */
  calculateNewPath(
    linkFromFile: string,
    linkToFile: string,
    newLinkFromFile: string,
    newLinkToFile: string
  ): string {
    // Normalize paths
    const normalizedNewFrom = path.normalize(newLinkFromFile).replace(/\\/g, '/');
    const normalizedNewTo = path.normalize(newLinkToFile).replace(/\\/g, '/');

    // Get directories
    const fromDir = path.dirname(normalizedNewFrom);
    const toFile = normalizedNewTo;

    // Calculate relative path
    let relativePath = path.relative(fromDir, toFile).replace(/\\/g, '/');

    // Ensure relative path starts with ./ if it doesn't start with ../
    if (!relativePath.startsWith('.') && !relativePath.startsWith('/')) {
      relativePath = './' + relativePath;
    }

    return relativePath;
  }

  /**
   * Resolve a relative link to absolute path
   *
   * @param linkPath - Relative link path
   * @param fromFile - File containing the link
   * @param rootDir - Project root directory
   * @returns Resolved absolute path, or null if cannot resolve
   */
  resolveLink(linkPath: string, fromFile: string, rootDir: string): string | null {
    if (!this.isRelativeFilePath(linkPath)) {
      return null;
    }

    try {
      const fromDir = path.dirname(fromFile);
      const resolvedPath = path.resolve(rootDir, fromDir, linkPath);
      return path.relative(rootDir, resolvedPath).replace(/\\/g, '/');
    } catch {
      return null;
    }
  }

  /**
   * Update all links in content based on path mapping
   *
   * @param content - Markdown content
   * @param fromFile - Current file path (relative to root)
   * @param pathMapping - Map of old paths to new paths
   * @param newFromFile - New path for the current file (if it's moving)
   * @returns Updated content and list of changes
   */
  updateLinks(
    content: string,
    fromFile: string,
    pathMapping: Map<string, string>,
    newFromFile?: string
  ): UpdateLinksResult {
    const links = this.findLinks(content);
    const updates: LinkUpdate[] = [];

    // If file is moving, use new location; otherwise use current
    const effectiveFromFile = newFromFile || fromFile;

    // Process links in reverse order to maintain positions
    const sortedLinks = [...links].sort((a, b) => b.start - a.start);

    let updatedContent = content;

    for (const link of sortedLinks) {
      if (!this.isRelativeFilePath(link.path)) {
        continue;
      }

      // Resolve the link to get absolute target path
      const resolvedTarget = this.resolveLink(link.path, fromFile, '');
      if (!resolvedTarget) {
        continue;
      }

      // Check if target file is being moved
      const newTargetPath = pathMapping.get(resolvedTarget);

      // If neither source nor target is moving, skip
      if (!newTargetPath && !newFromFile) {
        continue;
      }

      // Calculate new relative path
      const effectiveTargetPath = newTargetPath || resolvedTarget;
      const newRelativePath = this.calculateNewPath(
        fromFile,
        resolvedTarget,
        effectiveFromFile,
        effectiveTargetPath
      );

      // Add anchor back if it existed
      const finalPath = link.anchor
        ? newRelativePath + link.anchor
        : newRelativePath;

      // Only update if path actually changed
      const originalWithAnchor = link.anchor
        ? link.path + link.anchor
        : link.path;

      if (finalPath !== originalWithAnchor) {
        // Build new link
        const imagePrefix = link.isImage ? '!' : '';
        const titleSuffix = link.title ? ` "${link.title}"` : '';
        const newLink = `${imagePrefix}[${link.text}](${finalPath}${titleSuffix})`;

        // Replace in content
        updatedContent =
          updatedContent.substring(0, link.start) +
          newLink +
          updatedContent.substring(link.end);

        updates.push({
          original: originalWithAnchor,
          updated: finalPath,
          lineNumber: link.lineNumber,
          columnStart: link.columnStart,
          columnEnd: link.columnStart + link.fullMatch.length,
        });
      }
    }

    return {
      content: updatedContent,
      updates: updates.reverse(), // Return in original order
      hasChanges: updates.length > 0,
    };
  }

  /**
   * Build cross-reference list for a file
   *
   * @param content - File content
   * @param filePath - Path of the file (relative to root)
   * @param rootDir - Project root
   * @returns Array of cross-references
   */
  buildCrossReferences(
    content: string,
    filePath: string,
    rootDir: string
  ): CrossReference[] {
    const links = this.findLinks(content);
    const refs: CrossReference[] = [];

    for (const link of links) {
      if (!this.isRelativeFilePath(link.path)) {
        continue;
      }

      const resolvedTarget = this.resolveLink(link.path, filePath, rootDir);
      if (!resolvedTarget) {
        continue;
      }

      refs.push({
        sourceFile: filePath,
        targetFile: resolvedTarget,
        linkText: link.text,
        originalPath: link.path,
        lineNumber: link.lineNumber,
        columnStart: link.columnStart,
        columnEnd: link.columnStart + link.fullMatch.length,
      });
    }

    return refs;
  }

  /**
   * Validate all links in content
   *
   * @param content - Markdown content
   * @param filePath - Path of the file being validated
   * @param allFiles - Set of all existing file paths
   * @param rootDir - Project root directory
   * @returns Array of broken links
   */
  validateLinks(
    content: string,
    filePath: string,
    allFiles: Set<string>,
    rootDir: string
  ): BrokenLink[] {
    const links = this.findLinks(content);
    const broken: BrokenLink[] = [];

    for (const link of links) {
      if (!this.isRelativeFilePath(link.path)) {
        continue;
      }

      const resolvedTarget = this.resolveLink(link.path, filePath, rootDir);
      if (!resolvedTarget) {
        broken.push({
          sourceFile: filePath,
          linkPath: link.path,
          lineNumber: link.lineNumber,
        });
        continue;
      }

      // Check if target exists in file set
      if (!allFiles.has(resolvedTarget)) {
        // Try with common extensions
        const withMd = resolvedTarget.endsWith('.md')
          ? resolvedTarget
          : resolvedTarget + '.md';

        if (!allFiles.has(withMd)) {
          // Try to suggest a fix
          const suggestion = this.findSimilarFile(resolvedTarget, allFiles);

          broken.push({
            sourceFile: filePath,
            linkPath: link.path,
            lineNumber: link.lineNumber,
            suggestion,
          });
        }
      }
    }

    return broken;
  }

  /**
   * Find a similar file path (for suggestions)
   *
   * @param targetPath - Path that wasn't found
   * @param allFiles - Set of all files
   * @returns Suggested similar file or undefined
   */
  private findSimilarFile(targetPath: string, allFiles: Set<string>): string | undefined {
    const targetName = path.basename(targetPath).toLowerCase();
    const targetNameNoExt = targetName.replace(/\.[^.]+$/, '');

    for (const file of allFiles) {
      const fileName = path.basename(file).toLowerCase();
      const fileNameNoExt = fileName.replace(/\.[^.]+$/, '');

      // Exact name match in different directory
      if (fileName === targetName || fileNameNoExt === targetNameNoExt) {
        return file;
      }
    }

    return undefined;
  }
}

export default ReferenceUpdater;
