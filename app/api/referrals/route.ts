import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { addReferral, getReferrals } from '@/lib/db-firestore';

export async function GET(req: Request) {
  const session = await auth() as any;
  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get('leadId') || undefined;
  const partnershipId = searchParams.get('partnershipId') || undefined;
  const dueForFollowUp = searchParams.get('dueForFollowUp') === 'true';

  try {
    const referrals = await getReferrals({ leadId, partnershipId, dueForFollowUp });
    return NextResponse.json({ referrals });
  } catch (error: any) {
    console.error('GET referrals error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to fetch referrals' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth() as any;
  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (
      typeof body?.leadId !== 'string' ||
      typeof body?.leadName !== 'string' ||
      typeof body?.partnershipId !== 'string' ||
      typeof body?.institutionId !== 'string' ||
      typeof body?.institutionName !== 'string'
    ) {
      return NextResponse.json({ error: 'A lead and a partnership are required' }, { status: 400 });
    }

    const referral = await addReferral(session.user.id, {
      leadId: body.leadId,
      leadName: body.leadName,
      partnershipId: body.partnershipId,
      institutionId: body.institutionId,
      institutionName: body.institutionName,
    });
    return NextResponse.json({ referral }, { status: 201 });
  } catch (error: any) {
    console.error('POST referrals error:', error.message);
    const message = error.message || 'Failed to create referral';
    const status = message.includes('required') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
