// One-time/occasional backfill: creates a Google Calendar event (on the
// same 'primary' calendar used for 1:1 lead appointments) for every school
// programme session that doesn't have one yet, and saves the event id back
// onto the session. Going forward, cancel/restore/career edits keep each
// session's event in sync automatically (see syncProgrammeSessionCalendarEvent
// in lib/db-firestore.ts) - this script only needs to run for sessions that
// predate that wiring, or after seeding a new programme.
//
// Usage:
//   node scripts/sync-school-programme-calendar.mjs                 (dry run)
//   node scripts/sync-school-programme-calendar.mjs --apply         (creates events)
//   node scripts/sync-school-programme-calendar.mjs --apply --programme <id>

import { google } from 'googleapis';
import { createProductionFirestore, PRODUCTION_PROJECT_ID } from './firestore-admin.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const programmeIndex = args.indexOf('--programme');
const programmeId = programmeIndex >= 0 ? args[programmeIndex + 1] : 'gundecha-2026-27-career-primer';

if (apply && process.env.CONFIRM_FIREBASE_PROJECT !== PRODUCTION_PROJECT_ID) {
  throw new Error(`Apply requires CONFIRM_FIREBASE_PROJECT=${PRODUCTION_PROJECT_ID}.`);
}

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
if (apply && (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN)) {
  throw new Error('Apply requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.');
}

// Keep this in sync with buildProgrammeSessionEventBody in lib/calendar.ts.
const PROGRAMME_SESSION_COLOR_ID = '9'; // Blueberry

function to24HourTime(displayTime) {
  const match = displayTime.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    throw new Error(`Unrecognised session time format: ${displayTime}`);
  }
  const [, hourStr, minute, suffix] = match;
  let hour = parseInt(hourStr, 10) % 12;
  if (suffix.toUpperCase() === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function buildEventBody(session, institutionName, cancelled) {
  const careerLines = (session.careers || []).length
    ? session.careers.map((career) => `- ${career.name} (${career.status})`).join('\n')
    : 'No careers assigned yet.';

  return {
    summary: `${cancelled ? '[Cancelled] ' : ''}School Programme: ${institutionName} — ${session.grade} ${session.division} (${session.room})`,
    description: `Career primer session with ${session.teacher}.\n\nCareers:\n${careerLines}`,
    start: { dateTime: `${session.date}T${to24HourTime(session.startTime)}:00`, timeZone: 'Asia/Kolkata' },
    end: { dateTime: `${session.date}T${to24HourTime(session.endTime)}:00`, timeZone: 'Asia/Kolkata' },
    colorId: PROGRAMME_SESSION_COLOR_ID,
  };
}

const db = createProductionFirestore();
const programmeRef = db.collection('school_programmes').doc(programmeId);
const programmeDoc = await programmeRef.get();

if (!programmeDoc.exists) {
  throw new Error(`School programme ${programmeId} not found.`);
}

const programme = programmeDoc.data();
const sessions = programme.sessions || [];
const missing = sessions.filter((session) => !session.calendarEventId);

console.log(`${programmeId}: ${sessions.length} sessions total, ${missing.length} missing a calendar event.`);

if (!apply) {
  console.log('Dry run only - pass --apply to create the missing calendar events.');
  process.exit(0);
}

const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
const calendar = google.calendar({ version: 'v3', auth });

let created = 0;
let failed = 0;

for (const session of missing) {
  const cancelled = session.status === 'cancelled_restorable' || session.status === 'cancelled_passed';
  const eventBody = buildEventBody(session, programme.institutionName, cancelled);

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventBody,
    });
    session.calendarEventId = response.data.id;
    created += 1;
  } catch (error) {
    failed += 1;
    console.error(`  FAILED ${session.id}: ${error.message}`);
  }

  if ((created + failed) % 20 === 0) {
    console.log(`  ${created + failed}/${missing.length} processed...`);
  }
}

await programmeRef.set({ sessions }, { merge: true });
console.log(`Created ${created} calendar events (${failed} failed) and saved their IDs to ${programmeId}.`);
