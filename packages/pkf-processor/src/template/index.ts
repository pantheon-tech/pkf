/**
 * Template System Module.
 *
 * Provides template definition parsing, variable substitution,
 * and template file generation per Architecture Section 8.
 *
 * @module template
 */

// Schema exports
export {
  TemplateDefinitionSchema,
  TemplatesFileSchema,
  BodySectionSchema,
  FrontmatterConfigSchema,
  type TemplateDefinition,
  type TemplatesFile,
  type BodySection,
  type FrontmatterConfig,
} from './schema.js';

// Variable exports
export {
  substituteVariables,
  substituteVariablesLenient,
  extractVariables,
  padNumber,
  slugify,
  getCurrentDate,
  createDefaultVariables,
  type TemplateVariables,
  type SubstitutionError,
} from './variables.js';

// Parser exports
export {
  parseTemplatesFile,
  getTemplate,
  listTemplateNames,
  getTemplatesForSchema,
  type ParseError,
} from './parser.js';

// Frontmatter exports
export {
  generateFrontmatter,
  validateFrontmatter,
  extractFrontmatter,
  type FrontmatterError,
} from './frontmatter.js';

// Body exports
export {
  generateBody,
  getRequiredSections,
  validateSections,
  type BodyError,
} from './body.js';

// Generator exports
export {
  generateTemplate,
  generateAllTemplates,
  generateTemplateByName,
  generateTemplatesForSchema,
  type GeneratedTemplate,
  type GenerateError,
  type GenerateOptions,
} from './generator.js';

// Writer exports
export {
  writeTemplate,
  writeTemplates,
  type WriteError,
  type WriteResult,
  type WriteOptions,
  type BatchWriteOptions,
  type BatchWriteResult,
} from './writer.js';
