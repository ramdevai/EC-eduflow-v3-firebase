import { Partnership, Referral, ReferralStatus, UserRole } from './types';

export type ReferralPartner = Pick<Partnership, 'id' | 'institutionId' | 'institutionName' | 'pointOfContact' | 'status'>;
export const REFERRAL_STATUSES: ReferralStatus[] = ['Referred', 'Due', 'Paid', 'Didnt join'];
export const REFERRAL_FOLLOWUP_TEMPLATE = {
  id: 'referral_followup', label: 'Referral Follow-up',
  subject: 'Referral Follow-up - {studentName} - {institutionName}',
  message: 'Hi {contactName},\n\nFollowing up on our referral of {studentName} to {institutionName}.\n\n{followUpRequest}\n\nThanks,\nEduCompass',
};

export function referralStatus(status: string, commissionStatus?: string): ReferralStatus {
  if (status === 'Due' || status === 'Paid' || status === 'Didnt join') return status;
  if (status === 'Declined' || status === 'Didnt join') return 'Didnt join';
  if (status === 'Paid' || commissionStatus === 'Paid' || status === 'Commission Paid') return 'Paid';
  if (status === 'Due' || commissionStatus === 'Due' || commissionStatus === 'Pending' || status === 'Admitted' || status === 'Commission Due') return 'Due';
  return 'Referred';
}

export function referralToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}`;
}

export function referralReminderDate(now = new Date()): string {
  const date = new Date(`${referralToday(now)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 30);
  return date.toISOString().slice(0, 10);
}

export function referralClosed(status: ReferralStatus): boolean {
  return status === 'Paid' || status === 'Didnt join';
}

export function referralForRole(referral: Referral, role: UserRole): Referral {
  const legacy = referral as Referral & { commissionStatus?: string };
  const status = referralStatus(referral.status, legacy.commissionStatus);
  const baseDate = new Date(referral.lastFollowUpAt || (status === 'Due' ? referral.updatedAt : referral.referredAt) || referral.referredAt);
  const nextFollowUpDate = referralClosed(status) ? null : referral.nextFollowUpDate ||
    (Number.isNaN(baseDate.getTime()) ? undefined : referralReminderDate(baseDate));
  return {
    id: referral.id, leadId: referral.leadId, leadName: referral.leadName,
    partnershipId: referral.partnershipId, institutionId: referral.institutionId,
    institutionName: referral.institutionName,
    status,
    referredAt: referral.referredAt, referredBy: referral.referredBy,
    intimatedAt: referral.intimatedAt, intimatedBy: referral.intimatedBy,
    notificationChannel: referral.notificationChannel, updatedAt: referral.updatedAt,
    lastFollowUpAt: referral.lastFollowUpAt, followUpChannel: referral.followUpChannel,
    nextFollowUpDate, timeline: role === UserRole.Admin ? referral.timeline : [],
  };
}

export function referralUpdate(existing: Referral, updates: Partial<Referral>, now = new Date()): Partial<Referral> {
  const current = referralForRole(existing, UserRole.Admin);
  const status = updates.status || current.status;
  if (updates.followUpChannel && referralClosed(status)) throw new Error('Invalid: This referral is closed.');
  const patch: Partial<Referral> = { ...updates, status, updatedAt: now.toISOString() };
  if (referralClosed(status)) patch.nextFollowUpDate = null;
  else if (updates.followUpChannel || (updates.status && updates.status !== current.status)) patch.nextFollowUpDate = referralReminderDate(now);
  else if (current.nextFollowUpDate) patch.nextFollowUpDate = current.nextFollowUpDate;
  if (updates.followUpChannel) patch.lastFollowUpAt = now.toISOString();
  return patch;
}

export function referralReminderDue(referral: Referral, now = new Date()): boolean {
  return !referralClosed(referral.status) && !!referral.nextFollowUpDate && referral.nextFollowUpDate <= referralToday(now);
}

export function referralFollowUpMessage(referral: Referral, contactName: string, templates: { id: string; subject?: string; message?: string }[] = []) {
  const template = templates.find(t => t.id === REFERRAL_FOLLOWUP_TEMPLATE.id);
  const values: Record<string, string> = {
    studentName: referral.leadName, institutionName: referral.institutionName, contactName,
    followUpRequest: referral.status === 'Due' ? 'The student has joined. Could you please share an update on the commission payment?'
      : 'Could you please confirm whether the student has joined your institute?',
  };
  const fill = (text: string) => text.replace(/\{(studentName|institutionName|contactName|followUpRequest)\}/g, (_, key) => values[key]);
  return { subject: fill(template?.subject || REFERRAL_FOLLOWUP_TEMPLATE.subject), body: fill(template?.message || REFERRAL_FOLLOWUP_TEMPLATE.message) };
}

export function partnerForReferral(partner: Partnership): ReferralPartner {
  return {
    id: partner.id, institutionId: partner.institutionId,
    institutionName: partner.institutionName, pointOfContact: partner.pointOfContact,
    status: partner.status,
  };
}

export function partnerWhatsAppLink(phone: string, message: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
