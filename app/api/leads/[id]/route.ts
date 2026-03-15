import { NextResponse } from 'next/server';
import { updateLead, deleteLead } from '@/lib/db-sheets';
import { auth } from '@/lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth() as any;
  const sheetId = req.headers.get('x-sheet-id');
  const { id } = await params;

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sheetId) {
    return NextResponse.json({ error: 'Sheet ID not provided' }, { status: 400 });
  }

  try {
    const body = await req.json();
    await updateLead(sheetId, session.accessToken as string, parseInt(id), body);
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
  const session = await auth() as any;
  const sheetId = req.headers.get('x-sheet-id');
  const { id } = await params;

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sheetId) {
    return NextResponse.json({ error: 'Sheet ID not provided' }, { status: 400 });
  }

  try {
    await deleteLead(sheetId, session.accessToken as string, parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE lead error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete lead' }, { status: 500 });
  }
}
