import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { CollaborationId } from '@/lib/collaboration-schema';
import { CollaborationError, readPublicCollaboration } from '@/lib/collaborations';
import {
  WebsiteIntakeSchema,
  verifyWebsiteIntakeSignature,
} from '@/lib/website-intake-security';
import {
  createWebsiteLeadOccurrence,
  WebsiteIntakeRateLimitError,
} from '@/lib/website-intake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.CRM_WEBSITE_INTAKE_SECRET;
  const campaign = CollaborationId.safeParse(new URL(req.url).searchParams.get('collaboration'));
  if (!secret || !campaign.success || !verifyWebsiteIntakeSignature({
    secret,
    timestamp: req.headers.get('x-ec-timestamp') || '',
    requestId: campaign.data,
    signature: req.headers.get('x-ec-signature') || '',
    body: 'collaboration-page',
  })) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    return NextResponse.json(
      { collaboration: await readPublicCollaboration(campaign.data) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    console.error('Unable to read public collaboration');
    return NextResponse.json({ error: 'Content unavailable' }, { status: 503 });
  }
}

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

  if (Buffer.byteLength(body) > 16_384) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });

  if (!verifyWebsiteIntakeSignature({ secret, timestamp, requestId, signature, body })) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = WebsiteIntakeSchema.parse(JSON.parse(body));
    if (parsed.requestId !== requestId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const result = await createWebsiteLeadOccurrence(parsed);
    return NextResponse.json(
      result,
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof CollaborationError && error.status === 422) {
      return NextResponse.json({ error: 'collaboration_code_unavailable' }, { status: 422 });
    }
    if (error instanceof WebsiteIntakeRateLimitError) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('Website lead intake failed', { requestId });
    return NextResponse.json({ error: 'Unable to process enquiry' }, { status: 500 });
  }
}
