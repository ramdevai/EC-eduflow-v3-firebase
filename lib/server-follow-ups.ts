import 'server-only';
import { adminDb } from './server-firebase';
import { FollowUpEntry, FollowUpSummary, followUpSchema, nextFollowUpSummary } from './follow-ups';
import { UserRole } from './types';

export class FollowUpError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function assertAccess(uid: string, role: UserRole, leadId: string) {
  if (!uid || ![UserRole.Admin, UserRole.Staff].includes(role)) throw new FollowUpError('Access denied', 403);
  if (!leadId || leadId.includes('/')) throw new FollowUpError('Invalid lead', 400);
}

function summaryFrom(data: FirebaseFirestore.DocumentData): FollowUpSummary {
  return {
    followUpCount: data.followUpCount || 0,
    lastFollowUp: data.lastFollowUp || '',
    lastFollowUpOutcome: data.lastFollowUpOutcome || '',
    nextFollowUpDate: data.nextFollowUpDate || '',
  };
}

export async function getFollowUps(uid: string, role: UserRole, leadId: string, before?: string) {
  assertAccess(uid, role, leadId);
  const leadRef = adminDb.collection('leads').doc(leadId);
  const lead = await leadRef.get();
  if (!lead.exists) throw new FollowUpError('Lead not found', 404);
  let query = leadRef.collection('followUps').orderBy('happenedAt', 'desc').limit(51);
  if (before) {
    if (before.includes('/')) throw new FollowUpError('Invalid history cursor', 400);
    const cursor = await leadRef.collection('followUps').doc(before).get();
    if (!cursor.exists) throw new FollowUpError('Invalid history cursor', 400);
    query = query.startAfter(cursor);
  }
  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, 50);
  return {
    entries: docs.map(doc => ({ ...doc.data(), id: doc.id } as FollowUpEntry)),
    summary: summaryFrom(lead.data()!),
    nextCursor: snapshot.size > 50 ? docs[docs.length - 1].id : null,
  };
}

export async function recordFollowUp(uid: string, role: UserRole, name: string, leadId: string, body: unknown) {
  assertAccess(uid, role, leadId);
  const input = followUpSchema.parse(body);
  const leadRef = adminDb.collection('leads').doc(leadId);
  const entryRef = leadRef.collection('followUps').doc(input.requestId);
  return adminDb.runTransaction(async transaction => {
    const [lead, existing] = await transaction.getAll(leadRef, entryRef);
    if (!lead.exists) throw new FollowUpError('Lead not found', 404);
    if (existing.exists) {
      if (existing.data()?.recordedBy !== uid) throw new FollowUpError('Contact record already exists', 409);
      return { entry: { ...existing.data(), id: existing.id } as FollowUpEntry, summary: summaryFrom(lead.data()!) };
    }
    const { requestId, ...details } = input;
    const entry: FollowUpEntry = {
      ...details, happenedAt: new Date(details.happenedAt).toISOString(),
      id: requestId, recordedAt: new Date().toISOString(), recordedBy: uid, recordedByName: name || 'Staff',
    };
    const summary = nextFollowUpSummary(summaryFrom(lead.data()!), input);
    summary.lastFollowUp = new Date(summary.lastFollowUp).toISOString();
    transaction.create(entryRef, entry);
    transaction.update(leadRef, { ...summary, updatedAt: entry.recordedAt });
    return { entry, summary };
  });
}
