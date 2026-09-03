import { describe, expect, it } from 'vitest';
import { buildCalendarEventBody, buildProgrammeSessionEventBody } from '@/lib/calendar';

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

describe('school programme session calendar event', () => {
  const session = {
    school: 'Gundecha Education Academy',
    grade: 'IX',
    division: 'Ebony',
    room: '713',
    date: '2026-09-07',
    startTime: '10:00 AM',
    endTime: '10:35 AM',
    teacher: 'Sugana Karki',
    careers: [{ name: 'Cybersecurity Analyst', status: 'planned' }],
  };

  it('converts the 12-hour display time to a Kolkata-zoned dateTime', () => {
    const event = buildProgrammeSessionEventBody(session, false);

    expect(event.start).toEqual({ dateTime: '2026-09-07T10:00:00', timeZone: 'Asia/Kolkata' });
    expect(event.end).toEqual({ dateTime: '2026-09-07T10:35:00', timeZone: 'Asia/Kolkata' });
    expect(event.summary).toBe('School Programme: Gundecha Education Academy — IX Ebony (713)');
  });

  it('handles noon and midnight correctly', () => {
    const noon = buildProgrammeSessionEventBody({ ...session, startTime: '12:00 PM', endTime: '12:35 PM' }, false);
    expect(noon.start.dateTime).toBe('2026-09-07T12:00:00');

    const midnight = buildProgrammeSessionEventBody({ ...session, startTime: '12:00 AM', endTime: '12:35 AM' }, false);
    expect(midnight.start.dateTime).toBe('2026-09-07T00:00:00');
  });

  it('prefixes the title when the session is cancelled', () => {
    const event = buildProgrammeSessionEventBody(session, true);
    expect(event.summary).toMatch(/^\[Cancelled\] /);
  });
});
