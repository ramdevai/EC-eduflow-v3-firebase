import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAvailability } from '@/lib/calendar';

export async function GET(req: Request) {
  const session = await auth() as any;
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get('timeMin');
  const timeMax = searchParams.get('timeMax');

  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: 'timeMin and timeMax are required' }, { status: 400 });
  }

  try {
    const busySlots = await getAvailability(session.accessToken, timeMin, timeMax);
    return NextResponse.json(busySlots);
  } catch (error: any) {
    console.error('Calendar Availability error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
