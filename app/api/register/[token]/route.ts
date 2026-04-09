import { NextResponse } from 'next/server';
import { getLeadByToken, updateLeads } from '@/lib/db-firestore';
import { UserRole } from '@/lib/types';
import { toInputFormat, safeFormat } from '@/lib/utils';



export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);
  const sid = searchParams.get('sid');
  try {
    const lead = await getLeadByToken(token);

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
  const sidParam = searchParams.get('sid');
  
  try {
    const body = await req.json();
    const lead = await getLeadByToken(token);

    if (!lead) {
      return NextResponse.json({ error: 'Invalid registration link' }, { status: 404 });
    }

    // Update the lead with form data and EXPIRE the token
    const updates = {
        ...body,
        dob: safeFormat(body.dob), // Ensure Indian format in DB
        stage: lead.stage === 'Registration requested' ? 'Registration done' : lead.stage,
        updatedAt: safeFormat(new Date()),
        registrationToken: '' // Clear token so link expires
    };

    await updateLeads('system-registration', UserRole.Admin, [{ id: String(lead.id), data: updates }]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Registration POST failure:', error);
    return NextResponse.json({ 
      error: 'Registration submission failed', 
      details: error.message 
    }, { status: 500 });
  }
}
