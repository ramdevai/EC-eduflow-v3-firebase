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
const primaryContactNames = [
  'Anita Sharma',
  'Rajesh Mehta',
  'Aarav Kulkarni',
  'Neha Iyer',
  'Sanjay Patel',
  'Pooja Nair',
  'Vikram Rao',
  'Kavita Shah',
  'Manish Gupta',
];
const studentNames = [
  '',
  '',
  'Aarav Kulkarni',
  'Riya Iyer',
  'Ishaan Patel',
  'Ananya Nair',
  'Dev Rao',
  'Myra Shah',
  'Kabir Gupta',
];
const cities = [
  'Mumbai, Maharashtra',
  'Pune, Maharashtra',
  'Bengaluru, Karnataka',
  'Chennai, Tamil Nadu',
  'Ahmedabad, Gujarat',
  'Kochi, Kerala',
  'Hyderabad, Telangana',
  'Surat, Gujarat',
  'Delhi',
];

stages.forEach((stage, index) => {
  const number = String(index + 1).padStart(2, '0');
  const document = db.collection('leads').doc(`fixture-lead-${number}`);
  const isComplete = stage === 'Session complete' || stage === 'Report sent';

  const identityScenario = index === 2
    ? {
        name: primaryContactNames[index],
        phone: '+91 90000 00103',
        email: 'aarav.kulkarni@example.com',
        studentName: studentNames[index],
        studentPhone: '+91 90000 00103',
        studentEmail: 'aarav.kulkarni@example.com',
      }
    : index === 3
      ? {
          name: primaryContactNames[index],
          phone: '+91 90000 00104',
          email: 'neha.iyer@example.com',
          studentName: studentNames[index],
          studentPhone: '+91 90000 00104',
          studentEmail: 'neha.iyer@example.com',
        }
      : index === 1
        ? {
            name: primaryContactNames[index],
            phone: '+91 90000 00102',
            email: 'rajesh.mehta@example.com',
            studentName: '',
            studentPhone: '',
            studentEmail: '',
          }
        : {
            name: primaryContactNames[index],
            phone: `+91 90000 001${number}`,
            email: `primary.${number}@example.com`,
            studentName: studentNames[index],
            studentPhone: stage === 'New' ? '' : `+91 90000 002${number}`,
            studentEmail: stage === 'New' ? '' : `student.${number}@example.com`,
          };

  batch.set(
    document,
    {
      ownerUid: 'local-admin',
      ...identityScenario,
      stage,
      status: stage === 'Lost' ? 'Lost' : isComplete ? 'Won' : 'Open',
      inquiryDate: now.toISOString(),
      updatedAt: new Date(now.getTime() + index * 60_000).toISOString(),
      lastStageUpdate: now.toISOString(),
      googleContactId: '',
      address: `${number}, Sample Residency, ${cities[index]}`,
      gender: '',
      dob: '',
      grade: index % 2 === 0 ? '10th' : '12th',
      board: index % 2 === 0 ? 'CBSE' : 'ISC',
      school: index % 2 === 0 ? 'Sample International School' : 'Demo Public School',
      hobbies: index % 2 === 0 ? 'Reading and cricket' : 'Music and sketching',
      fatherName: `Sample Father ${number}`,
      fatherPhone: `+91 90000 003${number}`,
      fatherEmail: `parent.${number}@example.com`,
      fatherOccupation: 'Salaried professional',
      motherName: `Sample Mother ${number}`,
      motherPhone: `+91 90000 004${number}`,
      motherEmail: `mother.${number}@example.com`,
      motherOccupation: 'Self-employed',
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
      privacy_consent: stage !== 'New' && stage !== 'Registration requested',
      privacy_consent_date: stage !== 'New' && stage !== 'Registration requested' ? now.toISOString() : '',
      primaryContactRecoveredAt: '',
    },
    { merge: true }
  );
});

const recoveryFixtures = [
  {
    id: 'fixture-legacy-recoverable',
    googleContactId: 'fixture-google-recoverable',
    name: 'Legacy Student Aarohi',
    phone: '+91 90000 00501',
    email: 'legacy.full@student.example.com',
  },
  {
    id: 'fixture-legacy-partial',
    googleContactId: 'fixture-google-partial',
    name: 'Legacy Student Vivaan',
    phone: '+91 90000 00502',
    email: 'legacy.partial@student.example.com',
  },
  {
    id: 'fixture-legacy-unmatched',
    googleContactId: 'fixture-google-unmatched',
    name: 'Legacy Student Diya',
    phone: '+91 90000 00503',
    email: 'legacy.unmatched@student.example.com',
  },
];

for (const fixture of recoveryFixtures) {
  batch.set(db.collection('leads').doc(fixture.id), {
    ownerUid: 'local-admin',
    ...fixture,
    studentName: '',
    studentPhone: '',
    studentEmail: '',
    stage: 'Registration done',
    status: 'Open',
    inquiryDate: now.toISOString(),
    updatedAt: now.toISOString(),
    lastStageUpdate: now.toISOString(),
    grade: '10th',
    board: 'CBSE',
    notes: '',
    lastFollowUp: '',
    testLink: '',
    appointmentTime: '',
    feesPaid: 'Due',
    reportSentDate: '',
    convertedDate: '',
    communityJoined: 'No',
    registrationToken: '',
    registrationSid: '',
    privacy_consent: true,
    privacy_consent_date: now.toISOString(),
    primaryContactRecoveredAt: '',
  });
}

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
console.log(`Seeded ${stages.length + recoveryFixtures.length} synthetic leads and supporting local fixtures.`);
