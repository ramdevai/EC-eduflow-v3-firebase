import type { Metadata } from 'next';
import { PRIVACY_NOTICE_URL, SERVICE_TERMS_VERSION } from '@/lib/legal-documents';

export const metadata: Metadata = {
  title: 'Educational Consulting Services Terms | EduCompass',
  description: 'Terms that apply when registering for EduCompass Educational Consulting Services.',
  robots: { index: false, follow: false },
};

const sections = [
  {
    title: '1. Services',
    body: 'EduCompass provides Educational Consulting Services. Depending on the service recommended to you, this may include assessments, interpretation of results, counselling sessions, a written report, planning support, and follow-up guidance. The exact scope will be communicated separately, and the sequence or method may be adapted using professional judgement as the work progresses.',
  },
  {
    title: '2. Fees and payment',
    body: 'Applicable fees and payment arrangements will be communicated separately before the service begins. Registration through this form does not alter the fee or payment arrangement already communicated to you. EduCompass may pause delivery until an agreed payment is received.',
  },
  {
    title: '3. Cancellation and rescheduling',
    body: 'Please provide at least 24 hours\' notice when requesting to reschedule a session. A late cancellation or missed session may be treated as used, and any rescheduling is subject to availability. Payments may become non-refundable to the extent that an assessment has been activated or completed, a consultation has begun, or report or other agreed work has been undertaken. If EduCompass cannot deliver an agreed service, EduCompass may provide a suitable reschedule or refund the undelivered portion, as appropriate. Exceptional circumstances may be considered at EduCompass\'s reasonable discretion.',
  },
  {
    title: '4. Client responsibilities',
    body: 'You agree to provide complete and accurate information, complete assessments personally and honestly, attend agreed sessions on time, and tell us about relevant circumstances that may affect the guidance provided. Incomplete, inaccurate, or delayed information may affect the timing or quality of the service and may require EduCompass to pause or reschedule it. A parent or lawful guardian must accept these terms where the student is under 18.',
  },
  {
    title: '5. Guidance and outcomes',
    body: 'EduCompass provides professional educational and career guidance to support informed decisions. We do not guarantee admission, academic performance, employment, visa approval, or any particular career outcome. Final decisions and actions remain with the student and family. To the extent permitted by law, EduCompass is not responsible for indirect or consequential loss arising from decisions made outside the agreed service.',
  },
  {
    title: '6. Assessments and reports',
    body: 'Assessments, reports, and recommendations are interpreted using the information available at the time. They are intended to support counselling and decision-making, not to replace medical, psychological, legal, immigration, or other regulated professional advice. Admissions, eligibility, fees, and other time-sensitive information should be verified with the relevant official institution.',
  },
  {
    title: '7. Privacy',
    body: 'We process registration, student, family, assessment, and service information as described in the EduCompass Privacy Notice. Where the student is under 18, the parent or lawful guardian confirms that they are authorised to provide the information and accept these terms.',
  },
  {
    title: '8. Contact and governing law',
    body: 'These terms are governed by the laws of India, and courts in Mumbai will have jurisdiction. Questions may be sent to Binal Soni, Founder and Counsellor, at binal@educompass.in.',
  },
];

export default function EducationalConsultingTermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-800 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600">EduCompass</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Educational Consulting Services Terms
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          These terms apply when you register for Educational Consulting Services recommended by EduCompass.
        </p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-slate-950">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{section.body}</p>
              {section.title === '7. Privacy' && (
                <p className="mt-3 text-sm">
                  <a className="font-semibold text-primary-600 underline underline-offset-4" href={PRIVACY_NOTICE_URL}>
                    Read the EduCompass Privacy Notice
                  </a>
                </p>
              )}
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-500">
          <p>Version {SERVICE_TERMS_VERSION}</p>
          <p>Last updated: 23 November 2026</p>
        </footer>
      </article>
    </main>
  );
}
