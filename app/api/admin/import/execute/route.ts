import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole, Lead, FeesPaidStatus, CommunityJoinedStatus } from '@/lib/types';
import { addLeads, updateLeads, getAllLeads } from '@/lib/db-firestore';
import { safeFormat, safeParseISO, computeLeadStatus, normalizeStage } from '@/lib/utils';

export async function POST(req: Request) {
  const session = await auth() as any;
  const { rows, externalSheetId, handleDuplicates = 'update', source } = await req.json();

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
    const existingLeads = await getAllLeads(session.user.id, session.user.role as UserRole);
    const emailMap = new Map<string, Lead>();
    const phoneMap = new Map<string, Lead>();
    const googleIdMap = new Map<string, Lead>();
    const nameMap = new Map<string, Lead>();

    existingLeads.forEach(l => {
      if (l.email) emailMap.set(l.email.toLowerCase().trim(), l);
      if (l.phone) phoneMap.set(l.phone.replace(/\D/g, '').slice(-10), l);
      if (l.googleContactId) googleIdMap.set(l.googleContactId.trim(), l);
      if (l.name) nameMap.set(l.name.toLowerCase().trim(), l);
    });

    const leadsToImport: any[] = [];
    const leadsToUpdate: { id: string; data: Partial<Lead> }[] = [];
    let skipped = 0;
    let updatedCount = 0;

    for (const row of rows) {
      const email = (row.email || row.Email || row.EMAIL || '').toString().trim().toLowerCase();
      const phoneRaw = (row.phone || row.Phone || row.PHONE || row.mobile || row.Mobile || '').toString();
      const phone = phoneRaw.replace(/\D/g, '').slice(-10);
      const name = (row.name || row.Name || row.NAME || row.student || row.Student || '').toString().trim();
      const googleId = (row.googleContactId || row.GoogleContactId || row['Google Contact ID'] || '').toString().trim();

      if (!name) {
        skipped++;
        continue;
      }

      // We allow leads even with only a name, especially if it matches an existing orphan
      // Or if it has any other identifier
      const rawStage = row.stage || row.Stage || row.STAGE || 'New';
      const normalizedStage = normalizeStage(rawStage);
      const csvStatus = row.status || row.Status || row.STATUS;
      const computedStatus = computeLeadStatus(normalizedStage, csvStatus);

      const inquiryDateRaw = row.inquiryDate || row.InquiryDate || row['Inquiry Date'] || row.timestamp || row.Timestamp || row.date || row.Date;
      const inquiryDate = inquiryDateRaw ? safeFormat(safeParseISO(inquiryDateRaw)) : '';

      const lastStageUpdateRaw = row.lastStageUpdate || row.LastStageUpdate || row['Last Stage Update'];
      const lastStageUpdate = lastStageUpdateRaw ? safeFormat(safeParseISO(lastStageUpdateRaw)) : '';

      const leadData: Partial<Lead> = {
        name,
        email: email || '',
        phone: phone || '',
        address: (row.address || row.Address || '').toString().trim(),
        gender: (row.gender || row.Gender || '').toString().trim(),
        dob: (row.dob || row.DOB || '').toString().trim(),
        grade: (row.grade || row.Grade || row.class || row.Class || '10th').toString().trim(),
        board: (row.board || row.Board || 'CBSE').toString().trim(),
        school: (row.school || row.School || '').toString().trim(),
        hobbies: (row.hobbies || row.Hobbies || '').toString().trim(),
        
        fatherName: (row.fatherName || row.FatherName || row['Father Name'] || '').toString().trim(),
        fatherPhone: (row.fatherPhone || row.FatherPhone || row['Father Phone'] || '').toString().trim(),
        fatherEmail: (row.fatherEmail || row.FatherEmail || row['Father Email'] || '').toString().trim(),
        fatherOccupation: (row.fatherOccupation || row.FatherOccupation || row['Father Occupation'] || '').toString().trim(),
        
        motherName: (row.motherName || row.MotherName || row['Mother Name'] || '').toString().trim(),
        motherPhone: (row.motherPhone || row.MotherPhone || row['Mother Phone'] || '').toString().trim(),
        motherEmail: (row.motherEmail || row.MotherEmail || row['Mother Email'] || '').toString().trim(),
        motherOccupation: (row.motherOccupation || row.MotherOccupation || row['Mother Occupation'] || '').toString().trim(),

        source: row.source || row.Source || row['Source'] || source || 'CSV Import',
        comments: (row.comments || row.Comments || '').toString().trim(),
        status: computedStatus,
        stage: normalizedStage as any,
        inquiryDate,
        lastStageUpdate,
        notes: (row.notes || row.Notes || '').toString().trim() || 'Imported from CSV',
        
        lastFollowUp: (row.lastFollowUp || row.LastFollowUp || row['Last Follow Up'] || safeFormat(new Date())).toString().trim(),
        testLink: (row.testLink || row.TestLink || row['Test Link'] || '').toString().trim(),
        appointmentTime: (row.appointmentTime || row.AppointmentTime || row['Appointment Time'] || '').toString().trim(),
        feesPaid: (row.feesPaid || row.FeesPaid || row['Fees Paid'] || 'Due') as FeesPaidStatus,
        feesAmount: (row.feesAmount || row.FeesAmount || row['Fees Amount'] || '').toString().trim(),
        paymentMode: (row.paymentMode || row.PaymentMode || row['Payment Mode'] || '').toString().trim(),
        transactionId: (row.transactionId || row.TransactionId || row['Transaction ID'] || '').toString().trim(),
        reportSentDate: (row.reportSentDate || row.ReportSentDate || row['Report Sent Date'] || '').toString().trim(),
        convertedDate: (row.convertedDate || row.ConvertedDate || row['Converted Date'] || '').toString().trim(),
        reportPdfUrl: (row.reportPdfUrl || row.ReportPdfUrl || row['Report PDF URL'] || '').toString().trim(),
        communityJoined: (row.communityJoined || row.CommunityJoined || row['Community Joined'] || 'No') as CommunityJoinedStatus,
        registrationToken: (row.registrationToken || row.RegistrationToken || row['Registration Token'] || '').toString().trim(),
        calendarEventId: (row.calendarEventId || row.CalendarEventId || row['Calendar Event ID'] || '').toString().trim(),
        googleContactId: (row.googleContactId || row.GoogleContactId || row['Google Contact ID'] || '').toString().trim(),
        communicateViaEmailOnly: row.communicateViaEmailOnly === 'TRUE' || row.communicateViaEmailOnly === true,
      };

      const existingByEmail = email ? emailMap.get(email) : null;
      const existingByPhone = phone ? phoneMap.get(phone) : null;
      const existingByGoogleId = googleId ? googleIdMap.get(googleId) : null;
      const existingByName = !email && !phone ? nameMap.get(name.toLowerCase()) : null;
      const existingLead = existingByEmail || existingByPhone || existingByGoogleId || existingByName;

      if (existingLead) {
        leadsToUpdate.push({ id: existingLead.id, data: leadData });
        updatedCount++;
      } else {
        leadsToImport.push(leadData);
      }
    }

    let importedCount = 0;
    if (leadsToImport.length > 0) {
      const importedIds = await addLeads(session.user.id, session.user.role as UserRole, leadsToImport);
      importedCount = importedIds.length;
    }

    if (leadsToUpdate.length > 0) {
      await updateLeads(session.user.id, session.user.role as UserRole, leadsToUpdate);
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      updated: updatedCount,
      skipped,
      message: `Successfully processed ${importedCount + updatedCount} leads (${importedCount} new, ${updatedCount} updated).`
    });
  } catch (error: any) {
    console.error('CSV execute error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
