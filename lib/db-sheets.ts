import { getSheetsClient } from './google';
import { Lead, LeadStage, LeadStatus, FeesPaidStatus, CommunityJoinedStatus } from './types';

const RANGE = 'Leads!A2:AO';

export function generateRegistrationToken(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 12; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
        if ((i + 1) % 4 === 0 && i !== 11) token += '-';
    }
    return token;
}

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
  } catch (error: any) {
    if (error.message?.includes('Unable to parse range') || error.code === 400) {
      console.warn('Leads sheet not found or range invalid.');
      return [];
    }
    console.error('Error fetching from Google Sheets:', error);
    throw error;
  }
}

export async function addLead(spreadsheetId: string, accessToken: string, lead: Partial<Lead>): Promise<number> {
  const ids = await addLeads(spreadsheetId, accessToken, [lead]);
  return ids[0];
}

export async function addLeads(spreadsheetId: string, accessToken: string, leads: Partial<Lead>[]): Promise<number[]> {
  if (leads.length === 0) return [];
  const sheets = await getSheetsClient(accessToken);
  const existingLeads = await getAllLeads(spreadsheetId, accessToken);
  let nextId = existingLeads.length > 0 ? Math.max(...existingLeads.map(l => l.id).filter(id => !isNaN(id))) + 1 : 1;

  const preparedLeads = leads.map(lead => {
    const id = nextId++;
    return {
      ...lead,
      id,
      inquiryDate: lead.inquiryDate || new Date().toISOString(),
      stage: lead.stage || 'New',
      status: lead.status || 'Open',
      updatedAt: new Date().toISOString(),
      registrationToken: lead.registrationToken || generateRegistrationToken(),
      notes: lead.notes || '',
      lastFollowUp: lead.lastFollowUp || '',
      testLink: lead.testLink || '',
      appointmentTime: lead.appointmentTime || '',
      feesPaid: lead.feesPaid || 'Due',
      reportSentDate: lead.reportSentDate || '',
      convertedDate: lead.convertedDate || '',
      communityJoined: lead.communityJoined || 'No',
    } as Lead;
  });

  const rows = preparedLeads.map(mapLeadToRow);

  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: 'Leads!A:A',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows,
    },
  });

  return preparedLeads.map(l => l.id);
}

export async function updateLead(spreadsheetId: string, accessToken: string, id: number, updates: Partial<Lead>): Promise<void> {
  await updateLeads(spreadsheetId, accessToken, [{ id, data: updates }]);
}

export async function updateLeads(spreadsheetId: string, accessToken: string, updates: { id: number; data: Partial<Lead> }[]): Promise<void> {
  if (updates.length === 0) return;
  const sheets = await getSheetsClient(accessToken);
  const existingLeads = await getAllLeads(spreadsheetId, accessToken);

  const data = updates.map(update => {
    const index = existingLeads.findIndex(l => l.id === update.id);
    if (index === -1) throw new Error(`Lead with ID ${update.id} not found`);

    const updatedLead = { ...existingLeads[index], ...update.data, updatedAt: new Date().toISOString() };
    const row = mapLeadToRow(updatedLead);
    const rowNumber = index + 2;

    return {
      range: `Leads!A${rowNumber}:AO${rowNumber}`,
      values: [row],
    };
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: data,
    },
  });
}

export async function deleteLead(spreadsheetId: string, accessToken: string, id: number): Promise<void> {
    const sheets = await getSheetsClient(accessToken);
    const leads = await getAllLeads(spreadsheetId, accessToken);
    const index = leads.findIndex(l => l.id === id);
    if (index === -1) return;

    const rowIndex = index;
    
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
                            startIndex: rowIndex + 1,
                            endIndex: rowIndex + 2
                        }
                    }
                }
            ]
        }
    });
}

export async function getLeadByToken(spreadsheetId: string, accessToken: string, token: string): Promise<Lead | null> {
    const leads = await getAllLeads(spreadsheetId, accessToken);
    return leads.find(l => l.registrationToken === token) || null;
}

const DEFAULT_TEMPLATES = [
    { id: 'onboarding', label: 'Onboarding Message', message: 'Hi {name}, this is Binal from EduCompass. Great to have you onboard! Please fill this registration form to share student details: [REGISTRATION_LINK]' },
    { id: 'test', label: 'Assessment Link', message: 'Hi {name}, based on your details, here is the career assessment link: {url}. Please complete this before our 1:1 session.' },
    { id: 'followup', label: 'Follow-up Message', message: 'Hi {name}, just checking in regarding your career counseling inquiry. Do you have any questions I can help with?' },
    { id: 'community', label: 'Community Invite', message: "Hi {name}, I'd like to invite you to the EduCompass Parents WhatsApp Community where I share important updates and form filling dates: https://chat.whatsapp.com/example-group-link" },
    { id: 'review', label: 'Google Review Request', message: 'Hi {name}, it was a pleasure counseling you. If you found the session helpful, I\'d really appreciate a quick review on Google: [YOUR_GOOGLE_REVIEW_LINK]' },
    { id: 'birthday', label: 'Birthday Wish', message: 'Hi {name}, wishing you a very Happy Birthday! 🎂 Hope you have a fantastic day ahead! - Binal from EduCompass' },
];

