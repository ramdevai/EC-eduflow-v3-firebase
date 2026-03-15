import { NextResponse } from 'next/server';
import { getAllLeads, addLead } from '@/lib/db-sheets';

export async function GET() {
  try {
    const leads = await getAllLeads();
    return NextResponse.json(leads);
  } catch (error) {
    console.error('GET leads error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await addLead(body);
    return NextResponse.json({ id });
  } catch (error) {
    console.error('POST lead error:', error);
    return NextResponse.json({ error: 'Failed to add lead' }, { status: 500 });
  }
}
