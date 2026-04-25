import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';

/**
 * API to trigger a Firestore native import (Restore).
 * Restricted to Admins.
 */
export async function POST(req: Request) {
  const session = await auth() as any;
  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { timestamp, collectionIds } = await req.json();

    if (!timestamp) {
      return NextResponse.json({ error: 'Backup timestamp is required' }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const bucketName = 'educompassfb_crm_backups'; // Strictly use the backup bucket as requested
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!projectId || !serviceAccountKey) {
      return NextResponse.json({ 
        error: 'Missing required configuration (PROJECT_ID or SERVICE_ACCOUNT_KEY)' 
      }, { status: 500 });
    }

    const inputUriPrefix = `gs://${bucketName}/backups/firestore-native/${timestamp}`;

    const authClient = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccountKey),
      scopes: [
        'https://www.googleapis.com/auth/datastore',
        'https://www.googleapis.com/auth/cloud-platform'
      ],
    });

    const firestore = google.firestore({ version: 'v1', auth: authClient });
    
    // Trigger Import
    const response = await firestore.projects.databases.importDocuments({
      name: `projects/${projectId}/databases/(default)`,
      requestBody: {
        inputUriPrefix: inputUriPrefix,
        collectionIds: collectionIds && collectionIds.length > 0 ? collectionIds : undefined,
      },
    });

    console.log(`[Restore API] Import initiated: ${response.data.name}`);

    return NextResponse.json({ 
      success: true, 
      operationName: response.data.name,
      message: 'Restore operation has been initiated.'
    });

  } catch (error: any) {
    console.error('[Restore API] Failed to trigger restore:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
