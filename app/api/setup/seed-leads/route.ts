import { NextResponse } from 'next/server';
import { addLeads } from '@/lib/db-firestore';
import { UserRole, Lead } from '@/lib/types';
import { auth } from '@/lib/auth';
import { getFirebaseEnvironment } from '@/lib/firebase-environment';
import { SAMPLE_LEADS } from '@/lib/sample-leads';

export async function POST(req: Request) {
  if (getFirebaseEnvironment() !== 'local') {
    return NextResponse.json(
      { error: 'Sample lead seeding is available only in local mode.' },
      { status: 403 }
    );
  }

  const session = await auth() as any;

  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const callerUid = session.user.id;
  const role = session.user.role as UserRole;

  try {
    await addLeads(callerUid, role, SAMPLE_LEADS as Partial<Lead>[]);
    return NextResponse.json({ success: true, count: SAMPLE_LEADS.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
