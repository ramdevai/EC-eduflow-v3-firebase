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

// The app initializes the standard message templates on first load.

const placeholderCareers = {
  technology: [
    { id: 'cybersecurity', name: 'Cybersecurity Analyst', area: 'Technology', color: 'indigo', status: 'planned', description: 'Works to protect systems, networks and data from cyber threats.' },
    { id: 'sports-management', name: 'Sports Management', area: 'Sports + Business', color: 'green', status: 'planned', description: 'Involves the business and operations side of sports and events.' },
    { id: 'genetic-counsellor', name: 'Genetic Counsellor', area: 'Healthcare', color: 'green', status: 'planned', description: 'Helps individuals and families understand genetic conditions.' },
    { id: 'architect', name: 'Architect', area: 'Design', color: 'amber', status: 'planned', description: 'Designs buildings and spaces that are functional, safe and aesthetically pleasing.' },
  ],
  science: [
    { id: 'environmental-scientist', name: 'Environmental Scientist', area: 'Science', color: 'sky', status: 'planned', description: 'Studies environmental systems and solves ecological problems.' },
    { id: 'actuary', name: 'Actuary', area: 'Finance + Math', color: 'green', status: 'planned', description: 'Uses statistics to understand financial risk and uncertainty.' },
    { id: 'product-designer', name: 'Product Designer', area: 'Design', color: 'amber', status: 'planned', description: 'Designs digital or physical products around user needs.' },
  ],
  business: [
    { id: 'digital-marketing', name: 'Digital Marketing', area: 'Business', color: 'indigo', status: 'planned', description: 'Plans online campaigns across search, social, content and analytics.' },
    { id: 'nutritionist', name: 'Nutritionist', area: 'Healthcare', color: 'green', status: 'planned', description: 'Guides people on food choices, health goals and diet planning.' },
    { id: 'civil-services', name: 'Civil Services', area: 'Public Service', color: 'amber', status: 'planned', description: 'Works in government administration, policy and public service delivery.' },
  ],
};

const gundechaClasses = [
  { id: 'ix-ebony-713', grade: 'IX', division: 'Ebony', room: '713', classTeacher: 'Sugana Karki' },
  { id: 'ix-margosa-604', grade: 'IX', division: 'Margosa', room: '604', classTeacher: 'Alpana Tripathy' },
  { id: 'x-olive-614', grade: 'X', division: 'Olive', room: '614', classTeacher: 'Divya Badalia' },
  { id: 'ix-mint-613', grade: 'IX', division: 'Mint', room: '613', classTeacher: 'Revathi Menon' },
  { id: 'x-cinnamon-602', grade: 'X', division: 'Cinnamon', room: '602', classTeacher: 'Renu Joshi' },
  { id: 'x-maple-603', grade: 'X', division: 'Maple', room: '603', classTeacher: 'Anukana Chakraborty' },
  { id: 'ix-arnica-612', grade: 'IX', division: 'Arnica', room: '612', classTeacher: 'Preeti Arora' },
  { id: 'x-eucalyptus-704', grade: 'X', division: 'Eucalyptus', room: '704', classTeacher: 'Rupa Mondal' },
  { id: 'ix-mahagony-714', grade: 'IX', division: 'Mahagony', room: '714', classTeacher: 'G. Banumathy' },
  { id: 'x-rosewood-705', grade: 'X', division: 'Rosewood', room: '705', classTeacher: 'Priyanka Singh' },
];

const gundechaTimetableSlots = [
  { id: 'ix-ebony-713-life-skills', classId: 'ix-ebony-713', grade: 'IX', division: 'Ebony', room: '713', weekday: 'Monday', startTime: '10:00', endTime: '10:35', durationMinutes: 35, period: 'Life Skills', teacher: 'Sugana Karki', sourceImage: 'IMG_6446.JPG' },
  { id: 'ix-margosa-604-life-skills', classId: 'ix-margosa-604', grade: 'IX', division: 'Margosa', room: '604', weekday: 'Monday', startTime: '10:35', endTime: '11:05', durationMinutes: 30, period: 'Life Skills', teacher: 'Alpana Tripathy', sourceImage: 'IMG_6448.JPG' },
  { id: 'x-olive-614-life-skills', classId: 'x-olive-614', grade: 'X', division: 'Olive', room: '614', weekday: 'Tuesday', startTime: '10:35', endTime: '11:05', durationMinutes: 30, period: 'Life Skills', teacher: 'Divya Badalia', sourceImage: 'IMG_6444.JPG' },
  { id: 'ix-mint-613-life-skills', classId: 'ix-mint-613', grade: 'IX', division: 'Mint', room: '613', weekday: 'Tuesday', startTime: '11:05', endTime: '11:35', durationMinutes: 30, period: 'Life Skills', teacher: 'Revathi Menon', sourceImage: 'IMG_6449.JPG' },
  { id: 'x-cinnamon-602-life-skills', classId: 'x-cinnamon-602', grade: 'X', division: 'Cinnamon', room: '602', weekday: 'Wednesday', startTime: '09:00', endTime: '09:40', durationMinutes: 40, period: 'Life Skills', teacher: 'Renu Joshi', sourceImage: 'IMG_6442.JPG' },
  { id: 'x-maple-603-life-skills', classId: 'x-maple-603', grade: 'X', division: 'Maple', room: '603', weekday: 'Wednesday', startTime: '10:35', endTime: '11:05', durationMinutes: 30, period: 'Life Skills', teacher: 'Anukana Chakraborty', sourceImage: 'IMG_6441.JPG' },
  { id: 'ix-arnica-612-life-skills', classId: 'ix-arnica-612', grade: 'IX', division: 'Arnica', room: '612', weekday: 'Wednesday', startTime: '12:35', endTime: '13:05', durationMinutes: 30, period: 'Life Skills', teacher: 'Preeti Arora', sourceImage: 'IMG_6445.JPG' },
  { id: 'x-eucalyptus-704-life-skills', classId: 'x-eucalyptus-704', grade: 'X', division: 'Eucalyptus', room: '704', weekday: 'Thursday', startTime: '10:00', endTime: '10:35', durationMinutes: 35, period: 'Life Skills', teacher: 'Rupa Mondal', sourceImage: 'IMG_6440.JPG' },
  { id: 'ix-mahagony-714-life-skills', classId: 'ix-mahagony-714', grade: 'IX', division: 'Mahagony', room: '714', weekday: 'Thursday', startTime: '10:35', endTime: '11:05', durationMinutes: 30, period: 'Life Skills', teacher: 'G. Banumathy', sourceImage: 'IMG_6447.JPG' },
  { id: 'x-rosewood-705-life-skills', classId: 'x-rosewood-705', grade: 'X', division: 'Rosewood', room: '705', weekday: 'Thursday', startTime: '12:35', endTime: '13:05', durationMinutes: 30, period: 'Life Skills', teacher: 'Priyanka Singh', sourceImage: 'IMG_6443.JPG' },
];

