import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';

/**
 * API to list available Firestore native backups from GCS.
 * Restricted to Admins.
 */
export async function GET() {
  const session = await auth() as any;
  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const bucketName = 'educompassfb_crm_backups'; // Strictly use the backup bucket as requested
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    return NextResponse.json({ 
      error: 'Service Account Key not configured.' 
    }, { status: 500 });
  }

  try {
    const authClient = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccountKey),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const storage = google.storage({ version: 'v1', auth: authClient });
    
    // List "folders" under backups/firestore-native/
    // GCS is flat, so we use a delimiter to simulate folder listing.
    const response = await storage.objects.list({
      bucket: bucketName,
      prefix: 'backups/firestore-native/',
      delimiter: '/',
    });

    // Prefixes contain the "folders" (e.g., "backups/firestore-native/2023-10-27-1200/")
    const backups = response.data.prefixes?.map(prefix => {
        const parts = prefix.split('/').filter(Boolean);
        return parts[parts.length - 1]; // Get the timestamp folder name
    }) || [];

    // Sort backups descending (newest first)
    return NextResponse.json({ 
      success: true,
      backups: backups.sort().reverse() 
    });

  } catch (error: any) {
    console.error('[Restore API] Failed to list backups:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
