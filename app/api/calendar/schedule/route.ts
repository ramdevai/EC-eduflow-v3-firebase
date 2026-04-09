import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { upsertCalendarEvent } from '@/lib/calendar';
import { updateLeads, getAllLeads } from '@/lib/db-firestore';
import { UserRole } from '@/lib/types';

export async function POST(req: Request) {
  const session = await auth() as any;

  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { leadId, startTime } = await req.json();
    const callerUid = session.user.id;
    const role = session.user.role as UserRole;
    
    const token = session.accessToken; // Retain token for calendar operations
    const leads = await getAllLeads(callerUid, role);
    const lead = leads.find(l => l.id === leadId);
    
    if (!lead) throw new Error('Lead not found');

    // Simple idempotency: If lead already has an appointment at this exact time, skip creation
    if (lead.appointmentTime === startTime && lead.calendarEventId) {
        return NextResponse.json({ 
            success: true, 
            eventId: lead.calendarEventId,
            message: 'Appointment already scheduled for this time'
        });
    }

    const event = await upsertCalendarEvent(
        token as string, // Ensure token is string
        { name: lead.name, email: lead.email, id: lead.id }, 
        startTime,
        lead.calendarEventId
    );

    // Update lead in Firestore with event info
    await updateLeads(callerUid, role, [{
      id: lead.id,
      data: {
        calendarEventId: event.id || '',
        appointmentTime: startTime,
        stage: '1:1 scheduled',
        lastStageUpdate: new Date().toISOString(),
      },
    }]);

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
