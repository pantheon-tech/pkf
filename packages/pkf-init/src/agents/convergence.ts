/**
 * PKF Init Convergence Detection
 * Detects when agents have reached agreement in a conversation
 */

import type { AgentMessage, ConvergenceResult } from '../types/index.js';

/**
 * Explicit convergence signals that agents can emit
 * These are structured signals that clearly indicate agreement
 */
const convergenceSignals = [
  /SCHEMA-DESIGN-CONVERGED:\s*(.+)/i,
  /SCHEMA-DESIGN-APPROVED:\s*(.+)/i,
  /IMPLEMENTATION-COMPLETE:\s*(.+)/i,
  /MIGRATION-COMPLETE:\s*(.+)/i,
];

/**
 * Implicit agreement patterns for natural language consensus
 */
const agreementPatterns = [
  /I agree|approved|looks good|ready to proceed/i,
  /no further changes|this is complete|ready for/i,
];

/**
 * Check for explicit convergence signals in a message
 * @param content - Message content to check
 * @returns Match result if found, null otherwise
 */
function findExplicitSignal(content: string): { signal: string; match: string } | null {
  for (const pattern of convergenceSignals) {
    const match = content.match(pattern);
    if (match) {
      return {
        signal: pattern.source,
        match: match[0],
      };
    }
  }
  return null;
}

/**
 * Check if a message contains agreement patterns
 * @param content - Message content to check
 * @returns True if agreement patterns found
 */
function containsAgreement(content: string): boolean {
  return agreementPatterns.some((pattern) => pattern.test(content));
}

/**
 * Detect convergence in a conversation between agents
 *
 * Checks for:
 * 1. Explicit convergence signals (highest priority)
 * 2. Implicit convergence through agreement patterns in last 4 messages
 *
 * @param messages - Array of agent messages in the conversation
 * @returns ConvergenceResult indicating if convergence was detected
 */
export function detectConvergence(messages: AgentMessage[]): ConvergenceResult {
  if (!messages || messages.length === 0) {
    return {
      converged: false,
      reason: 'No messages to analyze',
    };
  }

  // Check for explicit convergence signals in the most recent messages
  // Start from the end and work backwards
  for (let i = messages.length - 1; i >= Math.max(0, messages.length - 4); i--) {
    const message = messages[i];
    const signalResult = findExplicitSignal(message.content);

    if (signalResult) {
      return {
        converged: true,
        reason: 'Explicit convergence signal detected',
        signal: signalResult.match,
      };
    }
  }

  // Check for implicit convergence: last 4 messages all have agreement patterns
  if (messages.length >= 4) {
    const lastFourMessages = messages.slice(-4);
    const allAgree = lastFourMessages.every((msg) => containsAgreement(msg.content));

    if (allAgree) {
      return {
        converged: true,
        reason: 'Implicit convergence: last 4 messages show agreement',
      };
    }
  }

  // Check for shorter conversations: if we have 2+ messages and last 2 agree
  if (messages.length >= 2) {
    const lastTwoMessages = messages.slice(-2);
    const bothAgree = lastTwoMessages.every((msg) => containsAgreement(msg.content));

    // For 2-3 messages, if both last messages agree and they're from different roles
    if (
      bothAgree &&
      lastTwoMessages[0].role !== lastTwoMessages[1].role
    ) {
      return {
        converged: true,
        reason: 'Implicit convergence: both agents agree in last exchange',
      };
    }
  }

  return {
    converged: false,
    reason: 'No convergence detected',
  };
}

export default detectConvergence;
