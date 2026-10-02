import 'server-only';

import { adminDb } from './server-firebase';
import { generateRegistrationSid, generateRegistrationToken } from './utils';
import {
  normalizeWebsitePhone,
  websiteLeadIdentity,
  type WebsiteIntake,
} from './website-intake-security';

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
  const header = `[Website enquiry · ${PERSONA_LABELS[intake.persona]} · ${INTEREST_LABELS[intake.interest]}]`;
  return intake.message ? `${header}\n${intake.message}` : header;
}

export async function createOrRefreshWebsiteLead(intake: WebsiteIntake): Promise<{
  leadId: string;
  reference: string;
  created: boolean;
}> {
  const ownerUid = process.env.WEBSITE_INTAKE_OWNER_UID?.trim();
  if (!ownerUid) throw new Error('WEBSITE_INTAKE_OWNER_UID is not configured');

  const now = new Date().toISOString();
  const reference = intake.requestId.slice(0, 8).toUpperCase();
  const normalizedPhone = normalizeWebsitePhone(intake.contact.phone);
  const identityHash = websiteLeadIdentity(normalizedPhone);
  const intakeRef = adminDb.collection('websiteIntakes').doc(intake.requestId);
  const identityRef = adminDb.collection('leadIdentities').doc(`phone_${identityHash}`);
  const rateRef = adminDb.collection('websiteIntakeRateLimits').doc(intake.clientFingerprint);
  const limit = Number(process.env.WEBSITE_INTAKE_RATE_LIMIT || 10);
  const windowMs = 15 * 60 * 1000;

  return adminDb.runTransaction(async transaction => {
    const [existingIntake, identityDoc, rateDoc] = await Promise.all([
      transaction.get(intakeRef),
      transaction.get(identityRef),
      transaction.get(rateRef),
    ]);

    if (existingIntake.exists) {
      const previous = existingIntake.data()!;
      return {
        leadId: previous.leadId as string,
        reference: previous.reference as string,
        created: previous.created === true,
      };
    }

    const currentTime = Date.now();
    const rate = rateDoc.data();
    const sameWindow = rate && currentTime - Number(rate.windowStartedAt || 0) < windowMs;
    const requestCount = sameWindow ? Number(rate.requestCount || 0) + 1 : 1;
    if (requestCount > limit) throw new WebsiteIntakeRateLimitError('Rate limit exceeded');

    const existingLeadId = identityDoc.exists ? String(identityDoc.data()!.leadId || '') : '';
    const leadRef = existingLeadId
      ? adminDb.collection('leads').doc(existingLeadId)
      : adminDb.collection('leads').doc();
    const leadDoc = existingLeadId ? await transaction.get(leadRef) : null;
    const existingLead = leadDoc?.exists ? leadDoc.data()! : null;
    const summary = enquirySummary(intake);
    const created = !existingLead;

    transaction.set(rateRef, {
      windowStartedAt: sameWindow ? rate.windowStartedAt : currentTime,
      requestCount,
      updatedAt: now,
    });

    if (existingLead) {
      const oldComments = String(existingLead.comments || '').trim();
      transaction.update(leadRef, {
        name: existingLead.name || intake.contact.name,
        phone: existingLead.phone || normalizedPhone,
        email: existingLead.email || intake.contact.email,
        comments: [oldComments, summary].filter(Boolean).join('\n\n').slice(-5000),
        updatedAt: now,
        lastWebsiteInquiryAt: now,
        websiteInquiryCount: Number(existingLead.websiteInquiryCount || 0) + 1,
        latestWebsiteInterest: intake.interest,
        latestWebsiteAttribution: intake.attribution,
        privacy_consent: true,
        privacy_consent_date: now,
      });
    } else {
      transaction.set(leadRef, {
        ownerUid,
        name: intake.contact.name,
        phone: normalizedPhone,
        email: intake.contact.email,
        stage: 'New',
        status: 'Open',
        inquiryDate: now,
        updatedAt: now,
        lastStageUpdate: now,
        grade: '',
        board: '',
        source: 'Website',
        comments: summary,
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
      transaction.set(identityRef, { leadId: leadRef.id, type: 'phone', createdAt: now });
    }

    transaction.set(intakeRef, {
      leadId: leadRef.id,
      reference,
      created,
      submittedAt: intake.submittedAt,
      receivedAt: now,
      persona: intake.persona,
      interest: intake.interest,
      message: intake.message,
      attribution: intake.attribution,
      consentVersion: intake.consent.version,
    });

    return { leadId: leadRef.id, reference, created };
  });
}
