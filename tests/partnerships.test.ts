import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Partnership, Referral, UserRole } from '@/lib/types';
import { partnerWhatsAppLink, referralForRole, referralUpdate, referralReminderDate, referralReminderDue, referralFollowUpMessage } from '@/lib/partnership-workflow';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), getPartnerships: vi.fn(), addPartnership: vi.fn(),
  updatePartnership: vi.fn(), deletePartnership: vi.fn(),
  updateReferral: vi.fn(), getReferrals: vi.fn(), addReferral: vi.fn(),
  getPartnershipById: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db-firestore', () => mocks);

import { GET, POST } from '@/app/api/partnerships/route';
import { PATCH, DELETE } from '@/app/api/partnerships/[id]/route';
import { PATCH as updateReferral } from '@/app/api/referrals/[id]/route';
import { GET as listReferrals } from '@/app/api/referrals/route';

const partner = {
  id: 'atlas', institutionId: 'atlas', institutionName: 'Atlas', status: 'Active',
  pointOfContact: { name: 'Admissions', role: 'Admissions', email: 'admissions@example.com', phone: '9000000000' },
  commissionTerms: 'Private terms', notes: 'Private notes', mouSigned: true,
} as Partnership;
const referral = {
  id: 'ref-1', leadId: 'lead-1', partnershipId: 'atlas', institutionName: 'Atlas',
  leadName: 'Demo Student', institutionId: 'atlas', referredAt: '2026-10-04',
  referredBy: 'staff-1', updatedAt: '2026-10-04',
  status: 'Due', timeline: [], nextFollowUpDate: '2026-11-03',
} as Referral;
const params = { params: Promise.resolve({ id: 'ref-1' }) };
const request = (body: unknown) => new Request('http://localhost/api/referrals/ref-1', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'staff-1', role: UserRole.Staff } });
  mocks.getPartnerships.mockResolvedValue([partner, { ...partner, id: 'inactive', status: 'Inactive' }]);
  mocks.getReferrals.mockResolvedValue([referral]);
  mocks.updateReferral.mockImplementation(async (_uid, _id, updates) => ({ ...referral, ...referralUpdate(referral, updates) }));
});

describe('partnership access', () => {
  it('blocks staff from reading or modifying the master', async () => {
    expect((await GET(new Request('http://localhost/api/partnerships'))).status).toBe(403);
    expect((await POST(request({}))).status).toBe(403);
    expect((await PATCH(request({}), params)).status).toBe(403);
    expect((await DELETE(request({}), params)).status).toBe(403);
    expect(mocks.getPartnerships).not.toHaveBeenCalled();
    expect(mocks.addPartnership).not.toHaveBeenCalled();
    expect(mocks.updatePartnership).not.toHaveBeenCalled();
    expect(mocks.deletePartnership).not.toHaveBeenCalled();
  });

  it('returns referral contacts without private master details to staff', async () => {
    const response = await GET(new Request('http://localhost/api/partnerships?forReferral=true'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.partnerships).toHaveLength(2);
    expect(data.partnerships[0]).toEqual({
      id: 'atlas', institutionId: 'atlas', institutionName: 'Atlas', pointOfContact: partner.pointOfContact, status: 'Active',
    });
    expect(data.partnerships[0].commissionTerms).toBeUndefined();
  });

  it('allows admins to read the master', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: UserRole.Admin } });
    const response = await GET(new Request('http://localhost/api/partnerships'));
    expect(response.status).toBe(200);
    expect((await response.json()).partnerships[0].commissionTerms).toBe('Private terms');
  });

  it('requires sign-in even for referral contacts', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET(new Request('http://localhost/api/partnerships?forReferral=true'))).status).toBe(401);
  });
});

describe('referral updates', () => {
  it('blocks staff from changing referral status', async () => {
    expect((await updateReferral(request({ status: 'Paid' }), params)).status).toBe(403);
    expect(mocks.updateReferral).not.toHaveBeenCalled();
  });

  it('allows an admin to mark paid and clear the reminder', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: UserRole.Admin } });
    const response = await updateReferral(request({ status: 'Paid' }), params);
    expect(response.status).toBe(200);
    expect((await response.json()).referral).toMatchObject({ status: 'Paid', nextFollowUpDate: null });
  });

  it('records notification time and actor on the server', async () => {
    const response = await updateReferral(request({ notificationChannel: 'WhatsApp' }), params);
    expect(response.status).toBe(200);
    expect(mocks.updateReferral).toHaveBeenCalledWith('staff-1', 'ref-1', {
      notificationChannel: 'WhatsApp', intimatedBy: 'staff-1', intimatedAt: expect.any(String),
    }, 'Institute notified by WhatsApp');
    expect((await response.json()).referral.commissionStatus).toBeUndefined();
  });

  it.each([
    { commissionAmount: '15000' }, { nextFollowUpDate: '2026-10-08' },
    { lastFollowUpNote: 'Call later' }, { status: 'Commission Paid' },
    { notificationChannel: 'SMS' }, { intimatedBy: 'another-user' },
  ])('rejects removed or invalid fields: %j', async body => {
    expect((await updateReferral(request(body), params)).status).toBe(400);
    expect(mocks.updateReferral).not.toHaveBeenCalled();
  });

  it('allows staff to list referrals while withholding master and timeline data', async () => {
    expect((await listReferrals(new Request('http://localhost/api/referrals'))).status).toBe(200);
    const response = await listReferrals(new Request('http://localhost/api/referrals?leadId=lead-1'));
    expect((await response.json()).referrals[0].commissionStatus).toBeUndefined();
  });
});

