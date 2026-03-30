# EduCompass CRM: Security & Development Guidelines

These rules are mandatory for all future development. Access and review this file before making any changes to authentication, data fetching, or session management.

## 1. Authentication & Token Management
- **Never Expose Refresh Tokens**: The `refreshToken` (Master Key) must remain on the server. It should NEVER be passed to the `session` callback in `lib/auth.ts` or accessed via the frontend.
- **Server-Side Rotation**: All token refreshes must happen within the `jwt` callback in `lib/auth.ts` using the `refreshAccessToken` helper.
- **Expiry Safety Buffer**: Always use a minimum 60-second buffer when checking `expiresAt` to prevent tokens from dying mid-request.

## 2. Session & Cookie Security
- **Short-Lived Sessions**: Maintain a maximum session `maxAge` of 7 days (604800 seconds) or less. Do not extend this without a critical business requirement.
- **Hardened Cookies**: Use the `__Secure-` prefix for session cookies. Enforce `httpOnly: true`, `secure: true`, and `sameSite: "lax"`.
- **Zombified Session Prevention**: The frontend must monitor for `RefreshAccessTokenError` in the session object and trigger an immediate `signOut()` to prevent usage of broken credentials.

## 3. Data Privacy & Least Privilege
- **No Global Sheet IDs**: Avoid storing specific Google Sheet IDs in server-side environment variables. Always pass the `sheetId` via secure headers (`x-sheet-id`) or encrypted query parameters (`sid`).
- **Scoped Permissions**: Only request the minimum necessary Google Scopes (Sheets, Calendar, Contacts). Do not add `drive` or `mail` permissions unless specifically requested by the user.

## 4. Development Workflow
- **Review Before Edit**: Before any code modification, read this file to ensure the planned change does not violate these security mandates.
- **Build Verification**: After any auth-related change, a full `npm run build` must be performed to ensure type-safety and logical integrity.
