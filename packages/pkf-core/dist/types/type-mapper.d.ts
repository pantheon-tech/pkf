/**
 * Type mapping interfaces for document classification and path resolution
 * @packageDocumentation
 */
/**
 * Supported PKF document types
 */
export type DocumentType = 'readme' | 'guide' | 'api-reference' | 'architecture' | 'adr' | 'spec' | 'proposal' | 'register' | 'template' | 'generic';
/**
 * Configuration for type detection and mapping
 */
export interface TypeMappingOptions {
    /** Preserve subdirectory structure in target paths */
    preserveSubdirectories?: boolean;
    /** Custom type-to-directory mappings */
    customMappings?: Record<string, string>;
    /** Custom type detection patterns */
    customPatterns?: Array<{
        pattern: RegExp;
        type: string;
    }>;
}
/**
 * Result of type detection and path resolution
 */
export interface ResolvedPath {
    /** Target path in PKF structure */
    targetPath: string;
    /** Detected document type */
    docType: DocumentType;
    /** Schema name to use for validation */
    schemaName: string;
}
//# sourceMappingURL=type-mapper.d.ts.map