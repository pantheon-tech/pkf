/**
 * PKF Validator Parsers
 *
 * Parser modules for various PKF file formats including Schema DSL.
 */

export {
  // Main class
  SchemaDSLParser,

  // Standalone functions
  parseSchemasDSL,
  parseSchemasDSLFile,
  schemaDSLToJsonSchema,
  validateSchemaDSL,
  validateSchemaDSLFile,

  // Types
  type SchemaPropertyType,
  type SchemaArrayItems,
  type SchemaField,
  type SchemaMetadata,
  type SchemaDefinition,
  type SchemaRelationship,
  type ParsedSchemaDSL,
} from './schema-dsl-parser.js';
