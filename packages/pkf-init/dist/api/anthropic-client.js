/**
 * Anthropic API Client Wrapper
 *
 * Wraps the Anthropic SDK with retry logic, error handling, and token tracking.
 */
import Anthropic from '@anthropic-ai/sdk';
/**
 * Sleep for a specified duration
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Check if an error is retryable
 */
function isRetryableError(error) {
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
function getRetryAfterMs(error) {
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
    client;
    maxRetries;
    retryDelayMs;
    /**
     * Create a new Anthropic client
     * @param apiKey - Anthropic API key
     * @param options - Client options
     */
    constructor(apiKey, options) {
        this.client = new Anthropic({ apiKey });
        this.maxRetries = options?.maxRetries ?? 3;
        this.retryDelayMs = options?.retryDelayMs ?? 1000;
    }
    /**
     * Execute a function with retry logic and exponential backoff
     */
    async retry(fn) {
        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
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
    async createMessage(params) {
        const { model, systemPrompt, messages, maxTokens = 4096, temperature = 0.7 } = params;
        // Convert our message format to Anthropic format
        const anthropicMessages = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));
        const response = await this.retry(() => this.client.messages.create({
            model,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: anthropicMessages,
        }));
        // Extract text content from response
        const textBlocks = response.content.filter((block) => block.type === 'text');
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
     * @param params - Message creation parameters
     * @yields Stream events with text chunks and completion data
     */
    async *streamMessage(params) {
        const { model, systemPrompt, messages, maxTokens = 4096, temperature = 0.7 } = params;
        // Convert our message format to Anthropic format
        const anthropicMessages = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));
        const stream = this.client.messages.stream({
            model,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: anthropicMessages,
        });
        // Process stream events
        for await (const event of stream) {
            if (event.type === 'content_block_delta') {
                const delta = event.delta;
                if ('text' in delta) {
                    yield { type: 'text', text: delta.text };
                }
            }
        }
        // Get final message for token counts
        const finalMessage = await stream.finalMessage();
        yield {
            type: 'done',
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
        };
    }
    /**
     * Create a message with streaming, calling a callback for each text chunk
     * @param params - Message creation parameters
     * @param onText - Callback for each text chunk
     * @returns Message result with content and token usage
     */
    async createMessageStreaming(params, onText) {
        const { model, systemPrompt, messages, maxTokens = 4096, temperature = 0.7 } = params;
        // Convert our message format to Anthropic format
        const anthropicMessages = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));
        const stream = await this.retry(() => Promise.resolve(this.client.messages.stream({
            model,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: anthropicMessages,
        })));
        let content = '';
        // Process stream events
        for await (const event of stream) {
            if (event.type === 'content_block_delta') {
                const delta = event.delta;
                if ('text' in delta) {
                    content += delta.text;
                    onText(delta.text);
                }
            }
        }
        // Get final message for token counts
        const finalMessage = await stream.finalMessage();
        return {
            content,
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
            stopReason: finalMessage.stop_reason ?? 'unknown',
            model: finalMessage.model,
        };
    }
}
//# sourceMappingURL=anthropic-client.js.map