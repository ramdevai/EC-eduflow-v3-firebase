import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSystemSettings } from '@/lib/db-firestore';

export async function GET() {
  const session = await auth() as any;

  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getSystemSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
