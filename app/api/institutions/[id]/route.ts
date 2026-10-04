import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateInstitution } from '@/lib/db-firestore';
import { UserRole } from '@/lib/types';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth() as any;
  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (session.user.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const { id } = await params;

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body?.name !== undefined) updates.name = body.name;
    if (body?.campus !== undefined) updates.campus = body.campus;
    if (body?.address !== undefined) updates.address = body.address;
    if (body?.status !== undefined) updates.status = body.status;
    if (body?.contacts !== undefined) updates.contacts = body.contacts;

    const institution = await updateInstitution(id, updates);
    return NextResponse.json({ institution });
  } catch (error: any) {
    console.error('PATCH institution error:', error.message);
    const message = error.message || 'Failed to update institution';
    const status = message.includes('not found') ? 404 : message.includes('required') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
