import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth() as any;

  if (!session) {
    return new Response('Unauthorized. Please sign in to the CRM first.', { status: 401 });
  }

  return NextResponse.json({
    instructions: "COPY THESE VALUES TO YOUR .env.local FILE",
    GOOGLE_REFRESH_TOKEN: session.refreshToken || "NOT_FOUND_RE_LOGIN_AND_CLICK_ALLOW",
    GOOGLE_SHEET_ID: "Pasted from your Preferences",
    tip: "If Refresh Token is 'NOT_FOUND', please Sign Out and Sign In again, ensuring you click 'Allow' on all permissions."
  });
}
