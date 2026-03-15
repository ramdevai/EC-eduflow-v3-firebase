import { getSheetsClient } from './google';
import { Lead, LeadStage } from './types';

const RANGE = 'Leads!A2:AK';

export async function getAllLeads(spreadsheetId: string, accessToken: string): Promise<Lead[]> {
  if (!spreadsheetId) return [];
  
  try {
    const sheets = await getSheetsClient(accessToken);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: RANGE,
    });

    const rows = response.data.values || [];
    return rows.map(mapRowToLead).filter(lead => lead.id);
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    throw error;
  }
}

export async function addLead(spreadsheetId: string, accessToken: string, lead: Partial<Lead>): Promise<number> {
  const sheets = await getSheetsClient(accessToken);
  const leads = await getAllLeads(spreadsheetId, accessToken);
  const newId = leads.length > 0 ? Math.max(...leads.map(l => l.id)) + 1 : 1;

  const row = mapLeadToRow({
    ...lead,
    id: newId,
    inquiryDate: lead.inquiryDate || new Date().toISOString(),
    stage: lead.stage || 'New',
    updatedAt: new Date().toISOString(),
    notes: lead.notes || '',
    lastFollowUp: lead.lastFollowUp || '',
    testLink: lead.testLink || '',
    appointmentTime: lead.appointmentTime || '',
    feesPaid: lead.feesPaid || false,
    reportSentDate: lead.reportSentDate || '',
    convertedDate: lead.convertedDate || '',
    communityJoined: lead.communityJoined || false,
  } as Lead);

  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: 'Leads!A:A',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });

  return newId;
}

export async function updateLead(spreadsheetId: string, accessToken: string, id: number, updates: Partial<Lead>): Promise<void> {
  const sheets = await getSheetsClient(accessToken);
  const leads = await getAllLeads(spreadsheetId, accessToken);
  const index = leads.findIndex(l => l.id === id);
  if (index === -1) throw new Error('Lead not found');

  const updatedLead = { ...leads[index], ...updates, updatedAt: new Date().toISOString() };
  const row = mapLeadToRow(updatedLead);
  const rowNumber = index + 2;

  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: `Leads!A${rowNumber}:AK${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });
}

export async function deleteLead(spreadsheetId: string, accessToken: string, id: number): Promise<void> {
    const sheets = await getSheetsClient(accessToken);
    const leads = await getAllLeads(spreadsheetId, accessToken);
    const index = leads.findIndex(l => l.id === id);
    if (index === -1) return;

    const rowIndex = index; // 0-based index for rows after header (A2 is index 0)
    
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: spreadsheetId });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Leads')?.properties?.sheetId;

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1, // +1 for headers
                            endIndex: rowIndex + 2
                        }
                    }
                }
            ]
        }
    });
}

function mapRowToLead(row: any[]): Lead {
  return {
    id: parseInt(row[0]),
    name: row[1] || '',
    phone: row[2] || '',
    email: row[3] || '',
    stage: (row[4] as LeadStage) || 'New',
    inquiryDate: row[5] || '',
    updatedAt: row[6] || '',
    googleContactId: row[7] || '',
    address: row[8] || '',
    gender: row[9] || '',
    dob: row[10] || '',
    grade: row[11] || '',
    board: row[12] || '',
    school: row[13] || '',
    hobbies: row[14] || '',
    fatherName: row[15] || '',
    fatherPhone: row[16] || '',
    fatherEmail: row[17] || '',
    fatherOccupation: row[18] || '',
    motherName: row[19] || '',
    motherPhone: row[20] || '',
    motherEmail: row[21] || '',
    motherOccupation: row[22] || '',
    source: row[23] || '',
    comments: row[24] || '',
    notes: row[25] || '',
    lastFollowUp: row[26] || '',
    testLink: row[27] || '',
    appointmentTime: row[28] || '',
    feesPaid: row[29] === 'TRUE',
    feesAmount: row[30] || '',
    paymentMode: row[31] || '',
    transactionId: row[32] || '',
    reportSentDate: row[33] || '',
    convertedDate: row[34] || '',
    reportPdfUrl: row[35] || '',
    communityJoined: row[36] === 'TRUE',
  };
}

function mapLeadToRow(lead: Lead): any[] {
  return [
    lead.id,
    lead.name,
    lead.phone,
    lead.email,
    lead.stage,
    lead.inquiryDate,
    lead.updatedAt,
    lead.googleContactId || '',
    lead.address || '',
    lead.gender || '',
    lead.dob || '',
    lead.grade || '',
    lead.board || '',
    lead.school || '',
    lead.hobbies || '',
    lead.fatherName || '',
    lead.fatherPhone || '',
    lead.fatherEmail || '',
    lead.fatherOccupation || '',
    lead.motherName || '',
    lead.motherPhone || '',
    lead.motherEmail || '',
    lead.motherOccupation || '',
    lead.source || '',
    lead.comments || '',
    lead.notes || '',
    lead.lastFollowUp || '',
    lead.testLink || '',
    lead.appointmentTime || '',
    lead.feesPaid ? 'TRUE' : 'FALSE',
    lead.feesAmount || '',
    lead.paymentMode || '',
    lead.transactionId || '',
    lead.reportSentDate || '',
    lead.convertedDate || '',
    lead.reportPdfUrl || '',
    lead.communityJoined ? 'TRUE' : 'FALSE',
  ];
}
