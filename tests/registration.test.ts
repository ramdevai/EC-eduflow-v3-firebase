import { describe, expect, it } from 'vitest';
import { buildRegistrationUpdates, getPublicRegistrationData } from '@/lib/registration';
import {
  PRIVACY_NOTICE_URL,
  PRIVACY_NOTICE_VERSION,
  SERVICE_TERMS_URL,
  SERVICE_TERMS_VERSION,
} from '@/lib/legal-documents';
import { Lead } from '@/lib/types';

const lead = {
  id: 'lead-1',
  ownerUid: 'owner',
  name: 'Primary Parent',
  phone: '1111111111',
  email: 'parent@example.com',
  stage: 'Registration requested',
  status: 'Open',
  inquiryDate: '2026-06-01',
  updatedAt: '2026-06-01',
  grade: '',
  board: '',
  notes: '',
  lastFollowUp: '',
  testLink: '',
  appointmentTime: '',
  feesPaid: 'Due',
  reportSentDate: '',
  convertedDate: '',
  communityJoined: 'No',
} as Lead;

describe('public registration identity separation', () => {
  it('does not expose primary-contact identity', () => {
    const data = getPublicRegistrationData(lead);
    expect(data).not.toHaveProperty('name');
    expect(data).not.toHaveProperty('phone');
    expect(data).not.toHaveProperty('email');
    expect(data).not.toHaveProperty('studentName');
  });

  it('requires all student identity fields', () => {
    expect(() => buildRegistrationUpdates({
      studentName: 'Student',
      studentPhone: '2222222222',
      legalAcceptance: true,
    }, lead)).toThrow('studentEmail is required');
  });

  it('preserves the collaboration source while accepting other registration sources', () => {
    const submission = {
      studentName: 'Student',
      studentPhone: '1111111111',
      studentEmail: 'parent@example.com',
      source: 'Workshop',
      legalAcceptance: true,
    };

    expect(buildRegistrationUpdates(submission, { ...lead, source: 'Collaboration' })).not.toHaveProperty('source');
    expect(buildRegistrationUpdates(submission, { ...lead, source: 'Website' })).toHaveProperty('source', 'Workshop');
  });

  it('requires explicit acceptance of the service terms and privacy notice', () => {
    const identity = {
      studentName: 'Student',
      studentPhone: '2222222222',
      studentEmail: 'student@example.com',
    };

    expect(() => buildRegistrationUpdates(identity, lead)).toThrow('You must accept');
    expect(() => buildRegistrationUpdates({ ...identity, legalAcceptance: false }, lead)).toThrow('You must accept');
  });

  it('stores student identity without overwriting primary contact', () => {
    const updates = buildRegistrationUpdates({
      name: 'Attempted overwrite',
      phone: '9999999999',
      email: 'wrong@example.com',
      studentName: 'Student',
      studentPhone: '1111111111',
      studentEmail: 'parent@example.com',
      legalAcceptance: true,
      privacy_consent: false,
      privacy_consent_date: 'client-controlled-date',
    }, lead, '2026-11-23T10:00:00.000Z');

    expect(updates).toMatchObject({
      studentName: 'Student',
      studentPhone: '1111111111',
      studentEmail: 'parent@example.com',
      stage: 'Registration done',
      privacy_consent: true,
      privacy_consent_date: '2026-11-23T10:00:00.000Z',
      legalAcceptance: true,
      legalAcceptanceDate: '2026-11-23T10:00:00.000Z',
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      privacyNoticeUrl: PRIVACY_NOTICE_URL,
      serviceTermsVersion: SERVICE_TERMS_VERSION,
      serviceTermsUrl: SERVICE_TERMS_URL,
    });
    expect(updates).not.toHaveProperty('name');
    expect(updates).not.toHaveProperty('phone');
    expect(updates).not.toHaveProperty('email');
  });
});
