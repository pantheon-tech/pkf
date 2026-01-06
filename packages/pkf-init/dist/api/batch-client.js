/**
 * Anthropic Message Batches API Client
 * Provides 50% cost reduction for bulk processing
 * https://docs.anthropic.com/en/api/creating-message-batches
 */
import Anthropic from '@anthropic-ai/sdk';
/**
 * Message Batches API Client
 * Provides 50% cost reduction for bulk message processing
 */
export class BatchClient {
    client;
    constructor(apiKey, useOAuth = false) {
        // OAuth tokens (like CLAUDE_CODE_OAUTH_TOKEN) use authToken, not apiKey
        this.client = new Anthropic(useOAuth ? { authToken: apiKey } : { apiKey });
    }
    /**
     * Create a new message batch
     * @param requests - Array of batch requests (max 100,000)
     * @returns Batch info with ID for tracking
     */
    async createBatch(requests) {
        if (requests.length === 0) {
            throw new Error('Batch must contain at least one request');
        }
        if (requests.length > 100000) {
            throw new Error('Batch cannot exceed 100,000 requests');
        }
        const response = await this.client.beta.messages.batches.create({
            requests: requests.map(req => ({
                custom_id: req.custom_id,
                params: {
                    model: req.params.model,
                    max_tokens: req.params.max_tokens,
                    messages: req.params.messages,
                    system: req.params.system,
                    temperature: req.params.temperature,
                },
            })),
        });
        return response;
    }
    /**
     * Get batch status
     * @param batchId - Batch ID
     * @returns Current batch info
     */
    async getBatch(batchId) {
        const response = await this.client.beta.messages.batches.retrieve(batchId);
        return response;
    }
    /**
     * Get batch results (only available when processing_status is 'ended')
     * @param batchId - Batch ID
     * @returns Array of results
     */
    async getBatchResults(batchId) {
        const batch = await this.getBatch(batchId);
        if (batch.processing_status !== 'ended') {
            throw new Error(`Batch ${batchId} is not complete (status: ${batch.processing_status})`);
        }
        if (!batch.results_url) {
            throw new Error(`Batch ${batchId} has no results URL`);
        }
        // Fetch results from the results URL (JSONL format)
        const response = await fetch(batch.results_url, {
            headers: {
                'x-api-key': this.client.apiKey,
                'anthropic-version': '2023-06-01',
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch results: ${response.status}`);
        }
        const text = await response.text();
        const lines = text.trim().split('\n');
        return lines.map(line => JSON.parse(line));
    }
    /**
     * Cancel a batch
     * @param batchId - Batch ID
     * @returns Updated batch info
     */
    async cancelBatch(batchId) {
        const response = await this.client.beta.messages.batches.cancel(batchId);
        return response;
    }
    /**
     * Create batch and wait for completion
     * @param requests - Array of batch requests
     * @param options - Batch options
     * @returns Array of results
     */
    async createAndWait(requests, options = {}) {
        const { pollInterval = 30000, maxWaitTime = 86400000, // 24 hours
        onProgress, } = options;
        // Create the batch
        const batch = await this.createBatch(requests);
        const startTime = Date.now();
        if (onProgress) {
            onProgress(batch);
        }
        // Poll for completion
        let currentBatch = batch;
        while (currentBatch.processing_status === 'in_progress') {
            // Check timeout
            if (Date.now() - startTime > maxWaitTime) {
                throw new Error(`Batch ${batch.id} timed out after ${maxWaitTime}ms`);
            }
            // Wait before polling
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            // Get updated status
            currentBatch = await this.getBatch(batch.id);
            if (onProgress) {
                onProgress(currentBatch);
            }
        }
        // Handle cancellation
        if (currentBatch.processing_status === 'canceling') {
            throw new Error(`Batch ${batch.id} was canceled`);
        }
        // Get results
        return this.getBatchResults(batch.id);
    }
    /**
     * List all batches
     * @param limit - Maximum number of batches to return
     * @returns Array of batch info
     */
    async listBatches(limit = 20) {
        const response = await this.client.beta.messages.batches.list({ limit });
        return response.data;
    }
}
/**
 * Check if batch processing would be beneficial
 * Batch is worth it if:
 * - More than 10 requests (overhead of batch setup)
 * - Time is not critical (batch can take up to 24 hours)
 * @param requestCount - Number of requests
 * @param timeConstraint - Maximum acceptable wait time in ms
 * @returns Whether batch processing is recommended
 */
export function shouldUseBatch(requestCount, timeConstraint = 3600000 // 1 hour default
) {
    // Batch overhead only worth it for more than 10 requests
    // and when we can wait at least 1 hour
    return requestCount > 10 && timeConstraint >= 3600000;
}
//# sourceMappingURL=batch-client.js.map