import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { getAllLeads, deleteLead } from '@/lib/db-firestore';

export async function POST(req: Request) {
  const session = await auth() as any;

  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  }

  try {
    const allLeads = await getAllLeads(session.user.id, UserRole.Admin);
    const csvLeads = allLeads.filter(lead => 
      lead.source && (
        lead.source.toLowerCase().includes('csv') || 
        lead.source.toLowerCase().includes('imported from csv')
      )
    );

    let deleted = 0;
    for (const lead of csvLeads) {
      await deleteLead(session.user.id, UserRole.Admin, lead.id);
      deleted++;
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted} leads with 'Imported from CSV' source. Total checked: ${allLeads.length}`,
      deleted,
      totalChecked: allLeads.length
    });
  } catch (error: any) {
    console.error('CSV delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
