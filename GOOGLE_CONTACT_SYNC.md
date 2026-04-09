# Google Contacts Sync Documentation

This document outlines the logic and rules for synchronizing Google Contacts into the CRM as Leads.

## Sync Mechanism
The system utilizes the **Google People API** to fetch contacts from one primary sources:
1.  **Connections**: Contacts explicitly saved in "My Contacts".


There are two ways the sync is triggered:
-   **Manual Sync**: Triggered from the UI (`/api/leads/sync`).
-   **Automated Sync**: Triggered via a cron job (`/api/cron/sync-contacts`).

---

## Import Rules

To be imported as a Lead, a contact must meet the following criteria:

### 1. Keyword Filtering
The system searches for the ddmmyy suffix (case-insensitive) in the following fields:
-   **Display Name**
-   **Biography/Notes**
-   **Organization Name**

If suffix is not found in any of these fields, the contact is ignored.

### 2. Required Data
A contact must have at least one of the following to be meaningful:
-   A **Phone Number** (preferred for duplicate checking)
-   An **Email Address**

### 3. Name Cleaning
During import, labels used for identification are stripped from the lead name to keep the CRM clean:
-   Removes `[lead]`, `(lead)`, or `lead`.
-   Removes date suffixes (e.g., `10Jan`, `2Feb`, `22Mar`) often used to mark when a lead was received.
-   Trims whitespace and trailing dashes.

---

## Duplicate Check Logic

The system prevents duplicate leads by checking against existing leads in the database using two identifiers:

1.  **Google Contact ID**: The unique `resourceName` from Google People API.
2.  **Phone Number**: A normalized comparison (digits only) of the contact's primary phone number.

### Conflict Resolution
| Scenario | Action |
| :--- | :--- |
| **New Identifier** | Lead is added as a new entry. |
| **Existing ID AND Phone** | The entry is considered a duplicate. |
| **Manual Sync (Duplicate)** | If data has changed (phone, email, or missing ID), the existing lead is **updated**. |
| **Cron Sync (Duplicate)** | The lead is **skipped** (no updates performed in automated mode to prevent accidental overwrites). |

---

## Quantity Limits

To ensure performance and stay within API quotas, the system implements the following limits:

| Trigger | "My Contacts" Limit | Total Processed |
| :--- | :---: | :---: |
| **Manual Sync** | 10 | **Top 10** (Cumulative) |
| **Automated (Cron)** | 100 | **All 100** |

> [!NOTE]
> The Manual Sync prioritizes the most recently modified contacts but restricts the total output to 10 to provide immediate user feedback without long wait times.

---

## Technical Details

-   **API Used**: Google People API (`v1`).
-   **Scopes Required**: 
    -   `https://www.googleapis.com/auth/contacts.readonly`
    
-   **Default Lead Setup**:
    -   **Stage**: `New`
    -   **Inquiry Date**: Google's `updateTime` or current system time.
    -   **Registration Token**: A unique token is generated for each new lead to track future form submissions.
