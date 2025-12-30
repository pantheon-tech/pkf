/**
 * PKF Init Configuration Generator
 * Generates pkf.config.yaml from schemas.yaml and project information
 */
import type { GeneratedStructure } from './structure.js';
/**
 * ConfigGenerator - Generates pkf.config.yaml
 */
export declare class ConfigGenerator {
    private rootDir;
    /**
     * Create a new ConfigGenerator
     * @param rootDir - Root directory of the project
     */
    constructor(rootDir: string);
    /**
     * Generate pkf.config.yaml content
     * @param schemasYaml - The schemas.yaml content
     * @param structure - Generated structure information
     * @returns The YAML configuration string
     */
    generate(schemasYaml: string, structure: GeneratedStructure): Promise<string>;
    /**
     * Write configuration to file
     * @param configContent - The YAML configuration content
     */
    write(configContent: string): Promise<void>;
    /**
     * Build the configuration object
     * @param schemas - Parsed schemas object
     * @param dirs - List of created/existing directories
     * @returns PKF configuration object
     */
    private buildConfig;
    /**
     * Load project information from package.json
     * @returns Project information
     */
    private loadProjectInfo;
    /**
     * Build document types configuration from schemas
     * @param schemas - Parsed schemas object
     * @param dirs - Available directories
     * @returns Document types configuration
     */
    private buildDocumentTypes;
    /**
     * Extract document types from schemas object
     * @param schemas - Parsed schemas object
     * @returns Map of document type names to their info
     */
    private extractDocumentTypes;
    /**
     * Parse type information from schema entry
     * @param info - Type information object
     * @returns Parsed type info
     */
    private parseTypeInfo;
    /**
     * Get the appropriate path for a document type
     * @param typeName - Normalized type name
     * @param dirs - Available directories
     * @returns Path for the document type
     */
    private getPathForType;
}
//# sourceMappingURL=config.d.ts.map