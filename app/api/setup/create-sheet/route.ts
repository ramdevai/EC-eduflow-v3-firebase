import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { validateEnv } from '@/lib/env-check';

export async function POST(req: Request) {
  const envStatus = validateEnv();
  if (!envStatus.isValid) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const session = await auth() as any;

  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
  }

  // This route previously created a new Google Sheet workspace.
  // With the migration to Firestore, this functionality is deprecated and no longer active.
  return NextResponse.json({
    success: true,
    message: "Google Sheets workspace creation is deprecated and no longer active. Data is now managed in Firestore.",
    sheetId: null,
  }, { status: 200 });
}
