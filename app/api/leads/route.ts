import { NextResponse } from 'next/server';
import { getAllLeads, addLead } from '@/lib/db-sheets';
import { auth } from '@/lib/auth';
import { validateEnv } from '@/lib/env-check';

export async function GET(req: Request) {
  const envStatus = validateEnv();
  if (!envStatus.isValid) {
    return NextResponse.json({ error: 'Server configuration error', details: envStatus.errors }, { status: 500 });
  }

  const session = await auth() as any;
  const sheetId = req.headers.get('x-sheet-id');

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!sheetId) {
    return NextResponse.json({ error: 'Google Sheet ID is not connected. Please go to Settings.' }, { status: 400 });
  }

  try {
    const leads = await getAllLeads(sheetId, session.accessToken as string);
    return NextResponse.json(leads);
  } catch (error: any) {
    console.error('GET leads error:', error);
    const status = error.code === 403 || error.code === 401 ? 403 : 500;
    return NextResponse.json({ 
        error: error.message || 'Failed to fetch leads',
        details: error.code === 404 ? 'Sheet not found. Check your Sheet ID.' : 'Check your Google account permissions.'
    }, { status });
  }
}

export async function POST(req: Request) {
  const envStatus = validateEnv();
  if (!envStatus.isValid) {
      return NextResponse.json({ error: 'Server configuration error', details: envStatus.errors }, { status: 500 });
  }

  const session = await auth() as any;
  const sheetId = req.headers.get('x-sheet-id');

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
