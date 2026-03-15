import { NextResponse } from 'next/server';
import { getAllLeads, addLead } from '@/lib/db-sheets';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await auth() as any;
  const sheetId = req.headers.get('x-sheet-id');

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sheetId) {
    return NextResponse.json({ error: 'Sheet ID not provided' }, { status: 400 });
  }

  try {
    const leads = await getAllLeads(sheetId, session.accessToken as string);
    return NextResponse.json(leads);
  } catch (error: any) {
    console.error('GET leads error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth() as any;
  const sheetId = req.headers.get('x-sheet-id');

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sheetId) {
    return NextResponse.json({ error: 'Sheet ID not provided' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const id = await addLead(sheetId, session.accessToken as string, body);
    return NextResponse.json({ id });
  } catch (error: any) {
    console.error('POST lead error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add lead' }, { status: 500 });
  }
}
