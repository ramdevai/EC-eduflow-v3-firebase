import { NextResponse } from 'next/server';
import { getPeopleClient } from '@/lib/google';
import { getAllLeads, addLead, updateLead, generateRegistrationToken } from '@/lib/db-sheets';
import { auth } from '@/lib/auth';
import { validateEnv } from '@/lib/env-check';

export async function POST(req: Request) {
  const envStatus = validateEnv();
  if (!envStatus.isValid) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const session = await auth() as any;
  const sheetId = req.headers.get('x-sheet-id');

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!sheetId) {
    return NextResponse.json({ error: 'Sheet ID not provided' }, { status: 400 });
  }

  try {
    const token = session.accessToken;
    const people = await getPeopleClient(token);
    const existingLeads = await getAllLeads(sheetId, token);

    const allVisible: any[] = [];
    
    // 1. Fetch from 'My Contacts'
    try {
        const response = await people.people.connections.list({
          resourceName: 'people/me',
          personFields: 'names,emailAddresses,phoneNumbers,biographies,organizations',
          pageSize: 1000,
          sortOrder: 'LAST_MODIFIED_DESCENDING',
        });
        if (response.data.connections) {
            allVisible.push(...response.data.connections);
        }
    } catch (e: any) {
        console.warn('Failed to fetch standard contacts (check scopes):', e.message);
    }
    
    // 2. Fetch Other Contacts
    try {
        const otherResponse = await people.otherContacts.list({
          readMask: 'names,emailAddresses,phoneNumbers',
          pageSize: 100,
        });
        if (otherResponse.data.otherContacts) {
            allVisible.push(...otherResponse.data.otherContacts);
        }
    } catch (e: any) {
        console.warn('Failed to fetch other contacts (check scopes):', e.message);
    }
    
    if (allVisible.length === 0) {
        return NextResponse.json({ 
            success: false, 
            error: "Could not access your contacts. Please Sign Out and Sign In again to grant permissions." 
        }, { status: 403 });
    }

    const processedIds = new Set<string>();
    let addedCount = 0;
    let updatedCount = 0;
    const skipped = [];

    for (const person of allVisible) {
      if (!person) continue;
      const googleContactId = person.resourceName || '';
      if (!googleContactId || processedIds.has(googleContactId)) continue;
      processedIds.add(googleContactId);

      const name = person.names?.[0]?.displayName || '';
      const notes = person.biographies?.[0]?.value || '';
      const org = person.organizations?.[0]?.name || '';
      
      const combined = `${name} ${notes} ${org}`.toLowerCase();
      
      // Flexible match for 'lead'
      if (!combined.includes('lead')) continue;

      const phone = person.phoneNumbers?.[0]?.value || '';
      const email = person.emailAddresses?.[0]?.value || '';
      
      // Check for duplicates in Sheet
      const duplicate = existingLeads.find(l => 
        (googleContactId && l.googleContactId === googleContactId) || 
        (phone && l.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
      );

      if (!duplicate) {
        // ... Clean and add new lead
        let cleanName = name
          .replace(/\[lead\]/gi, '')
          .replace(/\(lead\)/gi, '')
          .replace(/lead/gi, '')
          .replace(/\d{1,2}(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/gi, '') 
          .replace(/[- ]+$/, '')
          .trim();

        await addLead(sheetId, token, {
          name: cleanName || 'Unnamed Lead',
          email: email,
          phone: phone,
          googleContactId: googleContactId,
          stage: 'New',
          registrationToken: generateRegistrationToken(),
          notes: notes ? `Contact Notes: ${notes}` : 'Imported from Google Contacts',
        } as any);
        addedCount++;
      } else {
        // UPDATE LOGIC: Check if anything changed or if we need to link the Google ID
        const normalizedSheetPhone = duplicate.phone.replace(/\D/g, '');
        const normalizedGooglePhone = phone.replace(/\D/g, '');
        
        const phoneChanged = normalizedGooglePhone && normalizedSheetPhone !== normalizedGooglePhone;
        const emailChanged = email && (duplicate.email || '').toLowerCase() !== email.toLowerCase();
        const idMissingOrChanged = duplicate.googleContactId !== googleContactId;

        if (phoneChanged || emailChanged || idMissingOrChanged) {
            await updateLead(sheetId, token, duplicate.id, {
                phone: phone || duplicate.phone,
                email: email || duplicate.email,
                googleContactId: googleContactId, // Link or update the ID
                updatedAt: new Date().toISOString(),
            });
            updatedCount++;
        } else {
            skipped.push(name);
        }
      }
    }

    return NextResponse.json({ 
        success: true, 
        added: addedCount, 
        updated: updatedCount,
        skippedCount: skipped.length 
    });
  } catch (error: any) {
    console.error('Manual sync error:', error);
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
