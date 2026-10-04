import { describe, expect, it } from 'vitest';
import { followUpSchema, nextFollowUpSummary } from '@/lib/follow-ups';

const input = {
  requestId: '9d1a7e6c-2f63-4b8f-a195-43f4fa819b78', channel: 'WhatsApp' as const,
  outcome: 'No response' as const, happenedAt: '2026-01-01T10:00:00.000Z', notes: '', message: '', nextFollowUpDate: '',
};

describe('follow-up validation and summaries', () => {
  it('keeps no response separate from not interested', () => {
    expect(followUpSchema.parse(input).outcome).toBe('No response');
    expect(followUpSchema.parse({ ...input, outcome: 'Not interested' }).outcome).toBe('Not interested');
  });
  it('accepts labeled messages and keeps older entries compatible', () => {
    expect(followUpSchema.parse({ ...input, outcome: 'Message sent', messageType: 'test' }).messageType).toBe('test');
    expect(followUpSchema.parse(input).messageType).toBeUndefined();
    expect(followUpSchema.safeParse({ ...input, messageType: 'unknown' }).success).toBe(false);
  });
  it('preserves a scheduled follow-up when a message is sent', () => {
    const summary = nextFollowUpSummary({ nextFollowUpDate: '2026-01-07' }, followUpSchema.parse({ ...input, outcome: 'Message sent' }));
    expect(summary.nextFollowUpDate).toBe('2026-01-07');
    expect(summary.lastFollowUpOutcome).toBe('Message sent');
  });
  it('rejects invalid dates, unconfirmed outcomes, and forged staff metadata', () => {
    for (const patch of [{ nextFollowUpDate: '2026-99-10' }, { nextFollowUpDate: '2026-02-30' }, { happenedAt: 'not-a-date' }, { happenedAt: '2099-01-01T00:00:00Z' }, { outcome: '' }, { recordedBy: 'forged-user' }]) {
      expect(followUpSchema.safeParse({ ...input, ...patch }).success).toBe(false);
    }
  });
  it('does not replace the latest outcome or planned date when recording older contact', () => {
    const current = { followUpCount: 3, lastFollowUp: '2026-01-05T10:00:00Z', lastFollowUpOutcome: 'Interested', nextFollowUpDate: '2026-01-07' };
    expect(nextFollowUpSummary(current, input)).toEqual({ ...current, followUpCount: 4 });
  });
  it('uses the latest contact and clears an old next date when none is scheduled', () => {
    expect(nextFollowUpSummary({ followUpCount: 1, lastFollowUp: '2025-01-01', nextFollowUpDate: '2025-01-03' }, input)).toEqual({
      followUpCount: 2, lastFollowUp: input.happenedAt, lastFollowUpOutcome: 'No response', nextFollowUpDate: '',
    });
  });
});
