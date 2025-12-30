/**
 * PKF Init Cost Tracker
 * Tracks API costs with budget enforcement
 */
/**
 * Model pricing per million tokens (as of Jan 2025)
 */
const MODEL_PRICING = {
    'claude-sonnet-4-20250514': { inputPerMillion: 3.00, outputPerMillion: 15.00 },
    'claude-haiku-3-5-20241022': { inputPerMillion: 0.80, outputPerMillion: 4.00 },
    'claude-opus-4-20250514': { inputPerMillion: 15.00, outputPerMillion: 75.00 },
};
/**
 * Custom error for budget exceeded
 */
export class BudgetExceededError extends Error {
    code = 'BUDGET_EXCEEDED';
    constructor(currentCost, maxCost) {
        super(`Budget exceeded: $${currentCost.toFixed(4)} > $${maxCost.toFixed(4)}`);
        this.name = 'BudgetExceededError';
    }
}
/**
 * Tracks API costs with budget enforcement
 */
export class CostTracker {
    maxCost;
    totalCost = 0;
    totalInputTokens = 0;
    totalOutputTokens = 0;
    usageByModel = new Map();
    /**
     * Create a new CostTracker
     * @param maxCost - Optional budget limit in USD
     */
    constructor(maxCost) {
        this.maxCost = maxCost ?? null;
    }
    /**
     * Calculate cost for given token usage
     */
    calculateCost(model, inputTokens, outputTokens) {
        const pricing = MODEL_PRICING[model];
        const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
        const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
        return inputCost + outputCost;
    }
    /**
     * Record API usage and return the cost
     * @param model - The Claude model used
     * @param inputTokens - Number of input tokens
     * @param outputTokens - Number of output tokens
     * @returns The cost of this usage in USD
     * @throws BudgetExceededError if recording would exceed maxCost
     */
    recordUsage(model, inputTokens, outputTokens) {
        const cost = this.calculateCost(model, inputTokens, outputTokens);
        const newTotalCost = this.totalCost + cost;
        // Check budget before recording
        if (this.maxCost !== null && newTotalCost > this.maxCost) {
            throw new BudgetExceededError(newTotalCost, this.maxCost);
        }
        // Update totals
        this.totalCost = newTotalCost;
        this.totalInputTokens += inputTokens;
        this.totalOutputTokens += outputTokens;
        // Update per-model usage
        const existingUsage = this.usageByModel.get(model) ?? {
            inputTokens: 0,
            outputTokens: 0,
            cost: 0,
        };
        this.usageByModel.set(model, {
            inputTokens: existingUsage.inputTokens + inputTokens,
            outputTokens: existingUsage.outputTokens + outputTokens,
            cost: existingUsage.cost + cost,
        });
        return cost;
    }
    /**
     * Get the total accumulated cost in USD
     */
    getTotalCost() {
        return this.totalCost;
    }
    /**
     * Get the total tokens used (input + output)
     */
    getTotalTokens() {
        return this.totalInputTokens + this.totalOutputTokens;
    }
    /**
     * Get usage breakdown by model
     */
    getUsageByModel() {
        return new Map(this.usageByModel);
    }
    /**
     * Estimate cost without recording usage
     * @param model - The Claude model
     * @param estimatedInputTokens - Estimated input tokens
     * @param estimatedOutputTokens - Estimated output tokens
     * @returns Estimated cost in USD
     */
    estimateCost(model, estimatedInputTokens, estimatedOutputTokens) {
        return this.calculateCost(model, estimatedInputTokens, estimatedOutputTokens);
    }
    /**
     * Get remaining budget
     * @returns Remaining budget in USD, or null if no limit set
     */
    getRemainingBudget() {
        if (this.maxCost === null) {
            return null;
        }
        return Math.max(0, this.maxCost - this.totalCost);
    }
    /**
     * Check if over budget
     */
    isOverBudget() {
        if (this.maxCost === null) {
            return false;
        }
        return this.totalCost > this.maxCost;
    }
    /**
     * Reset all tracking
     */
    reset() {
        this.totalCost = 0;
        this.totalInputTokens = 0;
        this.totalOutputTokens = 0;
        this.usageByModel.clear();
    }
}
export default CostTracker;
//# sourceMappingURL=cost-tracker.js.map