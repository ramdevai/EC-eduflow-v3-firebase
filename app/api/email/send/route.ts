import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendEmailWithSentCopy } from '@/lib/email';
import { UserRole } from '@/lib/types';
import { followUpSchema } from '@/lib/follow-ups';
import { recordFollowUp } from '@/lib/server-follow-ups';
import { adminDb } from '@/lib/server-firebase';

export async function POST(req: Request) {
  try {
    const session = await auth() as any;

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.user.role !== UserRole.Admin && session.user.role !== UserRole.Staff) {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    const formData = await req.formData();
    const to = formData.get('to') as string;
    const subject = formData.get('subject') as string;
    const body = formData.get('body') as string;
    const file = formData.get('report') as File | null;

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const leadId = formData.get('leadId');
    let followUpInput;
    if (leadId !== null) {
      if (typeof leadId !== 'string' || !leadId || leadId.includes('/')) {
        return NextResponse.json({ error: 'Invalid lead' }, { status: 400 });
      }
      const parsed = followUpSchema.safeParse({
        requestId: formData.get('requestId'), channel: 'Email', outcome: 'Message sent',
        happenedAt: new Date().toISOString(),
        messageType: formData.get('messageType'),
      });
      if (!parsed.success) return NextResponse.json({ error: 'Invalid email history details' }, { status: 400 });
      const lead = await adminDb.collection('leads').doc(leadId).get();
      if (!lead.exists) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      followUpInput = parsed.data;
    }

    const attachments: any[] = [];
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({
        filename: file.name,
        content: buffer,
      });
    }

    const result = await sendEmailWithSentCopy(to, subject, body, attachments);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.message, 
        details: result.error 
      }, { status: 500 });
    }

    if (followUpInput && typeof leadId === 'string') {
      try {
        const followUp = await recordFollowUp(session.user.id, session.user.role, session.user.name || '', leadId, {
          ...followUpInput, happenedAt: new Date().toISOString(),
        });
        return NextResponse.json({ ...result, followUp });
      } catch {
        console.error('Sent email follow-up could not be recorded');
        return NextResponse.json({ ...result, followUpWarning: 'Email was sent, but follow-up history could not be saved. Record it manually; do not resend the email.' });
      }
    }
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json({ 
      error: 'Failed to send email', 
      details: error.message 
    }, { status: 500 });
  }
}
