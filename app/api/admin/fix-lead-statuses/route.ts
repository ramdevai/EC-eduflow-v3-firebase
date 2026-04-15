import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { getAllLeads, updateLeads } from '@/lib/db-firestore';
import { computeLeadStatus, normalizeStage, safeFormat } from '@/lib/utils';

export async function POST(req: Request) {
  const session = await auth() as any;

  if (!session?.user?.id || session?.user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  }

  try {
    const allLeads = await getAllLeads(session.user.id, UserRole.Admin);
    const updates: { id: string; data: any }[] = [];
    let changed = 0;
    let newStatusCount = 0;
    let shouldBeWonCount = 0;

    for (const lead of allLeads) {
      if (!['Open', 'Won', 'Lost'].includes(lead.status || '')) newStatusCount++;
      const normalizedStage = normalizeStage(lead.stage || 'New');
      const correctStatus = computeLeadStatus(normalizedStage, lead.status);
      if (correctStatus !== lead.status) {
        if ((normalizedStage === 'Session complete' || normalizedStage === 'Report sent') && lead.status !== 'Won') {
          shouldBeWonCount++;
        }
        updates.push({
          id: lead.id,
          data: { 
            status: correctStatus,
            lastStageUpdate: safeFormat(new Date())
          }
        });
        changed++;
      }
    }

    if (updates.length > 0) {
      await updateLeads(session.user.id, UserRole.Admin, updates);
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${changed} leads (including ${newStatusCount} with status 'New' and ${shouldBeWonCount} that should be 'Won'). Total checked: ${allLeads.length}`,
      changed,
      newStatusCount,
      shouldBeWonCount,
      totalChecked: allLeads.length
    });
  } catch (error: any) {
    console.error('Status fix error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
