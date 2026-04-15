import { NextResponse } from 'next/server';
import { consumeRegistrationLink, getLeadByRegistrationAccess } from '@/lib/db-firestore';
import { toInputFormat, safeFormat } from '@/lib/utils';

const ALLOWED_REGISTRATION_FIELDS = [
  'name',
  'phone',
  'email',
  'grade',
  'board',
  'address',
  'dob',
  'gender',
  'school',
  'hobbies',
  'fatherName',
  'fatherPhone',
  'fatherEmail',
  'fatherOccupation',
  'motherName',
  'motherPhone',
  'motherEmail',
  'motherOccupation',
  'source',
  'comments',
  'privacy_consent',
  'privacy_consent_date',
] as const;

function pickRegistrationUpdates(body: Record<string, unknown>) {
  const updates: Record<string, unknown> = {};

  for (const field of ALLOWED_REGISTRATION_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field];
    }
  }

  return updates;
}

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
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        grade: lead.grade,
        board: lead.board,
        address: lead.address,
        dob: toInputFormat(lead.dob),
        gender: lead.gender,
        school: lead.school,
        hobbies: lead.hobbies,
        fatherName: lead.fatherName,
        fatherPhone: lead.fatherPhone,
        fatherEmail: lead.fatherEmail,
        fatherOccupation: lead.fatherOccupation,
        motherName: lead.motherName,
        motherPhone: lead.motherPhone,
        motherEmail: lead.motherEmail,
        motherOccupation: lead.motherOccupation,
        source: lead.source,
        comments: lead.comments,
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
    const updates = {
        ...pickRegistrationUpdates(body),
        dob: typeof body.dob === 'string' ? safeFormat(body.dob) : lead.dob || '',
        stage: lead.stage === 'Registration requested' ? 'Registration done' : lead.stage,
    };

    await consumeRegistrationLink(token, sid, updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Registration POST failure:', error);
    return NextResponse.json({ 
      error: 'Registration submission failed', 
      details: error.message 
    }, { status: 500 });
  }
}
