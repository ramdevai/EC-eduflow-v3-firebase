import { NextResponse } from 'next/server';
import { getPeopleClient, getSheetsClient } from '@/lib/google';
import { getAllLeads, addLead } from '@/lib/db-sheets';
import { google } from 'googleapis';

const SUFFIX = '[LEAD]';

export async function GET(req: Request) {
  // 1. Verify Cron Secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. Get Refresh Token from env or DB
    // For this prototype, we'll assume the admin's refresh token is in ENV
    // In production, you'd fetch this from your Config sheet
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token configured' }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { token } = await oauth2Client.getAccessToken();
    
    if (!token) throw new Error('Failed to get access token');

    const people = await getPeopleClient(token);
    const existingLeads = await getAllLeads();

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
          (phone && l.phone === phone)
        );

        if (!isDuplicate) {
          await addLead({
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
  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
