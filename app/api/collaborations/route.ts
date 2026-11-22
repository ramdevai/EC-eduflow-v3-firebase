import { NextResponse } from 'next/server';
import { collaborationActor, collaborationApiError, readCollaborationJson } from '@/lib/collaboration-api';
import { NewCollaboration } from '@/lib/collaboration-schema';
import { addCollaboration, getCollaborations } from '@/lib/collaborations';

export async function GET() {
  try {
    const actor = await collaborationActor();
    return NextResponse.json({ collaborations: await getCollaborations(actor) });
  } catch (error) {
    return collaborationApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await collaborationActor();
    await addCollaboration(actor, NewCollaboration.parse(await readCollaborationJson(req)));
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return collaborationApiError(error);
  }
}
