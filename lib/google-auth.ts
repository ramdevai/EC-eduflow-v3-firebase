import { google } from 'googleapis';

/**
 * Creates an OAuth2 client authorized with the administrative refresh token.
 * This client can be used to perform actions on behalf of the business account
 * regardless of the current user's session.
 */
export function getAdminAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google Administrative Credentials in environment variables.');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    // The redirect URI is not needed for refreshing tokens
    undefined
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}
