import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { adminDb } from '@/lib/server-firebase';
import { format } from 'date-fns';

/**
 * CRON API Route to trigger an automated Firestore backup.
 * Expects a Bearer token in the Authorization header matching CRON_SECRET.
 */
export async function GET(req: Request) {
  // 1. Verify Cron Secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const bucketName = process.env.FIREBASE_BACKUP_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!projectId || !bucketName || !serviceAccountKey) {
    return NextResponse.json({
      success: false,
      error: 'Missing required configuration (PROJECT_ID, BUCKET_NAME, or SERVICE_ACCOUNT_KEY)'
    }, { status: 500 });
  }

  try {
    // Generate a timestamped folder name for the backup
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
    const outputUriPrefix = `gs://${bucketName}/backups/firestore-native/${timestamp}`;
    
    // --- Trigger Native Firestore Export ---
    // We use googleapis to authenticate with the service account and trigger the export documents operation.
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccountKey),
      scopes: [
        'https://www.googleapis.com/auth/datastore',
        'https://www.googleapis.com/auth/cloud-platform'
      ],
    });

    const firestore = google.firestore({ version: 'v1', auth });
    
    // This starts an asynchronous long-running operation in Google Cloud
    const exportResponse = await firestore.projects.databases.exportDocuments({
      name: `projects/${projectId}/databases/(default)`,
      requestBody: {
        outputUriPrefix: outputUriPrefix,
      },
    });

    console.log(`[Backup Cron] Native export started: ${exportResponse.data.name}`);

    return NextResponse.json({
      success: true,
      timestamp,
      operationName: exportResponse.data.name,
      outputLocation: outputUriPrefix,
      message: 'Firestore native export operation has been initiated.'
    });

  } catch (error: any) {
    console.error('[Backup Cron] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error during backup'
    }, { status: 500 });
  }
}
