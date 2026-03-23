import { NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { auth } from '@/lib/auth';
import { validateEnv } from '@/lib/env-check';

export async function POST(req: Request) {
  const envStatus = validateEnv();
  if (!envStatus.isValid) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const session = await auth() as any;
  if (!session?.accessToken) {
    return NextResponse.json({ 
        error: 'Authentication failed. Please Sign Out and Sign In again to refresh your Google session.',
        code: 'AUTH_REQUIRED' 
    }, { status: 401 });
  }

  try {
    const sheets = await getSheetsClient(session.accessToken);
    
    // 1. Create the spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: 'EduCompass CRM Workspace',
        },
      },
    });

    const sheetId = spreadsheet.data.spreadsheetId;

    if (!sheetId) {
        throw new Error('Failed to create spreadsheet');
    }

    // 2. Initialize it (we'll call our existing initialize-sheet logic internally or just return the ID for the client to call)
    // For better reliability, we return the ID and let the client call initialize-sheet
    return NextResponse.json({ 
        success: true, 
        sheetId: sheetId,
        message: 'Spreadsheet created successfully. Initializing workspace...' 
    });
  } catch (error: any) {
    console.error('Create sheet error:', error);
    
    if (error.code === 401 || error.message?.toLowerCase().includes('invalid authentication') || error.message?.toLowerCase().includes('credential')) {
        return NextResponse.json({ 
            error: 'Your Google Access Token has expired. Please Sign Out and Sign In again to continue.',
            code: 'AUTH_EXPIRED'
        }, { status: 401 });
    }

    return NextResponse.json({ error: error.message || 'Failed to create sheet' }, { status: 500 });
  }
}
