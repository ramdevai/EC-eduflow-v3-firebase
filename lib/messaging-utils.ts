import { Lead, TEST_LINKS } from './types';
import { normalizeStage } from './utils';

export const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/example-group-link";

export function getWhatsAppLink(
  lead: Lead, 
  type: 'onboarding' | 'test' | 'test_nudge' | 'followup' | 'community' | 'review' | 'birthday' | 'fees_reminder',
  templates?: any[]
) {
  const phone = lead.phone.replace(/\D/g, '');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Try to find custom template from sheet
  const customTemplate = templates?.find(t => t.id === type);
  let message = customTemplate?.message || "";
  
  // If no custom template, use defaults
  if (!message) {
    switch (type) {
        case 'onboarding':
            message = `Hi {name}, this is Binal from EduCompass. Great to have you onboard! Please fill this registration form to share student details: [REGISTRATION_LINK]`;
            break;
        case 'test':
            message = `Hi {name}, based on your details, here is the career assessment link: {url}. Please complete this before our 1:1 session.`;
            break;
        case 'test_nudge':
            message = `Hi {name}, hope you are doing well. Just a gentle nudge to complete the career assessment test so we can proceed with our 1:1 counseling session. Link: {url}`;
            break;
        case 'fees_reminder':
            message = `Hi {name}, just a gentle reminder regarding the professional fees for the career counseling session. Please ignore if already paid. Thanks!`;
            break;
        case 'community':
            message = `Hi {name}, I'd like to invite you to the EduCompass Parents WhatsApp Community where I share important updates and form filling dates: ${WHATSAPP_GROUP_LINK}`;
            break;
        case 'followup':
            if (normalizeStage(lead.stage) === 'Registration requested') {
                message = `Hi {name}, just checking in if you had a chance to fill the registration form? Here is the link again: [REGISTRATION_LINK]`;
            } else {
                message = `Hi {name}, just checking in regarding your career counseling inquiry. Do you have any questions I can help with?`;
            }
            break;
        case 'review':
            message = `Hi {name}, it was a pleasure counseling you. If you found the session helpful, I\'d really appreciate a quick review on Google: [YOUR_GOOGLE_REVIEW_LINK]`;
            break;
        case 'birthday':
            message = `Hi {name}, wishing you a very Happy Birthday! 🎂 Hope you have a fantastic day ahead! - Binal from EduCompass`;
            break;
    }

  }

  // Replace placeholders
  const token = lead.registrationToken || 'PENDING';
  const registrationLink = `${origin}/register/${token}`;
  
  // Use lead.testLink if provided, else attempt suggestion, else default
  const testLink = lead.testLink || getTestLinkByGrade(lead.grade, lead.board) || TEST_LINKS["8th-10th"];

  message = message
    .replace(/{name}/g, lead.name)
    .replace(/\[name\]/g, lead.name);

  // Smart placeholder replacement based on message type and intent
  if (type === 'onboarding' || (type === 'followup' && normalizeStage(lead.stage) === 'Registration requested')) {
      // For onboarding or registration follow-up, {url} or [url] should point to registration
      message = message
        .replace(/{url}/g, registrationLink)
        .replace(/\[url\]/g, registrationLink);
  } else {
      // For others (test, session, etc), {url} should point to assessment
      message = message
        .replace(/{url}/g, testLink)
        .replace(/\[url\]/g, testLink);
  }

  // Global replacements for specific placeholders
  message = message
    .replace(/{TEST_LINK}/g, testLink)
    .replace(/\[TEST_LINK\]/g, testLink)
    .replace(/{REGISTRATION_LINK}/g, registrationLink)
    .replace(/\[REGISTRATION_LINK\]/g, registrationLink);

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}


export function getReportEmailData(lead: Lead, templates?: any[]) {
  const customTemplate = templates?.find(t => t.id === 'report_email');
  const subject = `{name} - Career Counseling Report`.replace(/{name}/g, lead.name);
  
  let body = customTemplate?.message || `Dear Parent,

Please find attached the career counseling report for {name}.

Based on our 1:1 session, we discussed the following career choices and recommendations:
{notes}

[PLEASE ATTACH THE PDF DOWNLOADED FROM EDUMILESTONES]

If you have any questions, feel free to reach out.

Best regards,
Binal
Founder, EduCompass`;

  body = body
    .replace(/{name}/g, lead.name)
    .replace(/{notes}/g, lead.notes || '[Notes from your session]');

  return { subject, body };
}

export function getEmailLink(lead: Lead, templates?: any[]) {
  const { subject, body } = getReportEmailData(lead, templates);
  return `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}


export function getTestLinkByGrade(grade: string | undefined, board: string | undefined): string | undefined {
  if (!grade) return undefined;
  const g = grade.toLowerCase();
  const b = (board || '').toLowerCase();

  if (b.includes('ib') || b.includes('igcse')) {
    if (g.includes('11') || g.includes('12') || g.includes('level') || g.includes('dp')) return TEST_LINKS["High School (IBDP/A-level)"];
    return TEST_LINKS["Secondary (IB/IGCSE)"];
  }

  if (g.includes('2') || g.includes('3') || g.includes('4') || g.includes('5') || g.includes('6') || g.includes('7')) return TEST_LINKS["2nd-7th"];
  if (g.includes('8') || g.includes('9') || g.includes('10')) return TEST_LINKS["8th-10th"];
  if (g.includes('11') || g.includes('12')) return TEST_LINKS["11th-12th"];
  if (g.includes('grad')) return TEST_LINKS["Graduate"];
  if (g.includes('prof')) return TEST_LINKS["Professional"];
  if (g.includes('business') || g.includes('mba')) return TEST_LINKS["Business Management"];
  
  return undefined;
}
