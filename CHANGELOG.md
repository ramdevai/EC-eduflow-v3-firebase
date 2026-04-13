# Changelog

All notable changes to this project will be documented in this file.

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

## [v0.1.0] - 2026-04-09
### Added
- Implementation of Google Contacts synchronization for daily lead fetching.
- Manual sync trigger from the dashboard "Import Leads" button.
- Environment validation for `AUTH_SECRET` and `GOOGLE_REFRESH_TOKEN`.
- Date-based lead identification (DDMMYY suffix).
