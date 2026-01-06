/**
 * Unit tests for CostTracker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CostTracker, BudgetExceededError } from '../../src/utils/cost-tracker.js';
import type { ClaudeModel } from '../../src/types/index.js';

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker(10); // $10 budget
  });

  describe('recordUsage', () => {
    it('records usage correctly for sonnet', () => {
      const model: ClaudeModel = 'claude-sonnet-4-5-20250929';
      const cost = tracker.recordUsage(model, 1000, 500);

      // Sonnet: $3.00/M input, $15.00/M output
      // Expected: (1000/1M) * $3.00 + (500/1M) * $15.00
      // = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 6);
      expect(tracker.getTotalCost()).toBeCloseTo(0.0105, 6);
    });

    it('records usage correctly for haiku', () => {
      const model: ClaudeModel = 'claude-haiku-4-5-20251001';
      const cost = tracker.recordUsage(model, 10000, 2000);

      // Haiku: $1.00/M input, $5.00/M output
      // Expected: (10000/1M) * $1.00 + (2000/1M) * $5.00
      // = 0.01 + 0.01 = 0.02
      expect(cost).toBeCloseTo(0.02, 6);
    });

    it('records usage correctly for opus', () => {
      const model: ClaudeModel = 'claude-opus-4-5-20251101';
      const cost = tracker.recordUsage(model, 5000, 1000);

      // Opus: $15.00/M input, $75.00/M output
      // Expected: (5000/1M) * $15.00 + (1000/1M) * $75.00
      // = 0.075 + 0.075 = 0.15
      expect(cost).toBeCloseTo(0.15, 6);
    });

    it('calculates cost correctly (verify math)', () => {
      // Use unlimited tracker for this test to avoid budget constraint
      const unlimitedTracker = new CostTracker();
      const model: ClaudeModel = 'claude-sonnet-4-5-20250929';

      // 1 million input tokens = $3.00
      // 1 million output tokens = $15.00
      const cost = unlimitedTracker.recordUsage(model, 1_000_000, 1_000_000);

      expect(cost).toBeCloseTo(18.00, 2);
    });
  });

  describe('getTotalTokens', () => {
    it('tracks total tokens', () => {
      tracker.recordUsage('claude-sonnet-4-5-20250929', 1000, 500);
      tracker.recordUsage('claude-haiku-4-5-20251001', 2000, 1000);

      expect(tracker.getTotalTokens()).toBe(4500); // 1000+500+2000+1000
    });
  });

  describe('getUsageByModel', () => {
    it('returns correct breakdown', () => {
      tracker.recordUsage('claude-sonnet-4-5-20250929', 1000, 500);
      tracker.recordUsage('claude-sonnet-4-5-20250929', 2000, 1000);
      tracker.recordUsage('claude-haiku-4-5-20251001', 5000, 2000);

      const usageByModel = tracker.getUsageByModel();

      // Sonnet usage
      const sonnetUsage = usageByModel.get('claude-sonnet-4-5-20250929');
      expect(sonnetUsage).toBeDefined();
      expect(sonnetUsage?.inputTokens).toBe(3000);
      expect(sonnetUsage?.outputTokens).toBe(1500);

      // Haiku usage
      const haikuUsage = usageByModel.get('claude-haiku-4-5-20251001');
      expect(haikuUsage).toBeDefined();
      expect(haikuUsage?.inputTokens).toBe(5000);
      expect(haikuUsage?.outputTokens).toBe(2000);
    });
  });

  describe('estimateCost', () => {
    it('estimates cost without recording usage', () => {
      const estimated = tracker.estimateCost('claude-sonnet-4-5-20250929', 10000, 5000);

      // Should return estimated cost
      // (10000/1M) * $3.00 + (5000/1M) * $15.00 = 0.03 + 0.075 = 0.105
      expect(estimated).toBeCloseTo(0.105, 4);

      // But total cost should still be 0
      expect(tracker.getTotalCost()).toBe(0);
      expect(tracker.getTotalTokens()).toBe(0);
    });
  });

  describe('budget enforcement', () => {
    it('throws BudgetExceededError when over budget', () => {
      const smallBudgetTracker = new CostTracker(0.01); // $0.01 budget

      // This should exceed the budget
      expect(() => {
        smallBudgetTracker.recordUsage('claude-opus-4-5-20251101', 100000, 50000);
      }).toThrow(BudgetExceededError);
    });

    it('BudgetExceededError has correct properties', () => {
      const smallBudgetTracker = new CostTracker(0.01);

      try {
        smallBudgetTracker.recordUsage('claude-opus-4-5-20251101', 100000, 50000);
      } catch (error) {
        expect(error).toBeInstanceOf(BudgetExceededError);
        expect((error as BudgetExceededError).code).toBe('BUDGET_EXCEEDED');
        expect((error as BudgetExceededError).message).toContain('Budget exceeded');
      }
    });
  });

  describe('getRemainingBudget', () => {
    it('returns correct remaining value', () => {
      tracker.recordUsage('claude-sonnet-4-5-20250929', 100000, 50000);
      // Cost: (100000/1M) * $3.00 + (50000/1M) * $15.00 = 0.3 + 0.75 = 1.05

      const remaining = tracker.getRemainingBudget();

      expect(remaining).toBeCloseTo(10 - 1.05, 2); // $10 - $1.05 = $8.95
    });

    it('returns null when no budget limit set', () => {
      const unlimitedTracker = new CostTracker();

      expect(unlimitedTracker.getRemainingBudget()).toBeNull();
    });
  });

  describe('reset', () => {
    it('clears all tracking', () => {
      tracker.recordUsage('claude-sonnet-4-5-20250929', 10000, 5000);
      tracker.recordUsage('claude-haiku-4-5-20251001', 5000, 2000);

      tracker.reset();

      expect(tracker.getTotalCost()).toBe(0);
      expect(tracker.getTotalTokens()).toBe(0);
      expect(tracker.getUsageByModel().size).toBe(0);
    });
  });
});
