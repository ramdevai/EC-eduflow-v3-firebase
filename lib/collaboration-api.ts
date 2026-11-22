import 'server-only';

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from './auth';
import { CollaborationError } from './collaborations';
import { UserRole } from './types';

export async function collaborationActor() {
  const { user } = (await auth()) ?? {};
  if (!user?.id) throw new CollaborationError('Authentication required.', 401);
  if (!user.canManageCollaborations) throw new CollaborationError('Collaboration access required.', 403);
  return { uid: user.id, admin: user.role === UserRole.Admin };
}

export async function readCollaborationJson(req: Request) {
  if (req.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') {
    throw new CollaborationError('Expected JSON.', 415);
  }
  const body = await req.text();
  if (Buffer.byteLength(body) > 4096) throw new CollaborationError('Payload too large.', 413);
  return JSON.parse(body);
}

export function collaborationApiError(error: unknown) {
  if (error instanceof CollaborationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return NextResponse.json({
      error: 'Check the collaboration details. Use 1–24 letters, numbers or hyphens for the code.',
    }, { status: 400 });
  }
  console.error('Collaboration operation failed');
  return NextResponse.json({ error: 'Unable to complete the collaboration request.' }, { status: 500 });
}
