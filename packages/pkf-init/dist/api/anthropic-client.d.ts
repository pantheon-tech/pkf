/**
 * Anthropic API Client Wrapper
 *
 * Wraps the Anthropic SDK with retry logic, error handling, and token tracking.
 */
import type { ClaudeModel, AgentMessage } from '../types/index.js';
/**
 * Cache TTL options
 */
export type CacheTTL = '5m' | '1h';
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
    /** Maximum output tokens (up to 128K with beta) */
    maxTokens?: number;
    /** Temperature for generation */
    temperature?: number;
    /** Enable prompt caching for system prompt (reduces cost for repeated calls) */
    enableCaching?: boolean;
    /** Cache TTL - '5m' (default) or '1h' (requires beta header) */
    cacheTTL?: CacheTTL;
    /** Enable 128K output beta (for very large outputs) */
    enable128kOutput?: boolean;
}
/**
 * Token count result
 */
export interface TokenCountResult {
    /** Total input tokens that would be used */
    inputTokens: number;
}
/**
 * Tool definition for structured output
 */
export interface ToolDefinition {
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
}
/**
 * Parameters for tool-based message
 */
export interface CreateToolMessageParams extends CreateMessageParams {
    /** Tool definitions */
    tools: ToolDefinition[];
    /** Tool choice - force use of a specific tool */
    toolChoice?: {
        type: 'tool';
        name: string;
    } | {
        type: 'auto';
    } | {
        type: 'any';
    };
}
/**
 * Result from a tool-based message
 */
export interface ToolMessageResult extends MessageResult {
    /** Tool use blocks from the response */
    toolUse: Array<{
        type: 'tool_use';
        id: string;
        name: string;
        input: unknown;
    }>;
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
    /** Tokens used to create cache (first call only) */
    cacheCreationInputTokens?: number;
    /** Tokens read from cache (subsequent calls) */
    cacheReadInputTokens?: number;
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
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Base delay between retries in milliseconds (default: 1000) */
    retryDelayMs?: number;
    /** Whether to use OAuth authentication (authToken instead of apiKey) */
    useOAuth?: boolean;
    /** Request timeout in milliseconds (default: 600000 = 10 minutes, 0 = no timeout) */
    timeout?: number;
}
/**
 * Anthropic API client with retry logic and token tracking
 */
export declare class AnthropicClient {
    private client;
    private maxRetries;
    private retryDelayMs;
    readonly apiKey: string;
    /**
     * Create a new Anthropic client
     * @param apiKey - Anthropic API key or OAuth token
     * @param options - Client options
     */
    constructor(apiKey: string, options?: AnthropicClientOptions);
    /**
     * Count tokens for a message without making a completion request
     * Uses the /v1/messages/count_tokens endpoint
     * @param params - Message parameters to count tokens for
     * @returns Token count result
     */
    countTokens(params: CreateMessageParams): Promise<TokenCountResult>;
    /**
     * Execute a function with retry logic and exponential backoff
     */
    private retry;
    /**
     * Build cache control block with TTL
     */
    private buildCacheControl;
    /**
     * Create a message using the Anthropic API
     * @param params - Message creation parameters
     * @returns Message result with content and token usage
     */
    createMessage(params: CreateMessageParams): Promise<MessageResult>;
    /**
     * Stream a message using the Anthropic API
     * @param params - Message creation parameters
     * @yields Stream events with text chunks and completion data
     */
    streamMessage(params: CreateMessageParams): AsyncGenerator<StreamEvent>;
    /**
     * Create a message with streaming, calling a callback for each text chunk
     * @param params - Message creation parameters
     * @param onText - Optional callback for each text chunk (if omitted, streams silently)
     * @returns Message result with content and token usage
     */
    createMessageStreaming(params: CreateMessageParams, onText?: (text: string) => void): Promise<MessageResult>;
    /**
     * Create a message with tool use for structured output
     * @param params - Message creation parameters with tools
     * @returns Message result with tool use blocks
     */
    createMessageWithTools(params: CreateToolMessageParams): Promise<ToolMessageResult>;
}
//# sourceMappingURL=anthropic-client.d.ts.map