import { describe, expect, it } from 'vitest';
import { planPrimaryContactRecovery } from '../scripts/contact-recovery-core.mjs';

const consent = {
  privacy_consent: true,
  privacy_consent_date: '2026-05-01T00:00:00.000Z',
};

describe('primary-contact recovery planning', () => {
  it('handles full, partial, unmatched, and already recovered records', () => {
    const report: any = planPrimaryContactRecovery([
      { id: 'full', ...consent, googleContactId: 'g-full', name: 'Student A', phone: '1', email: 'a@student.test' },
      { id: 'partial', ...consent, googleContactId: 'g-partial', name: 'Student B', phone: '2', email: 'b@student.test' },
      { id: 'unmatched', ...consent, googleContactId: 'g-missing', name: 'Student C' },
      { id: 'done', ...consent, googleContactId: 'g-full', name: 'Parent', studentName: 'Student D' },
    ], [
      { googleContactId: 'g-full', rawName: 'Parent A 010626', name: 'Parent A', phone: '10', email: 'parent-a@test.com' },
      { googleContactId: 'g-partial', rawName: 'Parent B 020626', name: 'Parent B', phone: '', email: 'parent-b@test.com' },
    ], '2026-06-10T00:00:00.000Z');

    expect(report.recoverable).toHaveLength(1);
    expect(report.recoverable[0].updates).toMatchObject({
      studentName: 'Student A',
      name: 'Parent A',
      phone: '10',
      email: 'parent-a@test.com',
    });
    expect(report.partial).toHaveLength(1);
    expect(report.partial[0].updates.phone).toBeUndefined();
    expect(report.unmatched).toEqual([{ id: 'unmatched', reason: 'no exact Google Contact match' }]);
    expect(report.skipped[0].id).toBe('done');
  });

  it('rejects invalid date suffixes', () => {
    const report: any = planPrimaryContactRecovery([
      { id: 'lead', ...consent, googleContactId: 'g-invalid', name: 'Student' },
    ], [
      { googleContactId: 'g-invalid', rawName: 'Parent 321399', name: 'Parent', phone: '10' },
    ], '2026-06-10T00:00:00.000Z');

    expect(report.unmatched[0].reason).toContain('date suffix');
  });
});
