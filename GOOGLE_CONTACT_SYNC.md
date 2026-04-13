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

The system identifies "Leads" based on a specific naming convention used by the consultant. A contact is only imported if it contains a **6-digit date suffix** (DDMMYY).

### 1. Keyword Filtering
The system searches for the `DDMMYY` pattern (e.g., `150426` for April 15, 2026) in:
-   **Display Name** (e.g., "Rahul 150426")
-   **Biography/Notes**
-   **Organization Name**

### 2. Name Cleaning
During import, the date suffix is stripped to keep the lead name clean in the CRM.
-   **Example**: "Rahul 150426" becomes "Rahul" in Firestore.

---

## Duplicate Check & Conflict Resolution

The system uses a multi-layered check to prevent duplicates:

1.  **Google Contact ID**: Primary unique identifier (`resourceName`).
2.  **Phone Number**: Normalized (digits only) comparison of the last 10 digits.

### Conflict Resolution Table
| Scenario | Action |
| :--- | :--- |
| **New Identifier** | Lead is added as a new entry in Firestore. |
| **Existing ID/Phone** | The entry is considered a duplicate and skipped for creation. |
| **Manual Sync Update** | If data has changed (phone, email) during a manual sync, the existing lead is **updated**. |
| **Cron Sync Update** | Background sync **skips** existing leads to prevent accidental overwrites. |

---

## Technical Details

-   **API**: Google People API (`v1`)
-   **Auth Scopes**: 
    -   `https://www.googleapis.com/auth/contacts.readonly`
    -   `https://www.googleapis.com/auth/calendar` (Required for shared calendar operations)
-   **Payload**: The system fetches `names`, `emailAddresses`, `phoneNumbers`, `biographies`, and `organizations`.
-   **Quantity Limits**:
    -   **Manual**: Processes top 10 most recently modified contacts for speed.
    -   **Cron**: Processes top 100 contacts to ensure no leads are missed during off-hours.
