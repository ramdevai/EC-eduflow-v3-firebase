import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { validateEnv } from '@/lib/env-check';

export async function GET(req: Request) {
  const session = await auth() as any;

  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
  }

  // This route previously provided debug information for Google Contacts synchronization.
  // With the migration to Firestore, this functionality is deprecated and no longer active.
  return NextResponse.json({
    success: true,
    message: "Google Contacts synchronization debugging is deprecated and no longer active.",
    query: '',
    totalFound: 0,
    results: [],
  }, { status: 200 });
}
