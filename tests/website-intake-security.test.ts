import { describe, expect, it } from 'vitest';
import {
  createWebsiteIntakeSignature,
  normalizeWebsitePhone,
  verifyWebsiteIntakeSignature,
  WebsiteIntakeSchema,
} from '@/lib/website-intake-security';

describe('website intake security', () => {
  it('normalizes Indian mobile numbers', () => {
    expect(normalizeWebsitePhone('98765 43210')).toBe('+919876543210');
    expect(normalizeWebsitePhone('+91 98765 43210')).toBe('+919876543210');
  });

  it('verifies a fresh signed request and rejects tampering', () => {
    const timestamp = '1700000000';
    const requestId = 'a19fe7bb-c3a2-4b92-9df0-4b321b91ec0a';
    const body = '{"ok":true}';
    const signature = createWebsiteIntakeSignature('secret', timestamp, requestId, body);
    const base = { secret: 'secret', timestamp, requestId, signature: `sha256=${signature}`, nowSeconds: 1700000000 };

    expect(verifyWebsiteIntakeSignature({ ...base, body })).toBe(true);
    expect(verifyWebsiteIntakeSignature({ ...base, body: `${body} ` })).toBe(false);
  });

  it('rejects replayed requests outside the five minute window', () => {
    const timestamp = '1700000000';
    const requestId = 'a19fe7bb-c3a2-4b92-9df0-4b321b91ec0a';
    const body = '{}';
    const signature = createWebsiteIntakeSignature('secret', timestamp, requestId, body);
    expect(verifyWebsiteIntakeSignature({
      secret: 'secret', timestamp, requestId, signature, body, nowSeconds: 1700000400,
    })).toBe(false);
  });

  it('does not accept internal CRM fields', () => {
    const result = WebsiteIntakeSchema.safeParse({
      requestId: 'a19fe7bb-c3a2-4b92-9df0-4b321b91ec0a',
      submittedAt: '2026-09-30T12:00:00.000Z',
      contact: { name: 'Anita Shah', phone: '9876543210', email: '' },
      persona: 'parent',
      interest: 'subject-selection',
      message: '',
      consent: { contact: true, version: 'website-enquiry-v1' },
      attribution: { source: '', medium: '', campaign: '', content: '', term: '', landingPage: '/', referrer: '' },
      clientFingerprint: 'a'.repeat(64),
      ownerUid: 'attacker-controlled',
    });
    expect(result.success).toBe(false);
  });
});
