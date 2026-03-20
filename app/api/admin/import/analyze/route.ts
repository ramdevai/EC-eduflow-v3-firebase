import { NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { auth } from '@/lib/auth';
import { getAllLeads } from '@/lib/db-sheets';

export async function POST(req: Request) {
  const session = await auth() as any;
  const targetSheetId = req.headers.get('x-sheet-id');
  const { externalSheetId } = await req.json();

  if (!session?.accessToken || !targetSheetId || !externalSheetId) {
    return NextResponse.json({ error: 'Missing configuration' }, { status: 400 });
  }

  try {
    const sheets = await getSheetsClient(session.accessToken);
    
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
    const existingLeads = await getAllLeads(targetSheetId, session.accessToken);
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
