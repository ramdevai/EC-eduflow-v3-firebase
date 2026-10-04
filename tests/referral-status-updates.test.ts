import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FieldValue } from 'firebase-admin/firestore';
import { Referral } from '@/lib/types';

const { records, adminDb, queryReads } = vi.hoisted(() => {
  const records = new Map<string, Record<string, any>>();
  const queryReads: string[] = [];
  const snapshot = (id: string) => ({ id, ref: { id }, exists: records.has(id), data: () => records.get(id) });
  return {
    records, queryReads,
    adminDb: {
      collection: () => ({ doc: (id: string) => ({ id }), where: (_field: string, _op: string, leadId: string) => ({ leadId }) }),
      runTransaction: async (callback: (tx: any) => Promise<any>) => {
        const pending: Array<{ ref: { id: string }; patch: Record<string, any> }> = [];
        const result = await callback({
          get: async (target: { id?: string; leadId?: string }) => {
            if (pending.length) throw new Error('Transaction read after write');
            if (target.id) return snapshot(target.id);
            queryReads.push(target.leadId!);
            return { docs: [...records.entries()].filter(([, r]) => r.leadId === target.leadId).map(([id]) => snapshot(id)) };
          },
          set: (ref: { id: string }, patch: Record<string, any>) => pending.push({ ref, patch }),
        });
        for (const { ref, patch } of pending) {
          records.set(ref.id, { ...records.get(ref.id), ...patch });
        }
        return result;
      },
    },
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server-firebase', () => ({ adminDb }));
import { updateReferral } from '@/lib/db-firestore';

const record = (id: string, status: Referral['status'], leadId = 'student-1') => ({
  id, leadId, leadName: 'Demo Student', partnershipId: id, institutionId: id,
  institutionName: id, status, referredAt: '2026-10-01T10:00:00Z', referredBy: 'admin',
  updatedAt: '2026-10-01T10:00:00Z', nextFollowUpDate: '2026-10-31', timeline: [],
});

beforeEach(() => {
  records.clear(); queryReads.length = 0;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));
  records.set('atlas', record('atlas', 'Referred'));
  records.set('ecole', record('ecole', 'Referred'));
  records.set('ims', record('ims', 'Due'));
  records.set('paid', record('paid', 'Paid'));
  records.set('closed', record('closed', 'Didnt join'));
  records.set('another-student', record('another-student', 'Referred', 'student-2'));
});
afterEach(() => vi.useRealTimers());

describe('automatic closure of alternative referrals', () => {
  it('closes only the same student\'s other Referred entries when one becomes Due', async () => {
    await updateReferral('admin-1', 'atlas', { status: 'Due' });
    expect(records.get('atlas')).toMatchObject({ status: 'Due', nextFollowUpDate: '2026-11-03' });
    expect(records.get('ecole')).toMatchObject({ status: 'Didnt join', nextFollowUpDate: null });
    expect(records.get('ecole')!.timeline[0]).toMatchObject({ byUid: 'admin-1', note: expect.stringContaining('atlas') });
    expect(records.get('ims')!.status).toBe('Due');
    expect(records.get('paid')!.status).toBe('Paid');
    expect(records.get('another-student')!.status).toBe('Referred');
    expect(queryReads).toEqual(['student-1']);
  });

  it('does not close reopened alternatives when saving an already-Due referral', async () => {
    records.set('atlas', record('atlas', 'Due'));
    await updateReferral('admin', 'atlas', { status: 'Due' });
    expect(records.get('ecole')!.status).toBe('Referred');
    expect(queryReads).toEqual([]);
  });

  it('allows manual reactivation for concurrent university and class enrolment', async () => {
    await updateReferral('admin', 'atlas', { status: 'Due' });
    await updateReferral('admin', 'ecole', { status: 'Due' });
    expect(records.get('atlas')!.status).toBe('Due');
    expect(records.get('ecole')).toMatchObject({ status: 'Due', nextFollowUpDate: '2026-11-03' });
  });

  it('allows manually reopening a closed referral with a fresh reminder', async () => {
    await updateReferral('admin', 'closed', { status: 'Referred' });
    expect(records.get('closed')).toMatchObject({ status: 'Referred', nextFollowUpDate: '2026-11-03' });
  });

  it('also closes legacy notified referrals and removes legacy commission state', async () => {
    records.set('ecole', { ...record('ecole', 'Referred'), status: 'Intimated' });
    await updateReferral('admin', 'atlas', { status: 'Due' });
    expect(records.get('ecole')!.status).toBe('Didnt join');
    expect(records.get('ecole')!.commissionStatus.isEqual(FieldValue.delete())).toBe(true);
  });
});
