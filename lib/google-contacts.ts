import { google } from 'googleapis';
import { Lead } from './types';
import { adminDb } from './server-firebase';
import { addLeads, updateLeads } from './db-firestore';

export async function getPeopleClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return google.people({ version: 'v1', auth: oauth2Client });
}

/**
 * Fetches contacts from Google People API that have a 6-digit date suffix in their name.
 * Format: DDMMYY (e.g., "Madhuri 170326")
 */
export async function syncGoogleContacts(callerUid: string, triggerType: 'manual' | 'cron') {
  const people = await getPeopleClient();
  
  // Debug: Check which account we are actually syncing
  const me = await people.people.get({
    resourceName: 'people/me',
    personFields: 'emailAddresses',
  });
  const myEmail = me.data.emailAddresses?.[0]?.value;
  console.log(`--- Sync Debug: Authenticated as ${myEmail} ---`);

  const leadsRef = adminDb.collection('leads');
  const pageSize = triggerType === 'manual' ? 10 : 100;
  
  // 1. Fetch recent contacts from "My Contacts"
  // Expanded personFields to include biographies and organizations per GOOGLE_CONTACT_SYNC.md
  const response = await people.people.connections.list({
    resourceName: 'people/me',
    pageSize,
    sortOrder: 'LAST_MODIFIED_DESCENDING',
    personFields: 'names,emailAddresses,phoneNumbers,metadata,biographies,organizations',
  });

  const connections = response.data.connections || [];
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
    const contactId = person.metadata?.sources?.[0]?.id;
    if (!contactId) continue;

    const googleName = person.names?.[0]?.displayName || '';
    const googleBio = person.biographies?.[0]?.value || '';
    const googleOrg = person.organizations?.[0]?.name || '';
    const email = person.emailAddresses?.[0]?.value?.toLowerCase() || '';
    const rawPhone = person.phoneNumbers?.[0]?.value || '';
    const phone = rawPhone.replace(/\D/g, '');

    // Suffix Search: Check Display Name, Biography/Notes, and Organization Name
    const nameMatch = googleName.match(dateSuffixRegex);
    const bioMatch = googleBio.match(dateSuffixRegex);
    const orgMatch = googleOrg.match(dateSuffixRegex);
    
    const match = nameMatch || bioMatch || orgMatch;
    const dateCode = match ? match[1] : null;

    if (dateCode) {
      const cleanName = googleName.replace(dateSuffixRegex, '').trim();
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

  // 3. Save new leads to Firestore
  if (leadsToAdd.length > 0) {
    await addLeads(callerUid, 'admin' as any, leadsToAdd);
  }

  // 4. Update existing leads (Manual Sync only)
  if (leadsToUpdate.length > 0) {
    await updateLeads(callerUid, 'admin' as any, leadsToUpdate);
  }

  return {
    checked: connections.length,
    added: leadsToAdd.length,
    updated: leadsToUpdate.length,
  };
}
