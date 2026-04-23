import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';

export async function GET() {
  const session = await auth() as any;

  if (!session?.user?.id || session.user.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  return NextResponse.json({
    status: 'enabled',
    details: 'Administrative refresh token generation is available via the settings panel.',
    instructions: [
      'Navigate to System Settings > Integrations.',
      'Click "Generate Refresh Token" to initiate the OAuth flow.',
      'Copy the resulting token and update GOOGLE_REFRESH_TOKEN in your environment.',
      'Only accessible to Admin users.'
    ],
    actionUrl: '/api/admin/auth/google'
  });
}
