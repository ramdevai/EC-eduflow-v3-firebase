import { NextResponse } from 'next/server';
import { getPeopleClient } from '@/lib/google';
import { getAllLeads, addLeads, updateLeads } from '@/lib/db-sheets';
import { generateRegistrationToken } from '@/lib/utils';
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
    
    // 1. Fetch from 'My Contacts' - limit to 10
    try {
        const response = await people.people.connections.list({
          resourceName: 'people/me',
          personFields: 'metadata,names,emailAddresses,phoneNumbers,biographies,organizations',
          pageSize: 10,
          sortOrder: 'LAST_MODIFIED_DESCENDING',
        });
        if (response.data.connections) {
            allVisible.push(...response.data.connections);
        }
    } catch (e: any) {
        console.warn('Failed to fetch standard contacts:', e.message);
    }
    
    // 2. Fetch Other Contacts - limit to 10
    try {
        const otherResponse = await people.otherContacts.list({
          readMask: 'metadata,names,emailAddresses,phoneNumbers,biographies,organizations',
          pageSize: 10,
        });
        if (otherResponse.data.otherContacts) {
            allVisible.push(...otherResponse.data.otherContacts);
        }
    } catch (e: any) {
        console.warn('Failed to fetch other contacts:', e.message);
    }
    
    if (allVisible.length === 0) {
        return NextResponse.json({ 
            success: false, 
            error: "No contacts found or access denied." 
        }, { status: 403 });
    }

    const processedIds = new Set<string>();
    const leadsToAdd = [];
    const leadsToUpdate = [];
    const skippedNames = [];

    // Prioritize and keep only top 10 from the combined list
    const topContacts = allVisible.slice(0, 10);

    for (const person of topContacts) {
      if (!person) continue;
      const googleContactId = person.resourceName || '';
      if (!googleContactId || processedIds.has(googleContactId)) continue;
      processedIds.add(googleContactId);

      const name = person.names?.[0]?.displayName || '';
      const notes = person.biographies?.[0]?.value || '';
      const org = person.organizations?.[0]?.name || '';
      
      const combined = `${name} ${notes} ${org}`.toLowerCase();
      if (!combined.includes('lead')) continue;

      const phone = person.phoneNumbers?.[0]?.value || '';
      const email = person.emailAddresses?.[0]?.value || '';
      
      // Check for duplicates in Sheet
      const duplicate = existingLeads.find(l => 
        (googleContactId && l.googleContactId === googleContactId) || 
        (phone && l.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
      );

      const metadata = person.metadata?.sources?.[0];
      const inquiryDate = metadata?.updateTime || new Date().toISOString();

      if (!duplicate) {
        let cleanName = name
          .replace(/\[lead\]/gi, '')
          .replace(/\(lead\)/gi, '')
          .replace(/lead/gi, '')
          .replace(/\d{1,2}(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/gi, '') 
          .replace(/[- ]+$/, '')
          .trim();

        leadsToAdd.push({
          name: cleanName || 'Unnamed Lead',
          email: email,
          phone: phone,
          googleContactId: googleContactId,
          stage: 'New',
          inquiryDate: inquiryDate,
          registrationToken: generateRegistrationToken(),
          notes: notes || '',
        });
      } else {
        const normalizedSheetPhone = duplicate.phone.replace(/\D/g, '');
        const normalizedGooglePhone = phone.replace(/\D/g, '');
        
        const phoneChanged = normalizedGooglePhone && normalizedSheetPhone !== normalizedGooglePhone;
        const emailChanged = email && (duplicate.email || '').toLowerCase() !== email.toLowerCase();
        const idMissingOrChanged = duplicate.googleContactId !== googleContactId;

        if (phoneChanged || emailChanged || idMissingOrChanged) {
            leadsToUpdate.push({
                id: duplicate.id,
                data: {
                    phone: phone || duplicate.phone,
                    email: email || duplicate.email,
                    googleContactId: googleContactId,
                    updatedAt: new Date().toISOString(),
                }
            });
        } else {
            skippedNames.push(name);
        }
      }
    }

    if (leadsToAdd.length > 0) {
      await addLeads(sheetId, token, leadsToAdd as any);
    }
    if (leadsToUpdate.length > 0) {
      await updateLeads(sheetId, token, leadsToUpdate);
    }

    return NextResponse.json({ 
        success: true, 
        added: leadsToAdd.length, 
        updated: leadsToUpdate.length,
        skippedCount: skippedNames.length 
    });
  } catch (error: any) {
    console.error('Manual sync error:', error);
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
