/**
 * PKF Init Cost Tracker
 * Tracks API costs with budget enforcement
 */

import type { ClaudeModel, ModelPricing } from '../types/index.js';
import { MODEL_PRICING as API_MODEL_PRICING, getModelPricing } from '../api/model-fetcher.js';

/**
 * Build model pricing lookup
 */
const MODEL_PRICING: Record<string, ModelPricing> = {};
for (const [modelId, pricing] of Object.entries(API_MODEL_PRICING)) {
  MODEL_PRICING[modelId] = {
    inputPerMillion: pricing.input,
    outputPerMillion: pricing.output,
  };
}

/**
 * Get pricing for a model with fallback to model-fetcher logic
 */
function getPricingForModel(model: ClaudeModel): ModelPricing {
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }
  const pricing = getModelPricing(model);
  return {
    inputPerMillion: pricing.input,
    outputPerMillion: pricing.output,
  };
}

/**
 * Custom error for budget exceeded
 */
export class BudgetExceededError extends Error {
  code = 'BUDGET_EXCEEDED' as const;

  constructor(currentCost: number, maxCost: number) {
    super(`Budget exceeded: $${currentCost.toFixed(4)} > $${maxCost.toFixed(4)}`);
    this.name = 'BudgetExceededError';
  }
}

/**
 * Cache pricing multipliers (Anthropic prompt caching)
 * - Cache creation: 1.25x input token price
 * - Cache read: 0.1x input token price (90% savings)
 */
const CACHE_CREATION_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

/**
 * Model usage statistics
 */
interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  cost: number;
}

/**
 * Tracks API costs with budget enforcement
 */
export class CostTracker {
  private maxCost: number | null;
  private totalCost: number = 0;
  private totalInputTokens: number = 0;
  private totalOutputTokens: number = 0;
  private totalCacheCreationTokens: number = 0;
  private totalCacheReadTokens: number = 0;
  private usageByModel: Map<ClaudeModel, ModelUsage> = new Map();

  /**
   * Create a new CostTracker
   * @param maxCost - Optional budget limit in USD
   */
  constructor(maxCost?: number) {
    this.maxCost = maxCost ?? null;
  }

  /**
   * Calculate cost for given token usage (including cache tokens)
   */
  private calculateCost(
    model: ClaudeModel,
    inputTokens: number,
    outputTokens: number,
    cacheCreationTokens: number = 0,
    cacheReadTokens: number = 0
  ): number {
    // Get pricing (with smart fallback for unknown models)
    const pricing = getPricingForModel(model);
    const baseInputRate = pricing.inputPerMillion;

    // Regular input tokens at base rate
    const inputCost = (inputTokens / 1_000_000) * baseInputRate;

    // Cache creation tokens at 1.25x base rate
    const cacheCreationCost = (cacheCreationTokens / 1_000_000) * baseInputRate * CACHE_CREATION_MULTIPLIER;

    // Cache read tokens at 0.1x base rate (90% savings)
    const cacheReadCost = (cacheReadTokens / 1_000_000) * baseInputRate * CACHE_READ_MULTIPLIER;

    // Output tokens at output rate
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;

    return inputCost + cacheCreationCost + cacheReadCost + outputCost;
  }

