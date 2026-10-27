import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole, Lead, FeesPaidStatus, CommunityJoinedStatus } from '@/lib/types';
import { addLeads, updateLeads, getAllLeads } from '@/lib/db-firestore';
import { safeFormat, safeParseISO, computeLeadStatus, normalizeStage } from '@/lib/utils';

// Returns the trimmed value of the first matching, non-empty CSV column, or
// undefined when none of the aliases are present. Used to tell "column was
// blank" apart from "column was absent" so updates never clobber existing
// data with a value the CSV simply didn't provide for that row.
function extract(row: any, keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = row[key];
    if (raw !== undefined && raw !== null) {
      const val = raw.toString().trim();
      if (val !== '') return val;
    }
  }
  return undefined;
}

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

    const BOARDS = ['CBSE', 'ICSE', 'IGCSE', 'SSC', 'IB', 'STATE BOARD', 'MAHARASHTRA'];
    const GRADES = ['10TH', '12TH', '8TH', '9TH', '11TH'];

    // Simple string fields: [Lead field name, CSV header aliases].
    const SIMPLE_FIELDS: [keyof Lead, string[]][] = [
      ['address', ['address', 'Address']],
      ['gender', ['gender', 'Gender']],
      ['dob', ['dob', 'DOB']],
      ['grade', ['grade', 'Grade', 'class', 'Class']],
      ['board', ['board', 'Board']],
      ['school', ['school', 'School']],
      ['hobbies', ['hobbies', 'Hobbies']],
      ['fatherName', ['fatherName', 'FatherName', 'Father Name']],
      ['fatherPhone', ['fatherPhone', 'FatherPhone', 'Father Phone']],
      ['fatherEmail', ['fatherEmail', 'FatherEmail', 'Father Email']],
      ['fatherOccupation', ['fatherOccupation', 'FatherOccupation', 'Father Occupation']],
      ['motherName', ['motherName', 'MotherName', 'Mother Name']],
      ['motherPhone', ['motherPhone', 'MotherPhone', 'Mother Phone']],
      ['motherEmail', ['motherEmail', 'MotherEmail', 'Mother Email']],
      ['motherOccupation', ['motherOccupation', 'MotherOccupation', 'Mother Occupation']],
      ['source', ['source', 'Source']],
      ['comments', ['comments', 'Comments']],
      ['notes', ['notes', 'Notes']],
      ['lastFollowUp', ['lastFollowUp', 'LastFollowUp', 'Last Follow Up']],
      ['testLink', ['testLink', 'TestLink', 'Test Link']],
      ['appointmentTime', ['appointmentTime', 'AppointmentTime', 'Appointment Time']],
      ['feesAmount', ['feesAmount', 'FeesAmount', 'Fees Amount']],
      ['paymentMode', ['paymentMode', 'PaymentMode', 'Payment Mode']],
      ['transactionId', ['transactionId', 'TransactionId', 'Transaction ID']],
      ['reportSentDate', ['reportSentDate', 'ReportSentDate', 'Report Sent Date']],
      ['convertedDate', ['convertedDate', 'ConvertedDate', 'Converted Date']],
      ['reportPdfUrl', ['reportPdfUrl', 'ReportPdfUrl', 'Report PDF URL']],
      ['registrationToken', ['registrationToken', 'RegistrationToken', 'Registration Token']],
      ['calendarEventId', ['calendarEventId', 'CalendarEventId', 'Calendar Event ID']],
    ];

    for (const row of rows) {
      const email = (row.email || row.Email || row.EMAIL || '').toString().trim().toLowerCase();
      const phoneRaw = (row.phone || row.Phone || row.PHONE || row.mobile || row.Mobile || '').toString();
      const phone = phoneRaw.replace(/\D/g, '').slice(-10);
      const name = (row.name || row.Name || row.NAME || row.student || row.Student || '').toString().trim();
      const googleId = extract(row, ['googleContactId', 'GoogleContactId', 'Google Contact ID']);

      // Robustness: Skip rows that are clearly fragments of scrambled CSV lines
      if (!name || name.length < 2 || BOARDS.includes(name.toUpperCase()) || GRADES.includes(name.toUpperCase())) {
        skipped++;
        continue;
      }

      const existingByEmail = email ? emailMap.get(email) : null;
      const existingByPhone = phone ? phoneMap.get(phone) : null;
      const existingByGoogleId = googleId ? googleIdMap.get(googleId) : null;
      const existingByName = !email && !phone ? nameMap.get(name.toLowerCase()) : null;
      const existingLead = existingByEmail || existingByPhone || existingByGoogleId || existingByName;

      if (existingLead && handleDuplicates === 'skip') {
        skipped++;
        continue;
      }

      const stageRaw = extract(row, ['stage', 'Stage', 'STAGE']);
      const statusRaw = extract(row, ['status', 'Status', 'STATUS']);
      const feesPaidRaw = extract(row, ['feesPaid', 'FeesPaid', 'Fees Paid']);
      const communityJoinedRaw = extract(row, ['communityJoined', 'CommunityJoined', 'Community Joined']);
      const inquiryDateRaw = extract(row, ['inquiryDate', 'InquiryDate', 'Inquiry Date', 'timestamp', 'Timestamp', 'date', 'Date']);
      const lastStageUpdateRaw = extract(row, ['lastStageUpdate', 'LastStageUpdate', 'Last Stage Update']);
      const communicateViaEmailOnlyProvided = row.communicateViaEmailOnly !== undefined;

      if (!existingLead) {
        // New lead: fill every field so the record is complete, defaulting
        // anything the CSV didn't provide.
        const normalizedStage = normalizeStage(stageRaw || 'New');
        const computedStatus = computeLeadStatus(normalizedStage, statusRaw);
        const inquiryDate = inquiryDateRaw ? safeFormat(safeParseISO(inquiryDateRaw)) : '';
        const lastStageUpdate = lastStageUpdateRaw ? safeFormat(safeParseISO(lastStageUpdateRaw)) : '';

        const leadData: Partial<Lead> = {
          name,
          email: email || '',
          phone: phone || '',
          status: computedStatus,
          stage: normalizedStage as any,
          inquiryDate,
          lastStageUpdate,
          lastFollowUp: safeFormat(new Date()),
          feesPaid: 'Due' as FeesPaidStatus,
          communityJoined: 'No' as CommunityJoinedStatus,
          googleContactId: googleId || '',
          communicateViaEmailOnly: row.communicateViaEmailOnly === 'TRUE' || row.communicateViaEmailOnly === true,
        };
        for (const [field, keys] of SIMPLE_FIELDS) {
          (leadData as any)[field] = extract(row, keys) || '';
        }
        if (!leadData.source) leadData.source = source || 'CSV Import';
        if (feesPaidRaw) leadData.feesPaid = feesPaidRaw as FeesPaidStatus;
        if (communityJoinedRaw) leadData.communityJoined = communityJoinedRaw as CommunityJoinedStatus;

        leadsToImport.push(leadData);
      } else {
        // Existing lead: only touch fields the CSV row actually supplied,
        // so columns absent from this import leave existing data untouched.
        const updateData: Partial<Lead> = { name };
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (googleId) updateData.googleContactId = googleId;
        if (communicateViaEmailOnlyProvided) {
          updateData.communicateViaEmailOnly = row.communicateViaEmailOnly === 'TRUE' || row.communicateViaEmailOnly === true;
        }
        for (const [field, keys] of SIMPLE_FIELDS) {
          const val = extract(row, keys);
          if (val !== undefined) (updateData as any)[field] = val;
        }

        if (stageRaw || statusRaw) {
          const normalizedStage = stageRaw ? normalizeStage(stageRaw) : existingLead.stage;
          updateData.stage = normalizedStage as any;
          updateData.status = computeLeadStatus(normalizedStage, statusRaw);
        }
        if (feesPaidRaw) updateData.feesPaid = feesPaidRaw as FeesPaidStatus;
        if (communityJoinedRaw) updateData.communityJoined = communityJoinedRaw as CommunityJoinedStatus;
        if (inquiryDateRaw) updateData.inquiryDate = safeFormat(safeParseISO(inquiryDateRaw));
        if (lastStageUpdateRaw) updateData.lastStageUpdate = safeFormat(safeParseISO(lastStageUpdateRaw));

        leadsToUpdate.push({ id: existingLead.id, data: updateData });
        updatedCount++;
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
