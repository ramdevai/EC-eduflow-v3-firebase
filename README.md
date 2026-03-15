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
4. **IMPORTANT:** In the OAuth Consent Screen, add your email and Binal's email as **Test Users** while the app is in testing mode.

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in the values:
- `AUTH_SECRET`: Generate with `npx auth secret`.
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From OAuth Client ID.
- `CRON_SECRET`: A random string to protect your sync endpoint.
- `GOOGLE_REFRESH_TOKEN`: (Optional) For background sync, see sync logic.

### 3. Usage
1.  **Login:** Sign in with your Google Account.
2.  **Connect Sheet:** On first login, paste the ID of your Google Sheet.
3.  **Permissions:** The app uses your own permissions to edit the sheet. No Service Account needed!


### 4. Run Locally
1. `npm install`
2. `npm run dev`
3. Visit `http://localhost:3000`

## Deployment
This app is optimized for **Vercel**.
- Set up the environment variables in the Vercel dashboard.
- Configure the Cron job in `vercel.json` (pointing to `/api/cron/sync-contacts`).
