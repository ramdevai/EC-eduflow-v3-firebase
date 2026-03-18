import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCalendarClient } from '@/lib/calendar';

export async function GET(req: Request) {
  const session = await auth() as any;
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const calendar = await getCalendarClient(session.accessToken);
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay,
      timeMax: endOfDay,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return NextResponse.json(response.data.items || []);
  } catch (error: any) {
    console.error('Calendar Events error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
