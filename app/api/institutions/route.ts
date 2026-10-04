import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { addInstitution, getInstitutions } from '@/lib/db-firestore';
import { UserRole } from '@/lib/types';

export async function GET() {
  const session = await auth() as any;
  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const institutions = await getInstitutions();
    return NextResponse.json({ institutions });
  } catch (error: any) {
    console.error('GET institutions error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to fetch institutions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth() as any;
  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (session.user.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  try {
    const body = await req.json();
    if (typeof body?.name !== 'string') {
      return NextResponse.json({ error: 'Institution name is required' }, { status: 400 });
    }

    const institution = await addInstitution({
      name: body.name,
      campus: body.campus,
      address: body.address,
      status: body.status,
      contacts: body.contacts,
    });
    return NextResponse.json({ institution }, { status: 201 });
  } catch (error: any) {
    console.error('POST institutions error:', error.message);
    const message = error.message || 'Failed to create institution';
    const status = message.includes('required') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
