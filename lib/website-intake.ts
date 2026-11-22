import 'server-only';

import { adminDb } from './server-firebase';
import { generateRegistrationSid, generateRegistrationToken } from './utils';
import { COLLABORATION_LEAD_SOURCE } from './types';
import { CollaborationError, resolveCollaboration } from './collaborations';
import type { WebsiteIntake } from './website-intake-security';

const PERSONA_LABELS: Record<WebsiteIntake['persona'], string> = {
  student: 'Student',
  parent: 'Parent',
  professional: 'Working professional',
  school: 'School or institution',
};

const INTEREST_LABELS: Record<WebsiteIntake['interest'], string> = {
  'subject-selection': 'Subject or stream selection',
  'career-counselling': 'Career counselling',
  'psychometric-assessment': 'Psychometric assessment',
  'international-education': 'International education',
  'school-partnership': 'School partnership',
  other: 'Something else',
};

export class WebsiteIntakeRateLimitError extends Error {}

function enquirySummary(intake: WebsiteIntake): string {
  const source = intake.collaborationInterest ? COLLABORATION_LEAD_SOURCE : 'Website';
  const header = `[${source} enquiry · ${PERSONA_LABELS[intake.persona]} · ${INTEREST_LABELS[intake.interest]}]`;
  return intake.message ? `${header}\n${intake.message}` : header;
}

export async function createWebsiteLeadOccurrence(intake: WebsiteIntake): Promise<{
  leadId: string;
  reference: string;
  created: boolean;
}> {
  const ownerUid = process.env.WEBSITE_INTAKE_OWNER_UID?.trim();
  if (!ownerUid) throw new Error('WEBSITE_INTAKE_OWNER_UID is not configured');

  const now = new Date().toISOString();
  const reference = intake.requestId.slice(0, 8).toUpperCase();
  const intakeRef = adminDb.collection('websiteIntakes').doc(intake.requestId);
  const interest = intake.collaborationInterest;
  const rateKey = interest ? `interest_${intake.clientFingerprint}` : intake.clientFingerprint;
  const rateRef = adminDb.collection('websiteIntakeRateLimits').doc(rateKey);
  const limit = interest ? 30 : Number(process.env.WEBSITE_INTAKE_RATE_LIMIT || 10);
  const windowMs = 15 * 60 * 1000;

  const result = await adminDb.runTransaction(async transaction => {
    const existingIntake = await transaction.get(intakeRef);

    if (existingIntake.exists) {
      const previous = existingIntake.data()!;
      return {
        leadId: previous.leadId as string,
        reference: previous.reference as string,
        created: previous.created === true,
      };
    }

    const currentTime = Date.now();
    const rate = (await transaction.get(rateRef)).data();
    const sameWindow = rate && currentTime - Number(rate.windowStartedAt || 0) < windowMs;
    const requestCount = sameWindow ? Number(rate.requestCount || 0) + 1 : 1;
    if (requestCount > limit) throw new WebsiteIntakeRateLimitError('Rate limit exceeded');

    // Resolve the code in the same transaction so a concurrent closure takes effect on new leads.
    const campaign = interest?.code ? await resolveCollaboration(transaction, interest.code) : undefined;

    transaction.set(rateRef, {
      windowStartedAt: sameWindow ? rate.windowStartedAt : currentTime,
      requestCount,
      updatedAt: now,
    });

    if (campaign === null) return null; // Count invalid codes toward the rate limit, too.

    const leadRef = adminDb.collection('leads').doc();
    transaction.set(leadRef, {
      ownerUid: campaign?.ownerUid || ownerUid,
      name: intake.contact.name,
      phone: intake.contact.phone,
      phoneNormalized: intake.contact.phoneNormalized,
      email: intake.contact.email,
      stage: 'New',
      status: 'Open',
      inquiryDate: now,
      updatedAt: now,
      lastStageUpdate: now,
      grade: interest?.grade || '',
      board: interest?.board || '',
      ...(interest && { studentName: interest.studentName, school: interest.school }),
      ...(campaign && {
        collaborationId: campaign.id,
        collaborationCode: campaign.code,
        collaborationTitle: campaign.title,
        ...(campaign.offer && { collaborationOffer: campaign.offer }),
      }),
      source: interest ? COLLABORATION_LEAD_SOURCE : 'Website',
      comments: enquirySummary(intake),
      notes: '',
      lastFollowUp: '',
      testLink: '',
      appointmentTime: '',
      feesPaid: 'Due',
      reportSentDate: '',
      convertedDate: '',
      communityJoined: 'No',
      registrationToken: generateRegistrationToken(),
      registrationSid: generateRegistrationSid(),
      privacy_consent: true,
      privacy_consent_date: now,
      websitePersona: intake.persona,
      latestWebsiteInterest: intake.interest,
      latestWebsiteAttribution: intake.attribution,
      lastWebsiteInquiryAt: now,
      websiteInquiryCount: 1,
    });

    transaction.set(intakeRef, {
      leadId: leadRef.id,
      reference,
      created: true,
      submittedAt: intake.submittedAt,
      receivedAt: now,
      persona: intake.persona,
      interest: intake.interest,
      message: intake.message,
      attribution: intake.attribution,
      consentVersion: intake.consent.version,
    });

    return { leadId: leadRef.id, reference, created: true };
  });
  if (!result) {
    throw new CollaborationError('This collaboration code is unavailable. Check it or leave the field blank.', 422);
  }
  return result;
}
