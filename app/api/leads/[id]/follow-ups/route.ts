import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { FollowUpError, getFollowUps, recordFollowUp } from '@/lib/server-follow-ups';

function errorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Invalid follow-up' }, { status: 400 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  if (error instanceof FollowUpError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('Follow-up request failed');
  return NextResponse.json({ error: 'Unable to save or load follow-ups. Please retry.' }, { status: 500 });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const { id } = await params;
    const before = new URL(req.url).searchParams.get('before') || undefined;
    return NextResponse.json(await getFollowUps(session.user.id, session.user.role as UserRole, id, before));
  } catch (error) { return errorResponse(error); }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const { id } = await params;
    return NextResponse.json(await recordFollowUp(session.user.id, session.user.role as UserRole, session.user.name || '', id, await req.json()), { status: 201 });
  } catch (error) { return errorResponse(error); }
}
