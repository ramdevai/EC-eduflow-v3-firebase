import { google } from 'googleapis';

export async function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth });
}

export async function getAvailability(accessToken: string, timeMin: string, timeMax: string) {
  const calendar = await getCalendarClient(accessToken);
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
  accessToken: string,
  lead: { name: string; email?: string; id: string },
  startTime: string,
  eventId?: string
) {
  const calendar = await getCalendarClient(accessToken);
  const endTime = new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();

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
