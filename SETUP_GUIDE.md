# EduCompass CRM - Complete Setup Guide

Follow these steps to set up a fresh instance of the EduCompass CRM for your organization.

---

## Phase 1: Google Cloud Console Setup

The CRM uses your Google account to manage Sheets, Contacts, and Calendar. You must register an application in the Google Cloud Console to enable these integrations.

### 1. Create a New Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top header and select **"New Project"**.
3. Name it `EduCompass CRM` and click **Create**.

### 2. Enable Required APIs
You must enable the specific APIs that the CRM communicates with:
1. In the sidebar, go to **APIs & Services > Library**.
2. Search for and **Enable** the following three APIs:
   - **Google Sheets API** (For the lead database)
   - **Google People API** (For contact syncing)
   - **Google Calendar API** (For session scheduling)

### 3. Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **External** and click **Create**.
3. **App Information:** 
   - App name: `EduCompass CRM`
   - User support email: Select your email.
   - Developer contact info: Your email.
4. **Scopes (Data Access):** You must tell Google which parts of your account the CRM needs to access.
   - Click **Add or Remove Scopes**.
   - A sidebar will appear. Scroll to the bottom to find the **"Manually add scopes"** text box.
   - Copy and paste the following line **exactly** into that box (only the text, do not include triple backticks or the word "text"):
     
     openid, https://www.googleapis.com/auth/userinfo.email, https://www.googleapis.com/auth/userinfo.profile, https://www.googleapis.com/auth/spreadsheets, https://www.googleapis.com/auth/contacts.readonly, https://www.googleapis.com/auth/contacts.other.readonly, https://www.googleapis.com/auth/calendar.events, https://www.googleapis.com/auth/calendar.readonly
     
   - Click **Add to Table**, then click **Update** at the bottom of the sidebar.
   - Click **Save and Continue**.
5. **Test Users (Audience):** Since this is a private CRM, you don't need to go through the official (and difficult) Google verification process. Instead, you manually authorize users.
   - On the **"Test users"** screen, click **+ ADD USERS**.
   - Enter your Gmail address and any other team members' Gmail addresses who will use the CRM.
   - Click **Add** and then **Save and Continue**.
   - *Note:* Only these specific users will be able to log in to the CRM. Keep the "Publishing status" as **Testing**. Do NOT click "Publish App" unless you want to go through a weeks-long official verification process.

### 4. Create OAuth Client ID (Credentials)
Once the consent screen is configured, you need to create the actual "key" (Client ID) for the app.
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Select **Web application** as the application type.
4. **Authorized Redirect URIs:** Add these two **exactly** (do not just add the domain, you must include the full path):
   - `http://localhost:3000/api/auth/callback/google`
   - `https://educompasscrm.vercel.app/api/auth/callback/google` (Replace with your actual Vercel URL if different)
5. Click **Create** and securely copy your **Client ID** and **Client Secret**.

---

## Phase 2: Handling the "Google hasn't verified this app" Screen

Because the app is in "Testing" mode and not officially verified by Google, you will see a scary warning the first time you log in. This is normal for private internal tools.

### How to skip the warning:
1. When you click "Sign In", Google may show: **"Google hasn't verified this app"**.
2. Click the **Advanced** link on the left side of the screen.
3. Click the link at the bottom that says **"Go to EduCompass CRM (unsafe)"**.
4. On the next screen, you **must check all the boxes** to give the app permission to access your Sheets, Contacts, and Calendar.
5. Click **Continue**.

### Why not verify the app?
Official verification requires a public Privacy Policy, a domain verification, and often a video submission to Google. For a private CRM used by 1-5 people, using "Testing" mode with "Test Users" is the standard and most efficient approach.

---

## Phase 3: Deployment & Environment Variables

