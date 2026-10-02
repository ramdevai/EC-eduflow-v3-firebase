# Google Contacts Sync Documentation

This document outlines the logic and technical implementation for synchronizing Google Contacts into the CRM.

## Sync Mechanism
The system utilizes the **Google People API** to fetch contacts from the connected administrative account's "My Contacts".

There are two primary trigger mechanisms:
-   **Manual Sync**: Triggered from the dashboard by an authorized user (`/api/leads/sync`).
-   **Automated Sync**: Triggered daily via a scheduled cron job (`/api/cron/sync-contacts`).

---

## Delegated Administrative Authentication
To support a single-consultant workflow where Staff can manage the consultant's contacts, the system uses a **Delegated Auth** model:

1.  **Centralized Token**: All Google API calls (Contacts, Calendar, Sheets) use a persistent `GOOGLE_REFRESH_TOKEN` stored in `.env.local`. 
2.  **Administrative Account**: This token must belong to the primary Business Admin/Owner account.
3.  **Cross-Role Access**: When a **Staff** member triggers a sync, the backend performs the operation using the Admin's credentials, effectively allowing staff to support the business account regardless of their own individual Google permissions.

**Technical Reference**: `lib/google-auth.ts` provides the `getAdminAuthClient()` utility used across all service layers.

---

## Role-Based Synchronization Rules

| Role | Permission | Behavior |
| :--- | :--- | :--- |
| **Admin** | Full Sync | Can trigger manual sync for the entire business database. |
| **Staff** | Delegated Sync | Can trigger manual sync using Admin credentials. New leads are assigned to the triggering staff member. |
| **System (Cron)**| Automated Sync | Runs in the background. Leads are tagged as `system-cron` for later assignment. |

---

## Lead Identification Logic (Date Suffix)

The system identifies "Leads" based on a specific naming convention used by the consultant. A contact is only imported if one of the checked fields ends with a **6-digit date suffix** (`DDMMYY`).

### 1. Date Suffix Filtering
The system searches for the `DDMMYY` pattern (e.g., `150426` for April 15, 2026) at the end of:
-   **Display Name** (e.g., "Rahul 150426")
-   **Biography/Notes**
-   **Organization Name**

The current implementation does not use `[lead]`, `lead`, labels, fuzzy matching, or "Other Contacts" for lead detection.

For automated sync, the suffix must also be a real calendar date within the cron window, from the previous successful cron date through the current run date in `Asia/Kolkata`. An old suffix is not imported merely because the Google contact was modified recently.

### 2. Name Cleaning
During import, a date suffix is stripped from the Google display name to keep the lead name clean in the CRM.
-   **Example**: "Rahul 150426" becomes "Rahul" in Firestore.

---

## Duplicate Check & Conflict Resolution

The system uses the stored Google Contact ID to prevent duplicates:

1.  **Google Contact ID**: Primary unique identifier from the contact metadata source ID.
2.  **Phone Number**: Not used for duplicate detection in the Google Contacts sync path.

### Conflict Resolution Table
| Scenario | Action |
| :--- | :--- |
| **New Google Contact ID** | Lead is added as a new entry in Firestore. |
| **Existing Google Contact ID, manual sync** | If name, email, or phone changed, the existing lead is updated. |
| **Existing Google Contact ID, cron sync** | Existing lead is skipped to prevent accidental overwrites. |

This Google Contact ID-only lookup is intentionally unchanged by the incremental cron fix. Migrating to a lead-occurrence key so one parent contact can create sibling leads years apart is tracked as a separate backlog activity. Two sibling leads from the same Google contact on the same date remain an explicitly documented low-priority limitation.

---

## Technical Details

-   **API**: Google People API (`v1`)
-   **Auth Scopes**: 
    -   `https://www.googleapis.com/auth/contacts.readonly`
    -   `https://www.googleapis.com/auth/calendar` (Required for shared calendar operations)
-   **Payload**: The system fetches `names`, `emailAddresses`, `phoneNumbers`, `biographies`, and `organizations`.
-   **Fetch Windows**:
    -   **Manual**: Checks the top 10 most recently modified contacts for speed.
    -   **Cron**: Pages through all contacts modified after the previous successful cron and no later than the current run start.
    -   The first cron run after this behavior is deployed establishes a baseline and imports no contacts, preventing historical contacts from being imported during initialization.
    -   The cron watermark advances only after lead writes complete successfully. A failed run retries the same window next time.
-   **Stored Field Truncation**:
    -   The sync does not truncate stored lead fields by character length.
    -   The phone value is saved as the raw Google Contacts phone value.
    -   Email is lowercased before saving.
    -   UI text truncation is visual only and does not alter stored Firestore data.
