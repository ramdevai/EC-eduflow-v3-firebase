import { google } from 'googleapis';
import { getAdminAuthClient } from './google-auth';

export async function getCalendarClient() {
  const auth = getAdminAuthClient();
  return google.calendar({ version: 'v3', auth });
}

export type CalendarBusySlot = {
  id?: string;
  title: string;
  start: string;
  end: string;
};

export function buildCalendarEventBody(
  lead: { name: string; studentName?: string; email?: string; id: string },
  startTime: string,
  durationMinutes: number = 90
) {
  const studentName = lead.studentName || lead.name;
  const endTime = new Date(new Date(startTime).getTime() + durationMinutes * 60 * 1000).toISOString();

  return {
    summary: `1:1 Career Counseling: ${studentName}`,
    description: `Career counseling session for student ID: ${lead.id}`,
    start: { dateTime: startTime },
    end: { dateTime: endTime },
    attendees: lead.email ? [{ email: lead.email }] : [],
    conferenceData: {
      createRequest: {
        requestId: `educompass-${lead.id}-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };
}

export async function getAvailability(timeMin: string, timeMax: string) {
  const calendar = await getCalendarClient();
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (response.data.items || []).reduce<CalendarBusySlot[]>((slots, event) => {
    if (event.status === 'cancelled' || event.transparency === 'transparent') {
      return slots;
    }

    const start = event.start?.dateTime || event.start?.date;
    const end = event.end?.dateTime || event.end?.date;

    if (!start || !end) {
      return slots;
    }

    slots.push({
      id: event.id || undefined,
      title: event.summary || 'Busy',
      start,
      end,
    });

    return slots;
  }, []);
}

export async function upsertCalendarEvent(
  lead: { name: string; studentName?: string; email?: string; id: string },
  startTime: string,
  eventId?: string,
  durationMinutes: number = 90
) {
  const calendar = await getCalendarClient();
  const eventBody = buildCalendarEventBody(lead, startTime, durationMinutes);

  if (eventId) {
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: eventBody,
      conferenceDataVersion: 1,
    });
    return response.data;
  } else {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventBody,
      conferenceDataVersion: 1,
    });
    return response.data;
  }
}

export async function deleteCalendarEvent(eventId: string) {
  const calendar = await getCalendarClient();
  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
  } catch (error: any) {
    // If the event is already deleted (404), we can ignore it
    if (error.code !== 404) {
      throw error;
    }
  }
}

// School programme sessions share the same primary calendar as 1:1 lead
// appointments (the counsellor plans off one calendar), but get a distinct
// color so ~250+ recurring class blocks don't visually blend into leads.
const PROGRAMME_SESSION_COLOR_ID = '9'; // Blueberry

function programmeSessionDisplayTimeTo24Hour(displayTime: string): string {
  const match = displayTime.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    throw new Error(`Unrecognised session time format: ${displayTime}`);
  }

  const [, hourStr, minute, suffix] = match;
  let hour = parseInt(hourStr, 10) % 12;
  if (suffix.toUpperCase() === 'PM') hour += 12;

  return `${String(hour).padStart(2, '0')}:${minute}`;
}

export function buildProgrammeSessionEventBody(session: {
  school: string;
  grade: string;
  division: string;
  room: string;
  date: string;
  startTime: string;
  endTime: string;
  teacher: string;
  careers: { name: string; status: string }[];
}, cancelled: boolean) {
  const careerLines = session.careers.length
    ? session.careers.map(career => `- ${career.name} (${career.status})`).join('\n')
    : 'No careers assigned yet.';

  return {
    summary: `${cancelled ? '[Cancelled] ' : ''}School Programme: ${session.school} — ${session.grade} ${session.division} (${session.room})`,
    description: `Career primer session with ${session.teacher}.\n\nCareers:\n${careerLines}`,
    start: {
      dateTime: `${session.date}T${programmeSessionDisplayTimeTo24Hour(session.startTime)}:00`,
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: `${session.date}T${programmeSessionDisplayTimeTo24Hour(session.endTime)}:00`,
      timeZone: 'Asia/Kolkata',
    },
    colorId: PROGRAMME_SESSION_COLOR_ID,
  };
}

/**
 * Creates or updates the calendar event mirroring a school programme session.
 * If the linked event was deleted directly on Google Calendar (update returns
 * 404), this falls back to creating a fresh one instead of failing the caller
 * - so calendar-side drift never blocks an in-app cancel/restore/edit.
 */
export async function upsertProgrammeSessionEvent(eventBody: ReturnType<typeof buildProgrammeSessionEventBody>, eventId?: string) {
  const calendar = await getCalendarClient();

  if (eventId) {
    try {
      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: eventBody,
      });
      return response.data;
    } catch (error: any) {
      if (error.code !== 404) {
        throw error;
      }
    }
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: eventBody,
  });
  return response.data;
}
