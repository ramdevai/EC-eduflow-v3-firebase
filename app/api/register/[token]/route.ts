import { NextResponse } from 'next/server';
import { consumeRegistrationLink, getLeadByRegistrationAccess } from '@/lib/db-firestore';
import { toInputFormat } from '@/lib/utils';
import { buildRegistrationUpdates, getPublicRegistrationData } from '@/lib/registration';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);
  const sid = searchParams.get('sid');
  try {
    const lead = await getLeadByRegistrationAccess(token, sid);

    if (!lead) {
      return NextResponse.json({ error: 'Invalid or expired registration link' }, { status: 404 });
    }

    // Return only necessary fields for pre-filling
    return NextResponse.json({
      ...getPublicRegistrationData(lead),
      dob: toInputFormat(lead.dob),
    });
  } catch (error: any) {
    console.error('Registration GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);
  const sid = searchParams.get('sid');
  
  try {
    const body = await req.json() as Record<string, unknown>;
    const lead = await getLeadByRegistrationAccess(token, sid);

    if (!lead) {
      return NextResponse.json({ error: 'Invalid registration link' }, { status: 404 });
    }

    // Update the lead with form data and EXPIRE the token
    const updates = buildRegistrationUpdates(body, lead);

    await consumeRegistrationLink(token, sid, updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Registration POST failure:', error);
    const isValidationError = String(error.message).endsWith('is required');
    return NextResponse.json({
      error: 'Registration submission failed',
      details: error.message
    }, { status: isValidationError ? 400 : 500 });
  }
}
