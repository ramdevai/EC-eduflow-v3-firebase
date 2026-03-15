import { Lead, TEST_LINKS } from './types';

export const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/example-group-link";
export const REGISTRATION_FORM_LINK = "https://forms.gle/Cab1hdnxPz2t1P6r8";

export function getWhatsAppLink(lead: Lead, type: 'onboarding' | 'test' | 'followup' | 'community' | 'review') {
  const phone = lead.phone.replace(/\D/g, '');
  let message = "";

  switch (type) {
    case 'onboarding':
      message = `Hi ${lead.name}, this is Binal from EduCompass. Great to have you onboard! Please fill this registration form to share student details: ${REGISTRATION_FORM_LINK}`;
      break;
    case 'test':
      const testLink = getTestLinkByGrade(lead.grade, lead.board);
      message = `Hi ${lead.name}, based on your details, here is the career assessment link: ${testLink || lead.testLink}. Please complete this before our 1:1 session.`;
      break;
    case 'community':
      message = `Hi ${lead.name}, I'd like to invite you to the EduCompass Parents WhatsApp Community where I share important updates and form filling dates: ${WHATSAPP_GROUP_LINK}`;
      break;
    case 'followup':
      message = `Hi ${lead.name}, just checking in regarding your career counseling inquiry. Do you have any questions I can help with?`;
      break;
    case 'review':
      message = `Hi ${lead.name}, it was a pleasure counseling you. If you found the session helpful, I'd really appreciate a quick review on Google: [YOUR_GOOGLE_REVIEW_LINK]`;
      break;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function getEmailLink(lead: Lead) {
  const subject = `Career Counseling Report - ${lead.name}`;
  const body = `Dear Parent,

Please find attached the career counseling report for ${lead.name}.

Based on our 1:1 session, we discussed the following career choices and recommendations:
${lead.notes || '[Notes from your session]'}

[PLEASE ATTACH THE PDF DOWNLOADED FROM EDUMILESTONES]

If you have any questions, feel free to reach out.

Best regards,
Binal
Founder, EduCompass`;

  return `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function getTestLinkByGrade(grade: string, board: string): string {
  const g = grade.toLowerCase();
  const b = board.toLowerCase();

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
  
  return TEST_LINKS["8th-10th"]; // Default
}
