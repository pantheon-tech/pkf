import { z } from 'zod';

/**
 * Component types per PKF Architecture Section 6.1.
 */
export const NodeTypeSchema = z.enum([
  'root',
  'section',
  'lifecycle-state',
  'document',
  'directory',
  'register',
]);
export type NodeType = z.infer<typeof NodeTypeSchema>;

/**
 * Base properties shared by all node types.
 */
export const BaseNodePropsSchema = z.object({
  _type: NodeTypeSchema,
  _readme: z.boolean().optional().default(true),
  _description: z.string().optional(),
});

/**
 * Document node - represents files with schema/template.
 */
export const DocumentNodeSchema = z.object({
  _type: z.literal('document'),
  _schema: z.string(),
  _template: z.string().optional(),
  _naming: z.string(),
  _description: z.string().optional(),
});
export type DocumentNode = z.infer<typeof DocumentNodeSchema>;

/**
 * Lifecycle state node - inherits _items from parent section.
 */
export const LifecycleStateNodeSchema = z.object({
  _type: z.literal('lifecycle-state'),
  _readme: z.boolean().optional().default(false),
  _description: z.string().optional(),
});
export type LifecycleStateNode = z.infer<typeof LifecycleStateNodeSchema>;

/**
 * Section node - can contain _lifecycle array and _items.
 */
export const SectionNodeSchema = z.object({
  _type: z.literal('section'),
  _readme: z.boolean().optional().default(true),
  _description: z.string().optional(),
  _lifecycle: z.array(z.string()).optional(),
  _items: DocumentNodeSchema.optional(),
});
export type SectionNode = z.infer<typeof SectionNodeSchema>;

/**
 * Root node - top-level docs configuration.
 */
export const RootNodeSchema = z.object({
  _type: z.literal('root'),
  _readme: z.boolean().optional().default(true),
  _description: z.string().optional(),
});
export type RootNode = z.infer<typeof RootNodeSchema>;

/**
 * Register node - tabular data with item schema.
 */
export const RegisterNodeSchema = z.object({
  _type: z.literal('register'),
  _schema: z.string(),
  _description: z.string().optional(),
});
export type RegisterNode = z.infer<typeof RegisterNodeSchema>;

/**
 * Directory node - simple directory container.
 */
export const DirectoryNodeSchema = z.object({
  _type: z.literal('directory'),
  _readme: z.boolean().optional().default(true),
  _description: z.string().optional(),
});
export type DirectoryNode = z.infer<typeof DirectoryNodeSchema>;

/**
 * Union of all node types.
 */
export const TreeNodeSchema = z.lazy(() =>
  z.union([
    RootNodeSchema,
    SectionNodeSchema,
    LifecycleStateNodeSchema,
    DocumentNodeSchema,
    DirectoryNodeSchema,
    RegisterNodeSchema,
  ]).and(z.record(z.string(), z.unknown()))
);

export type TreeNode = z.infer<typeof TreeNodeSchema>;
