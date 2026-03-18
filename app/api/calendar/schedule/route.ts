import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { upsertCalendarEvent } from '@/lib/calendar';
import { updateLead, getAllLeads } from '@/lib/db-sheets';

export async function POST(req: Request) {
  const session = await auth() as any;
  const sheetId = req.headers.get('x-sheet-id');

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sheetId) {
    return NextResponse.json({ error: 'Sheet ID missing' }, { status: 400 });
  }

  try {
    const { leadId, startTime } = await req.json();
    const token = session.accessToken;
    
    const leads = await getAllLeads(sheetId, token);
    const lead = leads.find(l => l.id === leadId);
    
    if (!lead) throw new Error('Lead not found');

    const event = await upsertCalendarEvent(
        token, 
        { name: lead.name, email: lead.email, id: lead.id }, 
        startTime,
        lead.calendarEventId
    );

    // Update sheet with event info
    await updateLead(sheetId, token, lead.id, {
        calendarEventId: event.id || '',
        appointmentTime: startTime,
        stage: '1:1 scheduled'
    });

    return NextResponse.json({ 
        success: true, 
        eventId: event.id,
        meetLink: event.conferenceData?.entryPoints?.[0]?.uri
    });
  } catch (error: any) {
    console.error('Calendar Schedule error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
