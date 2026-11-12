import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { normalizeLeadPhone } from './normalize-lead-phone.mjs';

export const WebsiteIntakeSchema = z.object({
  requestId: z.string().uuid(),
  submittedAt: z.string().datetime(),
  contact: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(8).max(24),
    email: z.string().trim().email().max(254).or(z.literal('')),
  }).strict().transform((contact, context) => {
    const phoneNormalized = normalizeLeadPhone(contact.phone);
    if (!phoneNormalized) {
      context.addIssue({ code: 'custom', path: ['phone'], message: 'Invalid phone number' });
      return z.NEVER;
    }
    return { ...contact, phoneNormalized };
  }),
  persona: z.enum(['student', 'parent', 'professional', 'school']),
  interest: z.enum([
    'subject-selection',
    'career-counselling',
    'psychometric-assessment',
    'international-education',
    'school-partnership',
    'other',
  ]),
  message: z.string().trim().max(1200),
  consent: z.object({
    contact: z.literal(true),
    version: z.literal('website-enquiry-v1'),
  }).strict(),
  attribution: z.object({
    source: z.string().trim().max(100),
    medium: z.string().trim().max(100),
    campaign: z.string().trim().max(150),
    content: z.string().trim().max(150),
    term: z.string().trim().max(150),
    landingPage: z.string().trim().max(500),
    referrer: z.string().trim().max(500),
  }).strict(),
  clientFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

export type WebsiteIntake = z.infer<typeof WebsiteIntakeSchema>;

export function createWebsiteIntakeSignature(
  secret: string,
  timestamp: string,
  requestId: string,
  body: string,
): string {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${requestId}.${body}`)
    .digest('hex');
}

export function verifyWebsiteIntakeSignature(input: {
  secret: string;
  timestamp: string;
  requestId: string;
  signature: string;
  body: string;
  nowSeconds?: number;
}): boolean {
  const timestampNumber = Number(input.timestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isInteger(timestampNumber) || Math.abs(now - timestampNumber) > 300) return false;

  const supplied = input.signature.replace(/^sha256=/, '');
  if (!/^[0-9a-f]{64}$/i.test(supplied)) return false;

  const expected = createWebsiteIntakeSignature(
    input.secret,
    input.timestamp,
    input.requestId,
    input.body,
  );
  return timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'));
}
