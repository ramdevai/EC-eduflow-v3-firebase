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
  'Report Sent Date', 'Converted Date', 'Report PDF URL', 'Community Joined', 'Registration Token', 'Calendar Event ID', 'Last Stage Update', 'Status', 'Communicate via Email Only'
];

const TEMPLATE_HEADERS = ['ID', 'Label', 'Subject', 'Message'];

export async function POST(req: Request) {
  const envStatus = validateEnv();
  if (!envStatus.isValid) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const session = await auth() as any;
  const sheetId = req.headers.get('x-sheet-id');
  const validateOnly = req.headers.get('x-validate-only') === 'true';

  if (!session?.accessToken) {
    return NextResponse.json({ 
        error: 'Authentication failed. Please Sign Out and Sign In again to refresh your Google session.',
        code: 'AUTH_REQUIRED'
    }, { status: 401 });
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
            range: 'Leads!A1:AP1'
        });
        
        const existingHeaders = headerRes.data.values?.[0] || [];
        const missing = HEADERS.filter(h => !existingHeaders.includes(h));
        
        if (missing.length > 0) {
             return NextResponse.json({ 
                 error: `Invalid sheet format. Missing columns in 'Leads': ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}. Please use 'Initialize' to fix headers.` 
             }, { status: 400 });
        }

        // Validate Templates Headers
        let templatesSheetCheck = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Templates');
        if (templatesSheetCheck) {
            const templateHeaderRes = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: 'Templates!A1:D1'
            });
            const existingTemplateHeaders = templateHeaderRes.data.values?.[0] || [];
            const missingTemplate = TEMPLATE_HEADERS.filter(h => !existingTemplateHeaders.includes(h));
            if (missingTemplate.length > 0) {
                return NextResponse.json({ 
                    error: `Invalid sheet format. Missing columns in 'Templates': ${missingTemplate.join(', ')}. Please use 'Initialize' to fix headers.` 
                }, { status: 400 });
            }
        } else {
            return NextResponse.json({ error: "Missing 'Templates' sheet tab. Please use 'Initialize' to fix." }, { status: 400 });
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
            TEMPLATE_HEADERS,
            ...[
                ['onboarding', 'Onboarding Message', 'Registration Form - EduCompass Career Counseling', 'Hi {name}, this is Binal from EduCompass. Great to have you onboard! Please fill this registration form to share student details: [REGISTRATION_LINK]'],
                ['test', 'Assessment Link', 'Career Assessment Link - {name}', 'Hi {name}, based on your details, here is the career assessment link: {url}. Please complete this before our 1:1 session.'],
                ['test_nudge', 'Test Nudge', 'Reminder: Career Assessment Pending', 'Hi {name}, hope you are doing well. Just a gentle nudge to complete the career assessment test so we can proceed with our 1:1 counseling session. Link: {url}'],
                ['followup', 'Follow-up Message', 'Follow-up: Career Counseling Inquiry', 'Hi {name}, just checking in regarding your career counseling inquiry. Do you have any questions I can help with?'],
                ['community', 'Community Invite', 'Invitation: EduCompass Parents Community', "Hi {name}, I'd like to invite you to the EduCompass Parents WhatsApp Community where I share important updates and form filling dates: https://chat.whatsapp.com/example-group-link"],
                ['review', 'Google Review Request', 'How was your session? - Feedback Request', 'Hi {name}, it was a pleasure counseling you. If you found the session helpful, I\'d really appreciate a quick review on Google: [YOUR_GOOGLE_REVIEW_LINK]'],
                ['birthday', 'Birthday Wish', 'Happy Birthday {name}! 🎂', 'Hi {name}, wishing you a very Happy Birthday! 🎂 Hope you have a fantastic day ahead! - Binal from EduCompass'],
                ['report_email', 'Report Email', '{name} - Career Counseling Report', "Dear Parent,\n\nPlease find attached the career counseling report for {name}.\n\nBased on our 1:1 session, we discussed the following career choices and recommendations:\n{notes}\n\n[PLEASE ATTACH THE PDF DOWNLOADED FROM EDUMILESTONES]\n\nIf you have any questions, feel free to reach out.\n\nBest regards,\nBinal\nFounder, EduCompass"],
                ['fees_reminder', 'Fees Reminder', 'Professional Fees Reminder - EduCompass', 'Hi {name}, just a gentle reminder regarding the professional fees for the career counseling session. Please ignore if already paid. Thanks!'],
            ]
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: 'Templates!A1:D10',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: rows },
        });
    } else {
        // If sheet exists, check if it's the old structure (3 columns)
        const templatesCheck = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Templates!A1:D',
        });
        
        const rows = templatesCheck.data.values || [];
        if (rows.length > 0) {
            const currentHeaders = rows[0];
            if (currentHeaders.length < 4 || currentHeaders[2] === 'Message') {
                console.log('Migrating Templates sheet to 4-column structure...');
                // Migrate data: Move Message from C to D, and insert default Subject in C
                const migratedRows = rows.map((row, i) => {
                    if (i === 0) return TEMPLATE_HEADERS;
                    const id = row[0];
                    const label = row[1];
                    const message = row[2] || '';
                    
                    // Find default subject
                    const defaults = [
                        ['onboarding', 'Registration Form - EduCompass Career Counseling'],
                        ['test', 'Career Assessment Link - {name}'],
                        ['test_nudge', 'Reminder: Career Assessment Pending'],
                        ['followup', 'Follow-up: Career Counseling Inquiry'],
                        ['community', 'Invitation: EduCompass Parents Community'],
                        ['review', 'How was your session? - Feedback Request'],
                        ['birthday', 'Happy Birthday {name}! 🎂'],
                        ['report_email', '{name} - Career Counseling Report'],
                        ['fees_reminder', 'Professional Fees Reminder - EduCompass'],
                    ];
                    const defaultSubject = defaults.find(d => d[0] === id)?.[1] || '';
                    
                    return [id, label, defaultSubject, message];
                });
                
                await sheets.spreadsheets.values.update({
                    spreadsheetId: sheetId,
                    range: 'Templates!A1',
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: migratedRows },
                });
            }
        } else {
            // Completely empty, populate
             const rows = [
                TEMPLATE_HEADERS,
                ['onboarding', 'Onboarding Message', 'Registration Form - EduCompass Career Counseling', 'Hi {name}, this is Binal from EduCompass. Great to have you onboard! Please fill this registration form to share student details: [REGISTRATION_LINK]'],
                ['test', 'Assessment Link', 'Career Assessment Link - {name}', 'Hi {name}, based on your details, here is the career assessment link: {url}. Please complete this before our 1:1 session.'],
                ['test_nudge', 'Test Nudge', 'Reminder: Career Assessment Pending', 'Hi {name}, hope you are doing well. Just a gentle nudge to complete the career assessment test so we can proceed with our 1:1 counseling session. Link: {url}'],
                ['followup', 'Follow-up Message', 'Follow-up: Career Counseling Inquiry', 'Hi {name}, just checking in regarding your career counseling inquiry. Do you have any questions I can help with?'],
                ['community', 'Community Invite', 'Invitation: EduCompass Parents Community', "Hi {name}, I'd like to invite you to the EduCompass Parents WhatsApp Community where I share important updates and form filling dates: https://chat.whatsapp.com/example-group-link"],
                ['review', 'Google Review Request', 'How was your session? - Feedback Request', 'Hi {name}, it was a pleasure counseling you. If you found the session helpful, I\'d really appreciate a quick review on Google: [YOUR_GOOGLE_REVIEW_LINK]'],
                ['birthday', 'Birthday Wish', 'Happy Birthday {name}! 🎂', 'Hi {name}, wishing you a very Happy Birthday! 🎂 Hope you have a fantastic day ahead! - Binal from EduCompass'],
                ['report_email', 'Report Email', '{name} - Career Counseling Report', "Dear Parent,\n\nPlease find attached the career counseling report for {name}.\n\nBased on our 1:1 session, we discussed the following career choices and recommendations:\n{notes}\n\n[PLEASE ATTACH THE PDF DOWNLOADED FROM EDUMILESTONES]\n\nIf you have any questions, feel free to reach out.\n\nBest regards,\nBinal\nFounder, EduCompass"],
                ['fees_reminder', 'Fees Reminder', 'Professional Fees Reminder - EduCompass', 'Hi {name}, just a gentle reminder regarding the professional fees for the career counseling session. Please ignore if already paid. Thanks!'],
            ];
            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: 'Templates!A1:D10',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: rows },
            });
        }
    }

    // 2. Set the headers in row 1 for Leads
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Leads!A1:AP1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [HEADERS],
      },
    });

    return NextResponse.json({ success: true, message: 'Sheet initialized successfully with Leads and Templates.' });
  } catch (error: any) {
    console.error('Initialize sheet error:', error);
    
    // Check for specific Google Auth errors
    if (error.code === 401 || error.message?.toLowerCase().includes('invalid authentication') || error.message?.toLowerCase().includes('credential')) {
        return NextResponse.json({ 
            error: 'Your Google Access Token has expired. Please Sign Out and Sign In again to continue.',
            code: 'AUTH_EXPIRED'
        }, { status: 401 });
    }

    return NextResponse.json({ error: error.message || 'Failed to initialize sheet' }, { status: 500 });
  }
}
