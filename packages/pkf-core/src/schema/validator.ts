/**
 * Schema validation utilities
 */

import type {
  SchemasYaml,
  SchemaDefinition,
  SchemaValidationResult,
} from './types.js';

/**
 * Validate schemas.yaml structure
 *
 * Performs comprehensive validation of PKF schema structure including:
 * - Version format validation
 * - Schema name format validation
 * - Property type validation
 * - Inheritance reference validation
 *
 * @param schemas - Parsed schemas object to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const validation = validateSchemasYaml(schemas);
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors);
 * }
 * if (validation.warnings.length > 0) {
 *   console.warn('Warnings:', validation.warnings);
 * }
 * ```
 */
export function validateSchemasYaml(schemas: SchemasYaml): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate version format
  if (!schemas.version) {
    errors.push('Missing required "version" field');
  } else if (!/^\d+\.\d+$/.test(String(schemas.version))) {
    errors.push(`Invalid version format: "${schemas.version}". Expected format: "X.Y"`);
  }

  // Validate schemas object exists
  if (!schemas.schemas) {
    errors.push('Missing required "schemas" field');
  } else if (typeof schemas.schemas !== 'object' || schemas.schemas === null) {
    errors.push('"schemas" must be an object');
  } else {
    const schemaNames = Object.keys(schemas.schemas);

    if (schemaNames.length === 0) {
      errors.push('At least one schema must be defined');
    }

    // Check for base-document type
    const hasBaseDoc = schemaNames.some(
      (name) => name === 'base-doc' || name === 'base-document'
    );
    if (!hasBaseDoc) {
      warnings.push(
        'Consider adding a "base-doc" schema with common fields (title, created, updated)'
      );
    }

    // Validate each schema
    for (const [name, schema] of Object.entries(schemas.schemas)) {
      // Validate schema name format
      if (!/^[a-z][a-z0-9-]*$/.test(name)) {
        errors.push(
          `Invalid schema name "${name}": must be lowercase alphanumeric with hyphens`
        );
      }

      // Validate schema structure
      if (typeof schema !== 'object' || schema === null) {
        errors.push(`Schema "${name}" must be an object`);
        continue;
      }

      const schemaObj = schema as SchemaDefinition;

      // Check _extends references
      if (schemaObj._extends) {
        const extendsName = String(schemaObj._extends);
        if (!schemaNames.includes(extendsName)) {
          errors.push(`Schema "${name}" extends unknown schema "${extendsName}"`);
        }
      }

      // Check properties
      if (!schemaObj.properties) {
        warnings.push(`Schema "${name}" has no properties defined`);
      } else if (typeof schemaObj.properties !== 'object') {
        errors.push(`Schema "${name}" properties must be an object`);
      } else {
        const properties = schemaObj.properties;

        for (const [propName, propDef] of Object.entries(properties)) {
          // Validate property name
          if (!/^[a-z][a-z0-9_-]*$/.test(propName)) {
            errors.push(`Invalid property name "${propName}" in schema "${name}"`);
          }

          // Validate property definition
          if (typeof propDef !== 'object' || propDef === null) {
            errors.push(`Property "${propName}" in schema "${name}" must be an object`);
            continue;
          }

          // Check required type field
          if (!propDef.type) {
            errors.push(
              `Property "${propName}" in schema "${name}" is missing required "type" field`
            );
          } else {
            const validTypes = ['string', 'number', 'boolean', 'date', 'array', 'object'];
            if (!validTypes.includes(String(propDef.type))) {
              errors.push(
                `Invalid type "${propDef.type}" for property "${propName}" in schema "${name}"`
              );
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate data against a schema definition (lightweight validation)
 *
 * Performs basic validation of data against a schema:
 * - Required field checks
 * - Type validation
 * - Enum value validation
 *
 * NOTE: This is a lightweight validator. For comprehensive JSON Schema validation,
 * use the pkf-validator package's validateWithSchema() function.
 *
 * @param data - Data object to validate
 * @param schema - Schema definition to validate against
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const data = { title: 'My Doc', status: 'draft' };
 * const validation = validateAgainstSchema(data, schemas.schemas['base-doc']);
 * if (!validation.valid) {
 *   console.error('Data validation failed:', validation.errors);
 * }
 * ```
 */
export function validateAgainstSchema(
  data: Record<string, unknown>,
  schema: SchemaDefinition
): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!schema.properties) {
    warnings.push('Schema has no properties defined');
    return { valid: true, errors, warnings };
  }

  // Check required fields
  for (const [propName, propDef] of Object.entries(schema.properties)) {
    if (propDef.required && !(propName in data)) {
      errors.push(`Missing required field: ${propName}`);
    }

    // If field exists, validate type and constraints
    if (propName in data) {
      const value = data[propName];

      // Type validation (basic)
      if (value !== null && value !== undefined) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        const expectedType = propDef.type;

        // Check type compatibility
        let typeValid = false;
        switch (expectedType) {
          case 'string':
            typeValid = actualType === 'string';
            break;
          case 'number':
            typeValid = actualType === 'number';
            break;
          case 'boolean':
            typeValid = actualType === 'boolean';
            break;
          case 'date':
            // Accept string or Date object for date type
            typeValid = actualType === 'string' || value instanceof Date;
            break;
          case 'array':
            typeValid = actualType === 'array';
            break;
          case 'object':
            typeValid = actualType === 'object';
            break;
        }

        if (!typeValid) {
          errors.push(
            `Field "${propName}" has type ${actualType} but expected ${expectedType}`
          );
        }

        // Enum validation
        if (propDef.enum && propDef.enum.length > 0) {
          if (!propDef.enum.includes(value)) {
            errors.push(
              `Field "${propName}" value "${value}" is not in allowed values: ${propDef.enum.join(', ')}`
            );
          }
        }

        // Pattern validation (for strings)
        if (propDef.pattern && typeof value === 'string') {
          const regex = new RegExp(propDef.pattern);
          if (!regex.test(value)) {
            errors.push(`Field "${propName}" value "${value}" does not match pattern ${propDef.pattern}`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
