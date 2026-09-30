import { describe, expect, it } from 'vitest';
import { compareDateValuesDesc, computeLeadStatus, isActivePipelineLead, isCustomerLead, isLostLead, normalizeStage } from '@/lib/utils';
import { Lead } from '@/lib/types';

const leadAt = (stage: Lead['stage'], status: Lead['status']) => ({ stage, status } as Lead);

describe('lead status and pipeline classification', () => {
  it('treats Lost as a status while preserving the pipeline stage', () => {
    const lostAtTestSent = leadAt('Test sent', 'Lost');

    expect(isLostLead(lostAtTestSent)).toBe(true);
    expect(isActivePipelineLead(lostAtTestSent)).toBe(false);
    expect(isCustomerLead(lostAtTestSent)).toBe(false);
    expect(lostAtTestSent.stage).toBe('Test sent');
  });

  it('restores a lost lead to the same active pipeline stage when status is Open', () => {
    const restored = leadAt('Registration done', 'Open');

    expect(isLostLead(restored)).toBe(false);
    expect(isActivePipelineLead(restored)).toBe(true);
    expect(isCustomerLead(restored)).toBe(false);
  });

  it('keeps legacy stage Lost records out of the active pipeline', () => {
    const legacyLost = leadAt('Lost', 'Lost');

    expect(normalizeStage('lost')).toBe('Lost');
    expect(computeLeadStatus('Lost')).toBe('Lost');
    expect(isLostLead(legacyLost)).toBe(true);
    expect(isActivePipelineLead(legacyLost)).toBe(false);
  });
});

describe('lead date ordering', () => {
  it('sorts mixed legacy and ISO timestamps chronologically, newest first', () => {
    const dates = [
      '30 Sep 2026',
      '2026-09-30T19:31:37.537Z',
      '29 Sep 2026',
      '',
    ];

    expect(dates.sort(compareDateValuesDesc)).toEqual([
      '2026-09-30T19:31:37.537Z',
      '30 Sep 2026',
      '29 Sep 2026',
      '',
    ]);
  });
});
