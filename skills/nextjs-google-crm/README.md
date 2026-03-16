# Skill: Next.js Google Workspace CRM Setup

This skill enables the rapid conversion of a React application into a full-stack Next.js CRM that uses Google Sheets as a database and Google Contacts as a lead source.

## 🏗️ Architecture Pattern

- **Framework:** Next.js 15 (App Router)
- **Database:** Google Sheets API (via Service Account)
- **Authentication:** Auth.js (NextAuth.js) v5 with Google Provider
- **Sync Logic:** Vercel Cron Jobs + Google People API
- **Styling:** Tailwind CSS (v3 for Node 18 compatibility, v4 for Node 20+)

## 🛠️ Implementation Steps

### 1. Dependency Scaffolding
Install the core integration libraries:
```bash
npm install googleapis next-auth@beta lucide-react date-fns zod
```

### 2. Google Services Client (`lib/google.ts`)
Creates a unified client for background tasks (Service Account) and user-interactive tasks (OAuth).

```typescript
import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/contacts.readonly'
];

export async function getSheetsClient(accessToken?: string) {
  if (accessToken) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.sheets({ version: 'v4', auth });
  }

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });

  return google.sheets({ version: 'v4', auth });
}
```

### 3. Google Sheets Repository (`lib/db-sheets.ts`)
Maps application types to Spreadsheet rows. Requires a sheet named `Leads`.

```typescript
const RANGE = 'Leads!A2:Q';

export async function getAllLeads() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: RANGE,
  });
  return (response.data.values || []).map(mapRowToLead);
}
```

### 4. Background Sync Logic (`app/api/cron/sync/route.ts`)
Automated lead import from Google Contacts.

- **Trigger:** Vercel Cron (`vercel.json`)
- **Logic:** Filter contacts by suffix (e.g., `[LEAD]`), de-duplicate against the Sheet using `googleContactId`, and append new rows.

## 🛡️ Stability & Error Handling Layer

To prevent recurring 500 errors and build cache corruption:

### 1. Build Cache Management
Always provide a clean development command to purge corrupted Webpack/Next.js chunks.
```json
"clean-dev": "rm -rf .next && next dev"
```

### 2. Environment Validation (Zod)
Validate critical API keys and secrets at the application layer to provide meaningful error messages instead of raw crashes.

```typescript
// lib/env-check.ts
import { z } from 'zod';
const envSchema = z.object({
  AUTH_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
});
```

### 3. Authenticated Route Guarding
Ensure API routes check for both Session and custom headers (like `x-sheet-id`) before invoking Google libraries.

### 4. Resilience Patterns
- **Async Params:** In Next.js 15, dynamic route params must be awaited.
- **Header-Based Config:** Use custom headers (e.g., `x-sheet-id`) to pass configuration from the client to serverless functions, enabling dynamic "Database" switching.
- **Diagnostic Boundaries:** Implement a custom `error.tsx` that detects "Auth" vs "Network" errors and offers specific recovery actions (like a "Re-authenticate" button).

## 📄 Environment Configuration
Required `.env.local` keys:
- `AUTH_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_REFRESH_TOKEN` (for background sync)
- `CRON_SECRET`
