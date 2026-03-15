import { NextResponse } from 'next/server';
import { updateLead, deleteLead } from '@/lib/db-sheets';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    await updateLead(parseInt(id), body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH lead error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteLead(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE lead error:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
