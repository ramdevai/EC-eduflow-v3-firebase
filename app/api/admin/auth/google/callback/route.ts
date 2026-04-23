import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';

export async function GET(req: Request) {
  const session = await auth() as any;

  if (!session?.user?.id || session.user.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${new URL(req.url).origin}/api/admin/auth/google/callback`
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return new Response(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #e11d48;">Warning: No Refresh Token</h1>
            <p>Google did not return a refresh token. This happens if you have already granted consent previously.</p>
            <p>To fix this, please <a href="/api/admin/auth/google">try again</a>. The system is configured to force consent.</p>
            <hr/>
            <p>If it still doesn't work, go to your <a href="https://myaccount.google.com/permissions" target="_blank">Google Account Permissions</a>, remove "EduCompass" (or your App Name), and try again.</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    // Return HTML with the token for the admin to copy
    return new Response(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; line-height: 1.6;">
          <h1 style="color: #059669;">Success!</h1>
          <p>Your Google Refresh Token has been generated. <strong>Copy this immediately</strong> and add it to your <code>GOOGLE_REFRESH_TOKEN</code> environment variable in Vercel.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; border: 1px solid #d1d5db; margin: 20px 0; word-break: break-all; font-family: monospace; font-size: 14px;">
            ${refreshToken}
          </div>

          <p style="color: #6b7280; font-size: 13px;">Security Note: This page is not cached. Once you close this window, you will need to re-run the flow to see the token again.</p>
          
          <button onclick="window.close()" style="background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 20px;">
            Close Window
          </button>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (error: any) {
    console.error('Token exchange error:', error);
    return NextResponse.json({ error: 'Failed to exchange token', details: error.message }, { status: 500 });
  }
}
