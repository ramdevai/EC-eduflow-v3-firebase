import 'server-only';

import { randomUUID } from 'node:crypto';
import { FieldPath } from 'firebase-admin/firestore';
import type { z } from 'zod';
import { adminDb } from './server-firebase';
import type { Collaboration, CollaborationChange, NewCollaboration } from './collaboration-schema';
import { mapDocToLead } from './db-firestore';

type Actor = { uid: string; admin: boolean };

export class CollaborationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const campaigns = () => adminDb.collection('collaborations');
const codes = () => adminDb.collection('collaborationCodes');
const campaignLeads = (id: string) => adminDb.collection('leads').where('collaborationId', '==', id);

function readCampaign(snapshot: FirebaseFirestore.DocumentSnapshot): Collaboration | undefined {
  if (snapshot.exists) return { ...snapshot.data(), id: snapshot.id } as Collaboration;
}

function requireCampaign(snapshot: FirebaseFirestore.DocumentSnapshot, actor: Actor): Collaboration {
  const campaign = readCampaign(snapshot);
  if (!campaign || (!actor.admin && campaign.ownerUid !== actor.uid)) {
    throw new CollaborationError('Collaboration not found.', 404);
  }
  return campaign;
}

export async function getCollaborations(actor: Actor) {
  const query = actor.admin ? campaigns() : campaigns().where('ownerUid', '==', actor.uid);
  const snapshot = await query.get();
  const rows = snapshot.docs.map(doc => readCampaign(doc)!);
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return Promise.all(rows.map(async campaign => ({
    ...campaign,
    leadCount: (await campaignLeads(campaign.id).count().get()).data().count,
  })));
}

export async function addCollaboration(actor: Actor, details: z.infer<typeof NewCollaboration>) {
  const id = randomUUID();
  const codeRef = codes().doc(details.code);
  const campaign: Collaboration = {
    ...details, id, ownerUid: actor.uid, status: 'Draft', revision: 1, updatedAt: new Date().toISOString(),
  };
  await adminDb.runTransaction(async transaction => {
    if ((await transaction.get(codeRef)).exists) {
      throw new CollaborationError('That code is already in use. Choose a unique code.', 409);
    }
    transaction.create(campaigns().doc(id), campaign);
    transaction.create(codeRef, { collaborationId: id });
  });
}

export async function changeCollaboration(actor: Actor, id: string, change: z.infer<typeof CollaborationChange>) {
  const ref = campaigns().doc(id);
  await adminDb.runTransaction(async transaction => {
    const current = requireCampaign(await transaction.get(ref), actor);
    if (change.revision !== current.revision) {
      throw new CollaborationError('This collaboration has changed. Refresh before saving.', 409);
    }
    if (current.status === 'Closed') throw new CollaborationError('This collaboration is closed.', 409);
    const updates = change.action === 'save' ? change.details : {
      status: change.action === 'launch' ? 'Active' : 'Closed',
    };
    if ((change.action === 'launch' && current.status !== 'Draft') ||
        (change.action === 'close' && current.status !== 'Active')) {
      throw new CollaborationError('This action is unavailable for the current status.', 409);
    }
    transaction.update(ref, { ...updates, revision: current.revision + 1, updatedAt: new Date().toISOString() });
  });
}

export async function readPublicCollaboration(id: string) {
  const campaign = readCampaign(await campaigns().doc(id).get());
  if (campaign?.status !== 'Active') return null;
  return { title: campaign.title, intro: campaign.intro, collaborator: campaign.collaborator };
}

export async function resolveCollaboration(transaction: FirebaseFirestore.Transaction, code: string) {
  const entry = await transaction.get(codes().doc(code));
  const id = entry.data()?.collaborationId;
  if (!id) return null;
  const campaign = readCampaign(await transaction.get(campaigns().doc(id)));
  return campaign?.status === 'Active' ? campaign : null;
}

export async function getCollaborationLeads(actor: Actor, id: string, after?: string) {
  requireCampaign(await campaigns().doc(id).get(), actor);
  const query = campaignLeads(id).orderBy(FieldPath.documentId());
  const pageSize = 25;
  const snapshot = await (after ? query.startAfter(after) : query).limit(pageSize + 1).get();
  const leads = snapshot.docs.slice(0, pageSize).map(doc => {
    const { name, studentName, stage, inquiryDate } = doc.data();
    return { id: doc.id, name, studentName, stage, inquiryDate };
  });
  return { leads, next: snapshot.size > pageSize ? leads.at(-1)?.id : undefined };
}

export async function openCollaborationLead(actor: Actor, id: string, leadId: string) {
  requireCampaign(await campaigns().doc(id).get(), actor);
  const doc = await adminDb.collection('leads').doc(leadId).get();
  const data = doc.data();
  if (data?.collaborationId !== id) throw new CollaborationError('Lead not found.', 404);
  return mapDocToLead({ ...data, id: doc.id });
}
