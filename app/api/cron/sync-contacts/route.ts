import { NextResponse } from 'next/server';
import { getPeopleClient } from '@/lib/google';
import { getAllLeads, addLead } from '@/lib/db-sheets';
import { google } from 'googleapis';

const SUFFIX = '[LEAD]';

export async function GET(req: Request) {
  // 1. Verify Cron Secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID; // Fallback or we need a way to get all active sheets
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!sheetId || !refreshToken) {
    return NextResponse.json({ error: 'Sync configuration missing (Sheet ID or Refresh Token)' }, { status: 500 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { token } = await oauth2Client.getAccessToken();
    
    if (!token) throw new Error('Failed to get access token from refresh token');

    const people = await getPeopleClient(token);
    const existingLeads = await getAllLeads(sheetId, token);

    // 3. Fetch Contacts
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,phoneNumbers',
      pageSize: 1000,
    });

    const connections = response.data.connections || [];
    let addedCount = 0;

    for (const person of connections) {
      const name = person.names?.[0]?.displayName || '';
      if (name.endsWith(SUFFIX)) {
        const email = person.emailAddresses?.[0]?.value || '';
        const phone = person.phoneNumbers?.[0]?.value || '';
        const googleContactId = person.resourceName || '';

        // Check for duplicates
        const isDuplicate = existingLeads.some(l => 
          l.googleContactId === googleContactId || 
          (phone && l.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
        );

        if (!isDuplicate) {
          await addLead(sheetId, token, {
            name: name.replace(SUFFIX, '').trim(),
            email,
            phone,
            googleContactId,
            stage: 'New',
            notes: 'Imported from Google Contacts',
          } as any);
          addedCount++;
        }
      }
    }

    return NextResponse.json({ success: true, added: addedCount });
  } catch (error: any) {
    console.error('Cron sync error:', error);
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
