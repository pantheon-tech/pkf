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
    apiKey;
    /**
     * Create a new Anthropic client
     * @param apiKey - Anthropic API key or OAuth token
     * @param options - Client options
     */
    constructor(apiKey, options) {
        this.apiKey = apiKey;
        // OAuth tokens (like CLAUDE_CODE_OAUTH_TOKEN) use authToken, not apiKey
        const useOAuth = options?.useOAuth ?? false;
        const timeout = options?.timeout ?? 600000; // Default 10 minutes
        this.client = new Anthropic(useOAuth
            ? { authToken: apiKey, timeout }
            : { apiKey, timeout });
        this.maxRetries = options?.maxRetries ?? 3;
        this.retryDelayMs = options?.retryDelayMs ?? 1000;
    }
    /**
     * Count tokens for a message without making a completion request
     * Uses the /v1/messages/count_tokens endpoint
     * @param params - Message parameters to count tokens for
     * @returns Token count result
     */
    async countTokens(params) {
        const { model, systemPrompt, messages } = params;
        // Convert our message format to Anthropic format
        const anthropicMessages = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));
        const response = await this.retry(() => this.client.messages.countTokens({
            model,
            system: systemPrompt,
            messages: anthropicMessages,
        }));
        return {
            inputTokens: response.input_tokens,
        };
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
     * Build cache control block with TTL
     */
    buildCacheControl(ttl = '5m') {
        // Only include ttl if it's 1h (5m is default)
        if (ttl === '1h') {
            return { type: 'ephemeral', ttl: '1h' };
        }
        return { type: 'ephemeral' };
    }
    /**
     * Create a message using the Anthropic API
     * @param params - Message creation parameters
     * @returns Message result with content and token usage
     */
    async createMessage(params) {
        const { model, systemPrompt, messages, maxTokens = 4096, temperature = 0.7, enableCaching = false, cacheTTL = '5m', enable128kOutput = false } = params;
        // Convert our message format to Anthropic format
        const anthropicMessages = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));
        // Build system prompt - use content block format for caching
        const system = enableCaching
            ? [
                {
                    type: 'text',
                    text: systemPrompt,
                    cache_control: this.buildCacheControl(cacheTTL),
                },
            ]
            : systemPrompt;
        // Add beta headers as needed
        const betas = [];
        if (cacheTTL === '1h') {
            betas.push('extended-cache-ttl-2025-04-11');
        }
        if (enable128kOutput) {
            betas.push('output-128k-2025-02-19');
        }
        const response = await this.retry(() => this.client.messages.create({
            model,
            max_tokens: maxTokens,
            temperature,
            system,
            messages: anthropicMessages,
            ...(betas.length > 0 && { betas }),
        }));
        // Extract text content from response
        const textBlocks = response.content.filter((block) => block.type === 'text');
        const content = textBlocks.map((block) => block.text).join('');
        // Extract cache usage from response if available
        const usage = response.usage;
        return {
            content,
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            stopReason: response.stop_reason ?? 'unknown',
            model: response.model,
            cacheCreationInputTokens: usage.cache_creation_input_tokens,
            cacheReadInputTokens: usage.cache_read_input_tokens,
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
     * @param onText - Optional callback for each text chunk (if omitted, streams silently)
     * @returns Message result with content and token usage
     */
    async createMessageStreaming(params, onText) {
        const { model, systemPrompt, messages, maxTokens = 4096, temperature = 0.7, enableCaching = false, cacheTTL = '5m', enable128kOutput = false } = params;
        // Convert our message format to Anthropic format
        const anthropicMessages = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));
        // Build system prompt - use content block format for caching
        const system = enableCaching
            ? [
                {
                    type: 'text',
                    text: systemPrompt,
                    cache_control: this.buildCacheControl(cacheTTL),
                },
            ]
            : systemPrompt;
        // Add beta headers as needed
        const betas = [];
        if (cacheTTL === '1h') {
            betas.push('extended-cache-ttl-2025-04-11');
        }
        if (enable128kOutput) {
            betas.push('output-128k-2025-02-19');
        }
        const stream = await this.retry(() => Promise.resolve(this.client.messages.stream({
            model,
            max_tokens: maxTokens,
            temperature,
            system,
            messages: anthropicMessages,
            ...(betas.length > 0 && { betas }),
        })));
        let content = '';
        // Process stream events
        for await (const event of stream) {
            if (event.type === 'content_block_delta') {
                const delta = event.delta;
                if ('text' in delta) {
                    content += delta.text;
                    if (onText) {
                        onText(delta.text);
                    }
                }
            }
        }
        // Get final message for token counts
        const finalMessage = await stream.finalMessage();
        // Extract cache usage from response if available
        const usage = finalMessage.usage;
        return {
            content,
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            stopReason: finalMessage.stop_reason ?? 'unknown',
            model: finalMessage.model,
            cacheCreationInputTokens: usage.cache_creation_input_tokens,
            cacheReadInputTokens: usage.cache_read_input_tokens,
        };
    }
    /**
     * Create a message with tool use for structured output
     * @param params - Message creation parameters with tools
     * @returns Message result with tool use blocks
     */
    async createMessageWithTools(params) {
        const { model, systemPrompt, messages, maxTokens = 4096, temperature = 0.7, enableCaching = false, cacheTTL = '5m', enable128kOutput = false, tools, toolChoice, } = params;
        // Convert our message format to Anthropic format
        const anthropicMessages = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));
        // Build system prompt - use content block format for caching
        const system = enableCaching
            ? [
                {
                    type: 'text',
                    text: systemPrompt,
                    cache_control: this.buildCacheControl(cacheTTL),
                },
            ]
            : systemPrompt;
        // Add beta headers as needed
        const betas = [];
        if (cacheTTL === '1h') {
            betas.push('extended-cache-ttl-2025-04-11');
        }
        if (enable128kOutput) {
            betas.push('output-128k-2025-02-19');
        }
        // Build tool choice parameter
        let tool_choice;
        if (toolChoice) {
            if (toolChoice.type === 'tool') {
                tool_choice = { type: 'tool', name: toolChoice.name };
            }
            else {
                tool_choice = { type: toolChoice.type };
            }
        }
        const response = await this.retry(() => this.client.messages.create({
            model,
            max_tokens: maxTokens,
            temperature,
            system,
            messages: anthropicMessages,
            tools: tools,
            tool_choice,
            ...(betas.length > 0 && { betas }),
        }));
        // Extract text content
        const textBlocks = response.content.filter((block) => block.type === 'text');
        const content = textBlocks.map((block) => block.text).join('');
        // Extract tool use blocks
        const toolUseBlocks = response.content.filter((block) => block.type === 'tool_use');
        const toolUse = toolUseBlocks.map((block) => ({
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input,
        }));
        // Extract cache usage
        const usage = response.usage;
        return {
            content,
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            stopReason: response.stop_reason ?? 'unknown',
            model: response.model,
            cacheCreationInputTokens: usage.cache_creation_input_tokens,
            cacheReadInputTokens: usage.cache_read_input_tokens,
            toolUse,
        };
    }
}
//# sourceMappingURL=anthropic-client.js.map