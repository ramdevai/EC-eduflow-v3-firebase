# Changelog

All notable changes to this project will be documented in this file.

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
