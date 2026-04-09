import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';

export async function POST(req: Request) {
  const session = await auth() as any;

  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: "Lead import functionality via Google Sheets is deprecated and no longer active.",
    imported: 0,
    skipped: 0,
  }, { status: 200 });
}
