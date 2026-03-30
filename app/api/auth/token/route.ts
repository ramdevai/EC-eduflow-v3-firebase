import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth() as any;

  if (!session) {
    return new Response('Unauthorized. Please sign in to the CRM first.', { status: 401 });
  }

  return NextResponse.json({
    status: "Action Required",
    details: "Copy these values and update them on the Vercel Dashboard (Settings > Environment Variables)",
    GOOGLE_REFRESH_TOKEN: {
        label: "GOOGLE_REFRESH_TOKEN",
        value: session.refreshToken || "NOT_FOUND_RE_LOGIN_AND_CLICK_ALLOW",
        action: "Copy the value below and paste into Vercel"
    },
    GOOGLE_SHEET_ID: {
        label: "GOOGLE_SHEET_ID",
        value: "Check your CRM preferences if you need this"
    },
    instructions: [
        "1. Copy the value above.",
        "2. Go to Vercel > EduCompass CRM project.",
        "3. Go to Settings > Environment Variables.",
        "4. Find GOOGLE_REFRESH_TOKEN and click Edit.",
        "5. Paste the new value and Save.",
        "6. IMPORTANT: Re-deploy the app for changes to take effect."
    ],
    tip: "If Refresh Token is 'NOT_FOUND', please Sign Out of the CRM and Sign In again, ensuring you click 'Allow' on all requested permissions."
  });
}
