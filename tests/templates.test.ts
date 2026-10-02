import { beforeEach, describe, expect, it, vi } from 'vitest';

const { documents, writes, adminDb } = vi.hoisted(() => {
  const documents = new Map<string, Record<string, unknown>>();
  const writes: string[] = [];
  const collection = {
    doc: (id: string) => ({ id }),
    get: async () => ({
      docs: [...documents.entries()].map(([id, data]) => ({ id, data: () => data })),
    }),
    limit: () => ({ get: async () => ({ empty: documents.size === 0 }) }),
  };
  return {
    documents,
    writes,
    adminDb: {
      collection: () => collection,
      runTransaction: async (callback: (transaction: any) => Promise<void>) => callback({
        getAll: async (...refs: { id: string }[]) => refs.map(ref => ({
          ref,
          exists: documents.has(ref.id),
        })),
        create: (ref: { id: string }, data: Record<string, unknown>) => {
          writes.push(ref.id);
          documents.set(ref.id, data);
        },
      }),
      batch: () => ({
        set: (ref: { id: string }, data: Record<string, unknown>) => {
          writes.push(ref.id);
          documents.set(ref.id, data);
        },
        commit: async () => {},
      }),
    },
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server-firebase', () => ({ adminDb }));

import { getTemplates } from '@/lib/db-firestore';

const expectedIds = [
  'onboarding', 'test', 'test_nudge', 'followup', 'community',
  'review', 'birthday', 'report_email', 'fees_reminder', 'location',
];

describe('template recovery', () => {
  beforeEach(() => {
    documents.clear();
    writes.length = 0;
  });

  it('restores all standard templates when only the two local fixtures exist', async () => {
    documents.set('registration', { id: 'registration', message: 'Local registration' });
    documents.set('appointment', { id: 'appointment', message: 'Local appointment' });

    const templates = await getTemplates();

    expect(templates.map(template => template.id)).toEqual(expect.arrayContaining(expectedIds));
    expect(templates).toHaveLength(12);
    expect(documents.get('registration')?.message).toBe('Local registration');
  });

  it('preserves customized templates and does not rewrite them on repeated loads', async () => {
    const customized = { id: 'onboarding', label: 'My welcome', subject: 'Custom subject', message: 'Custom welcome' };
    documents.set('onboarding', customized);

    await getTemplates();
    expect(documents.get('onboarding')).toEqual(customized);
    expect(writes).not.toContain('onboarding');
    writes.length = 0;
    await getTemplates();
    expect(writes).toEqual([]);
  });

  it('initializes an empty collection including the location message', async () => {
    const templates = await getTemplates();
    expect(templates).toHaveLength(expectedIds.length);
    expect(templates.find(template => template.id === 'location')?.message).toContain('6V6F+28 Mumbai, Maharashtra');
  });
});
