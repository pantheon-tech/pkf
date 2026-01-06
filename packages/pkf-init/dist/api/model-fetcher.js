/**
 * Anthropic Models API Client
 * Fetches available models from the Anthropic API
 */
/**
 * Model pricing (per million tokens)
 * Pricing is not provided by API, so we maintain it here
 */
export const MODEL_PRICING = {
    // Claude 4.5 models
    'claude-opus-4-5-20251101': { input: 15, output: 75 },
    'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
    'claude-haiku-4-5-20251001': { input: 1, output: 5 },
    // Claude 4 models
    'claude-sonnet-4-20250514': { input: 3, output: 15 },
    'claude-opus-4-20250514': { input: 15, output: 75 },
    // Claude 3.5 models (legacy)
    'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
    'claude-3-5-haiku-20241022': { input: 1, output: 5 },
    // Claude 3 models (legacy)
    'claude-3-opus-20240229': { input: 15, output: 75 },
    'claude-3-sonnet-20240229': { input: 3, output: 15 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
};
/**
 * Model recommendations
 */
export const RECOMMENDED_MODELS = new Set([
    'claude-sonnet-4-20250514',
    'claude-sonnet-4-5-20250929',
]);
/**
 * Models to exclude from listing (old versions, etc.)
 */
const EXCLUDED_MODEL_PATTERNS = [
    /^claude-2/, // Claude 2 models
    /^claude-instant/, // Instant models
];
/**
 * Fetch available models from Anthropic API
 * @param apiKey - Anthropic API key
 * @returns List of available models or null on error
 */
export async function fetchAvailableModels(apiKey) {
    const allModels = [];
    let lastId;
    let hasMore = true;
    try {
        while (hasMore) {
            const url = new URL('https://api.anthropic.com/v1/models');
            if (lastId) {
                url.searchParams.set('after_id', lastId);
            }
            url.searchParams.set('limit', '100');
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'anthropic-version': '2023-06-01',
                    'x-api-key': apiKey,
                },
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error ${response.status}: ${errorText}`);
            }
            const data = await response.json();
            allModels.push(...data.data);
            hasMore = data.has_more;
            lastId = data.last_id;
        }
        // Filter out excluded models
        const filteredModels = allModels.filter(model => {
            return !EXCLUDED_MODEL_PATTERNS.some(pattern => pattern.test(model.id));
        });
        // Sort by created_at descending (newest first)
        filteredModels.sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        return filteredModels;
    }
    catch (error) {
        // Return null on error - caller should fall back to hardcoded list
        console.error('Failed to fetch models:', error instanceof Error ? error.message : error);
        return null;
    }
}
/**
 * Get pricing for a model
 * @param modelId - Model ID
 * @returns Pricing info or default if unknown
 */
export function getModelPricing(modelId) {
    // Check exact match first
    if (MODEL_PRICING[modelId]) {
        return MODEL_PRICING[modelId];
    }
    // Try to match by model family
    if (modelId.includes('opus')) {
        return { input: 15, output: 75 };
    }
    if (modelId.includes('sonnet')) {
        return { input: 3, output: 15 };
    }
    if (modelId.includes('haiku')) {
        return { input: 1, output: 5 };
    }
    // Default to Sonnet pricing
    return { input: 3, output: 15 };
}
/**
 * Check if a model is recommended
 * @param modelId - Model ID
 * @returns Whether model is recommended
 */
export function isRecommended(modelId) {
    return RECOMMENDED_MODELS.has(modelId);
}
/**
 * Format model info for display
 * @param model - Model info from API
 * @returns Formatted display object
 */
export function formatModelForDisplay(model) {
    const pricing = getModelPricing(model.id);
    const recommended = isRecommended(model.id);
    // Generate description based on model family
    let description = 'Claude model';
    if (model.id.includes('opus')) {
        description = 'Most capable - complex reasoning';
    }
    else if (model.id.includes('sonnet')) {
        description = 'Balanced - best for most tasks';
    }
    else if (model.id.includes('haiku')) {
        description = 'Fast and cost-effective';
    }
    return {
        id: model.id,
        name: model.display_name,
        description,
        inputCost: pricing.input,
        outputCost: pricing.output,
        recommended,
        createdAt: model.created_at,
    };
}
//# sourceMappingURL=model-fetcher.js.map