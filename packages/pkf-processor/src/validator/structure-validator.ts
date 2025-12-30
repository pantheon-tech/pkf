import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ProcessorError } from '../types.js';

/**
 * Parse an INDEX file and extract the listed filenames.
 * INDEX format:
 *   # directory INDEX
 *   # Description
 *   filename.md: Description of the file...
 *   another-file.md: Another description...
 */
function parseIndexFile(indexPath: string): Set<string> {
  const filenames = new Set<string>();

  if (!existsSync(indexPath)) {
    return filenames;
  }

  try {
    const content = readFileSync(indexPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      // Skip empty lines and comments
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Extract filename from "filename: description" format
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const filename = trimmed.slice(0, colonIndex).trim();
        if (filename) {
          filenames.add(filename);
        }
      }
    }
  } catch {
    // Ignore parse errors, return empty set
  }

  return filenames;
}

/**
 * Structure node from generated structure.json
 */
interface StructureNode {
  type: 'file' | 'directory';
  required: boolean;
  children?: Record<string, StructureNode>;
  schema?: string;
}

/**
 * Generated structure.json format
 */
interface StructureJson {
  version: string;
  generated: string;
  root: StructureNode;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ProcessorError[];
  warnings: ProcessorError[];
}

/**
 * Validate directory structure against structure.json
 */
export function validateStructure(
  structureJson: StructureJson,
  rootPath: string = 'docs'
): ValidationResult {
  const errors: ProcessorError[] = [];
  const warnings: ProcessorError[] = [];

  /**
   * Recursively validate a node in the structure tree
   */
  function validateNode(
    node: StructureNode,
    currentPath: string,
    nodeName?: string
  ): void {
    const fullPath = nodeName ? join(currentPath, nodeName) : currentPath;
    const relativePath = relative(process.cwd(), fullPath);

    // Check if path exists
    const exists = existsSync(fullPath);

    if (!exists && node.required) {
      errors.push({
        file: relativePath,
        message: `Required ${node.type} does not exist`,
        severity: 'error',
        type: 'STRUCTURE_VIOLATION',
        expected: node.type === 'directory' ? 'directory' : 'file',
        rule: 'required_path',
      });
      return;
    }

    if (!exists) {
      // Optional path doesn't exist, that's fine
      return;
    }

    // Check type matches
    const stats = statSync(fullPath);
    const isDirectory = stats.isDirectory();
    const isFile = stats.isFile();

    if (node.type === 'directory' && !isDirectory) {
      errors.push({
        file: relativePath,
        message: `Expected directory but found file`,
        severity: 'error',
        type: 'STRUCTURE_VIOLATION',
        expected: 'directory',
        rule: 'type_mismatch',
      });
      return;
    }

    if (node.type === 'file' && !isFile) {
      errors.push({
        file: relativePath,
        message: `Expected file but found directory`,
        severity: 'error',
        type: 'STRUCTURE_VIOLATION',
        expected: 'file',
        rule: 'type_mismatch',
      });
      return;
    }

    // Validate children if directory
    if (node.type === 'directory' && node.children) {
      for (const [childName, childNode] of Object.entries(node.children)) {
        validateNode(childNode, fullPath, childName);
      }

      // Check for unexpected files/directories
      if (isDirectory) {
        const actualChildren = readdirSync(fullPath);
        const expectedChildren = Object.keys(node.children);

        // Parse INDEX file if present - files listed there are considered expected
        const indexPath = join(fullPath, 'INDEX');
        const indexedFiles = parseIndexFile(indexPath);

        for (const actualChild of actualChildren) {
          // Skip hidden files and common excludes
          if (actualChild.startsWith('.') || actualChild === 'node_modules') {
            continue;
          }

          // Skip INDEX file itself
          if (actualChild === 'INDEX') {
            continue;
          }

          if (!expectedChildren.includes(actualChild)) {
            // If parent has a schema, children are expected to match that schema
            if (node.schema) {
              // This is a schema directory, files here are expected
              continue;
            }

            // Check if file is listed in INDEX
            if (indexedFiles.has(actualChild)) {
              // File is documented in INDEX, no warning
              continue;
            }

            // Unexpected file/directory
            const unexpectedPath = join(fullPath, actualChild);
            const unexpectedRelPath = relative(process.cwd(), unexpectedPath);

            warnings.push({
              file: unexpectedRelPath,
              message: `Unexpected ${statSync(unexpectedPath).isDirectory() ? 'directory' : 'file'} (not in structure definition or INDEX)`,
              severity: 'warning',
              type: 'STRUCTURE_VIOLATION',
              rule: 'unexpected_path',
            });
          }
        }
      }
    }
  }

  // Start validation from root
  validateNode(structureJson.root, rootPath);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
