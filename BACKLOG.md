# Product Backlog

## Planned Follow-up

- **Google Contacts lead-occurrence deduplication**: Replace the current Google Contact ID-only lookup with a lead occurrence key based on Google Contact ID plus the validated lead date. This must be implemented as a separate activity after the incremental cron fix, with an explicit migration plan for existing imported leads. The goal is to allow the same parent contact details to create a new lead when a sibling becomes a lead years later.

## Low Priority

- **Same-day sibling leads from one Google contact**: The proposed Google Contact ID plus lead-date key would still treat two siblings becoming leads on the same date as one occurrence. Keep the current behavior for now. A future contact convention will need an additional student or occurrence identifier before this case can be supported safely.