async function ensureTemplatesSheet(spreadsheetId: string, accessToken: string) {
    const sheets = await getSheetsClient(accessToken);
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Templates');
    
    if (!sheet) {
        // Create sheet
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{
                    addSheet: { properties: { title: 'Templates' } }
                }]
            }
        });
    }

    // Check if empty or missing headers
    const checkResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Templates!A1:C1',
    });
    
    if (!checkResponse.data.values || checkResponse.data.values.length === 0) {
        // Populate with defaults if completely empty
        const rows = [
            ['ID', 'Label', 'Message'],
            ...DEFAULT_TEMPLATES.map(t => [t.id, t.label, t.message])
        ];
        
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Templates!A1:C',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: rows },
        });
    }
}

export async function getTemplates(spreadsheetId: string, accessToken: string): Promise<any[]> {
    if (!spreadsheetId) return DEFAULT_TEMPLATES;
    try {
        const sheets = await getSheetsClient(accessToken);
        let response;
        try {
            response = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: 'Templates!A2:C20', 
            });
        } catch (e: any) {
            // If range doesn't exist, try to ensure sheet and return defaults
            console.warn('Templates range not found, ensuring sheet exists...');
            await ensureTemplatesSheet(spreadsheetId, accessToken);
            return DEFAULT_TEMPLATES;
        }
        
        const rows = response.data.values || [];
        if (rows.length === 0) return DEFAULT_TEMPLATES;
        
        // Merge with defaults
        const sheetTemplates = rows.map(row => ({
            id: row[0],
            label: row[1] || row[0],
            message: row[2] || ''
        })).filter(t => t.id);

        const finalTemplates = [...DEFAULT_TEMPLATES];
        sheetTemplates.forEach(st => {
            const index = finalTemplates.findIndex(t => t.id === st.id);
            if (index !== -1) {
                finalTemplates[index] = st;
            } else {
                finalTemplates.push(st);
            }
        });

        return finalTemplates;
    } catch (error) {
        console.error('Error in getTemplates:', error);
        return DEFAULT_TEMPLATES;
    }
}

export async function updateTemplate(spreadsheetId: string, accessToken: string, id: string, message: string): Promise<void> {
    const sheets = await getSheetsClient(accessToken);
    
    let response;
    try {
        response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Templates!A2:A20',
        });
    } catch (e: any) {
        if (e.message?.includes('Unable to parse range')) {
            await ensureTemplatesSheet(spreadsheetId, accessToken);
            response = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: 'Templates!A2:A20',
            });
        } else {
            throw e;
        }
    }

    const ids = response.data.values?.map(r => r[0]) || [];
    const index = ids.indexOf(id);

    if (index !== -1) {
        // Update existing row
        const rowNumber = index + 2;
        await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `Templates!C${rowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[message]],
            },
        });
    } else {
        // Append new row if missing (use label from defaults)
        const def = DEFAULT_TEMPLATES.find(t => t.id === id);
        const label = def ? def.label : id;
        await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'Templates!A:C',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[id, label, message]],
            },
        });
    }
}

function mapRowToLead(row: any[]): Lead {
  const feesRaw = row[29];
  let feesPaid: FeesPaidStatus = 'Due';
  if (feesRaw === 'TRUE' || feesRaw === 'true' || feesRaw === true) feesPaid = 'Paid';
  else if (feesRaw === 'FALSE' || feesRaw === 'false' || feesRaw === false) feesPaid = 'Due';
  else if (feesRaw === 'bad debt') feesPaid = 'Bad debt';
  else if (feesRaw) feesPaid = feesRaw as FeesPaidStatus;

  const commRaw = row[36];
  let communityJoined: CommunityJoinedStatus = 'No';
  if (commRaw === 'TRUE' || commRaw === 'true' || commRaw === true) communityJoined = 'Yes';
  else if (commRaw === 'FALSE' || commRaw === 'false' || commRaw === false) communityJoined = 'No';
  else if (commRaw) communityJoined = commRaw as CommunityJoinedStatus;

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
    feesPaid: feesPaid,
    feesAmount: row[30] || '',
    paymentMode: row[31] || '',
    transactionId: row[32] || '',
    reportSentDate: row[33] || '',
    convertedDate: row[34] || '',
    reportPdfUrl: row[35] || '',
    communityJoined: communityJoined,
    registrationToken: row[37] || '',
    calendarEventId: row[38] || '',
    lastStageUpdate: row[39] || '',
    status: (row[40] as LeadStatus) || 'Open',
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
    lead.feesPaid || 'Due',
    lead.feesAmount || '',
    lead.paymentMode || '',
    lead.transactionId || '',
    lead.reportSentDate || '',
    lead.convertedDate || '',
    lead.reportPdfUrl || '',
    lead.communityJoined || 'No',
    lead.registrationToken || '',
    lead.calendarEventId || '',
    lead.lastStageUpdate || '',
    lead.status || 'Open',
  ];
}

