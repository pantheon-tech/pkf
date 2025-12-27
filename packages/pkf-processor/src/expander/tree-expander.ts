import type { DocumentNode, TreeNode } from '../schema/index.js';
import { type Result, ok, err, type ProcessorError } from '../types.js';

/**
 * Expanded node representation.
 */
export interface ExpandedNode {
  path: string;
  type: 'directory' | 'file' | 'pattern';
  nodeType: string;
  requiresReadme: boolean;
  schema?: string;
  template?: string;
  naming?: string;
  description?: string;
}

/**
 * Expanded tree result.
 */
export interface ExpandedTree {
  nodes: ExpandedNode[];
  pathSchemaMap: Map<string, string>;
}

/**
 * Expansion context passed down the tree.
 */
export interface ExpansionContext {
  parentItems?: DocumentNode;
  path: string[];
  visited: Set<string>;
}

/**
 * Check if a key is a PKF property (starts with _).
 */
function isPkfProperty(key: string): boolean {
  return key.startsWith('_');
}

/**
 * Get node type from object.
 */
function getNodeType(node: unknown): string | undefined {
  if (typeof node === 'object' && node !== null && '_type' in node) {
    return (node as { _type: string })._type;
  }
  return undefined;
}

/**
 * Get node children (non-PKF properties).
 */
function getNodeChildren(node: Record<string, unknown>): [string, unknown][] {
  return Object.entries(node).filter(([key]) => !isPkfProperty(key));
}

/**
 * Expand the compose tree into flat structure.
 */
export function expandTree(
  docs: Record<string, unknown>,
  rootPath: string = 'docs'
): Result<ExpandedTree, ProcessorError[]> {
  const nodes: ExpandedNode[] = [];
  const pathSchemaMap = new Map<string, string>();
  const errors: ProcessorError[] = [];

  const ctx: ExpansionContext = {
    path: [rootPath],
    visited: new Set(),
  };

  // Add root node
  const rootNode = docs as TreeNode;
  nodes.push({
    path: rootPath,
    type: 'directory',
    nodeType: getNodeType(rootNode) ?? 'root',
    requiresReadme: (rootNode as { _readme?: boolean })._readme !== false,
    description: (rootNode as { _description?: string })._description,
  });

  // Expand children
  expandNode(docs, ctx, nodes, pathSchemaMap, errors);

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({ nodes, pathSchemaMap });
}

/**
 * Recursively expand a node and its children.
 */
function expandNode(
  node: Record<string, unknown>,
  ctx: ExpansionContext,
  nodes: ExpandedNode[],
  pathSchemaMap: Map<string, string>,
  errors: ProcessorError[]
): void {
  const nodeType = getNodeType(node);
  const children = getNodeChildren(node);

  // Handle section with _items inheritance
  let inheritedItems: DocumentNode | undefined = ctx.parentItems;
  if (nodeType === 'section' && '_items' in node) {
    inheritedItems = node._items as DocumentNode;
  }

  // Handle _lifecycle array - auto-create lifecycle state directories
  if (nodeType === 'section' && '_lifecycle' in node) {
    const lifecycle = node._lifecycle as string[];
    for (const state of lifecycle) {
      const statePath = [...ctx.path, state].join('/');

      // Check for circular reference
      if (ctx.visited.has(statePath)) {
        errors.push({
          file: 'pkf.config.yaml',
          message: `Circular reference detected at path: ${statePath}`,
          severity: 'error',
          type: 'CIRCULAR_REFERENCE',
        });
        continue;
      }

      nodes.push({
        path: statePath,
        type: 'directory',
        nodeType: 'lifecycle-state',
        requiresReadme: false,
        schema: inheritedItems?._schema,
        template: inheritedItems?._template,
        naming: inheritedItems?._naming,
      });

      // Add schema mapping for lifecycle state directories
      if (inheritedItems?._schema) {
        pathSchemaMap.set(`${statePath}/**/*.md`, inheritedItems._schema);
      }
    }
  }

  // Process explicit children
  for (const [key, child] of children) {
    if (typeof child !== 'object' || child === null) {
      continue;
    }

    const childPath = [...ctx.path, key].join('/');
    const childNode = child as Record<string, unknown>;
    const childType = getNodeType(childNode);

    // Check for circular reference
    if (ctx.visited.has(childPath)) {
      errors.push({
        file: 'pkf.config.yaml',
        message: `Circular reference detected at path: ${childPath}`,
        severity: 'error',
        type: 'CIRCULAR_REFERENCE',
      });
      continue;
    }

    // Determine expanded node properties
    const expandedNode: ExpandedNode = {
      path: childPath,
      type: 'directory',
      nodeType: childType ?? 'directory',
      requiresReadme: (childNode._readme as boolean) !== false,
      description: childNode._description as string | undefined,
    };

    // Handle different node types
    switch (childType) {
      case 'section':
        nodes.push(expandedNode);
        break;

      case 'lifecycle-state':
        expandedNode.requiresReadme = false;
        expandedNode.schema = inheritedItems?._schema;
        expandedNode.naming = inheritedItems?._naming;
        if (inheritedItems?._schema) {
          pathSchemaMap.set(`${childPath}/**/*.md`, inheritedItems._schema);
        }
        nodes.push(expandedNode);
        break;

      case 'document':
        expandedNode.type = 'pattern';
        expandedNode.schema = (childNode as DocumentNode)._schema;
        expandedNode.template = (childNode as DocumentNode)._template;
        expandedNode.naming = (childNode as DocumentNode)._naming;
        nodes.push(expandedNode);
        break;

      case 'register':
        expandedNode.type = 'file';
        expandedNode.schema = childNode._schema as string;
        nodes.push(expandedNode);
        break;

      case 'directory':
      default:
        nodes.push(expandedNode);
        break;
    }

    // Recursively expand children
    const childCtx: ExpansionContext = {
      parentItems: childType === 'section' ? (childNode._items as DocumentNode | undefined) ?? inheritedItems : inheritedItems,
      path: [...ctx.path, key],
      visited: new Set([...ctx.visited, childPath]),
    };

    expandNode(childNode, childCtx, nodes, pathSchemaMap, errors);
  }
}

/**
 * Get all paths that require README.md.
 */
export function getReadmeRequiredPaths(tree: ExpandedTree): string[] {
  return tree.nodes
    .filter((node) => node.type === 'directory' && node.requiresReadme)
    .map((node) => `${node.path}/README.md`);
}

/**
 * Get path to schema mappings.
 */
export function getPathSchemaMap(tree: ExpandedTree): Record<string, string> {
  return Object.fromEntries(tree.pathSchemaMap);
}
