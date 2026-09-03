import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateCareer } from '@/lib/db-firestore';
import { Career, UserRole } from '@/lib/types';

const CAREER_COLORS: Career['color'][] = ['indigo', 'green', 'amber', 'sky', 'slate'];
const CAREER_STATUSES: Career['status'][] = ['active', 'archived'];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ careerId: string }> }
) {
  const session = await auth() as any;
  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { careerId } = await params;

  try {
    const body = await req.json();
    const updates: Partial<Pick<Career, 'name' | 'area' | 'color' | 'description' | 'status'>> = {};

    if (body?.name !== undefined) {
      if (typeof body.name !== 'string') return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      updates.name = body.name;
    }
    if (body?.area !== undefined) {
      if (typeof body.area !== 'string') return NextResponse.json({ error: 'Invalid area' }, { status: 400 });
      updates.area = body.area;
    }
    if (body?.color !== undefined) {
      if (!CAREER_COLORS.includes(body.color)) return NextResponse.json({ error: 'Invalid color' }, { status: 400 });
      updates.color = body.color;
    }
    if (body?.description !== undefined) {
      if (typeof body.description !== 'string') return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
      updates.description = body.description;
    }
    if (body?.status !== undefined) {
      if (!CAREER_STATUSES.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      updates.status = body.status;
    }

    const career = await updateCareer(careerId, updates);
    return NextResponse.json({ career });
  } catch (error: any) {
    console.error('PATCH career error:', error.message);
    const message = error.message || 'Failed to update career';
    const isValidationMessage = message.includes('required') || message.includes('Invalid') || message.includes('must be');
    const status = message.includes('not found') ? 404 : isValidationMessage ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