describe('legacy referrals and WhatsApp', () => {
  it('maps legacy statuses to the four new statuses', () => {
    const legacy = (status: string, commissionStatus?: string) => ({ ...referral, status, commissionStatus }) as unknown as Referral;
    expect(referralForRole(legacy('Commission Paid'), UserRole.Admin).status).toBe('Paid');
    expect(referralForRole(legacy('Commission Due', 'Paid'), UserRole.Admin).status).toBe('Paid');
    expect(referralForRole(legacy('Admitted'), UserRole.Admin).status).toBe('Due');
    expect(referralForRole(legacy('Intimated'), UserRole.Admin).status).toBe('Referred');
    expect(referralForRole(legacy('Declined'), UserRole.Admin).status).toBe('Didnt join');
  });

  it('builds a contact link with encoded text and an Indian country code', () => {
    expect(partnerWhatsAppLink('90000 00000', 'Hello & welcome'))
      .toBe('https://wa.me/919000000000?text=Hello%20%26%20welcome');
    expect(partnerWhatsAppLink('', 'Hello')).toBeNull();
    expect(partnerWhatsAppLink('+44 7700 900123', 'Hello')).toContain('https://wa.me/447700900123?');
  });
});

describe('30-day referral reminders', () => {
  const now = new Date('2026-10-04T12:00:00Z');
  it('schedules 30 calendar days in the app timezone across month boundaries', () => {
    expect(referralReminderDate(now)).toBe('2026-11-03');
    expect(referralReminderDate(new Date('2026-10-04T20:00:00Z'))).toBe('2026-11-04');
  });
  it('resets after joining and after each recorded follow-up', () => {
    expect(referralUpdate({ ...referral, status: 'Referred' }, { status: 'Due' }, now).nextFollowUpDate).toBe('2026-11-03');
    const later = new Date('2026-11-10T12:00:00Z');
    expect(referralUpdate(referral, { followUpChannel: 'WhatsApp' }, later)).toMatchObject({
      nextFollowUpDate: '2026-12-10', lastFollowUpAt: later.toISOString(), status: 'Due',
    });
  });
  it('does not postpone reminders when merely notifying or saving the same status', () => {
    const original = { ...referral, nextFollowUpDate: '2026-10-01' };
    expect(referralUpdate(original, { notificationChannel: 'Email' }, now).nextFollowUpDate).toBe('2026-10-01');
    expect(referralUpdate(original, { status: 'Due' }, now).nextFollowUpDate).toBe('2026-10-01');
  });
  it.each(['Paid', 'Didnt join'] as const)('stops reminders for %s', status => {
    expect(referralUpdate(referral, { status }, now).nextFollowUpDate).toBeNull();
    expect(referralReminderDue({ ...referral, status, nextFollowUpDate: '2026-10-01' }, now)).toBe(false);
    expect(() => referralUpdate({ ...referral, status }, { followUpChannel: 'Email' }, now)).toThrow('closed');
  });
  it('keeps overdue reminders visible until acted on', () => {
    expect(referralReminderDue({ ...referral, nextFollowUpDate: '2026-10-01' }, now)).toBe(true);
    expect(referralReminderDue({ ...referral, nextFollowUpDate: '2026-10-04' }, now)).toBe(true);
    expect(referralReminderDue(referral, now)).toBe(false);
  });
  it('prepares different questions for referred and joined students and applies custom templates', () => {
    expect(referralFollowUpMessage({ ...referral, status: 'Referred' }, 'Admissions').body).toContain('whether the student has joined');
    expect(referralFollowUpMessage(referral, 'Admissions').body).toContain('commission payment');
    expect(referralFollowUpMessage(referral, 'Admissions', [{ id: 'referral_followup', message: '{studentName} at {institutionName}' }]).body).toBe('Demo Student at Atlas');
  });
  it('allows staff to record a follow-up and reschedule it', async () => {
    const response = await updateReferral(request({ followUpChannel: 'Email' }), params);
    expect(response.status).toBe(200);
    expect(mocks.updateReferral).toHaveBeenCalledWith('staff-1', 'ref-1', { followUpChannel: 'Email' }, 'Referral follow-up sent by Email');
  });
});
