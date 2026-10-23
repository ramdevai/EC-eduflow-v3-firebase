import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@/lib/types';

const { docs, db } = vi.hoisted(() => {
  const docs = new Map<string, Record<string, unknown>>();
  const ref = (path: string): any => ({
    id: path.split('/').pop(), path,
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) }),
  });
  const snapshot = (reference: any) => ({ exists: docs.has(reference.path), id: reference.id, data: () => docs.get(reference.path) });
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: async (callback: (transaction: any) => unknown) => callback({
      getAll: async (...refs: any[]) => refs.map(snapshot),
      create: (reference: any, data: Record<string, unknown>) => docs.set(reference.path, data),
      update: (reference: any, data: Record<string, unknown>) => docs.set(reference.path, { ...docs.get(reference.path), ...data }),
    }),
  };
  return { docs, db };
});
vi.mock('server-only', () => ({}));
vi.mock('@/lib/server-firebase', () => ({ adminDb: db }));
import { recordFollowUp } from '@/lib/server-follow-ups';

const input = { requestId: '9d1a7e6c-2f63-4b8f-a195-43f4fa819b78', channel: 'Call', outcome: 'Requested more time', happenedAt: '2026-01-01T10:00:00Z', nextFollowUpDate: '2026-01-03' };

describe('confirmed follow-up persistence', () => {
  beforeEach(() => { docs.clear(); docs.set('leads/lead-1', { name: 'Fixture Parent', followUpCount: 0 }); });
  it('records server-assigned staff identity and updates the summary atomically', async () => {
    const { entry, summary } = await recordFollowUp('staff-1', UserRole.Staff, 'Fixture Staff', 'lead-1', input);
    expect(entry.recordedBy).toBe('staff-1');
    expect(entry.recordedByName).toBe('Fixture Staff');
    expect(summary.followUpCount).toBe(1);
    expect(docs.get('leads/lead-1')?.nextFollowUpDate).toBe('2026-01-03');
    expect(docs.size).toBe(2);
  });
  it('does not double-count a retry', async () => {
    await recordFollowUp('staff-1', UserRole.Staff, 'Fixture Staff', 'lead-1', input);
    const result = await recordFollowUp('staff-1', UserRole.Staff, 'Fixture Staff', 'lead-1', input);
    expect(result.summary.followUpCount).toBe(1);
    expect(docs.size).toBe(2);
  });
  it('persists the email label without clearing the next scheduled contact', async () => {
    docs.set('leads/lead-1', { followUpCount: 0, nextFollowUpDate: '2026-01-07' });
    const result = await recordFollowUp('staff-1', UserRole.Staff, 'Staff', 'lead-1', {
      ...input, channel: 'Email', outcome: 'Message sent', messageType: 'onboarding', nextFollowUpDate: '',
    });
    expect(result.entry.messageType).toBe('onboarding');
    expect(result.summary.nextFollowUpDate).toBe('2026-01-07');
  });
  it('rejects missing leads, invalid roles, and another staff member reusing the same record', async () => {
    await expect(recordFollowUp('user', 'unknown' as UserRole, 'Name', 'lead-1', input)).rejects.toMatchObject({ status: 403 });
    await expect(recordFollowUp('user', UserRole.Admin, 'Name', 'missing', input)).rejects.toMatchObject({ status: 404 });
    await recordFollowUp('staff-1', UserRole.Staff, 'Fixture Staff', 'lead-1', input);
    await expect(recordFollowUp('staff-2', UserRole.Staff, 'Other Staff', 'lead-1', input)).rejects.toMatchObject({ status: 409 });
  });
});
