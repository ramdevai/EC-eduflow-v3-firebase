# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Implementation of Google Contacts synchronization for daily lead fetching.
- Manual sync trigger from the dashboard "Import Leads" button.
- Environment validation for `AUTH_SECRET` and `GOOGLE_REFRESH_TOKEN`.
- Date-based lead identification (DDMMYY suffix).

### Changed
- Re-activated `/api/cron/sync-contacts` endpoint.

### Fixed
- NextAuth `MissingSecret` error by configuring `AUTH_SECRET`.
