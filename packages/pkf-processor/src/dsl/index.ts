// DSL Schema types
export {
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
} from './dsl.schema.js';

// Parser
export {
  parseSchemasFile,
  getSchemaDefinition,
  getSchemaNames,
  getSchemaParent,
  getInheritanceChain,
} from './dsl-parser.js';

// Keyword transformer
export {
  transformType,
  transformProperty,
  transformProperties,
  transformStatuses,
  transformIdConfig,
  generateIdPattern,
  buildRequiredArray,
} from './keyword-transformer.js';

// Schema generator
export {
  generateSchema,
  generateAllSchemas,
  validateSchemaReferences,
  type GeneratedSchema,
  type GenerationOptions,
} from './schema-generator.js';
