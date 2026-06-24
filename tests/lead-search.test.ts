import { describe, expect, it } from 'vitest';
import { leadMatchesSearch } from '@/lib/lead-search';
import { Lead } from '@/lib/types';

const lead = {
  id: 'lead-1',
  name: 'Primary Contact',
  phone: '+91 98765 43210',
  email: 'parent@example.com',
  studentName: 'Niharika Singh',
  studentPhone: '+91 90000 00123',
  studentEmail: 'student@example.com',
  stage: 'Report sent',
  status: 'Won',
  grade: '10th',
  board: 'CBSE',
  school: 'Example International School',
  fatherName: 'Family Contact',
  notes: 'Interested in design careers',
} as Lead;

describe('leadMatchesSearch', () => {
  it('matches primary and student contact fields', () => {
    expect(leadMatchesSearch(lead, 'Primary Contact')).toBe(true);
    expect(leadMatchesSearch(lead, 'Niharika')).toBe(true);
    expect(leadMatchesSearch(lead, 'student@example.com')).toBe(true);
  });

  it('matches profile and workflow fields', () => {
    expect(leadMatchesSearch(lead, 'International School')).toBe(true);
    expect(leadMatchesSearch(lead, 'design careers')).toBe(true);
    expect(leadMatchesSearch(lead, 'Report sent')).toBe(true);
  });

  it('normalizes phone-number formatting', () => {
    expect(leadMatchesSearch(lead, '9876543210')).toBe(true);
    expect(leadMatchesSearch(lead, '9000000123')).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(leadMatchesSearch(lead, 'unrelated person')).toBe(false);
  });
});