const programmeScheduleStart = '2026-09-01';
const programmeScheduleEnd = '2027-03-01';
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekdayShortNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const monthShortNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function parseDateOnly(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDateInfo(date) {
  const weekday = weekdayNames[date.getUTCDay()];
  const weekdayShort = weekdayShortNames[date.getUTCDay()];
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = monthShortNames[date.getUTCMonth()];

  return {
    date: formatDateOnly(date),
    weekday,
    dateLabel: `${weekday.toUpperCase()}, ${day} ${month}`,
    dayLabel: `${weekdayShort} ${day} ${month}`,
  };
}

function getProgrammeDates(startDate, endDate) {
  const dates = [];
  const end = parseDateOnly(endDate);

  for (let date = parseDateOnly(startDate); date <= end; date = addDays(date, 1)) {
    dates.push(formatDateInfo(date));
  }

  return dates;
}

function formatDisplayTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour = hours % 12 || 12;
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${suffix}`;
}

function careersForSlot(slot, index) {
  const groups = [placeholderCareers.technology, placeholderCareers.science, placeholderCareers.business];
  return groups[index % groups.length];
}

const gundechaSessions = getProgrammeDates(programmeScheduleStart, programmeScheduleEnd)
  .flatMap(dateInfo => gundechaTimetableSlots
    .map((slot, slotIndex) => ({ slot, slotIndex }))
    .filter(({ slot }) => slot.weekday === dateInfo.weekday)
    .map(({ slot, slotIndex }) => ({
      id: `${slot.classId}-${dateInfo.date}`,
      school: 'Gundecha Education Academy',
      grade: slot.grade,
      division: slot.division,
      room: slot.room,
      date: dateInfo.date,
      dateLabel: dateInfo.dateLabel,
      dayLabel: dateInfo.dayLabel,
      startTime: formatDisplayTime(slot.startTime),
      endTime: formatDisplayTime(slot.endTime),
      duration: `${slot.durationMinutes} min`,
      period: slot.period,
      teacher: slot.teacher,
      status: 'scheduled',
      reason: '',
      timetableSlotId: slot.id,
      careers: careersForSlot(slot, slotIndex),
    })));

batch.set(
  db.collection('institutions').doc('gundecha-education-academy'),
  {
    name: 'Gundecha Education Academy',
    campus: 'Thakur Village, Kandivali East',
    address: 'Gundecha Education Academy, Thakur Village, Kandivali (East), Mumbai - 400101',
    status: 'active',
    contacts: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  { merge: true }
);

batch.set(
  db.collection('school_programmes').doc('gundecha-2026-27-career-primer'),
  {
    institutionId: 'gundecha-education-academy',
    institutionName: 'Gundecha Education Academy',
    name: 'Gundecha Career Primer',
    academicYear: '2026-27',
    status: 'active',
    classes: gundechaClasses,
    timetableSlots: gundechaTimetableSlots,
    sessions: gundechaSessions,
    holidays: [],
    // careerCoverage is no longer stored per-programme - the app reads the
    // live, active subset of the `careers` collection (seeded below) instead.
    sourceNote: `Timetable slots cross-checked from IMG_6440.JPG through IMG_6449.JPG in docs/source-data/school-programmes/timetables. Sessions are generated weekly from ${programmeScheduleStart} through ${programmeScheduleEnd}. Career topics are placeholder assignments until the career-topic source is provided.`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  { merge: true }
);

const careersMaster = [
  ...placeholderCareers.technology,
  ...placeholderCareers.science,
  ...placeholderCareers.business,
];

for (const career of careersMaster) {
  batch.set(
    db.collection('careers').doc(career.id),
    {
      name: career.name,
      area: career.area,
      color: career.color,
      description: career.description,
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    { merge: true }
  );
}

await batch.commit();
console.log(`Seeded ${stages.length + recoveryFixtures.length} synthetic leads, ${gundechaTimetableSlots.length} Gundecha timetable slots, ${gundechaSessions.length} generated Gundecha sessions, ${careersMaster.length} careers, and supporting local fixtures.`);
