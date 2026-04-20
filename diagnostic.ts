import { parse } from 'csv-parse/sync';
import fs from 'fs';

// 1. Read CSV
const csvContent = fs.readFileSync('EduCompass CRM Workspace - Leads.csv', 'utf-8');
const rows = parse(csvContent, { columns: true, skip_empty_lines: true });

// 2. Identify Potential "New" Leads (Missing Email and Phone)
const potentialNew = rows.filter((row: any) => {
  const email = (row.Email || row.email || '').trim();
  const phone = (row.Phone || row.phone || '').replace(/\D/g, '');
  return !email && phone.length < 10;
});

console.log('Potential Unmatchable Leads (Missing Email & valid Phone):', potentialNew.length);
potentialNew.slice(0, 5).forEach((p: any) => console.log(`- ${p.Name || p.name} (ID: ${p.ID})`));
