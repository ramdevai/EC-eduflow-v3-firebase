import { google } from 'googleapis';
import { Lead, UserRole } from './types';
import { adminDb } from './server-firebase';
import { addLeads, updateLeads } from './db-firestore';
import { getAdminAuthClient } from './google-auth';
import {
  collectContactsModifiedInWindow,
  extractLeadDate,
  getContactSource,
  GOOGLE_CONTACT_PERSON_FIELDS,
  GoogleContactPerson,
  isLeadDateInCronWindow,
  stripLeadDateSuffix,
} from './google-contacts-core';

const CONTACT_SYNC_STATE_COLLECTION = 'system_sync_state';
const CONTACT_SYNC_STATE_DOC = 'google_contacts_cron';

export async function getPeopleClient() {
  const auth = getAdminAuthClient();
  return google.people({ version: 'v1', auth });
}

/**
 * Fetches contacts from Google People API that have a 6-digit date suffix in their name.
 * Format: DDMMYY (e.g., "Madhuri 170326")
 */
export async function syncGoogleContacts(callerUid: string, triggerType: 'manual' | 'cron') {
  const runStartedAt = new Date();
  const leadsRef = adminDb.collection('leads');
  const syncStateRef = adminDb
    .collection(CONTACT_SYNC_STATE_COLLECTION)
    .doc(CONTACT_SYNC_STATE_DOC);
  let cronWindowStart: Date | null = null;
  let checked = 0;
  let pages = 1;
  let connections: GoogleContactPerson[] = [];

  if (triggerType === 'cron') {
    const stateSnapshot = await syncStateRef.get();
    const lastSuccessfulAtValue = stateSnapshot.data()?.lastSuccessfulAt;
    const lastSuccessfulAt = typeof lastSuccessfulAtValue === 'string'
      ? new Date(lastSuccessfulAtValue)
      : null;

    if (
      !lastSuccessfulAt
      || Number.isNaN(lastSuccessfulAt.getTime())
      || lastSuccessfulAt > runStartedAt
    ) {
      const baseline = runStartedAt.toISOString();
      await syncStateRef.set({
        initializedAt: baseline,
        lastStartedAt: baseline,
        lastCompletedAt: baseline,
        lastSuccessfulAt: baseline,
        checked: 0,
        added: 0,
        updated: 0,
        pages: 0,
      }, { merge: true });

      return {
        checked: 0,
        added: 0,
        updated: 0,
        pages: 0,
        initialized: true,
      };
    }

    cronWindowStart = lastSuccessfulAt;
  }

  const people = await getPeopleClient();

  if (triggerType === 'cron' && cronWindowStart) {
    const result = await collectContactsModifiedInWindow(
      async (params) => {
        const response = await people.people.connections.list(params);
        return {
          data: {
            connections: response.data.connections as GoogleContactPerson[] | undefined,
            nextPageToken: response.data.nextPageToken,
          },
        };
      },
      { fromExclusive: cronWindowStart, toInclusive: runStartedAt },
    );
    connections = result.contacts;
    checked = result.checked;
    pages = result.pages;
  } else {
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 10,
      sortOrder: 'LAST_MODIFIED_DESCENDING',
      personFields: GOOGLE_CONTACT_PERSON_FIELDS,
      sources: ['READ_SOURCE_TYPE_CONTACT'],
    });
    connections = (response.data.connections || []) as GoogleContactPerson[];
    checked = connections.length;
  }

  const leadsToAdd: Partial<Lead>[] = [];
  const leadsToUpdate: { id: string; data: Partial<Lead> }[] = [];
  
  // 2. Get existing Leads to skip duplicates (primarily by Google Contact ID)
  const existingSnapshot = await leadsRef.get();
  const existingLeadsMap = new Map<string, { id: string; data: any }>();

  existingSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.googleContactId) {
      existingLeadsMap.set(data.googleContactId, { id: doc.id, data });
    }
  });

  const dateSuffixRegex = /\s+(\d{6})$/;

  for (const person of connections) {
    const contactId = getContactSource(person)?.id;
    if (!contactId) continue;

    const googleName = person.names?.[0]?.displayName || '';
    const googleBio = person.biographies?.[0]?.value || '';
    const googleOrg = person.organizations?.[0]?.name || '';
    const email = person.emailAddresses?.[0]?.value?.toLowerCase() || '';
    const rawPhone = person.phoneNumbers?.[0]?.value || '';
    // Suffix Search: Check Display Name, Biography/Notes, and Organization Name
    const nameMatch = googleName.match(dateSuffixRegex);
    const bioMatch = googleBio.match(dateSuffixRegex);
    const orgMatch = googleOrg.match(dateSuffixRegex);
    
    const match = nameMatch || bioMatch || orgMatch;
    let dateCode = match ? match[1] : null;

    if (triggerType === 'cron' && cronWindowStart) {
      const leadDate = extractLeadDate(person);
      if (!leadDate || !isLeadDateInCronWindow(leadDate.isoDate, cronWindowStart, runStartedAt)) {
        continue;
      }
      dateCode = leadDate.code;
    }

    if (dateCode) {
      const cleanName = stripLeadDateSuffix(googleName);
      const leadData: Partial<Lead> = {
        name: cleanName,
        email,
        phone: rawPhone,
        googleContactId: contactId,
        source: 'Google Contacts',
        notes: `Imported/Updated from Google Contacts via date suffix: ${dateCode}`,
      };

      const existing = existingLeadsMap.get(contactId);

      if (existing) {
        // If Manual Sync: Update existing lead if data changed
        if (triggerType === 'manual') {
          const hasChanged = 
            existing.data.name !== leadData.name || 
            existing.data.email !== leadData.email || 
            existing.data.phone !== leadData.phone;

          if (hasChanged) {
            leadsToUpdate.push({ id: existing.id, data: leadData });
          }
        }
        // If Cron Sync: The lead is skipped (no updates performed in automated mode)
        continue;
      } else {
        // New Identifier: Lead is added as a new entry
        leadsToAdd.push(leadData);
      }
    }
  }

  // 3. Save new leads to Firestore (use caller role for proper ownership)
  if (leadsToAdd.length > 0) {
    await addLeads(callerUid, UserRole.Staff as any, leadsToAdd); // Staff can add leads
  }

  // 4. Update existing leads (Manual Sync only)
  if (leadsToUpdate.length > 0) {
    await updateLeads(callerUid, UserRole.Staff as any, leadsToUpdate);
  }

  if (triggerType === 'cron') {
    await syncStateRef.set({
      lastStartedAt: runStartedAt.toISOString(),
      lastCompletedAt: new Date().toISOString(),
      lastSuccessfulAt: runStartedAt.toISOString(),
      checked,
      added: leadsToAdd.length,
      updated: leadsToUpdate.length,
      pages,
    }, { merge: true });
  }

  return {
    checked,
    added: leadsToAdd.length,
    updated: leadsToUpdate.length,
    pages,
    initialized: false,
  };
}
