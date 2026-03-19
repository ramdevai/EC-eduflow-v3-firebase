import { describe, it, expect } from 'vitest';
import { mapRowToLead, mapLeadToRow } from '@/lib/db-sheets';
import { Lead } from '@/lib/types';

describe('db-sheets mapping logic', () => {
  const sampleRow = [
    '1', 'John Doe', '+123456789', 'john@example.com', 'New', '2024-03-19', '2024-03-19',
    'contact_123', '123 Main St', 'Male', '2005-01-01', '10th', 'CBSE', 'Sample School',
    'Reading', 'Father Name', '987654321', 'father@example.com', 'Engineer',
    'Mother Name', '123123123', 'mother@example.com', 'Teacher', 'Google Search',
    'Some comments', 'Some notes', '2024-03-20', 'test_link', '2024-03-21T10:00:00',
    'TRUE', '5000', 'UPI', 'txn_789', '2024-03-22', '2024-03-23', 'report.pdf', 'FALSE',
    'token_abc', 'event_xyz', '2024-03-19T12:00:00', 'Open'
  ];

  it('should map a sheet row to a Lead object', () => {
    const lead = mapRowToLead(sampleRow);
    expect(lead.id).toBe(1);
    expect(lead.name).toBe('John Doe');
    expect(lead.phone).toBe('+123456789');
    expect(lead.email).toBe('john@example.com');
    expect(lead.stage).toBe('New');
    expect(lead.feesPaid).toBe('Paid');
    expect(lead.communityJoined).toBe('No');
    expect(lead.registrationToken).toBe('token_abc');
    expect(lead.status).toBe('Open');
  });

  it('should map a Lead object back to a sheet row correctly', () => {
    const lead: Lead = mapRowToLead(sampleRow);
    const row = mapLeadToRow(lead);
    
    // Check key fields match the sampleRow (some might be strings vs numbers but sheet expects string-like anyway)
    expect(row[0]).toBe(1);
    expect(row[1]).toBe('John Doe');
    expect(row[4]).toBe('New');
    expect(row[29]).toBe('Paid'); // maps feesPaid
    expect(row[36]).toBe('No');   // maps communityJoined
    expect(row[37]).toBe('token_abc');
  });

  it('should handle boolean-like strings for feesPaid and communityJoined', () => {
    const rowWithFalse = [...sampleRow];
    rowWithFalse[29] = 'FALSE'; // feesPaid
    rowWithFalse[36] = 'TRUE';  // communityJoined
    
    const lead = mapRowToLead(rowWithFalse);
    expect(lead.feesPaid).toBe('Due');
    expect(lead.communityJoined).toBe('Yes');
  });

  it('should ignore boolean-like strings in registrationToken', () => {
    const rowWithFalseToken = [...sampleRow];
    rowWithFalseToken[37] = 'FALSE';
    
    const lead = mapRowToLead(rowWithFalseToken);
    expect(lead.registrationToken).toBe('');

    const rowWithTrueToken = [...sampleRow];
    rowWithTrueToken[37] = 'true';
    const leadTrue = mapRowToLead(rowWithTrueToken);
    expect(leadTrue.registrationToken).toBe('');
  });
});
