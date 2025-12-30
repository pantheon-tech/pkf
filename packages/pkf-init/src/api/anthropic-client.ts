/**
 * Anthropic API Client Wrapper
 *
 * Wraps the Anthropic SDK with retry logic, error handling, and token tracking.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ClaudeModel, AgentMessage } from '../types/index.js';

/**
 * Parameters for creating a message
 */
export interface CreateMessageParams {
  /** Model to use */
  model: ClaudeModel;
  /** System prompt */
  systemPrompt: string;
  /** Conversation messages */
  messages: AgentMessage[];
  /** Maximum output tokens */
  maxTokens?: number;
  /** Temperature for generation */
  temperature?: number;
}

/**
 * Result from a message creation
 */
export interface MessageResult {
  /** Generated content */
  content: string;
  /** Input tokens used */
  inputTokens: number;
  /** Output tokens used */
  outputTokens: number;
  /** Stop reason */
  stopReason: string;
  /** Model used */
  model: string;
}

/**
 * Event from streaming response
 */
export interface StreamEvent {
  /** Event type */
  type: 'text' | 'done';
  /** Text content (for text events) */
  text?: string;
  /** Input tokens (for done events) */
  inputTokens?: number;
  /** Output tokens (for done events) */
  outputTokens?: number;
}

/**
 * Options for the Anthropic client
 */
export interface AnthropicClientOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Base delay between retries in milliseconds */
  retryDelayMs?: number;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Anthropic.RateLimitError) {
    return true;
  }
  if (error instanceof Anthropic.APIError) {
    const status = error.status;
    // 529 is Overloaded
    if (status === 529) {
      return true;
    }
    // 5xx server errors
    if (status !== undefined && status >= 500 && status < 600) {
      return true;
    }
  }
  return false;
}

/**
 * Extract retry delay from error if available (Retry-After header)
 */
function getRetryAfterMs(error: unknown): number | undefined {
  if (error instanceof Anthropic.APIError) {
    const headers = error.headers;
    if (headers) {
      const retryAfter = headers['retry-after'];
      if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        if (!isNaN(seconds)) {
          return seconds * 1000;
        }
      }
    }
  }
  return undefined;
}

/**
 * Anthropic API client with retry logic and token tracking
 */
export class AnthropicClient {
  private client: Anthropic;
  private maxRetries: number;
  private retryDelayMs: number;

  /**
   * Create a new Anthropic client
   * @param apiKey - Anthropic API key
   * @param options - Client options
   */
  constructor(apiKey: string, options?: AnthropicClientOptions) {
    this.client = new Anthropic({ apiKey });
    this.maxRetries = options?.maxRetries ?? 3;
    this.retryDelayMs = options?.retryDelayMs ?? 1000;
  }

  /**
   * Execute a function with retry logic and exponential backoff
   */
  private async retry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Only retry on retryable errors
        if (!isRetryableError(error)) {
          break;
        }

        // Calculate delay: use Retry-After if available, otherwise exponential backoff
        const retryAfterMs = getRetryAfterMs(error);
        const delay = retryAfterMs ?? this.retryDelayMs * Math.pow(2, attempt);

        await sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Create a message using the Anthropic API
   * @param params - Message creation parameters
   * @returns Message result with content and token usage
   */
  async createMessage(params: CreateMessageParams): Promise<MessageResult> {
    const { model, systemPrompt, messages, maxTokens = 4096, temperature = 0.7 } = params;

    // Convert our message format to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await this.retry(() =>
      this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: anthropicMessages,
      })
    );

    // Extract text content from response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    const content = textBlocks.map((block) => block.text).join('');

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason ?? 'unknown',
      model: response.model,
    };
  }

  /**
   * Stream a message using the Anthropic API
   * @param _params - Message creation parameters
   * @yields Stream events with text or completion data
   * @throws Error - Streaming not yet implemented
   */
  async *streamMessage(_params: CreateMessageParams): AsyncGenerator<StreamEvent> {
    throw new Error('Streaming not implemented');
    // Yield is unreachable but required for TypeScript to recognize this as a generator
    yield { type: 'done' };
  }
}
