import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateReferral } from '@/lib/db-firestore';
import { UserRole } from '@/lib/types';
import { referralForRole } from '@/lib/partnership-workflow';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['Referred', 'Due', 'Paid', 'Didnt join']).optional(),
  notificationChannel: z.enum(['Email', 'WhatsApp']).optional(),
  followUpChannel: z.enum(['Email', 'WhatsApp']).optional(),
}).strict();

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
    const body = updateSchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid referral update' }, { status: 400 });
    }
    if (body.data.status !== undefined && session.user.role !== UserRole.Admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const updates: Record<string, unknown> = {};
    if (body.data.status !== undefined) updates.status = body.data.status;
    if (body.data.followUpChannel !== undefined) updates.followUpChannel = body.data.followUpChannel;
    if (body.data.notificationChannel) {
      updates.notificationChannel = body.data.notificationChannel;
      updates.intimatedAt = new Date().toISOString();
      updates.intimatedBy = session.user.id;
    }
    const note = body.data.followUpChannel ? `Referral follow-up sent by ${body.data.followUpChannel}`
      : body.data.notificationChannel ? `Institute notified by ${body.data.notificationChannel}` : undefined;
    const referral = await updateReferral(session.user.id, id, updates, note);
    return NextResponse.json({ referral: referralForRole(referral, session.user.role) });
  } catch (error: any) {
    console.error('PATCH referral error:', error.message);
    const message = error.message || 'Failed to update referral';
    const status = message.includes('not found') ? 404 : message.includes('Invalid') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
