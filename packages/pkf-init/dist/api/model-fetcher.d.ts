/**
 * Anthropic Models API Client
 * Fetches available models from the Anthropic API
 */
/**
 * Model info from Anthropic API
 */
export interface ApiModelInfo {
    id: string;
    created_at: string;
    display_name: string;
    type: string;
}
/**
 * Model pricing (per million tokens)
 * Pricing is not provided by API, so we maintain it here
 */
export declare const MODEL_PRICING: Record<string, {
    input: number;
    output: number;
}>;
/**
 * Model recommendations
 */
export declare const RECOMMENDED_MODELS: Set<string>;
/**
 * Fetch available models from Anthropic API
 * @param apiKey - Anthropic API key
 * @returns List of available models or null on error
 */
export declare function fetchAvailableModels(apiKey: string): Promise<ApiModelInfo[] | null>;
/**
 * Get pricing for a model
 * @param modelId - Model ID
 * @returns Pricing info or default if unknown
 */
export declare function getModelPricing(modelId: string): {
    input: number;
    output: number;
};
/**
 * Check if a model is recommended
 * @param modelId - Model ID
 * @returns Whether model is recommended
 */
export declare function isRecommended(modelId: string): boolean;
/**
 * Format model info for display
 * @param model - Model info from API
 * @returns Formatted display object
 */
export declare function formatModelForDisplay(model: ApiModelInfo): {
    id: string;
    name: string;
    description: string;
    inputCost: number;
    outputCost: number;
    recommended: boolean;
    createdAt: string;
};
//# sourceMappingURL=model-fetcher.d.ts.map