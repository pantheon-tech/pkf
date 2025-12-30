/**
 * Anthropic API Client Wrapper
 *
 * Wraps the Anthropic SDK with retry logic, error handling, and token tracking.
 */
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
 * Anthropic API client with retry logic and token tracking
 */
export declare class AnthropicClient {
    private client;
    private maxRetries;
    private retryDelayMs;
    /**
     * Create a new Anthropic client
     * @param apiKey - Anthropic API key
     * @param options - Client options
     */
    constructor(apiKey: string, options?: AnthropicClientOptions);
    /**
     * Execute a function with retry logic and exponential backoff
     */
    private retry;
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
     * @param onText - Callback for each text chunk
     * @returns Message result with content and token usage
     */
    createMessageStreaming(params: CreateMessageParams, onText: (text: string) => void): Promise<MessageResult>;
}
//# sourceMappingURL=anthropic-client.d.ts.map