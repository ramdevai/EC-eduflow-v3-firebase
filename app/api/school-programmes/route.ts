import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { getSchoolProgrammeSchedule } from '@/lib/db-firestore';

export async function GET(req: Request) {
  const session = await auth() as any;
  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const programmeId = searchParams.get('programmeId') || undefined;

  try {
    const schedule = await getSchoolProgrammeSchedule(programmeId);
    if (!schedule) {
      return NextResponse.json({ error: 'School programme not found' }, { status: 404 });
    }

    return NextResponse.json(schedule);
  } catch (error: any) {
    console.error('GET school programme schedule error:', error.message);
    const status = error.message === 'Invalid programme id.' ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Failed to fetch school programme' }, { status });
  }
}
