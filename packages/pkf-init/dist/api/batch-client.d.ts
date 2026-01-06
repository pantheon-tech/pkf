/**
 * Anthropic Message Batches API Client
 * Provides 50% cost reduction for bulk processing
 * https://docs.anthropic.com/en/api/creating-message-batches
 */
import type { ClaudeModel } from '../types/index.js';
/**
 * Individual request in a batch
 */
export interface BatchRequest {
    custom_id: string;
    params: {
        model: ClaudeModel;
        max_tokens: number;
        messages: Array<{
            role: 'user' | 'assistant';
            content: string;
        }>;
        system?: string;
        temperature?: number;
    };
}
/**
 * Batch creation response
 */
export interface BatchInfo {
    id: string;
    type: 'message_batch';
    processing_status: 'in_progress' | 'ended' | 'canceling';
    request_counts: {
        processing: number;
        succeeded: number;
        errored: number;
        canceled: number;
        expired: number;
    };
    ended_at: string | null;
    created_at: string;
    expires_at: string;
    cancel_initiated_at: string | null;
    results_url: string | null;
}
/**
 * Individual result from a batch
 */
export interface BatchResult {
    custom_id: string;
    result: {
        type: 'succeeded' | 'errored' | 'expired' | 'canceled';
        message?: {
            id: string;
            type: 'message';
            role: 'assistant';
            content: Array<{
                type: 'text';
                text: string;
            }>;
            model: string;
            stop_reason: string;
            usage: {
                input_tokens: number;
                output_tokens: number;
                cache_creation_input_tokens?: number;
                cache_read_input_tokens?: number;
            };
        };
        error?: {
            type: string;
            message: string;
        };
    };
}
/**
 * Batch processing options
 */
export interface BatchOptions {
    /** Poll interval in milliseconds (default: 30000 = 30s) */
    pollInterval?: number;
    /** Maximum wait time in milliseconds (default: 86400000 = 24h) */
    maxWaitTime?: number;
    /** Callback for progress updates */
    onProgress?: (info: BatchInfo) => void;
}
/**
 * Message Batches API Client
 * Provides 50% cost reduction for bulk message processing
 */
export declare class BatchClient {
    private client;
    constructor(apiKey: string, useOAuth?: boolean);
    /**
     * Create a new message batch
     * @param requests - Array of batch requests (max 100,000)
     * @returns Batch info with ID for tracking
     */
    createBatch(requests: BatchRequest[]): Promise<BatchInfo>;
    /**
     * Get batch status
     * @param batchId - Batch ID
     * @returns Current batch info
     */
    getBatch(batchId: string): Promise<BatchInfo>;
    /**
     * Get batch results (only available when processing_status is 'ended')
     * @param batchId - Batch ID
     * @returns Array of results
     */
    getBatchResults(batchId: string): Promise<BatchResult[]>;
    /**
     * Cancel a batch
     * @param batchId - Batch ID
     * @returns Updated batch info
     */
    cancelBatch(batchId: string): Promise<BatchInfo>;
    /**
     * Create batch and wait for completion
     * @param requests - Array of batch requests
     * @param options - Batch options
     * @returns Array of results
     */
    createAndWait(requests: BatchRequest[], options?: BatchOptions): Promise<BatchResult[]>;
    /**
     * List all batches
     * @param limit - Maximum number of batches to return
     * @returns Array of batch info
     */
    listBatches(limit?: number): Promise<BatchInfo[]>;
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
export declare function shouldUseBatch(requestCount: number, timeConstraint?: number): boolean;
//# sourceMappingURL=batch-client.d.ts.map