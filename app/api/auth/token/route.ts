import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';

export async function GET() {
  const session = await auth() as any;

  if (!session?.user?.id || session.user.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  return NextResponse.json({
    status: 'disabled',
    details: 'Refresh token retrieval through the browser has been removed for security.',
    instructions: [
      'Store GOOGLE_REFRESH_TOKEN only in server-side environment variables.',
      'Rotate the existing Google refresh token if this endpoint was previously used in production.',
      'Use an admin-only operational workflow to update Vercel environment variables.'
    ],
  });
}
