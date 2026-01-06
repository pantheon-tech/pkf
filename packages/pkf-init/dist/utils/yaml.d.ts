/**
 * Secure YAML parsing utilities
 *
 * This module provides safe YAML parsing and dumping functions that prevent
 * arbitrary code execution attacks. All YAML operations should use these
 * utilities instead of calling js-yaml directly.
 *
 * Security Note:
 * - Uses JSON_SCHEMA which only supports JSON-compatible types
 * - Prevents !!js/function and other dangerous constructors
 * - Safe for parsing untrusted YAML content
 */
/**
 * Safely load YAML content using JSON schema
 *
 * This function uses the JSON_SCHEMA which only supports JSON-compatible types,
 * preventing code execution through YAML constructors like !!js/function.
 *
 * @param content - YAML string to parse
 * @returns Parsed object
 * @throws {Error} If YAML is malformed or invalid
 *
 * @example
 * ```typescript
 * const config = safeLoad(yamlContent);
 * ```
 */
export declare function safeLoad(content: string): unknown;
/**
 * Safely dump an object to YAML using JSON schema
 *
 * This function uses the JSON_SCHEMA which only supports JSON-compatible types,
 * preventing the output of dangerous constructors.
 *
 * @param data - Object to convert to YAML
 * @param options - Optional formatting options
 * @returns YAML string
 *
 * @example
 * ```typescript
 * const yamlString = safeDump({ key: 'value' }, { indent: 2 });
 * ```
 */
export declare function safeDump(data: unknown, options?: {
    indent?: number;
    lineWidth?: number;
    noRefs?: boolean;
    sortKeys?: boolean;
}): string;
//# sourceMappingURL=yaml.d.ts.map