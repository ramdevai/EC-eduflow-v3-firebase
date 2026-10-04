import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { groupReferralsByStudent, ReferralsListing } from '@/components/dashboard/ReferralsView';
import { Referral } from '@/lib/types';

const referral = (id: string, leadId: string, leadName: string, institutionName: string): Referral => ({
  id, leadId, leadName, institutionName, institutionId: institutionName, partnershipId: institutionName,
  status: 'Referred', referredAt: '2026-10-04T12:00:00Z', referredBy: 'demo', updatedAt: '2026-10-04T12:00:00Z',
  nextFollowUpDate: '2026-11-03', timeline: [],
});

describe('referral listing by student', () => {
  it('keeps one student\'s institutes together and students with the same name separate', () => {
    const groups = groupReferralsByStudent([
      referral('1', 'student-a', 'Demo Student', 'Atlas'),
      referral('2', 'student-b', 'Demo Student', 'IMS Classes'),
      referral('3', 'student-a', 'Demo Student', 'Bristol University'),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.find(g => g.leadId === 'student-a')!.referrals.map(r => r.id)).toEqual(['1', '3']);
  });

  it('renders named columns, readable dates, and a clear closed state', () => {
    const html = renderToStaticMarkup(<ReferralsListing referrals={[
      referral('1', 'student-a', 'Demo Student', 'Atlas'),
      { ...referral('2', 'student-b', 'Second Student', 'Akash Classes'), status: 'Didnt join', nextFollowUpDate: null },
    ]} />);
    expect(html).toContain('scope="rowgroup"');
    expect(html).toContain('Next follow-up');
    expect(html).toContain('Referred on');
    expect(html).toContain('3 Nov 2026');
    expect(html).toContain('Admission check');
    expect(html).toContain('Closed');
    expect(html).not.toContain('Invalid Date');
  });
});
