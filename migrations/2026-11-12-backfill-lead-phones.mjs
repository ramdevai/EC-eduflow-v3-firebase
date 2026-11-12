import { FieldPath } from 'firebase-admin/firestore';
import { normalizeLeadPhone } from '../lib/normalize-lead-phone.mjs';

const id = '2026-11-12-backfill-lead-phones';
const pageSize = 200;

function classifyPhone(phone) {
  if (phone == null || (typeof phone === 'string' && !phone.trim())) {
    return { kind: 'missing' };
  }

  const normalized = typeof phone === 'string' ? normalizeLeadPhone(phone) : null;
  return normalized ? { kind: 'valid', normalized } : { kind: 'invalid' };
}

function pageAfter(query, lastId) {
  return lastId ? query.startAfter(lastId) : query;
}

export default {
  id,
  description: 'Backfill normalized primary phones for existing CRM records.',
  async run({ db, dryRun, log }) {
    const query = db.collection('leads')
      .select('phone', 'phoneNormalized')
      .orderBy(FieldPath.documentId())
      .limit(pageSize);

    if (dryRun) {
      const totals = { total: 0, valid: 0, invalid: 0, missing: 0, proposedChanges: 0, relatedGroups: 0 };
      const groupCounts = new Map();
      let lastId;

      for (;;) {
        const page = await pageAfter(query, lastId).get();
        for (const doc of page.docs) {
          const phone = classifyPhone(doc.get('phone'));
          totals.total += 1;
          totals[phone.kind] += 1;
          if (phone.kind === 'valid') {
            if (doc.get('phoneNormalized') !== phone.normalized) totals.proposedChanges += 1;
            const count = (groupCounts.get(phone.normalized) ?? 0) + 1;
            groupCounts.set(phone.normalized, count);
            if (count === 2) totals.relatedGroups += 1;
          }
        }
        if (page.size < pageSize) break;
        lastId = page.docs.at(-1).id;
      }
      log(JSON.stringify(totals));
      return;
    }

    const checkpoint = db.collection('_migrations').doc(id).collection('progress').doc('backfill');
    let totalUpdated = 0;
    for (;;) {
      const result = await db.runTransaction(async transaction => {
        const progress = await transaction.get(checkpoint);
        if (progress.get('complete') === true) return { complete: true, updated: 0 };

        const page = await transaction.get(pageAfter(query, progress.get('lastId')));
        let updated = 0;
        for (const doc of page.docs) {
          const phone = classifyPhone(doc.get('phone'));
          if (phone.kind === 'valid' && doc.get('phoneNormalized') !== phone.normalized) {
            transaction.update(doc.ref, { phoneNormalized: phone.normalized });
            updated += 1;
          }
        }

        const complete = page.size < pageSize;
        transaction.set(checkpoint, {
          lastId: page.docs.at(-1)?.id ?? progress.get('lastId') ?? null,
          complete,
        });
        return { complete, updated };
      });
      totalUpdated += result.updated;
      if (result.complete) break;
    }
    log(JSON.stringify({ updatedThisRun: totalUpdated }));
  },
};
