import { NextResponse } from 'next/server';
import { getAllLeads, addLeads } from '@/lib/db-firestore';
import { UserRole } from '@/lib/types';
import { auth } from '@/lib/auth';
import { validateEnv } from '@/lib/env-check';

export async function GET(req: Request) {
  const envStatus = validateEnv();
  if (!envStatus.isValid) {
    return NextResponse.json({ error: 'Server configuration error', details: envStatus.errors }, { status: 500 });
  }

  const session = await auth() as any;

  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const leads = await getAllLeads(session.user.id, session.user.role as UserRole);
    return NextResponse.json(leads);
  } catch (error: any) {
    console.error('GET leads error:', error);
    const status = error.code === 403 || error.code === 401 ? 403 : 500;
    return NextResponse.json({ 
        error: error.message || 'Failed to fetch leads',
        details: error.message
    }, { status });
  }
}

export async function POST(req: Request) {
  const envStatus = validateEnv();
  if (!envStatus.isValid) {
      return NextResponse.json({ error: 'Server configuration error', details: envStatus.errors }, { status: 500 });
  }

  const session = await auth() as any;

  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const ids = await addLeads(session.user.id, session.user.role as UserRole, [body]);
    return NextResponse.json({ id: ids[0] });
  } catch (error: any) {
    console.error('POST lead error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add lead' }, { status: 500 });
  }
}
