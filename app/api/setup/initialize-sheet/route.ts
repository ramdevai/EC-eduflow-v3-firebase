import { NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { auth } from '@/lib/auth';
import { validateEnv } from '@/lib/env-check';

const HEADERS = [
  'ID', 'Name', 'Phone', 'Email', 'Stage', 'Inquiry Date', 'Updated At', 'Google Contact ID', 
  'Address', 'Gender', 'DOB', 'Grade', 'Board', 'School', 'Hobbies', 
  'Father Name', 'Father Phone', 'Father Email', 'Father Occupation', 
  'Mother Name', 'Mother Phone', 'Mother Email', 'Mother Occupation', 
  'Source', 'Comments', 'Notes', 'Last Follow Up', 'Test Link', 'Appointment Time', 
  'Fees Paid', 'Fees Amount', 'Payment Mode', 'Transaction ID', 
  'Report Sent Date', 'Converted Date', 'Report PDF URL', 'Community Joined', 'Registration Token', 'Calendar Event ID', 'Last Stage Update', 'Status'
];

export async function POST(req: Request) {
  const envStatus = validateEnv();
  if (!envStatus.isValid) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const session = await auth() as any;
  const sheetId = req.headers.get('x-sheet-id');
  const validateOnly = req.headers.get('x-validate-only') === 'true';

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!sheetId) {
    return NextResponse.json({ error: 'Sheet ID not provided' }, { status: 400 });
  }

  try {
    const sheets = await getSheetsClient(session.accessToken);
    
    // 1. Create the 'Leads' sheet if it doesn't exist, or just check it
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    
    // Check Leads sheet
    let leadsSheet = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Leads');
    
    if (validateOnly) {
        if (!leadsSheet) {
            return NextResponse.json({ error: "Missing 'Leads' sheet tab. Please use 'Initialize' to fix." }, { status: 400 });
        }
        
        // Validate Headers
        const headerRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Leads!A1:AO1'
        });
        
        const existingHeaders = headerRes.data.values?.[0] || [];
        const missing = HEADERS.filter(h => !existingHeaders.includes(h));
        
        if (missing.length > 0) {
             return NextResponse.json({ 
                 error: `Invalid sheet format. Missing columns: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}. Please use 'Initialize' to fix headers.` 
             }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Sheet validated successfully.' });
    }

    if (!leadsSheet) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                requests: [{
                    addSheet: { properties: { title: 'Leads' } }
                }]
            }
        });
    }

    // Check Templates sheet
    let templatesSheet = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Templates');
    if (!templatesSheet) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                requests: [{
                    addSheet: { properties: { title: 'Templates' } }
                }]
            }
        });
        
        // Populate with defaults
        const rows = [
            ['ID', 'Label', 'Message'],
            ...[
            ['onboarding', 'Onboarding Message', 'Hi {name}, this is Binal from EduCompass. Great to have you onboard! Please fill this registration form to share student details: [REGISTRATION_LINK]'],
            ['test', 'Assessment Link', 'Hi {name}, based on your details, here is the career assessment link: {url}. Please complete this before our 1:1 session.'],
                ['followup', 'Follow-up Message', 'Hi {name}, just checking in regarding your career counseling inquiry. Do you have any questions I can help with?'],
                ['community', 'Community Invite', "Hi {name}, I'd like to invite you to the EduCompass Parents WhatsApp Community where I share important updates and form filling dates: https://chat.whatsapp.com/example-group-link"],
                ['review', 'Google Review Request', 'Hi {name}, it was a pleasure counseling you. If you found the session helpful, I\'d really appreciate a quick review on Google: [YOUR_GOOGLE_REVIEW_LINK]'],
                ['birthday', 'Birthday Wish', 'Hi {name}, wishing you a very Happy Birthday! 🎂 Hope you have a fantastic day ahead! - Binal from EduCompass'],
            ]
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: 'Templates!A1:C7',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: rows },
        });
    } else {
        // If sheet exists, ensure headers are there if empty
        try {
            const templatesCheck = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: 'Templates!A1:C1',
            });
            if (!templatesCheck.data.values || templatesCheck.data.values.length === 0) {
                 throw new Error('empty');
            }
        } catch (e) {
             const rows = [
                ['ID', 'Label', 'Message'],
            ['onboarding', 'Onboarding Message', 'Hi {name}, this is Binal from EduCompass. Great to have you onboard! Please fill this registration form to share student details: [REGISTRATION_LINK]'],
            ['test', 'Assessment Link', 'Hi {name}, based on your details, here is the career assessment link: {url}. Please complete this before our 1:1 session.'],
                ['followup', 'Follow-up Message', 'Hi {name}, just checking in regarding your career counseling inquiry. Do you have any questions I can help with?'],
                ['community', 'Community Invite', "Hi {name}, I'd like to invite you to the EduCompass Parents WhatsApp Community where I share important updates and form filling dates: https://chat.whatsapp.com/example-group-link"],
                ['review', 'Google Review Request', 'Hi {name}, it was a pleasure counseling you. If you found the session helpful, I\'d really appreciate a quick review on Google: [YOUR_GOOGLE_REVIEW_LINK]'],
                ['birthday', 'Birthday Wish', 'Hi {name}, wishing you a very Happy Birthday! 🎂 Hope you have a fantastic day ahead! - Binal from EduCompass'],
            ];
            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: 'Templates!A1:C7',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: rows },
            });
        }
    }

    // 2. Set the headers in row 1 for Leads
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Leads!A1:AO1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [HEADERS],
      },
    });

    return NextResponse.json({ success: true, message: 'Sheet initialized successfully with Leads and Templates.' });
  } catch (error: any) {
    console.error('Initialize sheet error:', error);
    return NextResponse.json({ error: error.message || 'Failed to initialize sheet' }, { status: 500 });
  }
}
