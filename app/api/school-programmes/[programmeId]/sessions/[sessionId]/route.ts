import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateSchoolProgrammeSession } from '@/lib/db-firestore';
import { ProgrammeCareerStatus, UserRole } from '@/lib/types';

const ACTIONS = ['cancel', 'restore', 'setCareerStatus', 'setCareers', 'setNote'];
const CAREER_STATUSES: ProgrammeCareerStatus[] = ['planned', 'discussed'];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ programmeId: string; sessionId: string }> }
) {
  const session = await auth() as any;
  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { programmeId, sessionId } = await params;

  try {
    const body = await req.json();
    if (!body || typeof body.action !== 'string' || !ACTIONS.includes(body.action)) {
      return NextResponse.json({ error: 'Invalid programme session action' }, { status: 400 });
    }

    if (body.action === 'cancel') {
      const schedule = await updateSchoolProgrammeSession(programmeId, sessionId, {
        action: 'cancel',
        reason: typeof body.reason === 'string' ? body.reason : '',
      });
      return NextResponse.json(schedule);
    }

    if (body.action === 'restore') {
      const schedule = await updateSchoolProgrammeSession(programmeId, sessionId, { action: 'restore' });
      return NextResponse.json(schedule);
    }

    if (body.action === 'setCareerStatus') {
      if (typeof body.careerId !== 'string' || !CAREER_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid career status update' }, { status: 400 });
      }

      const schedule = await updateSchoolProgrammeSession(programmeId, sessionId, {
        action: 'setCareerStatus',
        careerId: body.careerId,
        status: body.status,
      });
      return NextResponse.json(schedule);
    }

    if (body.action === 'setNote') {
      if (typeof body.note !== 'string') {
        return NextResponse.json({ error: 'Invalid note' }, { status: 400 });
      }

      const schedule = await updateSchoolProgrammeSession(programmeId, sessionId, {
        action: 'setNote',
        note: body.note,
      });
      return NextResponse.json(schedule);
    }

    if (!isStringArray(body.careerIds)) {
      return NextResponse.json({ error: 'Invalid career selection' }, { status: 400 });
    }

    const schedule = await updateSchoolProgrammeSession(programmeId, sessionId, {
      action: 'setCareers',
      careerIds: body.careerIds,
    });
    return NextResponse.json(schedule);
  } catch (error: any) {
    console.error('PATCH school programme session error:', error.message);
    const message = error.message || 'Failed to update programme session';
    const status = message.includes('not found') ? 404 : message.startsWith('Invalid') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
