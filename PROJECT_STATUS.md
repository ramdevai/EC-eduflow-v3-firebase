# Project Status

- Owner: Ram Soni
- Purpose: EduCompass lead-management CRM built with Next.js, Firebase, Google Sheets, and Google Contacts workflows.
- Live URL: https://crm.educompass.in
- GitHub URL: https://github.com/ramdevai/EC-eduflow-v3-firebase
- Deploy target: Vercel project `educompasscrm-fbase` plus Firebase project `eduflowcrm` (`eduflow-689c0`); production deploy scripts are present.
- Env needs: Uses `.env.local`; `.env.example` is present.
- Current status: Active and live in production.
- Development: `feature/lead-follow-up-history` is approved for the 0.3.0 production release.
- Follow-up display: Latest contact visible by default, with show/hide for older history. WhatsApp uses a compact action title, channel/time, and "Mark as sent" confirmation. Inquiry follow-ups and registration reminders have distinct titles. Successful Eduflow emails automatically record a titled "Message sent" entry. New message contacts do not store message content and preserve the planned next-contact date. History does not display message content. Calls and external messages are recorded manually with outcomes and notes.
- Local review: http://localhost:3001, using the `demo-eduflow-local` emulator. Review fixture: `Follow-up Review Parent` (three contacts). Fresh Google sign-in requires `http://localhost:3001/api/auth/callback/google` in the existing OAuth client's authorized redirect URIs; an existing localhost session can be reused.
- Production release version: 0.3.0.
- Last production release: 2026-10-04.
- Release: 0.3.0 (2026-10-04), adding lead follow-up history, titled WhatsApp confirmations, automatic sent-email contacts, and compact latest-contact display; includes the 0.2.1 booking fixes.
