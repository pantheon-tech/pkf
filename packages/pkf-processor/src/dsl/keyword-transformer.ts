import type { DslProperty, JsonSchemaProperty, IdConfig } from './dsl.schema.js';

/**
 * Transform DSL type to JSON Schema type.
 */
export function transformType(dslType: string): { type?: string; format?: string } {
  switch (dslType) {
    case 'date':
      return { type: 'string', format: 'date' };
    case 'datetime':
      return { type: 'string', format: 'date-time' };
    case 'integer':
      return { type: 'integer' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'array':
      return { type: 'array' };
    case 'object':
      return { type: 'object' };
    case 'string':
    default:
      return { type: 'string' };
  }
}

/**
 * Transform DSL property to JSON Schema property.
 */
export function transformProperty(dslProp: DslProperty): JsonSchemaProperty {
  const result: JsonSchemaProperty = {};

  // Type transformation
  const typeInfo = transformType(dslProp.type);
  if (typeInfo.type) result.type = typeInfo.type;
  if (typeInfo.format) result.format = typeInfo.format;

  // Override format if explicitly specified
  if (dslProp.format) {
    result.format = dslProp.format;
  }

  // Copy other properties
  if (dslProp.enum) result.enum = dslProp.enum;
  if (dslProp.pattern) result.pattern = dslProp.pattern;
  if (dslProp.minLength !== undefined) result.minLength = dslProp.minLength;
  if (dslProp.maxLength !== undefined) result.maxLength = dslProp.maxLength;
  if (dslProp.minimum !== undefined) result.minimum = dslProp.minimum;
  if (dslProp.maximum !== undefined) result.maximum = dslProp.maximum;
  if (dslProp.default !== undefined) result.default = dslProp.default;
  if (dslProp.description) result.description = dslProp.description;

  // Array items
  if (dslProp.items) {
    result.items = transformProperty(dslProp.items);
  }

  return result;
}

/**
 * Generate ID pattern from ID config.
 */
export function generateIdPattern(idConfig: IdConfig): string {
  const digitPatterns: Record<string, string> = {
    'nn': '\\d{2}',
    'nnn': '\\d{3}',
    'nnnn': '\\d{4}',
  };

  const digits = digitPatterns[idConfig.format ?? 'nnn'] ?? '\\d{3}';
  return idConfig.pattern ?? `^${idConfig.prefix}-${digits}$`;
}

/**
 * Transform statuses shorthand to enum property.
 */
export function transformStatuses(statuses: string[]): JsonSchemaProperty {
  return {
    type: 'string',
    enum: statuses,
    description: 'Document lifecycle status',
  };
}

/**
 * Transform ID config to JSON Schema property.
 */
export function transformIdConfig(idConfig: IdConfig): JsonSchemaProperty {
  return {
    type: 'string',
    pattern: generateIdPattern(idConfig),
    description: `Unique identifier with prefix ${idConfig.prefix}`,
  };
}

/**
 * Transform DSL properties object to JSON Schema properties.
 */
export function transformProperties(
  dslProps: Record<string, DslProperty>
): Record<string, JsonSchemaProperty> {
  const result: Record<string, JsonSchemaProperty> = {};

  for (const [name, prop] of Object.entries(dslProps)) {
    result[name] = transformProperty(prop);
  }

  return result;
}

/**
 * Build required array from DSL properties.
 */
export function buildRequiredArray(
  dslProps: Record<string, DslProperty>,
  explicitRequired?: string[]
): string[] {
  const required = new Set<string>(explicitRequired ?? []);

  // Add properties marked as required: true
  for (const [name, prop] of Object.entries(dslProps)) {
    if (prop.required) {
      required.add(name);
    }
  }

  return Array.from(required);
}
