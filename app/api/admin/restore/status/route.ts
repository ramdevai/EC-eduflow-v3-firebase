import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';

/**
 * API to check the status of a long-running Firestore operation.
 */
export async function GET(req: Request) {
  const session = await auth() as any;
  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Operation name is required' }, { status: 400 });
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    return NextResponse.json({ error: 'Service Account Key not configured.' }, { status: 500 });
  }

  try {
    const authClient = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccountKey),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const firestore = google.firestore({ version: 'v1', auth: authClient });
    
    // Get Operation Status
    const response = await firestore.projects.databases.operations.get({ name });

    return NextResponse.json({ 
      success: true, 
      operation: response.data 
    });

  } catch (error: any) {
    console.error('[Restore API] Failed to check status:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
