import { NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { getLeadByToken, updateLead } from '@/lib/db-sheets';
import { google } from 'googleapis';
import { toInputFormat, safeFormat } from '@/lib/utils';

async function getSystemAccessToken() {
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!refreshToken || refreshToken === 'placeholder') {
        throw new Error('System sync not configured (Refresh Token missing)');
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const { token } = await oauth2Client.getAccessToken();
        if (!token) throw new Error('Failed to refresh system token');
        return token;
    } catch (error: any) {
        if (error.message?.includes('invalid_grant')) {
            throw new Error('System sync expired (invalid_grant). The administrator needs to re-authenticate.');
        }
        throw error;
    }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);
  const sid = searchParams.get('sid');
  const sheetId = sid || process.env.GOOGLE_SHEET_ID;

  if (!sheetId || sheetId === 'placeholder') {
    return NextResponse.json({ 
        error: 'Registration form link is missing its context (Sheet ID).', 
        details: 'GOOGLE_SHEET_ID is missing in .env and no sid was provided in the URL.' 
    }, { status: 400 });
  }

  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken || refreshToken === 'placeholder') {
    return NextResponse.json({ 
        error: 'System not configured', 
        details: 'GOOGLE_REFRESH_TOKEN is missing in .env.local on the server.' 
    }, { status: 500 });
  }

  try {
    const accessToken = await getSystemAccessToken();
    const lead = await getLeadByToken(sheetId, accessToken, token);

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
    const sheetId = sidParam || body.sid || process.env.GOOGLE_SHEET_ID;

    if (!sheetId || sheetId === 'placeholder') {
      return NextResponse.json({ error: 'System not configured. Missing Sheet ID.' }, { status: 500 });
    }

    const accessToken = await getSystemAccessToken();
    const lead = await getLeadByToken(sheetId, accessToken, token);

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

    await updateLead(sheetId, accessToken, lead.id, updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Registration POST failure:', error);
    return NextResponse.json({ 
      error: 'Registration submission failed', 
      details: error.message 
    }, { status: 500 });
  }
}
