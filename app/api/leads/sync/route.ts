import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { syncGoogleContacts } from '@/lib/google-contacts';

export async function POST(req: Request) {
  const session = await auth() as any;

  if (!session?.user?.id || (session?.user?.role !== UserRole.Admin && session?.user?.role !== UserRole.Staff)) {
    return NextResponse.json({ error: 'Unauthorized. Higher privileges required.' }, { status: 401 });
  }

  try {
    const result = await syncGoogleContacts(session.user.id, 'manual');

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Manual Sync Error:', error);
    const message = String(error?.message || '');
    const isQuotaError =
      message.toLowerCase().includes('resource_exhausted') ||
      message.toLowerCase().includes('quota exceeded');

    return NextResponse.json({
      success: false,
      error: isQuotaError
        ? 'Google Contacts quota exceeded. Please wait and try again later.'
        : error.message
    }, { status: 500 });
  }
}
