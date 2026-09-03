// One-time production seed for the Gundecha Education Academy school
// programme. Creates the `institutions` and `school_programmes` documents
// with the real timetable (transcribed in
// docs/source-data/school-programmes/timetables/README.md) and generates
// sessions starting Monday 2026-09-07 through 2027-03-01.
//
// This intentionally does NOT reuse scripts/seed-local-firestore.mjs:
// that script is hard-blocked from ever running against production (see
// assertLocalEnvironment in firestore-admin.mjs), seeds session career
// topics with placeholder data for local demo purposes, and starts the
// schedule on 2026-09-01 (already in the past by the time this runs).
// Sessions here are seeded with an EMPTY careers list - counsellors assign
// real careers per session via the app's "Edit careers" flow, which reads
// live from the `careers` master collection.
//
// The `careers` collection itself does not need seeding here: the app
// auto-populates it with a starter set the first time it's read in
// production (see ensureDefaultCareers in lib/db-firestore.ts) - e.g. the
// first time anyone opens Careers, or the first time this programme's
// schedule is fetched.
//
// Refuses to overwrite an existing programme document unless --force is
// passed, so re-running this by accident can't clobber real production data
// (cancellations, career assignments, calendar event ids, etc.).
//
// Usage:
//   node scripts/seed-production-school-programme.mjs                  (dry run)
//   node scripts/seed-production-school-programme.mjs --apply          (writes, only if programme doesn't exist yet)
//   node scripts/seed-production-school-programme.mjs --apply --force  (writes, overwriting an existing programme)
//
// Requires FIREBASE_SERVICE_ACCOUNT_KEY (or GOOGLE_APPLICATION_CREDENTIALS)
// for the eduflow-689c0 project, and CONFIRM_FIREBASE_PROJECT=eduflow-689c0
// to actually apply. Take a Firestore backup before running with --apply.

import { createProductionFirestore, PRODUCTION_PROJECT_ID } from './firestore-admin.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const force = args.includes('--force');

if (apply && process.env.CONFIRM_FIREBASE_PROJECT !== PRODUCTION_PROJECT_ID) {
  throw new Error(`Apply requires CONFIRM_FIREBASE_PROJECT=${PRODUCTION_PROJECT_ID}.`);
}

const INSTITUTION_ID = 'gundecha-education-academy';
const PROGRAMME_ID = 'gundecha-2026-27-career-primer';
const PROGRAMME_START = '2026-09-07';
const PROGRAMME_END = '2027-03-01';

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

const gundechaSessions = getProgrammeDates(PROGRAMME_START, PROGRAMME_END)
  .flatMap(dateInfo => gundechaTimetableSlots
    .filter(slot => slot.weekday === dateInfo.weekday)
    .map(slot => ({
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
      careers: [],
    })));

const db = createProductionFirestore();
const now = new Date().toISOString();

const institutionRef = db.collection('institutions').doc(INSTITUTION_ID);
const programmeRef = db.collection('school_programmes').doc(PROGRAMME_ID);

const [institutionDoc, programmeDoc] = await Promise.all([institutionRef.get(), programmeRef.get()]);

console.log(`Institution ${INSTITUTION_ID}: ${institutionDoc.exists ? 'already exists, will be merged' : 'will be created'}.`);
console.log(`Programme ${PROGRAMME_ID}: ${programmeDoc.exists ? 'ALREADY EXISTS' : 'will be created'}.`);
console.log(`${gundechaSessions.length} sessions generated from ${PROGRAMME_START} through ${PROGRAMME_END}, all with an empty careers list.`);

if (programmeDoc.exists && !force) {
  console.log('Refusing to overwrite the existing programme. Pass --force to overwrite anyway.');
  process.exit(apply ? 1 : 0);
}

if (!apply) {
  console.log('Dry run only - pass --apply to write.');
  process.exit(0);
}

const batch = db.batch();

batch.set(
  institutionRef,
  {
    name: 'Gundecha Education Academy',
    campus: 'Thakur Village, Kandivali East',
    address: 'Gundecha Education Academy, Thakur Village, Kandivali (East), Mumbai - 400101',
    status: 'active',
    contacts: [],
    createdAt: now,
    updatedAt: now,
  },
  { merge: true }
);

batch.set(programmeRef, {
  institutionId: INSTITUTION_ID,
  institutionName: 'Gundecha Education Academy',
  name: 'Gundecha Career Primer',
  academicYear: '2026-27',
  status: 'active',
  classes: gundechaClasses,
  timetableSlots: gundechaTimetableSlots,
  sessions: gundechaSessions,
  holidays: [],
  sourceNote: `Timetable slots cross-checked from IMG_6440.JPG through IMG_6449.JPG (see docs/source-data/school-programmes/timetables/README.md). Sessions generated weekly from ${PROGRAMME_START} through ${PROGRAMME_END}. Careers are assigned per session via the app, not pre-seeded.`,
  createdAt: now,
  updatedAt: now,
});

await batch.commit();
console.log(`Wrote institution + programme with ${gundechaSessions.length} sessions to production.`);
