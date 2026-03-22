import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { validateEnv } from '@/lib/env-check';

export async function POST(req: Request) {
  // 1. Validate Environment
  const envStatus = validateEnv();
  // We'll also check SMTP specifically since it might be new
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json({ 
        error: 'SMTP not configured', 
        details: 'Missing SMTP_HOST, SMTP_USER, or SMTP_PASS in environment variables.' 
    }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const to = formData.get('to') as string; // Could be a comma-separated list
    const subject = formData.get('subject') as string;
    const body = formData.get('body') as string;
    const file = formData.get('report') as File | null;

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Create Transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || '587'),
      secure: smtpPort === '465', // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // 3. Prepare Attachments
    const attachments = [];
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({
        filename: file.name,
        content: buffer,
      });
    }

    // 4. Send Email
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'EduCompass'}" <${smtpUser}>`,
      to,
      subject,
      text: body, // Plain text body
      // html: body.replace(/\n/g, '<br>'), // Optional: simplistic HTML version
      attachments,
    });

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json({ 
        error: 'Failed to send email', 
        details: error.message 
    }, { status: 500 });
  }
}
