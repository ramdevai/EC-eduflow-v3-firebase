import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateReferral } from '@/lib/db-firestore';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth() as any;
  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body?.status !== undefined) updates.status = body.status;
    if (body?.intimatedAt !== undefined) updates.intimatedAt = body.intimatedAt;
    if (body?.intimatedBy !== undefined) updates.intimatedBy = body.intimatedBy;
    if (body?.nextFollowUpDate !== undefined) updates.nextFollowUpDate = body.nextFollowUpDate;
    if (body?.lastFollowUpNote !== undefined) updates.lastFollowUpNote = body.lastFollowUpNote;
    if (body?.commissionAmount !== undefined) updates.commissionAmount = body.commissionAmount;
    if (body?.commissionStatus !== undefined) updates.commissionStatus = body.commissionStatus;

    const referral = await updateReferral(session.user.id, id, updates, body?.timelineNote);
    return NextResponse.json({ referral });
  } catch (error: any) {
    console.error('PATCH referral error:', error.message);
    const message = error.message || 'Failed to update referral';
    const status = message.includes('not found') ? 404 : message.includes('Invalid') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
