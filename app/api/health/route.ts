import { NextResponse } from 'next/server';
import { validateEnv } from '@/lib/env-check';
import { auth } from '@/lib/auth';

export async function GET() {
  const envStatus = validateEnv();
  const session = await auth() as any;

  return NextResponse.json({
    status: envStatus.isValid && session ? 'healthy' : 'degraded',
    environment: {
      valid: envStatus.isValid,
      errors: envStatus.errors,
    },
    authentication: {
      loggedIn: !!session,
      hasAccessToken: !!session?.accessToken,
    },
    timestamp: new Date().toISOString(),
  });
}
