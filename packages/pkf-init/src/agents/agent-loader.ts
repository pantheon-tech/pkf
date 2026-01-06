/**
 * PKF Init Agent Loader
 * Loads agent configurations from markdown files with YAML frontmatter
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentConfig, ClaudeModel } from '../types/index.js';

/**
 * Get the directory containing this file
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Default model settings if not specified in frontmatter
 */
const DEFAULT_MODEL: ClaudeModel = 'claude-sonnet-4-5-20250929';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Map frontmatter model names to ClaudeModel types
 * Supports short names (opus, sonnet, haiku) and full model IDs
 */
const MODEL_MAP: Record<string, ClaudeModel> = {
  // Short names (use latest versions)
  opus: 'claude-opus-4-5-20251101',
  sonnet: 'claude-sonnet-4-5-20250929',
  haiku: 'claude-haiku-4-5-20251001',
  // Full model IDs
  'claude-opus-4-5-20251101': 'claude-opus-4-5-20251101',
  'claude-sonnet-4-5-20250929': 'claude-sonnet-4-5-20250929',
  'claude-haiku-4-5-20251001': 'claude-haiku-4-5-20251001',
};

/**
 * Parsed frontmatter from agent markdown file
 */
interface ParsedFrontmatter {
  name?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableCaching?: boolean;
}

/**
 * Parse YAML frontmatter from markdown content
 * Expects frontmatter between first pair of --- markers
 *
 * @param content - Markdown file content
 * @returns Parsed frontmatter and remaining content
 */
function parseFrontmatter(content: string): { frontmatter: ParsedFrontmatter; body: string } {
  const lines = content.split('\n');

  // Check for opening ---
  if (lines[0]?.trim() !== '---') {
    return { frontmatter: {}, body: content };
  }

  // Find closing ---
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  // Extract frontmatter lines
  const frontmatterLines = lines.slice(1, endIndex);
  const body = lines.slice(endIndex + 1).join('\n').trim();

  // Parse simple YAML key-value pairs
  const frontmatter: ParsedFrontmatter = {};
  for (const line of frontmatterLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    switch (key) {
      case 'name':
        frontmatter.name = value;
        break;
      case 'model':
        frontmatter.model = value;
        break;
      case 'temperature': {
        const temp = parseFloat(value);
        if (!isNaN(temp)) {
          frontmatter.temperature = temp;
        }
        break;
      }
      case 'maxTokens':
      case 'max_tokens':
      case 'max-tokens': {
        const tokens = parseInt(value, 10);
        if (!isNaN(tokens)) {
          frontmatter.maxTokens = tokens;
        }
        break;
      }
      case 'caching':
      case 'enableCaching':
      case 'enable_caching': {
        frontmatter.enableCaching = value.toLowerCase() === 'true';
        break;
      }
    }
  }

  return { frontmatter, body };
}

/**
 * Get the default agents directory
 * Resolves to the agents/ directory bundled with the package
 *
 * @returns Absolute path to default agents directory
 */
export function getDefaultAgentsDir(): string {
  // Navigate from: dist/agents/ to package root agents/
  // __dirname = packages/pkf-init/dist/agents/
  // We need:   packages/pkf-init/agents/
  return join(__dirname, '..', '..', 'agents');
}

/**
 * Load agent configuration from a markdown file
 *
 * @param agentName - Name of the agent (filename without .md extension)
 * @param agentsDir - Optional directory containing agent files
 * @returns Parsed AgentConfig
 * @throws Error if agent file not found or invalid
 */
export async function loadAgentConfig(
  agentName: string,
  agentsDir?: string
): Promise<AgentConfig> {
  const dir = agentsDir ?? getDefaultAgentsDir();
  const filePath = join(dir, `${agentName}.md`);

  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load agent config for "${agentName}": ${errorMessage}`);
  }

  const { frontmatter, body } = parseFrontmatter(content);

  // Determine model from frontmatter or use default
  let model: ClaudeModel = DEFAULT_MODEL;
  if (frontmatter.model) {
    const mappedModel = MODEL_MAP[frontmatter.model.toLowerCase()];
    if (mappedModel) {
      model = mappedModel;
    }
  }

  const config = {
    name: frontmatter.name ?? agentName,
    instructions: body,
    model,
    temperature: frontmatter.temperature ?? DEFAULT_TEMPERATURE,
    maxTokens: frontmatter.maxTokens ?? DEFAULT_MAX_TOKENS,
    enableCaching: frontmatter.enableCaching,
  };

  // Debug log to trace maxTokens issue
  console.log(`[DEBUG] Loaded agent "${agentName}": maxTokens=${config.maxTokens}, from="${filePath}"`);

  return config;
}

export default loadAgentConfig;
