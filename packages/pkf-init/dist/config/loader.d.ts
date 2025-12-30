/**
 * PKF Init Configuration Loader
 * Loads and validates configuration from multiple sources
 */
import type { InitOptions, LoadedConfig } from '../types/index.js';
/**
 * ConfigLoader - Loads configuration from CLI args, environment, and config files
 */
export declare class ConfigLoader {
    private options;
    private workingDir;
    /**
     * Create a new ConfigLoader
     * @param options - CLI options
     * @param workingDir - Working directory (defaults to process.cwd())
     */
    constructor(options: InitOptions, workingDir?: string);
    /**
     * Load and validate all configuration
     * @returns Loaded and validated configuration
     * @throws Error if configuration is invalid
     */
    load(): Promise<LoadedConfig>;
    /**
     * Load API key from CLI args or environment
     * Priority: CLI arg > env var ANTHROPIC_API_KEY
     * @returns API key
     * @throws Error if no API key is found
     */
    private loadApiKey;
    /**
     * Validate API key format
     * @param key - API key to validate
     * @returns true if valid, false otherwise
     */
    private validateApiKey;
    /**
     * Detect if PKF is already initialized
     * Checks for pkf.config.yaml in working directory
     * @returns true if PKF is initialized, false otherwise
     */
    private detectPkfInstallation;
    /**
     * Resolve docs directory path
     * @returns Absolute path to docs directory
     */
    private resolveDocsDir;
    /**
     * Resolve output directory path
     * @returns Absolute path to output directory
     */
    private resolveOutputDir;
    /**
     * Resolve backup directory path
     * @returns Absolute path to backup directory
     */
    private resolveBackupDir;
}
//# sourceMappingURL=loader.d.ts.map