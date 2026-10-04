# Changelog

All notable changes to this project will be documented in this file.

## [v0.4.0] - 2026-10-04

### Added
- Separate Partnerships and Referrals sections with an admin-only partnership master and staff referral access.
- Active/Inactive and MOU Signed toggle switches; inactive partnership details are disabled.
- Student-grouped referral listing with readable dates and explicit follow-up filters.
- Referral links open the lead drawer at the expanded Partnerships section and selected referral.
- Editable institute referral follow-up template for email and WhatsApp.
- Recurring 30-day in-app reminders after referral, joining (Due), and each confirmed follow-up.

### Changed
- Use Referred, Due (joined, commission owed), Paid, and Didnt join statuses; status changes are admin-only.
- Marking a referral Due automatically closes the student's other Referred entries as Didnt join and stops their reminders, preserving Due/Paid entries and manual overrides.
- Paid/Didnt join stop reminders. Referral amounts and payment-ledger tracking are omitted.
- Retain existing lead follow-up history, messaging confirmations, and booking fixes.

## [v0.3.0] - 2026-10-04

### Added
- Lead follow-up history with contact outcomes, staff attribution, and next-contact dates.
- Compact titled WhatsApp confirmations with a "Mark as sent" action.
- Automatic follow-up entries after successful Eduflow emails, preserving planned next-contact dates.
- Distinct titles for inquiry follow-ups, registration reminders, assessment links, and other message actions.

### Changed
- Show only the latest contact by default, with show/hide and pagination for older history.
- Combine channel and action title on one line and italicise staff attribution; omit message bodies from history.
- Keep local review fixtures isolated from production data.

## [v0.2.1] - 2026-10-04

### Fixed
- Show only available slots in the booking calendar.
- Restore a cleared calendar lookahead field to the 3-day default and keep values within 1-14 whole days.
- Display the default when an empty or invalid calendar lookahead setting is loaded.

## [v0.2.0] - 2026-10-02

### Added
- Partnerships directory with institution contacts, MOU and commission details, lead referrals, and partner referral reminders.
- WhatsApp action to share the EduCompass location from lead details.
- Editable EduCompass location message template.

### Fixed
- Restore missing standard message templates without overwriting saved customizations.
- Reuse one named WhatsApp tab across all CRM message actions where the browser allows it.
- Local fixture setup no longer substitutes two sample templates for the standard set.

Lead follow-up history and WhatsApp message logging are deferred and are not included in this release.

## [Unreleased]

### Added
- Centralized administrative Google Auth utility to allow cross-role delegation.
- Enabled Staff members to sync leads from the Admin's Google Contacts.
- Enabled Staff members to schedule events on the Admin's Google Calendar.
- Added option to cancel/delete scheduled 1:1 calendar slots with automatic Google Calendar cleanup.
- Made the 'Remind' button functional in Student Detail for intelligent multi-stage nudges (Fees, Test, Registration).
- Added missing 'Residential Address' field to the Student Information section in Lead Drawer.
- Added automatic Age calculation and display based on student Date of Birth.
- Updated registration form to be DPDP (India) compliant with a formal Privacy Notice and mandatory consent.
- Support for Staff members to analyze recruitment spreadsheets using Admin credentials.

### Fixed
- NextAuth `MissingSecret` error by configuring `AUTH_SECRET`.
- NextAuth configuration to support access token persistence for Google API calls.
- Prevented duplicate lead creation when rapidly clicking the "Create Lead Profile" button by disabling it during submission.
- Fixed grade-to-test matching logic that incorrectly routed Grade 12 students into the 2nd-7th test bucket due to order-sensitive `includes('2')` check.
- Prevented duplicate lead creation when rapidly clicking the "Create Lead Profile" button by disabling it during submission.
- Fixed grade-to-test matching logic that incorrectly routed Grade 12 students into the 2nd-7th test bucket due to order-sensitive `includes('2')` check.

## [v0.1.2] - 2026-10-02
### Fixed
- Stacked Inquiry Date and Source fields in Lead Details on mobile and corrected label spacing.

## [v0.1.1] - 2026-09-29
### Fixed
- Changed the automated Google Contacts sync to process the complete window since the previous successful run.
- Prevented historical contacts from being imported merely because they were recently modified.
- Added a safe first-run baseline and advanced the sync watermark only after successful lead writes.

## [v0.1.0] - 2026-04-09
### Added
- Implementation of Google Contacts synchronization for daily lead fetching.
- Manual sync trigger from the dashboard "Import Leads" button.
- Environment validation for `AUTH_SECRET` and `GOOGLE_REFRESH_TOKEN`.
- Date-based lead identification (DDMMYY suffix).
