import { z } from 'zod';

export const FOLLOW_UP_CHANNELS = ['WhatsApp', 'Call', 'Email', 'In person'] as const;
export const FOLLOW_UP_OUTCOMES = ['Message sent', 'No response', 'Connected', 'Requested more time', 'Interested', 'Not interested'] as const;

export const FOLLOW_UP_MESSAGE_LABELS = {
  onboarding: 'Registration link sent',
  test: 'Assessment link sent',
  test_nudge: 'Assessment reminder',
  followup: 'Inquiry follow up',
  registration_reminder: 'Registration reminder',
  community: 'Community invitation',
  review: 'Review request',
  birthday: 'Birthday message',
  fees_reminder: 'Fees reminder',
  report_email: 'Career report sent',
  location: 'Location shared',
} as const;
export const followUpMessageTypeSchema = z.enum(Object.keys(FOLLOW_UP_MESSAGE_LABELS) as [keyof typeof FOLLOW_UP_MESSAGE_LABELS, ...(keyof typeof FOLLOW_UP_MESSAGE_LABELS)[]]);

export const followUpSchema = z.object({
  requestId: z.string().uuid(),
  channel: z.enum(FOLLOW_UP_CHANNELS),
  outcome: z.enum(FOLLOW_UP_OUTCOMES),
  happenedAt: z.iso.datetime({ offset: true }).refine(value => Date.parse(value) <= Date.now() + 60_000, 'Contact date cannot be in the future'),
  notes: z.string().trim().max(2000).default(''),
  message: z.string().trim().max(10000).default(''),
  messageType: followUpMessageTypeSchema.optional(),
  nextFollowUpDate: z.string().refine(value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Choose a valid next follow-up date').default(''),
}).strict();

export type FollowUpInput = z.infer<typeof followUpSchema>;
export interface FollowUpEntry extends Omit<FollowUpInput, 'requestId'> {
  id: string;
  recordedAt: string;
  recordedBy: string;
  recordedByName: string;
}
export interface FollowUpSummary {
  followUpCount: number;
  lastFollowUp: string;
  lastFollowUpOutcome: string;
  nextFollowUpDate: string;
}

export function nextFollowUpSummary(current: Partial<FollowUpSummary>, entry: FollowUpInput): FollowUpSummary {
  const latest = !current.lastFollowUp || Date.parse(entry.happenedAt) >= Date.parse(current.lastFollowUp);
  return {
    followUpCount: (current.followUpCount || 0) + 1,
    lastFollowUp: latest ? entry.happenedAt : current.lastFollowUp || '',
    lastFollowUpOutcome: latest ? entry.outcome : current.lastFollowUpOutcome || '',
    nextFollowUpDate: latest ? (entry.outcome === 'Message sent' ? entry.nextFollowUpDate || current.nextFollowUpDate || '' : entry.nextFollowUpDate) : current.nextFollowUpDate || '',
  };
}

export const WHATSAPP_FOLLOW_UP_EVENT = 'eduflow:whatsapp-follow-up';
export interface WhatsAppFollowUpDraft {
  requestId: string;
  leadId: string;
  messageType: keyof typeof FOLLOW_UP_MESSAGE_LABELS;
  happenedAt: string;
}
