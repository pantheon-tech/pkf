/**
 * PKF Configuration System
 * Loads configuration from YAML files and environment variables
 */

import * as fs from 'fs/promises';
import { safeLoad } from '../utils/yaml.js';
import * as logger from '../utils/logger.js';

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
 * Default configuration values
 */
const DEFAULT_CONFIG: PKFConfig = {
  analysis: {
    maxParallelInspections: 3,
  },
  orchestration: {
    maxIterations: 5,
  },
  planning: {
    avgOutputTokensPerDoc: 1000,
  },
  api: {
    maxRetries: 3,
    retryDelayMs: 1000,
    timeout: 1800000, // 30 minutes - sufficient for long agent conversations
  },
};

/**
 * Deep merge two configuration objects
 * @param target - Target configuration object
 * @param source - Source configuration object
 */
function mergeConfig(target: PKFConfig, source: Partial<PKFConfig>): void {
  if (source.analysis) {
    target.analysis = { ...target.analysis, ...source.analysis };
  }
  if (source.orchestration) {
    target.orchestration = { ...target.orchestration, ...source.orchestration };
  }
  if (source.planning) {
    target.planning = { ...target.planning, ...source.planning };
  }
  if (source.api) {
    target.api = { ...target.api, ...source.api };
  }
}

/**
 * Apply environment variable overrides to configuration
 * @param config - Configuration object to modify
 */
function applyEnvironmentOverrides(config: PKFConfig): void {
  // Analysis overrides
  if (process.env.PKF_MAX_PARALLEL_INSPECTIONS) {
    const value = parseInt(process.env.PKF_MAX_PARALLEL_INSPECTIONS, 10);
    if (!isNaN(value) && value > 0) {
      config.analysis.maxParallelInspections = value;
      logger.debug(`Config override from env: maxParallelInspections=${value}`);
    } else {
      logger.warn(`Invalid PKF_MAX_PARALLEL_INSPECTIONS value: ${process.env.PKF_MAX_PARALLEL_INSPECTIONS}`);
    }
  }

  // Orchestration overrides
  if (process.env.PKF_MAX_ITERATIONS) {
    const value = parseInt(process.env.PKF_MAX_ITERATIONS, 10);
    if (!isNaN(value) && value > 0) {
      config.orchestration.maxIterations = value;
      logger.debug(`Config override from env: maxIterations=${value}`);
    } else {
      logger.warn(`Invalid PKF_MAX_ITERATIONS value: ${process.env.PKF_MAX_ITERATIONS}`);
    }
  }

  // Planning overrides
  if (process.env.PKF_AVG_OUTPUT_TOKENS_PER_DOC) {
    const value = parseInt(process.env.PKF_AVG_OUTPUT_TOKENS_PER_DOC, 10);
    if (!isNaN(value) && value > 0) {
      config.planning.avgOutputTokensPerDoc = value;
      logger.debug(`Config override from env: avgOutputTokensPerDoc=${value}`);
    } else {
      logger.warn(`Invalid PKF_AVG_OUTPUT_TOKENS_PER_DOC value: ${process.env.PKF_AVG_OUTPUT_TOKENS_PER_DOC}`);
    }
  }

  // API overrides
  if (process.env.PKF_MAX_RETRIES) {
    const value = parseInt(process.env.PKF_MAX_RETRIES, 10);
    if (!isNaN(value) && value >= 0) {
      config.api.maxRetries = value;
      logger.debug(`Config override from env: maxRetries=${value}`);
    } else {
      logger.warn(`Invalid PKF_MAX_RETRIES value: ${process.env.PKF_MAX_RETRIES}`);
    }
  }

  if (process.env.PKF_RETRY_DELAY_MS) {
    const value = parseInt(process.env.PKF_RETRY_DELAY_MS, 10);
    if (!isNaN(value) && value >= 0) {
      config.api.retryDelayMs = value;
      logger.debug(`Config override from env: retryDelayMs=${value}`);
    } else {
      logger.warn(`Invalid PKF_RETRY_DELAY_MS value: ${process.env.PKF_RETRY_DELAY_MS}`);
    }
  }

  if (process.env.PKF_API_TIMEOUT) {
    const value = parseInt(process.env.PKF_API_TIMEOUT, 10);
    if (!isNaN(value) && value >= 0) {
      config.api.timeout = value;
      logger.debug(`Config override from env: timeout=${value}`);
    } else {
      logger.warn(`Invalid PKF_API_TIMEOUT value: ${process.env.PKF_API_TIMEOUT}`);
    }
  }
}

/**
 * Load PKF configuration from file and environment variables
 * @param configPath - Optional path to YAML configuration file
 * @returns Loaded and merged configuration
 */
export async function loadPKFConfig(configPath?: string): Promise<PKFConfig> {
  // Start with default config
  const config: PKFConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  // Try to load from config file if provided
  if (configPath) {
    try {
      const fileContent = await fs.readFile(configPath, 'utf-8');
      const fileConfig = safeLoad(fileContent) as Partial<PKFConfig>;

      if (fileConfig && typeof fileConfig === 'object') {
        mergeConfig(config, fileConfig);
        logger.debug(`Loaded configuration from: ${configPath}`);
      } else {
        logger.warn(`Invalid configuration file format: ${configPath}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.debug(`Configuration file not found: ${configPath}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load config from ${configPath}: ${errorMessage}`);
      }
    }
  }

  // Override with environment variables
  applyEnvironmentOverrides(config);

  return config;
}

/**
 * Get default configuration values
 * @returns Default PKF configuration
 */
export function getDefaultConfig(): PKFConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}
