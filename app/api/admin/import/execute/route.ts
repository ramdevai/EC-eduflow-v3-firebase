import { NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { auth } from '@/lib/auth';
import { getAllLeads, addLeads } from '@/lib/db-sheets';
import { Lead } from '@/lib/types';
import { safeParseISO, safeFormat } from '@/lib/utils';

export async function POST(req: Request) {
  const session = await auth() as any;
  const targetSheetId = req.headers.get('x-sheet-id');
  const { externalSheetId, handleDuplicates } = await req.json();

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
    const headers = externalRows[0].map(h => h.toLowerCase().trim());
    const dataRows = externalRows.slice(1);

    // 2. Get Existing for deduping if requested
    const existingLeads = await getAllLeads(targetSheetId, session.accessToken);
    const existingEmails = new Set(existingLeads.map(l => l.email?.toLowerCase().trim()).filter(Boolean));
    const existingPhones = new Set(existingLeads.map(l => l.phone?.replace(/\D/g, '').slice(-10)).filter(p => p.length >= 10));

    // 3. Find Field Indices
    const getIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));
    
    const idx = {
        timestamp: getIdx(['timestamp', 'date', 'time', 'submitted']),
        name: getIdx(['name', 'student name', 'full name']),
        phone: getIdx(['phone', 'mobile', 'contact', 'number', 'whatsapp', 'tel']),
        email: getIdx(['email', 'mail', 'id']),
        grade: getIdx(['grade', 'class']),
        board: getIdx(['board']),
        school: getIdx(['school']),
        address: getIdx(['address', 'location']),
        gender: getIdx(['gender', 'sex']),
        dob: getIdx(['dob', 'birth']),
        source: getIdx(['source', 'know', 'how did']),
        comments: getIdx(['comment', 'question', 'extra']),
        fatherName: getIdx(['father name']),
        motherName: getIdx(['mother name']),
        fatherPhone: getIdx(['father phone', 'father contact']),
        motherPhone: getIdx(['mother phone', 'mother contact']),
    };

    const leadsToInsert: Partial<Lead>[] = [];

    for (const row of dataRows) {
      if (!row || row.length === 0) continue; // Skip empty rows

      const email = idx.email !== -1 ? (row[idx.email] || '').toString().toLowerCase().trim() : '';
      const phoneRaw = idx.phone !== -1 ? (row[idx.phone] || '').toString().replace(/\D/g, '') : '';
      const phone = phoneRaw.slice(-10);

      if (handleDuplicates === 'skip') {
        const isDuplicate = (email && existingEmails.has(email)) || (phone && phone.length >= 10 && existingPhones.has(phone));
        if (isDuplicate) continue;
      }

      const timestampRaw = idx.timestamp !== -1 && row[idx.timestamp] ? row[idx.timestamp] : new Date().toISOString();
      const timestamp = safeFormat(timestampRaw);

      leadsToInsert.push({
        name: idx.name !== -1 && row[idx.name] ? row[idx.name] : 'Unknown',
        phone: idx.phone !== -1 ? row[idx.phone] || '' : '',
        email: email,
        inquiryDate: timestamp,
        stage: 'Report sent',
        status: 'Won',
        lastStageUpdate: 'Report sent',
        grade: idx.grade !== -1 ? row[idx.grade] || '' : '',
        board: idx.board !== -1 ? row[idx.board] || '' : '',
        school: idx.school !== -1 ? row[idx.school] || '' : '',
        address: idx.address !== -1 ? row[idx.address] || '' : '',
        gender: idx.gender !== -1 ? row[idx.gender] || '' : '',
        dob: idx.dob !== -1 ? row[idx.dob] || '' : '',
        source: idx.source !== -1 ? row[idx.source] || 'Import' : 'Import',
        comments: idx.comments !== -1 ? row[idx.comments] || '' : '',
        fatherName: idx.fatherName !== -1 ? row[idx.fatherName] || '' : '',
        motherName: idx.motherName !== -1 ? row[idx.motherName] || '' : '',
        fatherPhone: idx.fatherPhone !== -1 ? row[idx.fatherPhone] || '' : '',
        motherPhone: idx.motherPhone !== -1 ? row[idx.motherPhone] || '' : '',
        updatedAt: new Date().toISOString(),
      });
    }

    if (leadsToInsert.length > 0) {
      await addLeads(targetSheetId, session.accessToken, leadsToInsert);
    }

    return NextResponse.json({ 
        success: true, 
        imported: leadsToInsert.length,
        skipped: dataRows.length - leadsToInsert.length
    });

  } catch (error: any) {
    console.error('Import execution error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
