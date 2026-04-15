import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllLeads } from '@/lib/db-firestore';
import { UserRole } from '@/lib/types';
import { computeLeadStatus, normalizeStage } from '@/lib/utils';

export async function POST(req: Request) {
  const session = await auth() as any;
  const { rows, filename } = await req.json();

  if (!session?.user?.id || (session?.user?.role !== UserRole.Admin && session?.user?.role !== UserRole.Staff) || !rows || rows.length === 0) {
    return NextResponse.json({ error: 'Missing data or authentication' }, { status: 400 });
  }

  try {
    const existingLeads = await getAllLeads(session.user.id, session.user.role as UserRole);
    const existingEmails = new Set(existingLeads.map(l => l.email?.toLowerCase().trim()).filter(Boolean));
    const existingPhones = new Set(existingLeads.map(l => l.phone?.replace(/\D/g, '').slice(-10)).filter(p => p.length >= 10));

    let duplicatesCount = 0;
    const headers = Object.keys(rows[0] || {}).map(h => h.toLowerCase().trim());

    const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('whatsapp'));
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('student'));
    const gradeIdx = headers.findIndex(h => h.includes('grade') || h.includes('class') || h.includes('standard'));
    const stageIdx = headers.findIndex(h => h.includes('stage'));
    const statusIdx = headers.findIndex(h => h.includes('status'));
    const sourceIdx = headers.findIndex(h => h.includes('source') || h.includes('how') || h.includes('know'));

    for (const row of rows) {
      const email = row[Object.keys(row)[emailIdx]]?.toString().toLowerCase().trim() || '';
      const phoneRaw = row[Object.keys(row)[phoneIdx]]?.toString().replace(/\D/g, '') || '';
      const phone = phoneRaw.slice(-10);

      const isDuplicate = (email && existingEmails.has(email)) || (phone && phone.length >= 10 && existingPhones.has(phone));
      if (isDuplicate) duplicatesCount++;
    }

    const sampleRow = rows[0] || {};
    const sampleStage = normalizeStage(sampleRow[Object.keys(sampleRow)[stageIdx]] || 'New');
    const sampleStatus = computeLeadStatus(sampleStage, sampleRow[Object.keys(sampleRow)[statusIdx]]);

    return NextResponse.json({
      total: rows.length,
      duplicates: duplicatesCount,
      matchedFields: {
        name: nameIdx !== -1 ? Object.keys(sampleRow)[nameIdx] : null,
        email: emailIdx !== -1 ? Object.keys(sampleRow)[emailIdx] : null,
        phone: phoneIdx !== -1 ? Object.keys(sampleRow)[phoneIdx] : null,
        grade: gradeIdx !== -1 ? Object.keys(sampleRow)[gradeIdx] : null,
        stage: stageIdx !== -1 ? Object.keys(sampleRow)[stageIdx] : null,
        status: statusIdx !== -1 ? Object.keys(sampleRow)[statusIdx] : null,
      },
      sampleStatus,
      sampleStage,
      headers: Object.keys(sampleRow),
      sample: sampleRow,
      source: 'CSV Import'
    });
  } catch (error: any) {
    console.error('CSV analysis error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
