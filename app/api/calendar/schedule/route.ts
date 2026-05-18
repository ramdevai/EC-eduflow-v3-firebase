import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { getAllLeads, updateLeads, getSystemSettings } from '@/lib/db-firestore';
import { upsertCalendarEvent, deleteCalendarEvent, getAvailability } from '@/lib/calendar';

export async function POST(req: Request) {
  const session = await auth() as any;

  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { leadId, startTime } = await req.json();
    const callerUid = session.user.id;
    const role = session.user.role as UserRole;
    
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

    const settings = await getSystemSettings();
    const startDate = new Date(startTime);
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid startTime' }, { status: 400 });
    }

    const durationMinutes = settings.defaultSessionDuration || 90;
    const endTime = new Date(startDate.getTime() + durationMinutes * 60 * 1000).toISOString();
    const conflicts = await getAvailability(startDate.toISOString(), endTime);
    const blockingConflicts = conflicts.filter(conflict => {
      return !lead.calendarEventId || conflict.id !== lead.calendarEventId;
    });

    if (blockingConflicts.length > 0) {
      return NextResponse.json(
        { error: 'Selected slot is no longer available. Please refresh availability and choose another time.' },
        { status: 409 }
      );
    }

    const event = await upsertCalendarEvent(
        { name: lead.name, email: lead.email, id: lead.id }, 
        startTime,
        lead.calendarEventId,
        durationMinutes
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
        meetLink: event.conferenceData?.entryPoints?.[0]?.uri,
        htmlLink: event.htmlLink
    });
  } catch (error: any) {
    console.error('Calendar Schedule error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth() as any;

  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { leadId, eventId } = await req.json();
    const callerUid = session.user.id;
    const role = session.user.role as UserRole;

    if (!leadId || !eventId) {
      return NextResponse.json({ error: 'leadId and eventId are required' }, { status: 400 });
    }

    // 1. Delete from Google Calendar
    await deleteCalendarEvent(eventId);

    // 2. Update lead in Firestore
    await updateLeads(callerUid, role, [{
      id: leadId,
      data: {
        calendarEventId: '',
        appointmentTime: '',
        stage: 'Test completed', // Revert to previous logical stage
        lastStageUpdate: new Date().toISOString(),
      },
    }]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Calendar Cancel error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
