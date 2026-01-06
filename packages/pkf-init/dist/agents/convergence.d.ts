/**
 * PKF Init Convergence Detection
 * Detects when agents have reached agreement in a conversation
 */
import type { AgentMessage, ConvergenceResult } from '../types/index.js';
/**
 * Detect convergence in a conversation between agents
 *
 * Checks for:
 * 1. Minimum message count (ensures at least one full round-trip)
 * 2. Explicit convergence signals (highest priority)
 * 3. Implicit convergence through agreement patterns in last 4 messages
 *
 * @param messages - Array of agent messages in the conversation
 * @returns ConvergenceResult indicating if convergence was detected
 */
export declare function detectConvergence(messages: AgentMessage[]): ConvergenceResult;
export default detectConvergence;
//# sourceMappingURL=convergence.d.ts.map