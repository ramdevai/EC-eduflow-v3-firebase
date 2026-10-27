import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@/lib/types';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getAllLeads: vi.fn(),
  addLeads: vi.fn(),
  updateLeads: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db-firestore', () => ({
  getAllLeads: mocks.getAllLeads,
  addLeads: mocks.addLeads,
  updateLeads: mocks.updateLeads,
}));
import { POST } from '@/app/api/admin/import/execute/route';

const existingLead = {
  id: 'lead-1',
  ownerUid: 'owner',
  name: 'Existing Student',
  phone: '9999999999',
  email: 'existing@example.com',
  stage: 'Test sent',
  status: 'Open',
  feesAmount: '5000',
  notes: 'Prefers evening calls',
  fatherName: 'Father Name',
  feesPaid: 'Paid',
};

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/import/execute', { method: 'POST', body: JSON.stringify(body) });
}

describe('CSV bulk import execute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: UserRole.Admin } });
    mocks.getAllLeads.mockResolvedValue([existingLead]);
    mocks.addLeads.mockImplementation(async (_uid: string, _role: UserRole, leads: unknown[]) => leads.map((_, i) => `new-${i}`));
    mocks.updateLeads.mockResolvedValue(undefined);
  });

  it('skips matched rows when handleDuplicates is "skip"', async () => {
    const row = { name: 'Existing Student', phone: '9999999999' };
    const response = await POST(request({ rows: [row], handleDuplicates: 'skip' }));
    const data = await response.json();

    expect(data.updated).toBe(0);
    expect(data.skipped).toBe(1);
    expect(mocks.updateLeads).not.toHaveBeenCalled();
  });

  it('updates matched rows when handleDuplicates is "update"', async () => {
    const row = { name: 'Existing Student', phone: '9999999999', notes: 'New note from CSV' };
    const response = await POST(request({ rows: [row], handleDuplicates: 'update' }));
    const data = await response.json();

    expect(data.updated).toBe(1);
    expect(mocks.updateLeads).toHaveBeenCalledTimes(1);
    const [, , updates] = mocks.updateLeads.mock.calls[0];
    expect(updates[0].data.notes).toBe('New note from CSV');
  });

  it('does not blank existing fields the CSV row omits', async () => {
    const row = { name: 'Existing Student', phone: '9999999999' }; // no notes/feesAmount/fatherName/feesPaid columns
    await POST(request({ rows: [row], handleDuplicates: 'update' }));

    const [, , updates] = mocks.updateLeads.mock.calls[0];
    const data = updates[0].data;
    expect(data).not.toHaveProperty('notes');
    expect(data).not.toHaveProperty('feesAmount');
    expect(data).not.toHaveProperty('fatherName');
    expect(data).not.toHaveProperty('feesPaid');
  });

  it('still fills defaults for brand-new leads', async () => {
    const row = { name: 'Brand New Lead', phone: '1231231231' };
    const response = await POST(request({ rows: [row], handleDuplicates: 'update' }));
    const data = await response.json();

    expect(data.imported).toBe(1);
    const [, , newLeads] = mocks.addLeads.mock.calls[0];
    expect(newLeads[0].feesPaid).toBe('Due');
    expect(newLeads[0].communityJoined).toBe('No');
    expect(newLeads[0].stage).toBe('New');
  });
});
