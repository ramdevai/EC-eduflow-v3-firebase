import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { getAdminAuthClient } from '@/lib/google-auth';
import { google } from 'googleapis';

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const authClient = getAdminAuthClient();
    
    // 1. Check Auth Status (Access Token Refresh)
    const { token } = await authClient.getAccessToken();
    if (!token) throw new Error('Failed to retrieve access token');

    // 2. Fetch basic profile info to verify identity
    const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
    const userInfo = await oauth2.userinfo.get();

    return NextResponse.json({
      status: 'healthy',
      authorizedEmail: userInfo.data.email || 'Admin Account',
      services: {
        calendar: 'Connected',
        contacts: 'Connected',
        identity: 'Connected'
      }
    });
  } catch (error: any) {
    console.error('Admin Status Check Failure:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error.message || 'Connection failed' 
    }, { status: 500 });
  }
}
