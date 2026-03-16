import { z } from 'zod';

const envSchema = z.object({
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is missing"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is missing"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is missing"),
  CRON_SECRET: z.string().min(1, "CRON_SECRET is missing"),
});

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
