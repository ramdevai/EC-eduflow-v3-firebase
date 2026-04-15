import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { addLeads } from '@/lib/db-firestore';
import { safeFormat, safeParseISO, computeLeadStatus, normalizeStage } from '@/lib/utils';

export async function POST(req: Request) {
  const session = await auth() as any;
  const { rows, externalSheetId, handleDuplicates = 'skip', source } = await req.json();

  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
  }

  if (externalSheetId) {
    return NextResponse.json({
      success: true,
      message: "Lead import functionality via Google Sheets is deprecated and no longer active.",
      imported: 0,
      skipped: 0,
    }, { status: 200 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'No data provided' }, { status: 400 });
  }

    try {
    const leadsToImport: any[] = [];
    let skipped = 0;

    for (const row of rows) {
      const email = (row.email || row.Email || row.EMAIL || '').toString().trim().toLowerCase();
      const phone = (row.phone || row.Phone || row.PHONE || row.mobile || row.Mobile || '').toString().replace(/\D/g, '').slice(-10);
      const name = (row.name || row.Name || row.NAME || row.student || row.Student || '').toString().trim();

      if (!name || (!email && !phone)) {
        skipped++;
        continue;
      }

      const rawStage = row.stage || row.Stage || row.STAGE || row.Stage || 'New';
      const normalizedStage = normalizeStage(rawStage);
      const csvStatus = row.status || row.Status || row.STATUS;
      const computedStatus = computeLeadStatus(normalizedStage, csvStatus);

      const inquiryDateRaw = row.inquiryDate || row.InquiryDate || row['Inquiry Date'] || row.timestamp || row.Timestamp || row.date || row.Date;
      const inquiryDate = inquiryDateRaw ? safeFormat(safeParseISO(inquiryDateRaw)) : '';

      const lead = {
        name,
        email: email || '',
        phone: phone || '',
        grade: (row.grade || row.Grade || row.class || row.Class || '10th').toString().trim(),
        board: (row.board || row.Board || 'CBSE').toString().trim(),
        source: row.source || row.Source || row['Source'] || source || 'CSV Import',
        status: computedStatus,
        stage: normalizedStage as any,
        inquiryDate,
        notes: row.notes || row.Notes || row.comments || row.Comments || 'Imported from CSV',
        lastFollowUp: safeFormat(new Date()),
        testLink: '',
        appointmentTime: '',
        feesPaid: 'Due' as any,
        feesAmount: '',
        paymentMode: '',
        transactionId: '',
        reportSentDate: '',
        convertedDate: '',
        communityJoined: 'No' as any,
      };

      leadsToImport.push(lead);
    }


    const importedIds = await addLeads(session.user.id, session.user.role as UserRole, leadsToImport);

    return NextResponse.json({
      success: true,
      imported: importedIds.length,
      skipped,
      message: `Successfully imported ${importedIds.length} leads from CSV.`
    });
  } catch (error: any) {
    console.error('CSV execute error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
