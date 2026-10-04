import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@/lib/types';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), send: vi.fn(), record: vi.fn(), getLead: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/email', () => ({ sendEmailWithSentCopy: mocks.send }));
vi.mock('@/lib/server-follow-ups', () => ({ recordFollowUp: mocks.record }));
vi.mock('@/lib/server-firebase', () => ({ adminDb: { collection: () => ({ doc: () => ({ get: mocks.getLead }) }) } }));
import { POST } from '@/app/api/email/send/route';

function request(patch: Record<string, string> = {}) {
  const form = new FormData();
  const fields = { to: 'parent@example.com', subject: 'Assessment link', body: 'Here is your assessment link.', leadId: 'lead-1', messageType: 'test', requestId: '9d1a7e6c-2f63-4b8f-a195-43f4fa819b78', ...patch };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new Request('http://localhost/api/email/send', { method: 'POST', body: form });
}

describe('sent email follow-up history', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'staff-1', role: UserRole.Staff, name: 'Staff' } });
    mocks.getLead.mockResolvedValue({ exists: true });
    mocks.send.mockResolvedValue({ success: true, savedToSent: true });
    mocks.record.mockResolvedValue({ entry: { id: 'entry-1' }, summary: { followUpCount: 1 } });
  });

  it('records the actual email only after sending succeeds', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).followUp.summary.followUpCount).toBe(1);
    expect(mocks.record).toHaveBeenCalledWith('staff-1', UserRole.Staff, 'Staff', 'lead-1', expect.objectContaining({ channel: 'Email', outcome: 'Message sent', messageType: 'test', message: '', notes: '' }));
    expect(mocks.send.mock.invocationCallOrder[0]).toBeLessThan(mocks.record.mock.invocationCallOrder[0]);
  });
  it('does not record a failed send', async () => {
    mocks.send.mockResolvedValue({ success: false, message: 'Send failed' });
    expect((await POST(request())).status).toBe(500);
    expect(mocks.record).not.toHaveBeenCalled();
  });
  it('reports sent status with a warning if history persistence fails', async () => {
    mocks.record.mockRejectedValue(new Error('Unavailable'));
    const response = await POST(request());
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.followUpWarning).toContain('do not resend');
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it.each<Record<string, string>>([{ messageType: 'unknown' }, { requestId: 'invalid' }, { leadId: 'bad/id' }])('rejects invalid history details before sending: %j', async patch => {
    expect((await POST(request(patch))).status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('rejects missing leads before sending', async () => {
    mocks.getLead.mockResolvedValue({ exists: false });
    expect((await POST(request())).status).toBe(404);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('requires an authorized staff session', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    mocks.auth.mockResolvedValue({ user: { id: 'user', role: 'unknown' } });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
