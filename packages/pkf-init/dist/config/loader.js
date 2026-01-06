/**
 * PKF Init Configuration Loader
 * Loads and validates configuration from multiple sources
 */
import { access } from 'fs/promises';
import { resolve, join } from 'path';
/**
 * PKF config file name
 */
const PKF_CONFIG_FILE = 'pkf.config.yaml';
/**
 * Default configuration values
 */
const DEFAULTS = {
    apiTier: 'build1',
    docsDir: 'docs',
    outputDir: '.',
    backupDir: '.pkf-backup',
    maxCost: 50,
    workers: 3,
};
/**
 * ConfigLoader - Loads configuration from CLI args, environment, and config files
 */
export class ConfigLoader {
    options;
    workingDir;
    /**
     * Create a new ConfigLoader
     * @param options - CLI options
     * @param workingDir - Working directory (defaults to process.cwd())
     */
    constructor(options, workingDir) {
        this.options = options;
        this.workingDir = workingDir ?? process.cwd();
    }
    /**
     * Load and validate all configuration
     * @returns Loaded and validated configuration
     * @throws Error if configuration is invalid
     */
    async load() {
        // Load and validate API key
        const { apiKey, useOAuth } = this.loadApiKey();
        if (!this.validateApiKey(apiKey)) {
            throw new Error("Invalid API key format. Key should start with 'sk-ant-'");
        }
        // Detect existing PKF installation
        const pkfInitialized = await this.detectPkfInstallation();
        // Resolve directories
        const rootDir = resolve(this.workingDir);
        const docsDir = this.resolveDocsDir();
        const outputDir = this.resolveOutputDir();
        const backupDir = this.resolveBackupDir();
        return {
            apiKey,
            useOAuth,
            apiTier: this.options.apiTier ?? DEFAULTS.apiTier,
            rootDir,
            docsDir,
            outputDir,
            backupDir,
            maxCost: this.options.maxCost ?? DEFAULTS.maxCost,
            workers: this.options.workers ?? DEFAULTS.workers,
            pkfInitialized,
            customTemplateDir: this.options.customTemplateDir
                ? resolve(this.workingDir, this.options.customTemplateDir)
                : undefined,
        };
    }
    /**
     * Load API key from CLI args or environment
     * Priority: CLI arg > ANTHROPIC_API_KEY > CLAUDE_CODE_OAUTH_TOKEN
     * @returns API key and OAuth flag
     * @throws Error if no API key is found
     */
    loadApiKey() {
        // Priority 1: CLI argument (assume standard API key)
        if (this.options.apiKey) {
            return { apiKey: this.options.apiKey, useOAuth: false };
        }
        // Priority 2: ANTHROPIC_API_KEY environment variable
        const envKey = process.env.ANTHROPIC_API_KEY;
        if (envKey) {
            return { apiKey: envKey, useOAuth: false };
        }
        // Priority 3: CLAUDE_CODE_OAUTH_TOKEN environment variable (Claude Code OAuth)
        const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
        if (oauthToken) {
            return { apiKey: oauthToken, useOAuth: true };
        }
        throw new Error('Anthropic API key required. Set ANTHROPIC_API_KEY, CLAUDE_CODE_OAUTH_TOKEN, or use --api-key');
    }
    /**
     * Validate API key format
     * @param key - API key to validate
     * @returns true if valid, false otherwise
     */
    validateApiKey(key) {
        // Accept standard API keys (sk-ant-*) or OAuth tokens
        return key.startsWith('sk-ant-') || key.length > 20;
    }
    /**
     * Detect if PKF is already initialized
     * Checks for pkf.config.yaml in working directory
     * @returns true if PKF is initialized, false otherwise
     */
    async detectPkfInstallation() {
        const configPath = join(this.workingDir, PKF_CONFIG_FILE);
        try {
            await access(configPath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Resolve docs directory path
     * @returns Absolute path to docs directory
     */
    resolveDocsDir() {
        const docsPath = this.options.docsPath ?? DEFAULTS.docsDir;
        return resolve(this.workingDir, docsPath);
    }
    /**
     * Resolve output directory path
     * @returns Absolute path to output directory
     */
    resolveOutputDir() {
        const outputPath = this.options.output ?? DEFAULTS.outputDir;
        return resolve(this.workingDir, outputPath);
    }
    /**
     * Resolve backup directory path
     * @returns Absolute path to backup directory
     */
    resolveBackupDir() {
        const backupPath = this.options.backupDir ?? DEFAULTS.backupDir;
        return resolve(this.workingDir, backupPath);
    }
}
//# sourceMappingURL=loader.js.map