import { readFileSync } from 'node:fs';
import { google } from 'googleapis';
import {
  PRODUCTION_PROJECT_ID,
  createLocalFirestore,
  createProductionFirestore,
} from './firestore-admin.mjs';
import { planPrimaryContactRecovery } from './contact-recovery-core.mjs';

const args = process.argv.slice(2);
const hasArg = (name) => args.includes(name);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const production = hasArg('--production');
const apply = hasArg('--apply');
const confirmedFullApply = hasArg('--confirm-full-apply');
const pilotIds = new Set((getArg('--pilot') || '').split(',').map((value) => value.trim()).filter(Boolean));

if (apply && pilotIds.size === 0 && !confirmedFullApply) {
  throw new Error('Apply requires explicit --pilot lead-id[,lead-id] or --confirm-full-apply.');
}
if (confirmedFullApply && !apply) {
  throw new Error('--confirm-full-apply is valid only with --apply.');
}
if (production && apply && process.env.CONFIRM_FIREBASE_PROJECT !== PRODUCTION_PROJECT_ID) {
  throw new Error(`Production apply requires CONFIRM_FIREBASE_PROJECT=${PRODUCTION_PROJECT_ID}.`);
}

const db = production ? createProductionFirestore() : createLocalFirestore();

async function getProductionContacts() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Production recovery requires Google client ID, client secret, and refresh token.');
  }

  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  const people = google.people({ version: 'v1', auth });
  const contacts = [];
  let pageToken;

  do {
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      pageToken,
      personFields: 'names,emailAddresses,phoneNumbers,metadata,biographies,organizations',
    });
    for (const person of response.data.connections || []) {
      const googleContactId = person.metadata?.sources?.find((source) => source.id)?.id;
      if (!googleContactId) continue;
      const rawName = person.names?.[0]?.displayName || '';
      contacts.push({
        googleContactId,
        rawName,
        name: rawName.replace(/\s+\d{6}$/, '').trim(),
        phone: person.phoneNumbers?.[0]?.value || '',
        email: person.emailAddresses?.[0]?.value?.toLowerCase() || '',
        biography: person.biographies?.[0]?.value || '',
        organization: person.organizations?.[0]?.name || '',
      });
    }
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return contacts;
}

function getLocalContacts() {
  const fixturePath = getArg('--contacts-fixture')
    || new URL('./fixtures/google-contacts-recovery.json', import.meta.url);
  return JSON.parse(readFileSync(fixturePath, 'utf8'));
}

const [leadSnapshot, contacts] = await Promise.all([
  db.collection('leads').get(),
  production ? getProductionContacts() : Promise.resolve(getLocalContacts()),
]);
const leads = leadSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
const report = planPrimaryContactRecovery(leads, contacts, new Date().toISOString());
const planned = [...report.recoverable, ...report.partial];
const selected = pilotIds.size > 0
  ? planned.filter((item) => pilotIds.has(item.id))
  : planned;

if (pilotIds.size > 0) {
  const plannedIds = new Set(planned.map((item) => item.id));
  const alreadyRecoveredIds = new Set(
    report.skipped
      .filter((item) => item.reason === 'student fields already populated or recovery already recorded')
      .map((item) => item.id)
  );
  const invalidPilotIds = [...pilotIds].filter(
    (id) => !plannedIds.has(id) && !alreadyRecoveredIds.has(id)
  );
  if (invalidPilotIds.length > 0) {
    throw new Error(`Pilot IDs are not recoverable candidates: ${invalidPilotIds.join(', ')}`);
  }
}

if (apply) {
  for (const item of selected) {
    await db.collection('leads').doc(item.id).update(item.updates);
  }
}

console.log(JSON.stringify({
  environment: production ? 'production' : 'local',
  mode: apply ? 'apply' : 'dry-run',
  selected: selected.map((item) => item.id),
  counts: {
    recoverable: report.recoverable.length,
    partial: report.partial.length,
    unmatched: report.unmatched.length,
    skipped: report.skipped.length,
    changed: apply ? selected.length : 0,
  },
  report,
}, null, 2));
