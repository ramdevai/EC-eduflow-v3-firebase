import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const WebsiteIntakeSchema = z.object({
  requestId: z.string().uuid(),
  submittedAt: z.string().datetime(),
  contact: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(10).max(24),
    email: z.string().trim().email().max(254).or(z.literal('')),
  }).strict(),
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

export function normalizeWebsitePhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 10 || digits.length > 15) throw new Error('Invalid phone number');
  return `+${digits}`;
}

export function websiteLeadIdentity(phone: string): string {
  return createHash('sha256').update(normalizeWebsitePhone(phone)).digest('hex');
}

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
