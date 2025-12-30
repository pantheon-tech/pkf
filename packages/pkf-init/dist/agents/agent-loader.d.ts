/**
 * PKF Init Agent Loader
 * Loads agent configurations from markdown files with YAML frontmatter
 */
import type { AgentConfig } from '../types/index.js';
/**
 * Get the default agents directory
 * Resolves from current module to repo root agents/pkf-init/
 *
 * @returns Absolute path to default agents directory
 */
export declare function getDefaultAgentsDir(): string;
/**
 * Load agent configuration from a markdown file
 *
 * @param agentName - Name of the agent (filename without .md extension)
 * @param agentsDir - Optional directory containing agent files
 * @returns Parsed AgentConfig
 * @throws Error if agent file not found or invalid
 */
export declare function loadAgentConfig(agentName: string, agentsDir?: string): Promise<AgentConfig>;
export default loadAgentConfig;
//# sourceMappingURL=agent-loader.d.ts.map