import { describe, expect, it, vi } from 'vitest';
import {
  collectContactsModifiedInWindow,
  extractLeadDate,
  isLeadDateInCronWindow,
} from '../lib/google-contacts-core';

function contact(id: string, updateTime: string, displayName: string) {
  return {
    names: [{ displayName }],
    metadata: {
      sources: [{ type: 'CONTACT', id, updateTime }],
    },
  };
}

describe('Google Contacts cron window', () => {
  it('extracts and validates DDMMYY lead dates', () => {
    expect(extractLeadDate(contact('a', '2026-09-28T03:00:00.000Z', 'Parent 280926')))
      .toEqual({ code: '280926', isoDate: '2026-09-28' });
    expect(extractLeadDate(contact('a', '2026-09-28T03:00:00.000Z', 'Parent 310226')))
      .toBeNull();
  });

  it('uses Asia/Kolkata calendar dates for the inclusive lead-date window', () => {
    const from = new Date('2026-09-27T23:45:00.000Z'); // 28 Sep in India
    const to = new Date('2026-09-28T23:45:00.000Z'); // 29 Sep in India

    expect(isLeadDateInCronWindow('2026-09-27', from, to)).toBe(false);
    expect(isLeadDateInCronWindow('2026-09-28', from, to)).toBe(true);
    expect(isLeadDateInCronWindow('2026-09-29', from, to)).toBe(true);
    expect(isLeadDateInCronWindow('2026-09-30', from, to)).toBe(false);
  });

  it('paginates until it reaches the last successful fetch and keeps only the window', async () => {
    const listConnections = vi.fn()
      .mockResolvedValueOnce({
        data: {
          connections: [
            contact('future', '2026-09-29T00:01:00.000Z', 'Future 290926'),
            contact('new-1', '2026-09-28T10:00:00.000Z', 'New One 280926'),
          ],
          nextPageToken: 'page-2',
        },
      })
      .mockResolvedValueOnce({
        data: {
          connections: [
            contact('new-2', '2026-09-28T05:00:00.000Z', 'New Two 280926'),
            contact('boundary', '2026-09-28T00:00:00.000Z', 'Boundary 280926'),
            contact('old', '2026-09-27T23:59:59.000Z', 'Old 270926'),
          ],
          nextPageToken: 'page-3',
        },
      });

    const result = await collectContactsModifiedInWindow(listConnections, {
      fromExclusive: new Date('2026-09-28T00:00:00.000Z'),
      toInclusive: new Date('2026-09-29T00:00:00.000Z'),
    });

    expect(result.contacts.map((person) => person.metadata?.sources?.[0]?.id))
      .toEqual(['new-1', 'new-2']);
    expect(result.checked).toBe(5);
    expect(result.pages).toBe(2);
    expect(listConnections).toHaveBeenCalledTimes(2);
    expect(listConnections.mock.calls[1][0].pageToken).toBe('page-2');
  });

  it('rejects a historical suffix even when the contact changed in the fetch window', async () => {
    const listConnections = vi.fn().mockResolvedValue({
      data: {
        connections: [contact('old-lead', '2026-09-28T10:00:00.000Z', 'Parent 280924')],
      },
    });

    const result = await collectContactsModifiedInWindow(listConnections, {
      fromExclusive: new Date('2026-09-28T00:00:00.000Z'),
      toInclusive: new Date('2026-09-29T00:00:00.000Z'),
    });
    const leadDate = extractLeadDate(result.contacts[0]);

    expect(leadDate).toEqual({ code: '280924', isoDate: '2024-09-28' });
    expect(isLeadDateInCronWindow(leadDate!.isoDate, new Date('2026-09-28T00:00:00.000Z'), new Date('2026-09-29T00:00:00.000Z')))
      .toBe(false);
  });
});
