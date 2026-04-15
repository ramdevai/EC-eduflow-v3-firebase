import { z } from 'zod';

const envSchema = z.object({
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is missing"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is missing"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is missing"),
  GOOGLE_REFRESH_TOKEN: z.string().min(1, "GOOGLE_REFRESH_TOKEN is missing"),
  CRON_SECRET: z.string().min(1, "CRON_SECRET is missing"),
  SMTP_HOST: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  IMAP_HOST: z.string().optional(),
  IMAP_PORT: z.string().optional(),
  IMAP_SENT_FOLDER: z.string().optional().default("INBOX.ECRM-sent"),
}).passthrough();

export function validateEnv() {
  try {
    envSchema.parse(process.env);
    return { isValid: true, errors: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error.issues.map(i => i.message) };
    }
    return { isValid: false, errors: ["Unknown environment validation error"] };
  }
}
