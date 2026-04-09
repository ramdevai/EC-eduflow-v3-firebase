import { NextResponse } from 'next/server';
import { syncGoogleContacts } from '@/lib/google-contacts';

export async function GET(req: Request) {
  // 1. Verify Cron Secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // We use 'system-cron' as the owner for leads imported via background sync.
    // Admin users will be able to see and re-assign these leads.
    const result = await syncGoogleContacts('system-cron', 'cron');

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Cron Sync Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
