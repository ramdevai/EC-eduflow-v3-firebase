import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { syncGoogleContacts } from '@/lib/google-contacts';

export async function POST(req: Request) {
  const session = await auth() as any;

  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
  }

  try {
    const result = await syncGoogleContacts(session.user.id, 'manual');

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Manual Sync Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
