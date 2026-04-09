import { NextResponse } from 'next/server';
import { updateLeads, deleteLead } from '@/lib/db-firestore';
import { UserRole } from '@/lib/types';
import { auth } from '@/lib/auth';
import { validateEnv } from '@/lib/env-check';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const envStatus = validateEnv();
  if (!envStatus.isValid) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const session = await auth() as any;
  const { id } = await params;

  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    await updateLeads(session.user.id, session.user.role as UserRole, [{ id, data: body }]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PATCH lead error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const envStatus = validateEnv();
  if (!envStatus.isValid) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const session = await auth() as any;
  const { id } = await params;

  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    await deleteLead(session.user.id, session.user.role as UserRole, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE lead error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete lead' }, { status: 500 });
  }
}
