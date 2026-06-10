import { readFileSync } from 'node:fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const LOCAL_PROJECT_ID = 'demo-eduflow-local';
export const PRODUCTION_PROJECT_ID = 'eduflow-689c0';
export const LOCAL_EMULATOR_HOST = '127.0.0.1:8080';

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.');
    }
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) return null;
  try {
    return JSON.parse(readFileSync(credentialsPath, 'utf8'));
  } catch {
    throw new Error(
      `GOOGLE_APPLICATION_CREDENTIALS could not be read as JSON: ${credentialsPath}`
    );
  }
}

export function assertLocalEnvironment() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== 'local') {
    throw new Error('This command requires NEXT_PUBLIC_APP_ENV=local.');
  }

  if (process.env.FIRESTORE_EMULATOR_HOST !== LOCAL_EMULATOR_HOST) {
    throw new Error(
      `This command requires FIRESTORE_EMULATOR_HOST=${LOCAL_EMULATOR_HOST}.`
    );
  }
}

export function createLocalFirestore() {
  assertLocalEnvironment();

  const app =
    getApps()[0] ||
    initializeApp({
      projectId: LOCAL_PROJECT_ID,
    });

  return getFirestore(app);
}

export function createProductionFirestore() {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Production commands cannot run with FIRESTORE_EMULATOR_HOST set.');
  }

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    throw new Error(
      'Production migrations require FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS.'
    );
  }

  if (serviceAccount.project_id !== PRODUCTION_PROJECT_ID) {
    throw new Error(
      `Service account belongs to ${serviceAccount.project_id || 'an unknown project'}, not ${PRODUCTION_PROJECT_ID}.`
    );
  }

  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert(serviceAccount),
      projectId: PRODUCTION_PROJECT_ID,
    });

  return getFirestore(app);
}
