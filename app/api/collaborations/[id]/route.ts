import { NextResponse } from 'next/server';
import { z } from 'zod';
import { collaborationActor, collaborationApiError, readCollaborationJson } from '@/lib/collaboration-api';
import { CollaborationChange, CollaborationId } from '@/lib/collaboration-schema';
import { changeCollaboration, getCollaborationLeads, openCollaborationLead } from '@/lib/collaborations';

type Context = { params: Promise<{ id: string }> };
const LeadId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

export async function GET(req: Request, { params }: Context) {
  try {
    const actor = await collaborationActor();
    const id = CollaborationId.parse((await params).id);
    const { searchParams } = new URL(req.url);
    const lead = searchParams.get('lead');
    const after = LeadId.optional().parse(searchParams.get('after') ?? undefined);
    if (lead) return NextResponse.json({ lead: await openCollaborationLead(actor, id, LeadId.parse(lead)) });
    return NextResponse.json(await getCollaborationLeads(actor, id, after));
  } catch (error) {
    return collaborationApiError(error);
  }
}

export async function PATCH(req: Request, { params }: Context) {
  try {
    const actor = await collaborationActor();
    const id = CollaborationId.parse((await params).id);
    await changeCollaboration(actor, id, CollaborationChange.parse(await readCollaborationJson(req)));
    return NextResponse.json({ success: true });
  } catch (error) {
    return collaborationApiError(error);
  }
}
