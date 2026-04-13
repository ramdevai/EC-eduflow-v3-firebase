import { google } from 'googleapis';
import { getAdminAuthClient } from './google-auth';

export async function getCalendarClient() {
  const auth = getAdminAuthClient();
  return google.calendar({ version: 'v3', auth });
}

export async function getAvailability(timeMin: string, timeMax: string) {
  const calendar = await getCalendarClient();
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: 'primary' }],
    },
  });

  return response.data.calendars?.primary?.busy || [];
}

export async function upsertCalendarEvent(
  lead: { name: string; email?: string; id: string },
  startTime: string,
  eventId?: string,
  durationMinutes: number = 90
) {
  const calendar = await getCalendarClient();
  const endTime = new Date(new Date(startTime).getTime() + durationMinutes * 60 * 1000).toISOString();

  const eventBody = {
    summary: `1:1 Career Counseling: ${lead.name}`,
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
