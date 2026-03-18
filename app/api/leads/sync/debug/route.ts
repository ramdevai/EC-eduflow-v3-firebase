import { NextResponse } from 'next/server';
import { getPeopleClient } from '@/lib/google';
import { auth } from '@/lib/auth';
import { validateEnv } from '@/lib/env-check';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.toLowerCase() || 'lead';

  const envStatus = validateEnv();
  if (!envStatus.isValid) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const session = await auth() as any;
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const token = session.accessToken;
    const people = await getPeopleClient(token);

    // 1. HIGH PERFORMANCE SEARCH
    const searchResponse = await people.people.searchContacts({
      query: query,
      readMask: 'names,emailAddresses,phoneNumbers,biographies,organizations',
    });

    const searchResults = searchResponse.data.results || [];
    
    // 2. BACKUP: Other Contacts scan (if query is 'lead')
    let otherResults: any[] = [];
    if (query === 'lead') {
        const otherResponse = await people.otherContacts.list({
            readMask: 'names,emailAddresses,phoneNumbers',
            pageSize: 100,
        });
        otherResults = (otherResponse.data.otherContacts || []).filter(c => 
            c.names?.[0]?.displayName?.toLowerCase().includes('lead')
        );
    }

    const results = [
        ...searchResults.map(r => ({
            source: 'Search Results (My Contacts)',
            name: r.person?.names?.[0]?.displayName,
            phone: r.person?.phoneNumbers?.[0]?.value,
            email: r.person?.emailAddresses?.[0]?.value,
            notes: r.person?.biographies?.[0]?.value,
            organization: r.person?.organizations?.[0]?.name,
            resourceName: r.person?.resourceName
        })),
        ...otherResults.map(c => ({
            source: 'Filtered Other Contacts',
            name: c.names?.[0]?.displayName,
            phone: c.phoneNumbers?.[0]?.value,
            email: c.emailAddresses?.[0]?.value,
            resourceName: c.resourceName
        }))
    ];

    return NextResponse.json({ 
      query: query,
      totalFound: results.length,
      results
    });
  } catch (error: any) {
    console.error('Debug sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
