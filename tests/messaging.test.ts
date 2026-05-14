import { describe, it, expect } from 'vitest';
import { getWhatsAppLink, getEmailLink, getTestLinkByGrade } from '@/lib/messaging-utils';
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

  it('should generate correct fees reminder link', () => {
    const link = getWhatsAppLink(mockLead, 'fees_reminder');
    const decoded = decodeURIComponent(link);
    expect(decoded).toContain('professional fees');
  });

  it('should generate correct mailto link with subject and body', () => {
    const link = getEmailLink(mockLead);
    const decoded = decodeURIComponent(link);
    expect(decoded).toContain('mailto:john@example.com');
    expect(decoded).toContain('John Doe - Career Counseling Report');
    expect(decoded).toContain('Dear Parent');
  });
});

describe('getTestLinkByGrade', () => {
  it('should return 2nd-7th test for grade 2', () => {
    expect(getTestLinkByGrade('2nd', 'CBSE')).toContain('as11');
  });

  it('should return 8th-10th test for grade 8', () => {
    expect(getTestLinkByGrade('8th', 'CBSE')).toContain('as12');
  });

  it('should return 8th-10th test for grade 10', () => {
    expect(getTestLinkByGrade('10th', 'CBSE')).toContain('as12');
  });

  it('should return 11th-12th test for grade 11', () => {
    expect(getTestLinkByGrade('11th', 'CBSE')).toContain('as13');
  });

  it('should return 11th-12th test for grade 12 (not 2nd-7th)', () => {
    const link = getTestLinkByGrade('12th', 'CBSE');
    expect(link).toContain('as13');
    expect(link).not.toContain('as11');
  });

  it('should return High School (IBDP/A-level) for IB board with grade 11', () => {
    expect(getTestLinkByGrade('11th', 'IB')).toContain('as72');
  });

  it('should return Secondary (IB/IGCSE) for IB board with grade 8', () => {
    expect(getTestLinkByGrade('8th', 'IGCSE')).toContain('as71');
  });

  it('should return Graduate for grad keyword', () => {
    expect(getTestLinkByGrade('Graduate', '')).toContain('as14');
  });

  it('should return undefined for unrecognized grade', () => {
    expect(getTestLinkByGrade('unrecognized', 'CBSE')).toBeUndefined();
  });

  it('should return undefined when grade is undefined', () => {
    expect(getTestLinkByGrade(undefined, 'CBSE')).toBeUndefined();
  });
});
