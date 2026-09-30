import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  WebsiteIntakeSchema,
  verifyWebsiteIntakeSignature,
} from '@/lib/website-intake-security';
import {
  createOrRefreshWebsiteLead,
  WebsiteIntakeRateLimitError,
} from '@/lib/website-intake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.CRM_WEBSITE_INTAKE_SECRET;
  if (!secret || !process.env.WEBSITE_INTAKE_OWNER_UID) {
    return NextResponse.json({ error: 'Integration unavailable' }, { status: 503 });
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 16_384) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const body = await req.text();
  const timestamp = req.headers.get('x-ec-timestamp') || '';
  const requestId = req.headers.get('x-ec-request-id') || '';
  const signature = req.headers.get('x-ec-signature') || '';

  if (!verifyWebsiteIntakeSignature({ secret, timestamp, requestId, signature, body })) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = WebsiteIntakeSchema.parse(JSON.parse(body));
    if (parsed.requestId !== requestId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const result = await createOrRefreshWebsiteLead(parsed);
    return NextResponse.json(
      { reference: result.reference, created: result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof WebsiteIntakeRateLimitError) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('Website lead intake failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Unable to process enquiry' }, { status: 500 });
  }
}
