/**
 * Schema validation utilities using AJV
 */

import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { createIssue, type ValidationIssue } from '../types/index.js';

// Singleton AJV instance
let ajvInstance: Ajv | null = null;

/**
 * Get or create the AJV instance
 */
export function getAjv(): Ajv {
  if (!ajvInstance) {
    ajvInstance = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      validateFormats: true,
    });

    // Add common formats
    ajvInstance.addFormat('date', {
      type: 'string',
      validate: (str: string) => /^\d{4}-\d{2}-\d{2}$/.test(str),
    });

    ajvInstance.addFormat('datetime', {
      type: 'string',
      validate: (str: string) => !isNaN(Date.parse(str)),
    });

    ajvInstance.addFormat('semver', {
      type: 'string',
      validate: (str: string) => /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(str),
    });

    // Add URI format
    ajvInstance.addFormat('uri', {
      type: 'string',
      validate: (str: string) => {
        try {
          new URL(str);
          return true;
        } catch {
          return false;
        }
      },
    });

    // Add email format
    ajvInstance.addFormat('email', {
      type: 'string',
      validate: (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str),
    });
  }
  return ajvInstance;
}

// Cache for compiled schemas by their $id
const schemaCache = new Map<string, ValidateFunction<unknown>>();

/**
 * Compile a JSON schema for validation.
 * Caches compiled schemas by their $id to avoid re-compilation errors.
 */
export function compileSchema<T = unknown>(schema: object): ValidateFunction<T> {
  const ajv = getAjv();
  const schemaObj = schema as { $id?: string };
  const schemaId = schemaObj.$id;

  // Check cache first if schema has an $id
  if (schemaId && schemaCache.has(schemaId)) {
    return schemaCache.get(schemaId) as ValidateFunction<T>;
  }

  // Check if already added to AJV
  if (schemaId) {
    const existing = ajv.getSchema(schemaId);
    if (existing) {
      schemaCache.set(schemaId, existing as ValidateFunction<unknown>);
      return existing as ValidateFunction<T>;
    }
  }

  const compiled = ajv.compile<T>(schema);

  // Cache the compiled schema
  if (schemaId) {
    schemaCache.set(schemaId, compiled as ValidateFunction<unknown>);
  }

  return compiled;
}

/**
 * Convert AJV errors to ValidationIssues
 */
export function ajvErrorsToIssues(
  errors: ErrorObject[] | null | undefined,
  filePath?: string
): ValidationIssue[] {
  if (!errors || errors.length === 0) {
    return [];
  }

  return errors.map((error) => {
    const path = error.instancePath || '/';
    const keyword = error.keyword;

    let code: string;
    let message: string;
    let suggestion: string | undefined;

    switch (keyword) {
      case 'required':
        code = 'REQUIRED_FIELD';
        message = `Missing required field: ${error.params.missingProperty} at ${path}`;
        suggestion = `Add the '${error.params.missingProperty}' field`;
        break;
      case 'type':
        code = 'INVALID_TYPE';
        message = `Invalid type at ${path}: expected ${error.params.type}, got ${typeof error.data}`;
        suggestion = `Change the value to type '${error.params.type}'`;
        break;
      case 'enum':
        code = 'INVALID_ENUM';
        message = `Invalid value at ${path}: must be one of ${JSON.stringify(error.params.allowedValues)}`;
        suggestion = `Use one of: ${error.params.allowedValues.join(', ')}`;
        break;
      case 'pattern':
        code = 'PATTERN_MISMATCH';
        message = `Value at ${path} does not match pattern: ${error.params.pattern}`;
        suggestion = `Ensure the value matches the pattern: ${error.params.pattern}`;
        break;
      case 'format':
        code = 'INVALID_FORMAT';
        message = `Invalid format at ${path}: expected ${error.params.format}`;
        suggestion = `Use the correct format: ${error.params.format}`;
        break;
      case 'additionalProperties':
        code = 'ADDITIONAL_PROPERTY';
        message = `Unknown property '${error.params.additionalProperty}' at ${path}`;
        suggestion = `Remove the property '${error.params.additionalProperty}' or check spelling`;
        break;
      case 'minimum':
      case 'maximum':
      case 'minLength':
      case 'maxLength':
        code = 'OUT_OF_RANGE';
        message = `Value at ${path} ${error.message}`;
        break;
      default:
        code = `SCHEMA_${keyword.toUpperCase()}`;
        message = `Schema validation failed at ${path}: ${error.message}`;
    }

    return createIssue(code, message, 'error', {
      filePath,
      value: error.data,
      expected: error.params,
      suggestion,
    });
  });
}

/**
 * Validate data against a schema and return validation issues
 */
export function validateWithSchema<T = unknown>(
  data: unknown,
  schema: object,
  filePath?: string
): { valid: boolean; data?: T; issues: ValidationIssue[] } {
  const validate = compileSchema<T>(schema);
  const valid = validate(data);

  if (valid) {
    return { valid: true, data: data as T, issues: [] };
  }

  return {
    valid: false,
    issues: ajvErrorsToIssues(validate.errors, filePath),
  };
}
