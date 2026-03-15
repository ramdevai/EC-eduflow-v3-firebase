import { getSheetsClient } from './google';
import { Lead, LeadStage } from './types';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = 'Leads!A2:Q'; // Assuming headers are in row 1

export async function getAllLeads(): Promise<Lead[]> {
  if (!SPREADSHEET_ID) {
    console.error('GOOGLE_SHEET_ID is not configured');
    return [];
  }
  
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values || [];
    return rows.map(mapRowToLead).filter(lead => lead.id); // Filter out empty rows
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    return [];
  }
}

export async function addLead(lead: Partial<Lead>): Promise<number> {
  const sheets = await getSheetsClient();
  const leads = await getAllLeads();
  const newId = leads.length > 0 ? Math.max(...leads.map(l => l.id)) + 1 : 1;

  const row = mapLeadToRow({
    ...lead,
    id: newId,
    inquiryDate: lead.inquiryDate || new Date().toISOString(),
    stage: lead.stage || 'New',
    updatedAt: new Date().toISOString(),
  } as Lead);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Leads!A:A',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });

  return newId;
}

export async function updateLead(id: number, updates: Partial<Lead>): Promise<void> {
  const sheets = await getSheetsClient();
  const leads = await getAllLeads();
  const index = leads.findIndex(l => l.id === id);
  if (index === -1) throw new Error('Lead not found');

  const updatedLead = { ...leads[index], ...updates, updatedAt: new Date().toISOString() };
  const row = mapLeadToRow(updatedLead);
  const rowNumber = index + 2; // +1 for 0-index, +1 for headers

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Leads!A${rowNumber}:Q${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });
}

export async function deleteLead(id: number): Promise<void> {
    // Note: Deleting rows in Google Sheets API is slightly more complex than updating.
    // We'll mark as deleted or just clear the row for now, or use batchUpdate.
    // For simplicity in a Micro CRM, we can just clear the row or filter out "Lost" in UI.
    // But let's implement a real delete using batchUpdate.
    const sheets = await getSheetsClient();
    const leads = await getAllLeads();
    const index = leads.findIndex(l => l.id === id);
    if (index === -1) return;

    const rowIndex = index + 1; // 0-based index for the Leads sheet (excluding headers if we use the sheetId)
    
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Leads')?.properties?.sheetId;

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1, // +1 to skip headers
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
    grade: row[4] || '',
    board: row[5] || '',
    stage: (row[6] as LeadStage) || 'New',
    inquiryDate: row[7] || '',
    notes: row[8] || '',
    lastFollowUp: row[9] || '',
    testLink: row[10] || '',
    appointmentTime: row[11] || '',
    feesPaid: row[12] === 'TRUE',
    reportSentDate: row[13] || '',
    convertedDate: row[14] || '',
    updatedAt: row[15] || '',
    googleContactId: row[16] || '',
  } as any;
}

function mapLeadToRow(lead: Lead): any[] {
  return [
    lead.id,
    lead.name,
    lead.phone,
    lead.email,
    lead.grade,
    lead.board,
    lead.stage,
    lead.inquiryDate,
    lead.notes,
    lead.lastFollowUp,
    lead.testLink,
    lead.appointmentTime,
    lead.feesPaid ? 'TRUE' : 'FALSE',
    lead.reportSentDate,
    lead.convertedDate,
    lead.updatedAt,
    (lead as any).googleContactId || '',
  ];
}
