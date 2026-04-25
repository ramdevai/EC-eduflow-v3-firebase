import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { getAllLeads } from '@/lib/db-firestore';
import Papa from 'papaparse';

export async function GET() {
  const session = await auth() as any;
  
  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    // Fetch all leads (no limit, all fields)
    const leads = await getAllLeads(session.user.id, session.user.role);

    // Convert to CSV
    const csv = Papa.unparse(leads, {
      header: true,
      skipEmptyLines: true,
    });

    // Return as downloadable file
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error: any) {
    console.error('[Export API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
