// Types
export {
  type Result,
  ok,
  err,
  type ProcessorError,
  type ProcessorOutput,
  type ProcessorArtifacts,
  ErrorSeveritySchema,
  ErrorTypeSchema,
  ProcessorErrorSchema,
  ProcessorOutputSchema,
  ProcessorArtifactsSchema,
} from './types.js';

// Schema
export {
  // Node types
  NodeTypeSchema,
  type NodeType,
  DocumentNodeSchema,
  type DocumentNode,
  SectionNodeSchema,
  type SectionNode,
  RootNodeSchema,
  type RootNode,
  RegisterNodeSchema,
  type RegisterNode,
  DirectoryNodeSchema,
  type DirectoryNode,
  LifecycleStateNodeSchema,
  type LifecycleStateNode,
  TreeNodeSchema,
  type TreeNode,
  // Config
  PkfConfigSchema,
  type PkfConfig,
  ComponentsConfigSchema,
  type ComponentsConfig,
  ProjectConfigSchema,
  type ProjectConfig,
  OutputConfigSchema,
  type OutputConfig,
  type ValidatedConfig,
} from './schema/index.js';

// Parser
export {
  parseConfigFile,
  parseComponentFile,
  readYamlFile,
  type ParseResult,
} from './parser/index.js';

// Expander
export {
  expandTree,
  getReadmeRequiredPaths,
  getPathSchemaMap,
  type ExpandedTree,
  type ExpandedNode,
  type ExpansionContext,
} from './expander/index.js';

// Generator
export {
  generateStructureJson,
  generatePathSchemaMap,
  generateRemarkConfig,
  type StructureJson,
  type StructureNode,
  type PathSchemaMap,
} from './generator/index.js';

// Errors
export {
  formatError,
  formatErrors,
  formatStructureError,
} from './errors/index.js';

// DSL
export {
  // Types
  DslPropertySchema,
  type DslProperty,
  IdConfigSchema,
  type IdConfig,
  DslSchemaDefinitionSchema,
  type DslSchemaDefinition,
  SchemasFileSchema,
  type SchemasFile,
  type JsonSchemaProperty,
  type JsonSchema,
  // Parser
  parseSchemasFile,
  getSchemaDefinition,
  getSchemaNames,
  getSchemaParent,
  getInheritanceChain,
  // Transformer
  transformType,
  transformProperty,
  transformProperties,
  transformStatuses,
  transformIdConfig,
  generateIdPattern,
  buildRequiredArray,
  // Generator
  generateSchema,
  generateAllSchemas,
  validateSchemaReferences,
  type GeneratedSchema,
  type GenerationOptions,
} from './dsl/index.js';

// Template System
export {
  // Schema
  TemplateDefinitionSchema,
  TemplatesFileSchema,
  BodySectionSchema,
  FrontmatterConfigSchema,
  type TemplateDefinition,
  type TemplatesFile,
  type BodySection,
  type FrontmatterConfig,
  // Variables
  substituteVariables,
  substituteVariablesLenient,
  extractVariables,
  padNumber,
  slugify,
  getCurrentDate,
  createDefaultVariables,
  type TemplateVariables,
  type SubstitutionError,
  // Parser
  parseTemplatesFile,
  getTemplate,
  listTemplateNames,
  getTemplatesForSchema,
  type ParseError,
  // Frontmatter
  generateFrontmatter,
  validateFrontmatter,
  extractFrontmatter,
  type FrontmatterError,
  // Body
  generateBody,
  getRequiredSections,
  validateSections,
  type BodyError,
  // Generator
  generateTemplate,
  generateAllTemplates,
  generateTemplateByName,
  generateTemplatesForSchema,
  type GeneratedTemplate,
  type GenerateError,
  type GenerateOptions,
  // Writer
  writeTemplate,
  writeTemplates,
  type WriteError,
  type WriteResult,
  type WriteOptions,
  type BatchWriteOptions,
  type BatchWriteResult,
} from './template/index.js';
