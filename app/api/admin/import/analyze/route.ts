import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllLeads } from '@/lib/db-firestore';
import { UserRole } from '@/lib/types';
import { google } from 'googleapis'; // Temporarily re-introduce for external sheet reading

import { getAdminAuthClient } from '@/lib/google-auth';

async function getSheetsClient() {
  try {
    const auth = getAdminAuthClient();
    return google.sheets({ version: 'v4', auth });
  } catch (error: any) {
    console.error('Failed to initialize Google Sheets client:', error.message);
    throw new Error(`Google API Init Error: ${error.message}`);
  }
}

export async function POST(req: Request) {
  const session = await auth() as any;
  const { externalSheetId } = await req.json();

  if (!session?.user?.id || (session?.user?.role !== UserRole.Admin && session?.user?.role !== UserRole.Staff) || !externalSheetId) {
    return NextResponse.json({ error: 'Missing configuration or authentication' }, { status: 400 });
  }

  try {
    const sheets = await getSheetsClient();
    
    // 1. Get External Data
    const externalRes = await sheets.spreadsheets.values.get({
      spreadsheetId: externalSheetId,
      range: 'A1:AO5000', // Increased limit
    });

    const externalRows = externalRes.data.values || [];
    if (externalRows.length < 2) {
      return NextResponse.json({ error: 'No data found in external sheet' }, { status: 400 });
    }

    const headers = externalRows[0].map(h => h.toLowerCase().trim());
    const dataRows = externalRows.slice(1);

    // 2. Get Existing Data for Duplicate Check
    const existingLeads = await getAllLeads(session.user.id, session.user.role as UserRole);
    const existingEmails = new Set(existingLeads.map(l => l.email?.toLowerCase().trim()).filter(Boolean));
    const existingPhones = new Set(existingLeads.map(l => l.phone?.replace(/\D/g, '').slice(-10)).filter(p => p.length >= 10));

    let duplicatesCount = 0;
    const leadsToImport = [];

    // Find indices
    const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail') || h.includes('id'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('number') || h.includes('whatsapp') || h.includes('tel'));

    for (const row of dataRows) {
      if (!row || row.length === 0) continue; // Skip empty rows

      const email = emailIdx !== -1 ? (row[emailIdx] || '').toString().toLowerCase().trim() : '';
      const phoneRaw = phoneIdx !== -1 ? (row[phoneIdx] || '').toString().replace(/\D/g, '') : '';
      const phone = phoneRaw.slice(-10); // Standardize to last 10 digits

      const isDuplicate = (email && existingEmails.has(email)) || (phone && phone.length >= 10 && existingPhones.has(phone));
      
      if (isDuplicate) {
        duplicatesCount++;
      }
      leadsToImport.push(row);
    }

    return NextResponse.json({
      total: leadsToImport.length,
      duplicates: duplicatesCount,
      matchedFields: {
        email: emailIdx !== -1 ? externalRows[0][emailIdx] : null,
        phone: phoneIdx !== -1 ? externalRows[0][phoneIdx] : null,
      },
      headers: externalRows[0],
      sample: dataRows[0]
    });

  } catch (error: any) {
    console.error('Import analysis error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
