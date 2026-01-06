/**
 * Utility function interfaces
 * @packageDocumentation
 */
/**
 * Options for atomic file writes
 */
export interface AtomicWriteOptions {
    /** File mode/permissions */
    mode?: number;
    /** Create backup before overwriting */
    backup?: boolean;
    /** Encoding (default: 'utf-8') */
    encoding?: BufferEncoding;
}
/**
 * Options for safe YAML parsing
 */
export interface SafeYamlOptions {
    /** YAML schema to use */
    schema?: 'json' | 'core' | 'failsafe';
    /** Strict mode: fail on unknown tags */
    strict?: boolean;
}
//# sourceMappingURL=utils.d.ts.map