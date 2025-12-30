/**
 * Unit tests for Convergence Detection
 */

import { describe, it, expect } from 'vitest';
import { detectConvergence } from '../../src/agents/convergence.js';
import type { AgentMessage } from '../../src/types/index.js';

describe('detectConvergence', () => {
  describe('Empty and Single Message Cases', () => {
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
      expect(result.reason).toBe('No convergence detected');
    });
  });

  describe('Explicit Convergence Signals', () => {
    it('detects SCHEMA-DESIGN-CONVERGED signal', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Here is my schema proposal.' },
        { role: 'assistant', content: 'I have some suggestions.' },
        {
          role: 'user',
          content: 'SCHEMA-DESIGN-CONVERGED: Final schema agreed upon with all validations.',
        },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.reason).toBe('Explicit convergence signal detected');
      expect(result.signal).toContain('SCHEMA-DESIGN-CONVERGED');
    });

    it('detects SCHEMA-DESIGN-APPROVED signal', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Schema review complete.' },
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

    it('detects IMPLEMENTATION-COMPLETE signal', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Implementation work done.' },
        {
          role: 'assistant',
          content: 'IMPLEMENTATION-COMPLETE: All files generated successfully.',
        },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.signal).toContain('IMPLEMENTATION-COMPLETE');
    });

    it('detects MIGRATION-COMPLETE signal', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'Starting migration.' },
        { role: 'assistant', content: 'Processing documents.' },
        { role: 'user', content: 'MIGRATION-COMPLETE: All documents migrated.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.signal).toContain('MIGRATION-COMPLETE');
    });

    it('extracts reason from convergence signal', () => {
      const messages: AgentMessage[] = [
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
        {
          role: 'user',
          content: 'schema-design-converged: lowercase signal works too.',
        },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.signal).toContain('schema-design-converged');
    });
  });

  describe('Implicit Agreement Detection', () => {
    it('detects implicit agreement with "I agree"', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'I agree with your approach.' },
        { role: 'assistant', content: 'I agree, this looks correct.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.reason).toContain('Implicit convergence');
    });

    it('detects implicit agreement with "approved"', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'The design is approved.' },
        { role: 'assistant', content: 'Yes, approved and ready.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
    });

    it('detects implicit agreement with "looks good"', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'This looks good to me.' },
        { role: 'assistant', content: 'Looks good, proceeding.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
    });

    it('detects implicit agreement with "no further changes"', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'No further changes needed.' },
        { role: 'assistant', content: 'Agreed, no further changes required.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
    });

    it('requires 3+ agreements in last 4 messages for implicit convergence with 4+ messages', () => {
      // With 4 messages, all 4 must show agreement for implicit convergence
      const messages: AgentMessage[] = [
        { role: 'user', content: 'I agree with the design.' },
        { role: 'assistant', content: 'Looks good to me.' },
        { role: 'user', content: 'Approved for implementation.' },
        { role: 'assistant', content: 'Ready to proceed.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(true);
      expect(result.reason).toContain('Implicit convergence');
    });

    it('returns converged: false when not enough agreements in 4+ messages', () => {
      const messages: AgentMessage[] = [
        { role: 'user', content: 'I agree with the design.' },
        { role: 'assistant', content: 'I have some concerns about this.' },
        { role: 'user', content: 'Let me reconsider.' },
        { role: 'assistant', content: 'Yes, please review again.' },
      ];

      const result = detectConvergence(messages);

      expect(result.converged).toBe(false);
      expect(result.reason).toBe('No convergence detected');
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
