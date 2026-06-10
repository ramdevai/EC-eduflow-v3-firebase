import { createLocalFirestore } from './firestore-admin.mjs';

const stages = [
  'New',
  'Registration requested',
  'Registration done',
  'Test sent',
  'Test completed',
  '1:1 scheduled',
  'Session complete',
  'Report sent',
  'Lost',
];

const db = createLocalFirestore();
const batch = db.batch();
const now = new Date('2026-01-15T10:00:00.000Z');

stages.forEach((stage, index) => {
  const number = String(index + 1).padStart(2, '0');
  const document = db.collection('leads').doc(`fixture-lead-${number}`);
  const isComplete = stage === 'Session complete' || stage === 'Report sent';

  batch.set(
    document,
    {
      ownerUid: 'local-admin',
      name: `Test Student ${number}`,
      phone: `+1 202-555-01${number}`,
      email: `student.${number}@example.com`,
      stage,
      status: stage === 'Lost' ? 'Lost' : isComplete ? 'Won' : 'Open',
      inquiryDate: now.toISOString(),
      updatedAt: new Date(now.getTime() + index * 60_000).toISOString(),
      lastStageUpdate: now.toISOString(),
      googleContactId: '',
      address: `${number} Example Street`,
      gender: '',
      dob: '',
      grade: index % 2 === 0 ? '10th' : '12th',
      board: index % 2 === 0 ? 'CBSE' : 'ISC',
      school: 'Example School',
      hobbies: 'Reading',
      fatherName: `Test Parent ${number}`,
      fatherPhone: `+1 202-555-019${index}`,
      fatherEmail: `parent.${number}@example.com`,
      fatherOccupation: 'Test occupation',
      motherName: '',
      motherPhone: '',
      motherEmail: '',
      motherOccupation: '',
      source: 'Synthetic fixture',
      comments: 'Local development data only.',
      notes: '',
      lastFollowUp: '',
      testLink: '',
      appointmentTime: '',
      feesPaid: isComplete ? 'Paid' : 'Due',
      feesAmount: isComplete ? '5000' : '',
      paymentMode: '',
      transactionId: '',
      reportSentDate: stage === 'Report sent' ? now.toISOString() : '',
      convertedDate: '',
      reportPdfUrl: '',
      communityJoined: 'No',
      registrationToken: `fixture-registration-token-${number}`,
      registrationSid: `FIXTURE-${number}`,
      calendarEventId: '',
      communicateViaEmailOnly: false,
    },
    { merge: true }
  );
});

batch.set(
  db.collection('users').doc('fixture-staff'),
  {
    email: 'test.staff@example.com',
    role: 'staff',
    createdAt: now.toISOString(),
  },
  { merge: true }
);

batch.set(
  db.collection('system_settings').doc('global'),
  {
    defaultSessionDuration: 90,
    calendarLookaheadDays: 3,
  },
  { merge: true }
);

const templates = [
  {
    id: 'registration',
    label: 'Registration',
    subject: 'Complete your registration',
    message: 'Hello {name}, please complete your test registration.',
  },
  {
    id: 'appointment',
    label: 'Appointment',
    subject: 'Counseling appointment',
    message: 'Hello {name}, your test counseling appointment is scheduled.',
  },
];

for (const template of templates) {
  batch.set(db.collection('templates').doc(template.id), template, { merge: true });
}

await batch.commit();
console.log(`Seeded ${stages.length} synthetic leads and supporting local fixtures.`);
