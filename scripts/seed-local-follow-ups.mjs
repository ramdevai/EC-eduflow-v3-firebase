import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { encode } from 'next-auth/jwt';
import { createLocalFirestore } from './firestore-admin.mjs';

// Exercise the authenticated API against synthetic emulator fixtures only.
const db = createLocalFirestore();
const env = dotenv.parse(readFileSync('.env.local'));
if (!env.AUTH_SECRET) throw new Error('Local AUTH_SECRET is missing');
const baseUrl = 'http://localhost:3001';
const leadId = 'fixture-follow-up-review';
const leadRef = db.collection('leads').doc(leadId);
const day = days => new Date(Date.now() + days * 86400000);

if (!(await leadRef.get()).exists) {
  await leadRef.create({
    ownerUid: 'local-review', name: 'Follow-up Review Parent', studentName: 'Demo Student',
    phone: '+91 90000 00999', email: 'review.parent@example.com', stage: 'New', status: 'Open',
    inquiryDate: day(-14).toISOString(), updatedAt: day(-1).toISOString(),
    grade: '10th', board: 'CBSE', school: 'Demo School', feesPaid: 'Due', communityJoined: 'No',
    notes: '', testLink: '', appointmentTime: '', reportSentDate: '', convertedDate: '', lastFollowUp: '',
    followUpCount: 0, comments: 'Synthetic local fixture for reviewing follow-up history.',
  });
}

async function cookie(role = 'admin') {
  const token = await encode({ secret: env.AUTH_SECRET, salt: 'authjs.session-token', maxAge: 600,
    token: { sub: 'local-review', name: 'Demo Counselor', email: 'review.counselor@example.com', role } });
  return `authjs.session-token=${token}`;
}

const authCookie = await cookie();
const apiUrl = `${baseUrl}/api/leads/${leadId}/follow-ups`;
async function request(body, sessionCookie = authCookie) {
  const response = await fetch(apiUrl, { method: 'POST', headers: { Cookie: sessionCookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
const samples = [
  { requestId: 'c59937bc-6813-4fc8-a2c7-ff03c1764e01', channel: 'WhatsApp', outcome: 'No response', happenedAt: day(-10).toISOString(), notes: 'Shared the counseling details.', nextFollowUpDate: day(-5).toISOString().slice(0, 10) },
  { requestId: 'c59937bc-6813-4fc8-a2c7-ff03c1764e02', channel: 'Call', outcome: 'No response', happenedAt: day(-5).toISOString(), notes: 'Call was unanswered.', nextFollowUpDate: day(-1).toISOString().slice(0, 10) },
  { requestId: 'c59937bc-6813-4fc8-a2c7-ff03c1764e03', channel: 'Call', outcome: 'Requested more time', happenedAt: day(-1).toISOString(), notes: 'Parent is discussing with the family. Asked us to call next week.', nextFollowUpDate: day(3).toISOString().slice(0, 10) },
];
for (const sample of samples) {
  const result = await request(sample);
  if (result.status !== 201) throw new Error(`Seed failed: ${result.data.error}`);
}
const before = await (await fetch(apiUrl, { headers: { Cookie: authCookie } })).json();
await request(samples[0]);
const after = await (await fetch(apiUrl, { headers: { Cookie: authCookie } })).json();
if (before.summary.followUpCount !== after.summary.followUpCount) throw new Error('Retry double-counted a follow-up');
const invalid = await request({ ...samples[0], outcome: 'invalid' });
if (invalid.status !== 400) throw new Error('Invalid input was accepted');
const denied = await request(samples[0], await cookie('unknown'));
if (denied.status !== 403) throw new Error('Invalid role was accepted');
const unauthenticated = await fetch(apiUrl);
if (unauthenticated.status !== 401) throw new Error('Unauthenticated access was accepted');
const leads = await (await fetch(`${baseUrl}/api/leads?summary=true`, { headers: { Cookie: authCookie } })).json();
const lead = leads.leads?.find(item => item.id === leadId);
if (lead?.followUpCount !== after.summary.followUpCount) throw new Error('Lead list summary was not persisted');
console.log(JSON.stringify({ fixture: lead.name, count: after.summary.followUpCount, latestOutcome: after.summary.lastFollowUpOutcome, checks: 'Persistence, retries, invalid input, denied role, unauthenticated access, and list summaries passed.' }));
