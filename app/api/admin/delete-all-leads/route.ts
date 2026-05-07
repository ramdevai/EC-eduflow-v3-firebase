import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteAllLeads, getLeadCounts } from '@/lib/db-firestore';
import { UserRole } from '@/lib/types';

const CONFIRMATION_PHRASE = 'DELETE ALL DATA';

export async function POST(req: Request) {
  const session = await auth() as any;

  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (body?.confirmation !== CONFIRMATION_PHRASE) {
      return NextResponse.json({ error: `Type "${CONFIRMATION_PHRASE}" to confirm.` }, { status: 400 });
    }

    const countsBefore = await getLeadCounts(session.user.id, UserRole.Admin);
    const result = await deleteAllLeads(session.user.id, UserRole.Admin);

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deleted} lead and customer records.`,
      deleted: result.deleted,
      countsBefore,
    });
  } catch (error: any) {
    console.error('Delete all leads error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete leads and customers.' }, { status: 500 });
  }
}
