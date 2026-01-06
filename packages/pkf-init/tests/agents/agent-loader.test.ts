/**
 * Unit tests for Agent Loader
 */

import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAgentConfig, getDefaultAgentsDir } from '../../src/agents/agent-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to test fixtures
const fixturesDir = path.join(__dirname, '..', 'fixtures', 'agents');

describe('getDefaultAgentsDir', () => {
  it('returns correct path', () => {
    const agentsDir = getDefaultAgentsDir();

    // Should return a path that ends with agents/pkf-init
    expect(agentsDir).toContain('agents');
    expect(agentsDir).toContain('pkf-init');
    expect(path.isAbsolute(agentsDir)).toBe(true);
  });
});

describe('loadAgentConfig', () => {
  it('loads valid agent file', async () => {
    const config = await loadAgentConfig('test-agent', fixturesDir);

    expect(config).toBeDefined();
    expect(config.name).toBe('Test Agent');
  });

  it('parses YAML frontmatter correctly', async () => {
    const config = await loadAgentConfig('test-agent', fixturesDir);

    expect(config.name).toBe('Test Agent');
    // 'opus' short name maps to opus model
    expect(config.model).toBe('claude-opus-4-5-20251101');
    expect(config.temperature).toBe(0.5);
    expect(config.maxTokens).toBe(8192);
  });

  it('extracts system instructions (content after frontmatter)', async () => {
    const config = await loadAgentConfig('test-agent', fixturesDir);

    expect(config.instructions).toContain('# Test Agent System Instructions');
    expect(config.instructions).toContain('You are a test agent');
    expect(config.instructions).toContain('## Capabilities');
    expect(config.instructions).toContain('multi-line system instruction');
  });

  it('maps short model names to full model IDs', async () => {
    const config = await loadAgentConfig('test-agent', fixturesDir);

    // 'opus' in frontmatter should map to full model ID
    expect(config.model).toBe('claude-opus-4-5-20251101');
  });

  it('handles missing optional fields with defaults', async () => {
    const config = await loadAgentConfig('minimal-agent', fixturesDir);

    expect(config.name).toBe('Minimal Agent');
    // Should use default values (Sonnet)
    expect(config.model).toBe('claude-sonnet-4-5-20250929');
    expect(config.temperature).toBe(0.7);
    expect(config.maxTokens).toBe(4096);
  });

  it('throws error for missing file', async () => {
    await expect(
      loadAgentConfig('nonexistent-agent', fixturesDir)
    ).rejects.toThrow('Failed to load agent config for "nonexistent-agent"');
  });

  it('throws error for invalid YAML frontmatter (missing closing delimiter)', async () => {
    // Create a mock directory path that doesn't have proper files
    const invalidDir = path.join(__dirname, '..', 'fixtures', 'invalid-agents');

    await expect(loadAgentConfig('broken-agent', invalidDir)).rejects.toThrow(
      'Failed to load agent config'
    );
  });

  it('handles multi-line system instructions', async () => {
    const config = await loadAgentConfig('test-agent', fixturesDir);

    // Check that multi-line content is preserved
    const lines = config.instructions.split('\n');
    expect(lines.length).toBeGreaterThan(5);

    // Should contain content from different sections
    expect(config.instructions).toContain('## Guidelines');
    expect(config.instructions).toContain('1. Always be helpful');
  });

  it('custom agentsDir parameter works', async () => {
    // Use the fixtures directory explicitly
    const config = await loadAgentConfig('test-agent', fixturesDir);

    expect(config).toBeDefined();
    expect(config.name).toBe('Test Agent');
  });
});
