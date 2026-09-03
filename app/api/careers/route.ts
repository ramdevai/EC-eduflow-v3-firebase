import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createCareer, getCareers } from '@/lib/db-firestore';
import { Career, UserRole } from '@/lib/types';

const CAREER_COLORS: Career['color'][] = ['indigo', 'green', 'amber', 'sky', 'slate'];

export async function GET() {
  const session = await auth() as any;
  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const careers = await getCareers();
    return NextResponse.json({ careers });
  } catch (error: any) {
    console.error('GET careers error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to fetch careers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth() as any;
  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (
      typeof body?.name !== 'string' ||
      typeof body?.area !== 'string' ||
      typeof body?.description !== 'string' ||
      !CAREER_COLORS.includes(body?.color)
    ) {
      return NextResponse.json({ error: 'Invalid career details' }, { status: 400 });
    }

    const career = await createCareer({
      name: body.name,
      area: body.area,
      color: body.color,
      description: body.description,
    });
    return NextResponse.json({ career }, { status: 201 });
  } catch (error: any) {
    console.error('POST careers error:', error.message);
    const message = error.message || 'Failed to create career';
    const status = message.includes('already exists') ? 409 : message.includes('required') || message.includes('Invalid') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
