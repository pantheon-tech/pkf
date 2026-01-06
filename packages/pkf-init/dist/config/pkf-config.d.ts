/**
 * PKF Configuration System
 * Loads configuration from YAML files and environment variables
 */
/**
 * Configuration interface for PKF constants
 */
export interface PKFConfig {
    /** Analysis stage configuration */
    analysis: {
        /** Maximum number of parallel document inspections */
        maxParallelInspections: number;
    };
    /** Orchestration configuration */
    orchestration: {
        /** Maximum iterations for agent conversations */
        maxIterations: number;
    };
    /** Planning configuration */
    planning: {
        /** Average output tokens per document for cost estimation */
        avgOutputTokensPerDoc: number;
    };
    /** API client configuration */
    api: {
        /** Maximum number of retry attempts */
        maxRetries: number;
        /** Base delay between retries in milliseconds */
        retryDelayMs: number;
        /** Request timeout in milliseconds (0 = no timeout) */
        timeout: number;
    };
}
/**
 * Load PKF configuration from file and environment variables
 * @param configPath - Optional path to YAML configuration file
 * @returns Loaded and merged configuration
 */
export declare function loadPKFConfig(configPath?: string): Promise<PKFConfig>;
/**
 * Get default configuration values
 * @returns Default PKF configuration
 */
export declare function getDefaultConfig(): PKFConfig;
//# sourceMappingURL=pkf-config.d.ts.map