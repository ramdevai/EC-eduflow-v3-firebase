import { COLLABORATION_LEAD_SOURCE, type Lead } from './types';
import {
  PRIVACY_NOTICE_URL,
  PRIVACY_NOTICE_VERSION,
  SERVICE_TERMS_URL,
  SERVICE_TERMS_VERSION,
} from './legal-documents';
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
] as const;

export function getPublicRegistrationData(lead: Lead) {
  return {
    ...(lead.collaborationId && lead.studentName && { studentName: lead.studentName }),
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
  lead: Lead,
  acceptedAt = new Date().toISOString()
): Partial<Lead> {
  const requiredStudentFields = ['studentName', 'studentPhone', 'studentEmail'] as const;
  for (const field of requiredStudentFields) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      throw new Error(`${field} is required`);
    }
  }

  if (body.legalAcceptance !== true) {
    throw new Error('You must accept the service terms and privacy notice');
  }

  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_REGISTRATION_FIELDS) {
    if (field === 'source' && lead.source === COLLABORATION_LEAD_SOURCE) continue;
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
    }
  }

  updates.dob = typeof body.dob === 'string' ? safeFormat(body.dob) : lead.dob || '';
  updates.privacy_consent = true;
  updates.privacy_consent_date = acceptedAt;
  updates.legalAcceptance = true;
  updates.legalAcceptanceDate = acceptedAt;
  updates.privacyNoticeVersion = PRIVACY_NOTICE_VERSION;
  updates.privacyNoticeUrl = PRIVACY_NOTICE_URL;
  updates.serviceTermsVersion = SERVICE_TERMS_VERSION;
  updates.serviceTermsUrl = SERVICE_TERMS_URL;
  updates.stage = lead.stage === 'Registration requested' ? 'Registration done' : lead.stage;
  return updates as Partial<Lead>;
}
