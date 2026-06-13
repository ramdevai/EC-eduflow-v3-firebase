import { describe, expect, it } from 'vitest';
import { buildRegistrationUpdates, getPublicRegistrationData } from '@/lib/registration';
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
    }, lead)).toThrow('studentEmail is required');
  });

  it('stores student identity without overwriting primary contact', () => {
    const updates = buildRegistrationUpdates({
      name: 'Attempted overwrite',
      phone: '9999999999',
      email: 'wrong@example.com',
      studentName: 'Student',
      studentPhone: '1111111111',
      studentEmail: 'parent@example.com',
    }, lead);

    expect(updates).toMatchObject({
      studentName: 'Student',
      studentPhone: '1111111111',
      studentEmail: 'parent@example.com',
      stage: 'Registration done',
    });
    expect(updates).not.toHaveProperty('name');
    expect(updates).not.toHaveProperty('phone');
    expect(updates).not.toHaveProperty('email');
  });
});
