import type { ExpandedTree, ExpandedNode } from '../expander/index.js';
import type { PkfConfig } from '../schema/index.js';

/**
 * Structure node for structure.json output.
 */
export interface StructureNode {
  type: 'directory' | 'file';
  required: boolean;
  pattern?: string;
  schema?: string;
  children?: Record<string, StructureNode>;
}

/**
 * Structure JSON output format.
 */
export interface StructureJson {
  $schema: string;
  version: string;
  generated: string;
  root: StructureNode;
}

/**
 * Insert a node into the structure tree at the given path.
 */
function insertNode(
  root: StructureNode,
  pathParts: string[],
  node: ExpandedNode
): void {
  let current = root;

  // Navigate/create path to parent
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (!part) continue;

    if (!current.children) {
      current.children = {};
    }
    if (!current.children[part]) {
      current.children[part] = {
        type: 'directory',
        required: true,
      };
    }
    current = current.children[part]!;
  }

  // Insert the node
  const nodeName = pathParts[pathParts.length - 1];
  if (!nodeName) return;

  if (!current.children) {
    current.children = {};
  }

  if (node.type === 'pattern') {
    // Pattern nodes become wildcard entries
    current.children['*.md'] = {
      type: 'file',
      required: false,
      pattern: node.naming,
      schema: node.schema,
    };
  } else if (node.type === 'file') {
    current.children[nodeName] = {
      type: 'file',
      required: true,
      schema: node.schema,
    };
  } else {
    current.children[nodeName] = {
      type: 'directory',
      required: true,
      ...(node.schema && { schema: node.schema }),
    };

    // Add README.md if required
    if (node.requiresReadme) {
      if (!current.children[nodeName]!.children) {
        current.children[nodeName]!.children = {};
      }
      current.children[nodeName]!.children!['README.md'] = {
        type: 'file',
        required: true,
      };
    }
  }
}

/**
 * Generate structure.json from expanded tree.
 */
export function generateStructureJson(
  tree: ExpandedTree,
  config: PkfConfig
): StructureJson {
  const root: StructureNode = {
    type: 'directory',
    required: true,
    children: {},
  };

  // Skip the root node itself, process its children
  for (const node of tree.nodes) {
    const pathParts = node.path.split('/');

    // Skip the root docs directory
    if (pathParts.length <= 1) continue;

    insertNode(root, pathParts.slice(1), node);
  }

  return {
    $schema: 'https://pkf.dev/schemas/structure.schema.json',
    version: config.version,
    generated: new Date().toISOString(),
    root,
  };
}