  /**
   * Record API usage and return the cost
   * @param model - The Claude model used
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param cacheCreationTokens - Number of tokens used to create cache (optional)
   * @param cacheReadTokens - Number of tokens read from cache (optional)
   * @returns The cost of this usage in USD
   * @throws BudgetExceededError if recording would exceed maxCost
   */
  recordUsage(
    model: ClaudeModel,
    inputTokens: number,
    outputTokens: number,
    cacheCreationTokens?: number,
    cacheReadTokens?: number
  ): number {
    const cacheCreate = cacheCreationTokens ?? 0;
    const cacheRead = cacheReadTokens ?? 0;

    const cost = this.calculateCost(model, inputTokens, outputTokens, cacheCreate, cacheRead);
    const newTotalCost = this.totalCost + cost;

    // Check budget before recording
    if (this.maxCost !== null && newTotalCost > this.maxCost) {
      throw new BudgetExceededError(newTotalCost, this.maxCost);
    }

    // Update totals
    this.totalCost = newTotalCost;
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;
    this.totalCacheCreationTokens += cacheCreate;
    this.totalCacheReadTokens += cacheRead;

    // Update per-model usage
    const existingUsage = this.usageByModel.get(model) ?? {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      cost: 0,
    };
    this.usageByModel.set(model, {
      inputTokens: existingUsage.inputTokens + inputTokens,
      outputTokens: existingUsage.outputTokens + outputTokens,
      cacheCreationTokens: existingUsage.cacheCreationTokens + cacheCreate,
      cacheReadTokens: existingUsage.cacheReadTokens + cacheRead,
      cost: existingUsage.cost + cost,
    });

    return cost;
  }

  /**
   * Get the total accumulated cost in USD
   */
  getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * Get the total tokens used (input + output)
   */
  getTotalTokens(): number {
    return this.totalInputTokens + this.totalOutputTokens;
  }

  /**
   * Get total input tokens
   */
  getTotalInputTokens(): number {
    return this.totalInputTokens;
  }

  /**
   * Get total output tokens
   */
  getTotalOutputTokens(): number {
    return this.totalOutputTokens;
  }

  /**
   * Get cache creation tokens
   */
  getCacheCreationTokens(): number {
    return this.totalCacheCreationTokens;
  }

  /**
   * Get cache read tokens
   */
  getCacheReadTokens(): number {
    return this.totalCacheReadTokens;
  }

  /**
   * Get cache token totals
   */
  getCacheTokens(): { cacheCreationTokens: number; cacheReadTokens: number } {
    return {
      cacheCreationTokens: this.totalCacheCreationTokens,
      cacheReadTokens: this.totalCacheReadTokens,
    };
  }

  /**
   * Get usage breakdown by model
   */
  getUsageByModel(): Map<ClaudeModel, ModelUsage> {
    return new Map(this.usageByModel);
  }

  /**
   * Estimate cost without recording usage
   * @param model - The Claude model
   * @param estimatedInputTokens - Estimated input tokens
   * @param estimatedOutputTokens - Estimated output tokens
   * @returns Estimated cost in USD
   */
  estimateCost(model: ClaudeModel, estimatedInputTokens: number, estimatedOutputTokens: number): number {
    return this.calculateCost(model, estimatedInputTokens, estimatedOutputTokens);
  }

  /**
   * Get remaining budget
   * @returns Remaining budget in USD, or null if no limit set
   */
  getRemainingBudget(): number | null {
    if (this.maxCost === null) {
      return null;
    }
    return Math.max(0, this.maxCost - this.totalCost);
  }

  /**
   * Check if over budget
   */
  isOverBudget(): boolean {
    if (this.maxCost === null) {
      return false;
    }
    return this.totalCost > this.maxCost;
  }

  /**
   * Reset all tracking
   */
  reset(): void {
    this.totalCost = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalCacheCreationTokens = 0;
    this.totalCacheReadTokens = 0;
    this.usageByModel.clear();
  }

  /**
   * Calculate estimated savings from cache usage
   * Returns the amount saved compared to paying full price for all cached tokens
   */
  getEstimatedCacheSavings(): number {
    // Cache read tokens are charged at 10% of base price, so savings is 90%
    // This calculates what we would have paid without caching
    let savings = 0;

    for (const [model, usage] of this.usageByModel) {
      const pricing = getPricingForModel(model);
      const baseInputRate = pricing.inputPerMillion;

      // Cache read tokens at full price would cost:
      const fullPriceCacheRead = (usage.cacheReadTokens / 1_000_000) * baseInputRate;
      // We actually paid 10% of that:
      const actualCacheReadCost = fullPriceCacheRead * CACHE_READ_MULTIPLIER;
      // Savings:
      savings += fullPriceCacheRead - actualCacheReadCost;
    }

    return savings;
  }
}

export default CostTracker;
