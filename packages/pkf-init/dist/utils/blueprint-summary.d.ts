/**
 * Blueprint Summary Generator
 * Creates concise summaries of PKF blueprints for terminal display
 */
/**
 * Blueprint summary for display
 */
export interface BlueprintSummary {
    /** Total documents found */
    totalDocuments: number;
    /** Documents with existing frontmatter */
    withFrontmatter: number;
    /** Document types with counts */
    documentTypes: Map<string, number>;
    /** Top recommendations */
    topRecommendations: string[];
    /** Overall migration complexity */
    migrationComplexity: 'low' | 'medium' | 'high';
    /** Any warnings */
    warnings: string[];
}
/**
 * Extract summary from blueprint YAML
 * @param blueprintYaml - Raw YAML string
 * @returns BlueprintSummary or null if parsing fails
 */
export declare function extractBlueprintSummary(blueprintYaml: string): BlueprintSummary | null;
/**
 * Display blueprint summary to console
 * @param summary - BlueprintSummary to display
 * @param blueprintPath - Path where full blueprint was saved
 */
export declare function displayBlueprintSummary(summary: BlueprintSummary, blueprintPath: string): void;
/**
 * Save blueprint to file and return the path
 * @param blueprintYaml - Raw YAML content
 * @param rootDir - Project root directory
 * @returns Path where blueprint was saved
 */
export declare function saveBlueprintToFile(blueprintYaml: string, rootDir: string): Promise<string>;
declare const _default: {
    extractBlueprintSummary: typeof extractBlueprintSummary;
    displayBlueprintSummary: typeof displayBlueprintSummary;
    saveBlueprintToFile: typeof saveBlueprintToFile;
};
export default _default;
//# sourceMappingURL=blueprint-summary.d.ts.map