/**
 * Unit tests for Convergence Detection
 */

import { describe, it, expect } from 'vitest';
import { detectConvergence } from '../../src/agents/convergence.js';
import type { AgentMessage } from '../../src/types/index.js';

describe('detectConvergence', () => {
  describe('Empty and Insufficient Message Cases', () => {
    it('returns converged: false for empty messages', () => {
      const result = detectConvergence([]);

      expect(result.converged).toBe(false);
      expect(result.reason).toBe('No messages to analyze');
    });

    it('returns converged: false for single message', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Hello, let me analyze this.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(false);
      expect(result.reason).toContain('Minimum');
    });

    it('returns converged: false for fewer than 4 messages (minimum for one round-trip)', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Initial prompt.' },
        { role: 'assistant', content: 'SCHEMA-DESIGN-APPROVED: All good.' },
        { role: 'user', content: 'Forwarded to agent 2.' },
      ];

      // Even with an explicit signal, need at least 4 messages
      const result = detectConvergence(messages);

      expect(result.converged).toBe(false);
      expect(result.reason).toContain('Minimum 4 messages required');
    });
  });

  describe('Explicit Convergence Signals', () => {
    it('detects SCHEMA-DESIGN-CONVERGED signal with 4+ messages', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Here is my schema proposal.' },
        { role: 'assistant', content: 'I have some suggestions.' },
        { role: 'user', content: 'Good suggestions, incorporated.' },
        {
          role: 'assistant',
          content: 'SCHEMA-DESIGN-CONVERGED: Final schema agreed upon with all validations.',
        },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.reason).toBe('Explicit convergence signal detected');
      expect(result.signal).toContain('SCHEMA-DESIGN-CONVERGED');
    });

    it('detects SCHEMA-DESIGN-APPROVED signal with 4+ messages', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Schema review starting.' },
        { role: 'assistant', content: 'Looking at the schema now.' },
        { role: 'user', content: 'Any concerns?' },
        {
          role: 'assistant',
          content: 'SCHEMA-DESIGN-APPROVED: All requirements met.',
        },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.reason).toBe('Explicit convergence signal detected');
      expect(result.signal).toContain('SCHEMA-DESIGN-APPROVED');
    });

    it('detects IMPLEMENTATION-COMPLETE signal with 4+ messages', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Implementation work starting.' },
        { role: 'assistant', content: 'Processing files.' },
        { role: 'user', content: 'How is progress?' },
        {
          role: 'assistant',
          content: 'IMPLEMENTATION-COMPLETE: All files generated successfully.',
        },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.signal).toContain('IMPLEMENTATION-COMPLETE');
    });

    it('detects MIGRATION-COMPLETE signal with 4+ messages', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Starting migration.' },
        { role: 'assistant', content: 'Processing documents.' },
        { role: 'user', content: 'Status update?' },
        { role: 'assistant', content: 'MIGRATION-COMPLETE: All documents migrated.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.signal).toContain('MIGRATION-COMPLETE');
    });

    it('extracts reason from convergence signal', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Initial prompt.' },
        { role: 'assistant', content: 'Response 1.' },
        { role: 'user', content: 'Follow up.' },
        {
          role: 'assistant',
          content: 'SCHEMA-DESIGN-CONVERGED: Custom reason with details about the agreement.',
        },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.signal).toBe(
        'SCHEMA-DESIGN-CONVERGED: Custom reason with details about the agreement.'
      );
    });

    it('performs case insensitive signal detection', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Initial prompt.' },
        { role: 'assistant', content: 'Response 1.' },
        { role: 'user', content: 'Follow up.' },
        {
          role: 'assistant',
          content: 'schema-design-converged: lowercase signal works too.',
        },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.signal).toContain('schema-design-converged');
    });
  });

  describe('Implicit Agreement Detection', () => {
    it('detects implicit agreement with explicit "I fully agree" phrases', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Initial proposal.' },
        { role: 'assistant', content: 'I fully agree with your approach.' },
        { role: 'user', content: 'I fully agree, the design is final.' },
        { role: 'assistant', content: 'I fully agree, proceeding.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.reason).toContain('Implicit convergence');
    });

    it('detects implicit agreement with "fully approved" phrases', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'The design is fully approved.' },
        { role: 'assistant', content: 'Final approval granted.' },
        { role: 'user', content: 'Fully approved from my side too.' },
        { role: 'assistant', content: 'Final approval confirmed.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
    });

    it('detects implicit agreement with "no changes needed" phrases', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'No changes needed.' },
        { role: 'assistant', content: 'No modifications required.' },
        { role: 'user', content: 'Schema is complete.' },
        { role: 'assistant', content: 'Design is final.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
    });

    it('does NOT converge with casual "looks good" or "ready to proceed"', () => {
      // These phrases are too common and should NOT trigger convergence
      const messages: AgentMessage[] = [
        { role: 'user', content: 'This looks good to me.' },
        { role: 'assistant', content: 'Looks good, continuing.' },
        { role: 'user', content: 'Everything looks good.' },
        { role: 'assistant', content: 'Ready to proceed.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(false);
      expect(result.reason).toBe('No convergence detected');
    });

    it('does NOT converge with casual "I agree" without "fully"', () => {
      // Simple "I agree" is too casual and could be part of ongoing discussion
      const messages: AgentMessage[] = [
        { role: 'user', content: 'I agree with the design.' },
        { role: 'assistant', content: 'I agree with your approach.' },
        { role: 'user', content: 'Agreed, let me continue.' },
        { role: 'assistant', content: 'I agree, ready to proceed.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(false);
      expect(result.reason).toBe('No convergence detected');
    });

    it('returns converged: false when not enough agreements in 4+ messages', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'I fully agree with the design.' },
        { role: 'assistant', content: 'I have some concerns about this.' },
        { role: 'user', content: 'Let me reconsider.' },
        { role: 'assistant', content: 'Yes, please review again.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(false);
      expect(result.reason).toBe('No convergence detected');
    });

    it('returns converged: false for 2-message conversations even with agreement', () => {
      // Need at least 4 messages for convergence (one full round-trip)
      const messages: AgentMessage[] = [
        { role: 'user', content: 'I fully agree with your approach.' },
        { role: 'assistant', content: 'I fully agree, design is final.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(false);
      expect(result.reason).toContain('Minimum 4 messages required');
    });
  });

  describe('Signal Priority', () => {
    it('prefers explicit signals over implicit', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'I agree with everything.' },
        { role: 'assistant', content: 'Looks good to me.' },
        { role: 'user', content: 'Approved by me.' },
        {
          role: 'assistant',
          content: 'SCHEMA-DESIGN-CONVERGED: Final agreement reached.',
        },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.reason).toBe('Explicit convergence signal detected');
      expect(result.signal).toContain('SCHEMA-DESIGN-CONVERGED');
    });
  });
});
