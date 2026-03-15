<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# EduCompass Micro CRM (Next.js)

A modern lead management system integrated with Google Sheets and Google Contacts.

## Features
- **Google Sheets Database:** Your CRM data lives in a Google Sheet for easy access.
- **Google Contacts Sync:** Automatically import leads from your contacts when they have the `[LEAD]` suffix.
- **Next.js 15 (App Router):** Fast, modern, and serverless-ready.
- **Kanban & List Views:** Manage your workflow visually.

## Setup Instructions

### 1. Google Cloud Console
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Sheets API** and **Google People API**.
3. Create **OAuth 2.0 Client IDs** (Web application).
   - Authorized Redirect URI: `http://localhost:3000/api/auth/callback/google` (and your production URL).
4. Create a **Service Account** and download the JSON key.
   - You will need the `client_email` and `private_key` from this JSON.

### 2. Google Sheets Setup
1. Create a new Google Sheet.
2. Share it with your Service Account email (give "Editor" access).
3. Create a sheet named `Leads`.
4. Add the following headers in row 1:
   `ID`, `Name`, `Phone`, `Email`, `Grade`, `Board`, `Stage`, `Inquiry Date`, `Notes`, `Last Follow Up`, `Test Link`, `Appointment Time`, `Fees Paid`, `Report Sent Date`, `Converted Date`, `Updated At`, `Google Contact ID`

### 3. Environment Variables
Copy `.env.example` to `.env.local` and fill in the values:
- `AUTH_SECRET`: Generate with `npx auth secret`.
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From OAuth Client ID.
- `GOOGLE_SHEET_ID`: The ID from your Sheet URL.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` & `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: From Service Account JSON.
- `CRON_SECRET`: A random string to protect your cron endpoint.

### 4. Run Locally
1. `npm install`
2. `npm run dev`
3. Visit `http://localhost:3000`

## Deployment
This app is optimized for **Vercel**.
- Set up the environment variables in the Vercel dashboard.
- Configure the Cron job in `vercel.json` (pointing to `/api/cron/sync-contacts`).
