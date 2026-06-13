import { describe, expect, it } from 'vitest';
import { buildCalendarEventBody } from '@/lib/calendar';

describe('calendar event identity', () => {
  it('uses the student name in the title and primary contact as attendee', () => {
    const event = buildCalendarEventBody({
      id: 'lead-1',
      name: 'Primary Parent',
      studentName: 'Student Child',
      email: 'parent@example.com',
    }, '2026-06-10T10:00:00.000Z');

    expect(event.summary).toBe('1:1 Career Counseling: Student Child');
    expect(event.attendees).toEqual([{ email: 'parent@example.com' }]);
  });
});
