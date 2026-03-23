import { NextResponse } from 'next/server';
import { getPeopleClient } from '@/lib/google';
import { getAllLeads, addLeads } from '@/lib/db-sheets';
import { google } from 'googleapis';

export async function GET(req: Request) {
  // 1. Verify Cron Secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sid = searchParams.get('sid');
  const sheetId = sid || process.env.GOOGLE_SHEET_ID;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!sheetId || !refreshToken || refreshToken === 'placeholder' || sheetId === 'placeholder') {
    return NextResponse.json({ error: 'Sync configuration missing in .env.local' }, { status: 500 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { token } = await oauth2Client.getAccessToken();
    
    if (!token) throw new Error('Failed to refresh access token');

    const people = await getPeopleClient(token);
    const existingLeads = await getAllLeads(sheetId, token);

    // Fetch top 50 most recently modified "Other Contacts"
    const otherResponse = await people.otherContacts.list({
      readMask: 'metadata,names,emailAddresses,phoneNumbers,biographies,organizations',
      pageSize: 50,
    });

    // Also check standard connections (people manually saved)
    const connectionsResponse = await people.people.connections.list({
      resourceName: 'people/me',
      personFields: 'metadata,names,emailAddresses,phoneNumbers,biographies,organizations',
      pageSize: 50,
      sortOrder: 'LAST_MODIFIED_DESCENDING',
    });

    const allConnections = [
      ...(otherResponse.data.otherContacts || []),
      ...(connectionsResponse.data.connections || [])
    ];
    
    const processedIds = new Set<string>();
    const leadsToAdd = [];

    for (const person of allConnections) {
      if (!person) continue;
      const name = person.names?.[0]?.displayName || '';
      const notes = person.biographies?.[0]?.value || '';
      const org = person.organizations?.[0]?.name || '';
      const googleContactId = person.resourceName || '';
      
      if (!googleContactId || processedIds.has(googleContactId)) continue;
      processedIds.add(googleContactId);

      const combined = `${name} ${notes} ${org}`.toLowerCase();
      if (!combined.includes('lead')) continue;

      const phone = person.phoneNumbers?.[0]?.value || '';
      
      // Check duplicates
      const isDuplicate = existingLeads.some(l => 
        (googleContactId && l.googleContactId === googleContactId) || 
        (phone && l.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
      );

      if (!isDuplicate) {
        let cleanName = name
          .replace(/\[lead\]/gi, '')
          .replace(/\(lead\)/gi, '')
          .replace(/lead/gi, '')
          .replace(/\d{1,2}(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/gi, '') 
          .replace(/[- ]+$/, '')
          .trim();

        // Use contact saved date as inquiry date
        const metadata = person.metadata?.sources?.[0];
        const inquiryDate = metadata?.updateTime || new Date().toISOString();

        leadsToAdd.push({
          name: cleanName || 'Unnamed Lead',
          email: person.emailAddresses?.[0]?.value || '',
          phone: phone,
          googleContactId: googleContactId,
          stage: 'New',
          inquiryDate: inquiryDate,
          notes: notes || '',
        });
      }
    }

    if (leadsToAdd.length > 0) {
      await addLeads(sheetId, token, leadsToAdd as any);
    }

    return NextResponse.json({ 
        success: true, 
        added: leadsToAdd.length, 
        checked: processedIds.size 
    });
  } catch (error: any) {
    console.error('Cron sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
