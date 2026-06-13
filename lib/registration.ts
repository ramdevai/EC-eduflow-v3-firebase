import { Lead } from './types';
import { safeFormat } from './utils';

const ALLOWED_REGISTRATION_FIELDS = [
  'studentName',
  'studentPhone',
  'studentEmail',
  'grade',
  'board',
  'address',
  'dob',
  'gender',
  'school',
  'hobbies',
  'fatherName',
  'fatherPhone',
  'fatherEmail',
  'fatherOccupation',
  'motherName',
  'motherPhone',
  'motherEmail',
  'motherOccupation',
  'source',
  'comments',
  'privacy_consent',
  'privacy_consent_date',
] as const;

export function getPublicRegistrationData(lead: Lead) {
  return {
    grade: lead.grade,
    board: lead.board,
    address: lead.address,
    dob: lead.dob,
    gender: lead.gender,
    school: lead.school,
    hobbies: lead.hobbies,
    fatherName: lead.fatherName,
    fatherPhone: lead.fatherPhone,
    fatherEmail: lead.fatherEmail,
    fatherOccupation: lead.fatherOccupation,
    motherName: lead.motherName,
    motherPhone: lead.motherPhone,
    motherEmail: lead.motherEmail,
    motherOccupation: lead.motherOccupation,
    source: lead.source,
    comments: lead.comments,
  };
}

export function buildRegistrationUpdates(
  body: Record<string, unknown>,
  lead: Lead
): Partial<Lead> {
  const requiredStudentFields = ['studentName', 'studentPhone', 'studentEmail'] as const;
  for (const field of requiredStudentFields) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      throw new Error(`${field} is required`);
    }
  }

  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_REGISTRATION_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
    }
  }

  updates.dob = typeof body.dob === 'string' ? safeFormat(body.dob) : lead.dob || '';
  updates.stage = lead.stage === 'Registration requested' ? 'Registration done' : lead.stage;
  return updates as Partial<Lead>;
}
