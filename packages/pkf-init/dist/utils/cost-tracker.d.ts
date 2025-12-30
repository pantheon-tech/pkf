/**
 * PKF Init Cost Tracker
 * Tracks API costs with budget enforcement
 */
import type { ClaudeModel } from '../types/index.js';
/**
 * Custom error for budget exceeded
 */
export declare class BudgetExceededError extends Error {
    code: "BUDGET_EXCEEDED";
    constructor(currentCost: number, maxCost: number);
}
/**
 * Tracks API costs with budget enforcement
 */
export declare class CostTracker {
    private maxCost;
    private totalCost;
    private totalInputTokens;
    private totalOutputTokens;
    private usageByModel;
    /**
     * Create a new CostTracker
     * @param maxCost - Optional budget limit in USD
     */
    constructor(maxCost?: number);
    /**
     * Calculate cost for given token usage
     */
    private calculateCost;
    /**
     * Record API usage and return the cost
     * @param model - The Claude model used
     * @param inputTokens - Number of input tokens
     * @param outputTokens - Number of output tokens
     * @returns The cost of this usage in USD
     * @throws BudgetExceededError if recording would exceed maxCost
     */
    recordUsage(model: ClaudeModel, inputTokens: number, outputTokens: number): number;
    /**
     * Get the total accumulated cost in USD
     */
    getTotalCost(): number;
    /**
     * Get the total tokens used (input + output)
     */
    getTotalTokens(): number;
    /**
     * Get usage breakdown by model
     */
    getUsageByModel(): Map<ClaudeModel, {
        inputTokens: number;
        outputTokens: number;
        cost: number;
    }>;
    /**
     * Estimate cost without recording usage
     * @param model - The Claude model
     * @param estimatedInputTokens - Estimated input tokens
     * @param estimatedOutputTokens - Estimated output tokens
     * @returns Estimated cost in USD
     */
    estimateCost(model: ClaudeModel, estimatedInputTokens: number, estimatedOutputTokens: number): number;
    /**
     * Get remaining budget
     * @returns Remaining budget in USD, or null if no limit set
     */
    getRemainingBudget(): number | null;
    /**
     * Check if over budget
     */
    isOverBudget(): boolean;
    /**
     * Reset all tracking
     */
    reset(): void;
}
export default CostTracker;
//# sourceMappingURL=cost-tracker.d.ts.map