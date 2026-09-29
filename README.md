

# EC-eduflow-v3-firebase

A modern Next.js application integrated with Firebase, featuring advanced lead management and synchronization capabilities.

## Features
- **Google Sheets Database:** Your CRM data lives in a Google Sheet for easy access.
- **Google Contacts Sync:** Automatically import newly modified Google Contacts when the contact display name, notes, or organization ends with a valid in-window date suffix such as `150426`.
- **Next.js 15 (App Router):** Fast, modern, and serverless-ready.
- **Kanban & List Views:** Manage your workflow visually.

## Setup Instructions

### 1. Google Cloud Console
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Sheets API** and **Google People API**.
3. Create **OAuth 2.0 Client IDs** (Web application).
   - Authorized Redirect URI: `http://localhost:3000/api/auth/callback/google` (and your production URL).
4. **IMPORTANT:** In the OAuth Consent Screen, add your email and Binal's email as **Test Users** while the app is in testing mode.

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in the values:
- `AUTH_SECRET`: Generate with `npx auth secret`.
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From OAuth Client ID.
- `CRON_SECRET`: A random string to protect your sync endpoint.

**TIP:** To get your `GOOGLE_REFRESH_TOKEN` and `GOOGLE_SHEET_ID`:
1. Start the app and Sign In.
2. Visit `http://localhost:3000/api/auth/token` in your browser.
3. Copy those values into your `.env.local`.

### 3. Usage
1.  **Login:** Sign in with your Google Account.
2.  **Connect Sheet:** On first login, paste the ID of your Google Sheet.
3.  **Permissions:** The app uses your own permissions to edit the sheet. No Service Account needed!


### 4. Run Locally
1. Install Java and the Firebase CLI if they are not already available.
2. Run `npm install`.
3. Keep `NEXT_PUBLIC_APP_ENV=local` in `.env.local`. Production Firebase
   credentials are not required locally.
4. Run `npm run dev`.
5. Visit `http://localhost:3000`. The Firestore Emulator UI is available at
   `http://127.0.0.1:4000`.

`npm run dev` starts Firestore and Next.js without reseeding. Emulator data is
saved under `.firebase/emulator-data` on shutdown and restored on the next
startup. It fails instead of falling back to the live database if the emulator
is unavailable.

Useful local commands:

- `npm run emulators:start`: run the emulator separately.
- `npm run db:local:seed`: explicitly merge synthetic fixtures into the emulator.
- `npm run db:local:reset`: clear and reseed a running emulator.
- `npm run db:migrate:local:dry-run`: preview pending migrations locally.
- `npm run db:migrate:local`: apply pending migrations locally.

## Deployment
This app is optimized for **Vercel**.
- Set `NEXT_PUBLIC_APP_ENV=production` in the Vercel Production environment.
- Keep the live Firebase variables and service account only in Vercel.
- Configure the Cron job in `vercel.json` (pointing to `/api/cron/sync-contacts`).

Firestore rules, indexes, and data migrations are separate from the Vercel
deployment:

1. Trigger a production backup and verify it completed.
2. Run `npm run db:migrate:production:dry-run` with production credentials.
3. Deploy rules/indexes using `npm run firebase:deploy:production`.
4. Apply reviewed migrations using
   `CONFIRM_FIREBASE_PROJECT=eduflow-689c0 npm run db:migrate:production`.
5. Deploy the application through Vercel.

Production migrations require either `GOOGLE_APPLICATION_CREDENTIALS` pointing
to an untracked service-account JSON file or `FIREBASE_SERVICE_ACCOUNT_KEY` in
the current shell. The credential project must be `eduflow-689c0`.
