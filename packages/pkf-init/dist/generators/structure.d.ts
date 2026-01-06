/**
 * PKF Init Structure Generator
 * Creates the PKF directory structure based on schemas.yaml and blueprint
 */
/**
 * Result of structure generation
 */
export interface GeneratedStructure {
    /** Directories that were created */
    createdDirs: string[];
    /** Directories that already existed */
    existingDirs: string[];
}
/**
 * StructureGenerator - Creates PKF directory structure
 */
export declare class StructureGenerator {
    private rootDir;
    private outputDir;
    /**
     * Create a new StructureGenerator
     * @param rootDir - Root directory of the project
     * @param outputDir - Output directory for generated structure
     */
    constructor(rootDir: string, outputDir: string);
    /**
     * Generate the directory structure based on schemas.yaml
     * @param schemasYaml - The schemas.yaml content
     * @param blueprintYaml - Optional blueprint YAML for target path extraction
     * @returns Information about created and existing directories
     */
    generate(schemasYaml: string, blueprintYaml?: string): Promise<GeneratedStructure>;
    /**
     * Extract directories from blueprint target paths
     * @param blueprintYaml - Blueprint YAML content
     * @returns Set of required directory paths
     */
    private getDirectoriesFromBlueprint;
    /**
     * Analyze document types and determine required directories
     * Uses centralized PKF type mapping
     * @param schemas - Parsed schemas object
     * @returns Set of required directory paths
     */
    private getRequiredDirs;
    /**
     * Extract document types from schemas object
     * @param schemas - Parsed schemas object
     * @returns Array of document type names
     */
    private extractDocumentTypes;
    /**
     * Create directories recursively
     * @param dirs - List of directories to create (sorted)
     * @returns Information about created and existing directories
     */
    createDirectories(dirs: string[]): Promise<GeneratedStructure>;
    /**
     * Generate structure from blueprint alone (without schemas)
     * @param blueprintYaml - Blueprint YAML content
     * @returns Information about created and existing directories
     */
    generateFromBlueprint(blueprintYaml: string): Promise<GeneratedStructure>;
}
//# sourceMappingURL=structure.d.ts.map