### 1. Deploy to Vercel
1. Push this code to a private GitHub repository.
2. Import the repository into [Vercel](https://vercel.com/).
3. In the **Environment Variables** section, add the following:

| Key | Description |
| :--- | :--- |
| `AUTH_SECRET` | Run `npx auth secret`. **IMPORTANT:** Ensure the variable is named exactly `AUTH_SECRET` (not `BETTER_AUTH_SECRET`). |
| `GOOGLE_CLIENT_ID` | From the Google Cloud Credentials page. |
| `GOOGLE_CLIENT_SECRET` | From the Google Cloud Credentials page. |
| `CRON_SECRET` | Any random string (used to secure the background sync). |
| `GOOGLE_REFRESH_TOKEN` | *Leave empty for now* (See Phase 3). |
| `GOOGLE_SHEET_ID` | *Leave empty for now* (See Phase 3). |

#### **Why are these required?**

*   **`AUTH_SECRET`**: A secret key used to encrypt and secure your login session cookies. Without this, the app cannot securely keep you logged in.
*   **`GOOGLE_CLIENT_ID`**: The public identifier for your Google Cloud project. It tells Google which app is requesting permission to access your data.
*   **`GOOGLE_CLIENT_SECRET`**: A private password known only to your app and Google. It prevents unauthorized applications from impersonating your CRM.
*   **`CRON_SECRET`**: A security key used to protect the "Sync Contacts" background task. It ensures that only authorized systems (like Vercel) can trigger the automated lead import.
*   **`GOOGLE_REFRESH_TOKEN`**: This is a special, long-lasting key that allows the CRM to perform background tasks (like syncing leads) even when you are not actively using the app.
*   **`GOOGLE_SHEET_ID`**: This identifies the specific Google Sheet that acts as your database. It ensures the app knows exactly where to save and read your lead information.

---

## Phase 4: Finalizing the Sync Connection

To allow the CRM to sync contacts in the background (even when you are logged out), you need to provide a Refresh Token.

1. **Login:** Visit your deployed URL and Sign In with Google. Ensure you check **all permission boxes** during the Google login.
2. **Retrieve Tokens:** Visit `https://your-app-name.vercel.app/api/auth/token` in your browser.
2.1 **Update:** 
   - This is revoked by google. "Refresh token retrieval through the browser has been removed for security"
   - The Secure Rotation Plan
      Step 1: Temporary Code Modification
      We will add a temporary log statement to lib/auth.ts that only triggers for admins.
      1.  Open lib/auth.ts.
      2.  In the jwt callback, add a log line to capture the refresh token from the account object.
      // Inside lib/auth.ts -> jwt callback
      async jwt({ token, account }) {
      if (account) {
         const userEmail = token.email?.toLowerCase() || "";
         const isAdmin = ALL_ADMINS.includes(userEmail);
         // TEMPORARY LOG FOR ROTATION
         if (isAdmin && account.refresh_token) {
            console.log(">> ROTATION_TOKEN_START <<", account.refresh_token, ">> ROTATION_TOKEN_END <<");
         }
         
         // ... rest of your existing logic
      }
      return token;
      }
      Step 2: Deploy and Trigger
      1.  Commit and Push: Deploy this change to your production environment (Vercel).
      2.  Sign In: Visit your live application and Sign In with Google. 
         *   Crucial: Since the Client Secret was rotated (Phase 1), Google will show the consent screen. Ensure you check all permission boxes (Contacts, Calendar, etc.).
      3.  Capture Token: 
         *   Go to your Vercel Dashboard > Logs.
         *   Look for the log entry starting with >> ROTATION_TOKEN_START <<.
         *   Copy the string between the markers.
      Step 3: Secure Storage
      1.  Update Vercel: Go to Settings > Environment Variables and update GOOGLE_REFRESH_TOKEN with the new value.
      2.  Redeploy: Trigger one final deployment to ensure all background processes (cron jobs, sync tasks) start using the new token.
      Step 4: Cleanup
      1.  Remove the temporary console.log from lib/auth.ts.
      2.  Push the clean code back to your repository. 
3. **Update Vercel:** Copy the `GOOGLE_REFRESH_TOKEN` value from that page and add it to your Vercel Environment Variables.
4. **Setup Sheet:**
   - On the CRM dashboard, click **"Create New Workspace"**.
   - Copy the ID of the newly created sheet from the URL.
   - Add this ID to the `GOOGLE_SHEET_ID` variable in Vercel.
5. **Redeploy:** Redeploy the app in Vercel to ensure the background sync uses these new variables.

---

## Phase 5: Maintenance & Customization

### 1. Message Templates
- Go to the **Templates** tab in the CRM.
- Customize your WhatsApp messages.
- Use `[REGISTRATION_LINK]` to automatically insert the student's unique registration form link.

### 2. Database Maintenance
- If you ever accidentally delete a column in Google Sheets, go to **Settings > CRM Database Maintenance** and click **"Fix sheet structure"**. This will repair the sheet without deleting any lead data.

### 3. Troubleshooting Sync
- If contacts are not syncing, ensure you have added the label `[lead]` or `lead` anywhere in the contact's Name, Notes, or Organization field in Google Contacts.

---

## Phase 6: Common Errors & Fixes

### 1. Error: "There was a problem with the server configuration"
*   **Cause:** Your `AUTH_SECRET` is missing or named incorrectly in Vercel.
*   **Fix:** Ensure you have an environment variable named exactly **`AUTH_SECRET`**. If you see `BETTER_AUTH_SECRET`, rename it.

### 2. Error 400: redirect_uri_mismatch
*   **Cause:** The URL you typed in Google Cloud Console doesn't match the one the app is sending.
*   **Fix:** In Google Cloud Console, ensure your Redirect URI includes the full path: `https://your-app.vercel.app/api/auth/callback/google`. Just the domain is not enough.

### 3. "Access Blocked: EduCompass CRM has not completed the Google verification process"
*   **Cause:** You are logging in with an email that isn't on the "Test Users" list.
*   **Fix:** Go to **OAuth Consent Screen > Test Users** and add your Gmail address. Click **Advanced > Go to EduCompass CRM (unsafe)** to proceed.


## Miscelleneous 
Modern testing environment uses Vitest. Run the tests anytime using npm run test. This is in dev mode