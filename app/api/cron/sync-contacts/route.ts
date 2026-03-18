import { NextResponse } from 'next/server';
import { getPeopleClient } from '@/lib/google';
import { getAllLeads, addLead } from '@/lib/db-sheets';
import { google } from 'googleapis';

export async function GET(req: Request) {
  // 1. Verify Cron Secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
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

    // 1. Search for "lead"
    const searchResponse = await people.people.searchContacts({
      query: 'lead',
      readMask: 'names,emailAddresses,phoneNumbers,biographies,organizations',
    });

    const searchResults = searchResponse.data.results || [];
    
    // 2. Fetch Other Contacts (Light search)
    const otherResponse = await people.otherContacts.list({
      readMask: 'names,emailAddresses,phoneNumbers',
      pageSize: 100,
    });

    const standardConnections = searchResults.map(r => r.person).filter((p): p is any => !!p);
    const otherConnections = otherResponse.data.otherContacts || [];
    
    const allVisible = [...standardConnections, ...otherConnections];
    const processedIds = new Set<string>();
    let addedCount = 0;

    for (const person of allVisible) {
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

        await addLead(sheetId, token, {
          name: cleanName || 'Unnamed Lead',
          email: person.emailAddresses?.[0]?.value || '',
          phone: phone,
          googleContactId: googleContactId,
          stage: 'New',
          notes: notes ? `Notes: ${notes}` : 'Auto-synced via Cron',
        } as any);
        addedCount++;
      }
    }

    return NextResponse.json({ success: true, added: addedCount, checked: processedIds.size });
  } catch (error: any) {
    console.error('Cron sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
