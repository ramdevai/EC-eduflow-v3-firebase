import { describe, it, expect } from 'vitest';
import { getWhatsAppLink, getEmailLink } from '@/lib/messaging-utils';
import { Lead } from '@/lib/types';

describe('messaging utils', () => {
  const mockLead: Lead = {
    id: 1,
    name: 'John Doe',
    phone: '9876543210',
    email: 'john@example.com',
    stage: 'New',
    registrationToken: 'test-token',
    grade: '10th',
    board: 'CBSE',
    inquiryDate: '2024-03-19',
    updatedAt: '2024-03-19',
    status: 'Open',
    feesPaid: 'Due',
    communityJoined: 'No',
  } as any;

  it('should generate correct registration link for onboarding', () => {
    const link = getWhatsAppLink(mockLead, 'onboarding');
    const decoded = decodeURIComponent(link);
    expect(decoded).toContain('register/test-token');
    expect(decoded).not.toContain('careertest.edumilestones.com');
  });

  it('should generate correct test link for test stage', () => {
    const link = getWhatsAppLink(mockLead, 'test');
    const decoded = decodeURIComponent(link);
    expect(decoded).toContain('careertest.edumilestones.com');
    expect(decoded).not.toContain('register/test-token');
  });

  it('should use lead.testLink if provided for test stage', () => {
    const leadWithTest = { ...mockLead, testLink: 'https://custom-test.com' };
    const link = getWhatsAppLink(leadWithTest as any, 'test');
    const decoded = decodeURIComponent(link);
    expect(decoded).toContain('https://custom-test.com');
  });

  it('should fallback to suggested test link if lead.testLink is missing for test stage', () => {
    const leadNoTest = { ...mockLead, testLink: '', grade: '10th', board: 'CBSE' };
    const link = getWhatsAppLink(leadNoTest as any, 'test');
    const decoded = decodeURIComponent(link);
    expect(decoded).toContain('as12'); // as12 is the code for 8th-10th
  });

  it('should generate correct nudge link for test_nudge', () => {
    const link = getWhatsAppLink(mockLead, 'test_nudge');
    const decoded = decodeURIComponent(link);
    expect(decoded).toContain('gentle nudge');
    expect(decoded).toContain('careertest.edumilestones.com');
  });

  it('should generate correct mailto link with subject and body', () => {
    const link = getEmailLink(mockLead);
    const decoded = decodeURIComponent(link);
    expect(decoded).toContain('mailto:john@example.com');
    expect(decoded).toContain('John Doe - Career Counseling Report');
    expect(decoded).toContain('Dear Parent');
  });
});
