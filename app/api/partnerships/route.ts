import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { addPartnership, getPartnerships } from '@/lib/db-firestore';
import { UserRole } from '@/lib/types';
import { partnerForReferral } from '@/lib/partnership-workflow';

export async function GET(req: Request) {
  const session = await auth() as any;
  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const forReferral = new URL(req.url).searchParams.get('forReferral') === 'true';
  if (!forReferral && session.user.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  try {
    const partnerships = await getPartnerships();
    return NextResponse.json({ partnerships: forReferral
      ? partnerships.map(partnerForReferral)
      : partnerships });
  } catch (error: any) {
    console.error('GET partnerships error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to fetch partnerships' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth() as any;
  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (session.user.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (typeof body?.institutionId !== 'string' || typeof body?.institutionName !== 'string') {
      return NextResponse.json({ error: 'An institution is required' }, { status: 400 });
    }

    const partnership = await addPartnership(session.user.id, {
      institutionId: body.institutionId,
      institutionName: body.institutionName,
      status: body.status,
      pointOfContact: body.pointOfContact,
      mouSigned: body.mouSigned,
      commissionTerms: body.commissionTerms,
      notes: body.notes,
      tags: body.tags,
    });
    return NextResponse.json({ partnership }, { status: 201 });
  } catch (error: any) {
    console.error('POST partnerships error:', error.message);
    const message = error.message || 'Failed to create partnership';
    const status = message.includes('required') || message.includes('Invalid') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
