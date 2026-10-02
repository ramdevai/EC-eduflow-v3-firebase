import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deletePartnership, updatePartnership } from '@/lib/db-firestore';
import { UserRole } from '@/lib/types';

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
    if (body?.pointOfContact !== undefined) updates.pointOfContact = body.pointOfContact;
    if (body?.mouSigned !== undefined) updates.mouSigned = body.mouSigned;
    if (body?.commissionTerms !== undefined) updates.commissionTerms = body.commissionTerms;
    if (body?.notes !== undefined) updates.notes = body.notes;
    if (body?.tags !== undefined) updates.tags = body.tags;

    const partnership = await updatePartnership(id, updates);
    return NextResponse.json({ partnership });
  } catch (error: any) {
    console.error('PATCH partnership error:', error.message);
    const message = error.message || 'Failed to update partnership';
    const status = message.includes('not found') ? 404 : message.includes('Invalid') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth() as any;
  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deletePartnership(session.user.id, session.user.role as UserRole, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE partnership error:', error.message);
    const status = error.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Failed to delete partnership' }, { status });
  }
}
