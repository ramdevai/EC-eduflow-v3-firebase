import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/contacts.readonly'
];

export async function getSheetsClient(accessToken: string) {
  if (!accessToken) {
    throw new Error('Access token is required to initialize Google Sheets client');
  }

  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: accessToken });
    return google.sheets({ version: 'v4', auth });
  } catch (error: any) {
    console.error('Failed to initialize Google Sheets client:', error.message);
    throw new Error(`Google API Init Error: ${error.message}`);
  }
}

export async function getPeopleClient(accessToken: string) {
  if (!accessToken) {
    throw new Error('Access token is required to initialize Google People client');
  }

  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: accessToken });
    return google.people({ version: 'v1', auth });
  } catch (error: any) {
    console.error('Failed to initialize Google People client:', error.message);
    throw new Error(`Google People API Init Error: ${error.message}`);
  }
}

export async function getFormsClient(accessToken: string) {
  if (!accessToken) {
    throw new Error('Access token is required to initialize Google Forms client');
  }

  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: accessToken });
    return google.forms({ version: 'v1', auth });
  } catch (error: any) {
    console.error('Failed to initialize Google Forms client:', error.message);
    throw new Error(`Google Forms API Init Error: ${error.message}`);
  }
}

/**
 * Used for background sync using a stored refresh token
 */
export async function getClientFromRefreshToken(refreshToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}
