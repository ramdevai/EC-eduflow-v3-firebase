import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';

export async function GET(req: Request) {
  const session = await auth() as any;

  if (!session?.user?.id || session.user.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${new URL(req.url).origin}/api/admin/auth/google/callback`
  );

  const scopes = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/contacts.readonly',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/spreadsheets'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });

  return NextResponse.redirect(url);
}
