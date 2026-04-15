import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendEmailWithSentCopy } from '@/lib/email';
import { UserRole } from '@/lib/types';

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

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json({ 
      error: 'Failed to send email', 
      details: error.message 
    }, { status: 500 });
  }
}
