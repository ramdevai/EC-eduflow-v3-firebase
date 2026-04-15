import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';

import { validateEnv } from './env-check';

export interface EmailResult {
  success: boolean;
  message: string;
  savedToSent: boolean;
  sentFolder?: string;
  error?: string;
}

const DEFAULT_SENT_FOLDER = 'INBOX.Sent';

export async function sendEmailWithSentCopy(
  to: string,
  subject: string,
  body: string,
  attachments: any[] = []
): Promise<EmailResult> {
  const envStatus = validateEnv();
  if (!envStatus.isValid) {
    return {
      success: false,
      message: 'Server configuration error',
      savedToSent: false,
      error: 'Missing required environment variables'
    };
  }

  const smtpHost = process.env.SMTP_HOST!;
  const smtpUser = process.env.SMTP_USER!;
  const smtpPass = process.env.SMTP_PASS!;
  const sentFolder = process.env.IMAP_SENT_FOLDER || DEFAULT_SENT_FOLDER;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: smtpUser, pass: smtpPass }
  });

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'EduCompass'}" <${smtpUser}>`,
    to,
    subject,
    text: body,
    attachments,
    headers: { 'X-Eduflow-Sent': '1' }
  };

  try {
    await transporter.sendMail(mailOptions);

    const savedToSent = await appendToSentFolder(mailOptions, sentFolder);

    return {
      success: true,
      message: 'Email sent successfully',
      savedToSent,
      sentFolder: savedToSent ? sentFolder : undefined
    };
  } catch (error: any) {
    console.error('Email send error:', error);
    return {
      success: false,
      message: 'Failed to send email',
      savedToSent: false,
      error: error.message
    };
  }
}

async function appendToSentFolder(mailOptions: any, sentFolder: string): Promise<boolean> {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!
    },
    logger: false
  });

  try {
    await client.connect();

    let mailbox = await client.mailboxOpen(sentFolder).catch(() => null);
    if (!mailbox) {
      await client.mailboxCreate(sentFolder);
      mailbox = await client.mailboxOpen(sentFolder);
    }

    if (!mailbox) return false;

    const message = await new Promise<Buffer>((resolve, reject) => {
      const composer = new (require('nodemailer/lib/mail-composer'))(mailOptions);
      composer.compile().build((err: any, msg: Buffer) => {
        if (err) reject(err);
        else resolve(msg);
      });
    });

    await client.append(sentFolder, message, ['\\Seen']);

    return true;
  } catch (error: any) {
    console.warn(`[IMAP] Failed to save to ${sentFolder}:`, error.response || error.message);
    if (error.response) console.warn('[IMAP] Full response:', error.responseText);
    return false;
  } finally {
    await client.logout().catch(() => {});
  }
}
