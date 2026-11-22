import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/integrations/website-leads/route';
import { createWebsiteIntakeSignature } from '@/lib/website-intake-security';

const { records, transactionReads } = vi.hoisted(() => ({
  records: new Map<string, unknown>(),
  transactionReads: new Set<string>(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server-firebase', () => {
  // Model Firestore's serializable commits with an in-memory transaction queue.
  let committed = Promise.resolve();
  return {
    adminDb: {
      collection: (name: string) => ({
        doc: (id = randomUUID()) => ({ id, path: `${name}/${id}` }),
      }),
      runTransaction: (callback: (transaction: {
        get: (ref: { path: string }) => Promise<{ exists: boolean; data: () => unknown }>;
        set: (ref: { path: string }, value: unknown) => void;
      }) => Promise<unknown>) => {
        const pending = committed.then(async () => {
          const writes = new Map<string, unknown>();
          const result = await callback({
            get: async ({ path }) => {
              transactionReads.add(path);
              return { id: path.split('/').at(-1), exists: records.has(path), data: () => records.get(path) };
            },
            set: ({ path }, value) => writes.set(path, value),
          });
          for (const [path, value] of writes) records.set(path, value);
          return result;
        });
        committed = pending.then(() => undefined, () => undefined);
        return pending;
      },
    },
  };
});

const secret = 'test-signing-secret';
const fingerprint = 'a'.repeat(64);

function signedRequest(requestId: string, phone = '98765 43210', code?: string) {
  const body = JSON.stringify({
    requestId,
    submittedAt: new Date().toISOString(),
    contact: { name: 'Test Contact', phone, email: code === undefined ? '' : 'parent@example.com' },
    persona: 'parent',
    interest: code === undefined ? 'subject-selection' : 'psychometric-assessment',
    message: '',
    consent: { contact: true, version: code === undefined ? 'website-enquiry-v1' : 'website-interest-v1' },
    ...(code !== undefined && { collaborationInterest: { studentName: 'Sample Student', grade: '10', board: 'CBSE', school: 'Sample Institute', code } }),
    attribution: { source: '', medium: '', campaign: '', content: '', term: '', landingPage: '/', referrer: '' },
    clientFingerprint: fingerprint,
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  return new Request('http://localhost/api/integrations/website-leads', {
    method: 'POST',
    headers: {
      'x-ec-timestamp': timestamp,
      'x-ec-request-id': requestId,
      'x-ec-signature': createWebsiteIntakeSignature(secret, timestamp, requestId, body),
    },
    body,
  });
}

beforeEach(() => {
  records.clear();
  transactionReads.clear();
  vi.stubEnv('CRM_WEBSITE_INTAKE_SECRET', secret);
  vi.stubEnv('WEBSITE_INTAKE_OWNER_UID', 'website-owner');
  vi.stubEnv('WEBSITE_INTAKE_RATE_LIMIT', '10');
});

afterEach(() => vi.unstubAllEnvs());

describe('website lead occurrences', () => {
  it('creates separate leads for concurrent enquiries sharing an existing customer phone', async () => {
    const customer = { phone: '+919876543210', status: 'Converted', websiteInquiryCount: 5 };
    records.set('leads/customer', customer);
    records.set('leadIdentities/phone_legacy', { leadId: 'customer' });

    const firstId = randomUUID();
    const secondId = randomUUID();
    const [firstResponse, secondResponse] = await Promise.all([
      POST(signedRequest(firstId)),
      POST(signedRequest(secondId, '+91 98765 43210')),
    ]);
    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    const [first, second] = await Promise.all([firstResponse.json(), secondResponse.json()]);
    expect(first.leadId).not.toBe(second.leadId);
    expect(first.created).toBe(true);
    expect(second.created).toBe(true);
    expect(records.get(`websiteIntakes/${firstId}`)).toMatchObject(first);
    expect(records.get(`websiteIntakes/${secondId}`)).toMatchObject(second);
    expect(records.get(`leads/${first.leadId}`)).toMatchObject({
      phone: '98765 43210',
      phoneNormalized: '+919876543210',
      stage: 'New',
      status: 'Open',
      source: 'Website',
      websiteInquiryCount: 1,
      privacy_consent: true,
      registrationToken: expect.any(String),
    });
    expect(records.get('leads/customer')).toEqual(customer);
    expect([...transactionReads].every(path => !path.startsWith('leadIdentities/'))).toBe(true);
  });

  it('returns the original result for concurrent retries and counts the enquiry once', async () => {
    const request = signedRequest(randomUUID());
    const [first, retry] = await Promise.all([POST(request.clone()), POST(request)]);
    expect(await retry.json()).toEqual(await first.json());
    expect([...records.keys()].filter(path => path.startsWith('leads/'))).toHaveLength(1);
    expect(records.get(`websiteIntakeRateLimits/${fingerprint}`)).toMatchObject({ requestCount: 1 });
  });

  it('returns the stored legacy result without resurrecting a deleted lead', async () => {
    const id = randomUUID();
    const original = { leadId: 'deleted', reference: 'OLDREF', created: false };
    records.set(`websiteIntakes/${id}`, original);
    const response = await POST(signedRequest(id));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(original);
    expect(records.size).toBe(1);
  });

  it('rejects an invalid signed phone before accessing Firestore', async () => {
    const response = await POST(signedRequest(randomUUID(), 'abc9876543210'));
    expect(response.status).toBe(400);
    expect(transactionReads.size).toBe(0);
    expect(records.size).toBe(0);
  });
});


describe('collaboration enquiries', () => {
  const campaign = { status: 'Active', code: 'CKM2601', title: 'Assessment interest', ownerUid: 'binal', offer: 'Pilot offer' };

  beforeEach(() => {
    records.set('collaborationCodes/CKM2601', { collaborationId: 'pilot' });
    records.set('collaborations/pilot', campaign);
  });

  it('maps the parent and student fields, stores the offer and preserves attribution on retry after closure', async () => {
    const id = randomUUID();
    const response = await POST(signedRequest(id, undefined, ' ckm2601 '));
    expect(response.status).toBe(201);
    const result = await response.json();
    const leadRecord = `leads/${result.leadId}`;
    expect(records.get(leadRecord)).toMatchObject({
      ownerUid: 'binal', name: 'Test Contact', email: 'parent@example.com', studentName: 'Sample Student',
      grade: '10', board: 'CBSE', school: 'Sample Institute', collaborationId: 'pilot',
      collaborationCode: 'CKM2601', collaborationTitle: 'Assessment interest', collaborationOffer: 'Pilot offer', source: 'Collaboration',
      stage: 'New', status: 'Open',
    });

    records.set('collaborations/pilot', { ...campaign, status: 'Closed' });
    expect(await (await POST(signedRequest(id, undefined, 'CKM2601'))).json()).toEqual(result);
    expect([...records.keys()].filter(path => path.startsWith('leads/'))).toEqual([leadRecord]);
  });

  it('rejects closed and unknown codes and accepts the same enquiry with the code cleared', async () => {
    records.set('collaborations/pilot', { ...campaign, status: 'Closed' });
    const id = randomUUID();
    for (const code of ['CKM2601', 'UNKNOWN']) {
      expect((await POST(signedRequest(id, undefined, code))).status).toBe(422);
    }
    expect([...records.keys()].some(path => path.startsWith('leads/'))).toBe(false);
    const response = await POST(signedRequest(id, undefined, ''));
    expect(response.status).toBe(201);
    const { leadId } = await response.json();
    expect(records.get(`leads/${leadId}`)).toMatchObject({
      name: 'Test Contact', grade: '10', ownerUid: 'website-owner', source: 'Collaboration',
    });
    expect(records.get(`leads/${leadId}`)).not.toHaveProperty('collaborationCode');
  });
});
