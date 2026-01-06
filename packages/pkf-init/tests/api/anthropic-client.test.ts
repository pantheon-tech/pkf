/**
 * Unit tests for AnthropicClient
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicClient } from '../../src/api/anthropic-client.js';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk');

describe('AnthropicClient', () => {
  let client: AnthropicClient;
  let mockAnthropicInstance: any;

  beforeEach(() => {
    mockAnthropicInstance = {
      messages: {
        create: vi.fn(),
        stream: vi.fn(),
        countTokens: vi.fn(),
      },
    };

    vi.mocked(Anthropic).mockImplementation(() => mockAnthropicInstance);

    client = new AnthropicClient('test-api-key');
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(client).toBeDefined();
      expect(client.apiKey).toBe('test-api-key');
    });

    it('should accept custom options', () => {
      const customClient = new AnthropicClient('test-key', {
        maxRetries: 5,
        retryDelayMs: 2000,
      });

      expect(customClient).toBeDefined();
    });

    it('should support OAuth authentication', () => {
      const oauthClient = new AnthropicClient('oauth-token', {
        useOAuth: true,
      });

      expect(oauthClient).toBeDefined();
    });
  });

  describe('createMessage', () => {
    const mockParams = {
      model: 'claude-sonnet-4-5-20250929' as const,
      systemPrompt: 'You are a helpful assistant',
      messages: [{ role: 'user' as const, content: 'Hello' }],
    };

    it('should create message successfully', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Hello! How can I help?' }],
        usage: { input_tokens: 100, output_tokens: 50 },
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-5-20250929',
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await client.createMessage(mockParams);

      expect(result.content).toBe('Hello! How can I help?');
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
      expect(result.stopReason).toBe('end_turn');
      expect(result.model).toBe('claude-sonnet-4-5-20250929');
    });

    it('should support custom max tokens and temperature', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-5-20250929',
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      await client.createMessage({
        ...mockParams,
        maxTokens: 8192,
        temperature: 0.5,
      });

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 8192,
          temperature: 0.5,
        })
      );
    });

    it('should support prompt caching', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Cached response' }],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 80,
          cache_read_input_tokens: 20,
        },
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-5-20250929',
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await client.createMessage({
        ...mockParams,
        enableCaching: true,
      });

      expect(result.cacheCreationInputTokens).toBe(80);
      expect(result.cacheReadInputTokens).toBe(20);
    });

    it('should support extended cache TTL', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-5-20250929',
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      await client.createMessage({
        ...mockParams,
        enableCaching: true,
        cacheTTL: '1h',
      });

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          betas: expect.arrayContaining(['extended-cache-ttl-2025-04-11']),
        })
      );
    });

    it('should support 128k output beta', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Large response' }],
        usage: { input_tokens: 100, output_tokens: 50000 },
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-5-20250929',
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      await client.createMessage({
        ...mockParams,
        enable128kOutput: true,
      });

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          betas: expect.arrayContaining(['output-128k-2025-02-19']),
        })
      );
    });

    it('should retry on rate limit errors', async () => {
      const rateLimitError = new Anthropic.RateLimitError(
        429,
        {} as any,
        'Rate limited',
        { 'retry-after': '1' }
      );

      const mockResponse = {
        content: [{ type: 'text', text: 'Success after retry' }],
        usage: { input_tokens: 100, output_tokens: 50 },
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-5-20250929',
      };

      mockAnthropicInstance.messages.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(mockResponse);

      const result = await client.createMessage(mockParams);

      expect(result.content).toBe('Success after retry');
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx server errors', async () => {
      const serverError = new Anthropic.APIError(
        500,
        {} as any,
        'Internal server error',
        {}
      );

      const mockResponse = {
        content: [{ type: 'text', text: 'Success' }],
        usage: { input_tokens: 100, output_tokens: 50 },
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-5-20250929',
      };

      mockAnthropicInstance.messages.create
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce(mockResponse);

      const result = await client.createMessage(mockParams);

      expect(result.content).toBe('Success');
    });

    it('should not retry on client errors', async () => {
      const clientError = new Anthropic.APIError(
        400,
        {} as any,
        'Bad request',
        {}
      );

      mockAnthropicInstance.messages.create.mockRejectedValue(clientError);

      await expect(client.createMessage(mockParams)).rejects.toThrow(
        'Bad request'
      );

      // Should only be called once (no retries)
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(1);
    });

    it('should respect max retries', async () => {
      const customClient = new AnthropicClient('test-key', {
        maxRetries: 2,
        retryDelayMs: 10,
      });

      const serverError = new Anthropic.APIError(
        500,
        {} as any,
        'Server error',
        {}
      );

      mockAnthropicInstance.messages.create.mockRejectedValue(serverError);

      await expect(
        customClient.createMessage(mockParams)
      ).rejects.toThrow();

      // Should be called 3 times total (1 initial + 2 retries)
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple text blocks in response', async () => {
      const mockResponse = {
        content: [
          { type: 'text', text: 'First block. ' },
          { type: 'text', text: 'Second block.' },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-5-20250929',
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await client.createMessage(mockParams);

      expect(result.content).toBe('First block. Second block.');
    });
  });

  describe('createMessageStreaming', () => {
    const mockParams = {
      model: 'claude-sonnet-4-5-20250929' as const,
      systemPrompt: 'You are helpful',
      messages: [{ role: 'user' as const, content: 'Hi' }],
    };

    it('should stream message successfully', async () => {
      const chunks: string[] = [];
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: 'content_block_delta',
            delta: { text: 'Hello ' },
          };
          yield {
            type: 'content_block_delta',
            delta: { text: 'world!' },
          };
        },
        finalMessage: async () => ({
          usage: { input_tokens: 100, output_tokens: 50 },
          stop_reason: 'end_turn',
          model: 'claude-sonnet-4-5-20250929',
        }),
      };

      mockAnthropicInstance.messages.stream.mockReturnValue(mockStream);

      const result = await client.createMessageStreaming(
        mockParams,
        (text) => chunks.push(text)
      );

      expect(chunks).toEqual(['Hello ', 'world!']);
      expect(result.content).toBe('Hello world!');
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
    });

    it('should work without callback', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: 'content_block_delta',
            delta: { text: 'Silent stream' },
          };
        },
        finalMessage: async () => ({
          usage: { input_tokens: 50, output_tokens: 25 },
          stop_reason: 'end_turn',
          model: 'claude-sonnet-4-5-20250929',
        }),
      };

      mockAnthropicInstance.messages.stream.mockReturnValue(mockStream);

      const result = await client.createMessageStreaming(mockParams);

      expect(result.content).toBe('Silent stream');
    });
  });

  describe('createMessageWithTools', () => {
    const mockParams = {
      model: 'claude-sonnet-4-5-20250929' as const,
      systemPrompt: 'You have tools',
      messages: [{ role: 'user' as const, content: 'Use a tool' }],
      tools: [
        {
          name: 'test_tool',
          description: 'A test tool',
          input_schema: {
            type: 'object' as const,
            properties: { param: { type: 'string' } },
          },
        },
      ],
    };

    it('should create message with tools', async () => {
      const mockResponse = {
        content: [
          { type: 'text', text: 'Using tool' },
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'test_tool',
            input: { param: 'value' },
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
        stop_reason: 'tool_use',
        model: 'claude-sonnet-4-5-20250929',
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await client.createMessageWithTools(mockParams);

      expect(result.content).toBe('Using tool');
      expect(result.toolUse).toHaveLength(1);
      expect(result.toolUse[0].name).toBe('test_tool');
      expect(result.toolUse[0].input).toEqual({ param: 'value' });
    });

    it('should support tool choice', async () => {
      const mockResponse = {
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'test_tool',
            input: {},
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
        stop_reason: 'tool_use',
        model: 'claude-sonnet-4-5-20250929',
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      await client.createMessageWithTools({
        ...mockParams,
        toolChoice: { type: 'tool', name: 'test_tool' },
      });

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tool_choice: { type: 'tool', name: 'test_tool' },
        })
      );
    });
  });

  describe('countTokens', () => {
    const mockParams = {
      model: 'claude-sonnet-4-5-20250929' as const,
      systemPrompt: 'System',
      messages: [{ role: 'user' as const, content: 'Message' }],
    };

    it('should count tokens accurately', async () => {
      mockAnthropicInstance.messages.countTokens.mockResolvedValue({
        input_tokens: 150,
      });

      const result = await client.countTokens(mockParams);

      expect(result.inputTokens).toBe(150);
    });
  });
});
