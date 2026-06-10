const LOCAL_PROJECT_ID = 'demo-eduflow-local';
const PRODUCTION_PROJECT_ID = 'eduflow-689c0';
const DEFAULT_FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

export type FirebaseEnvironment = 'local' | 'production';

export function getFirebaseEnvironment(): FirebaseEnvironment {
  const value = process.env.NEXT_PUBLIC_APP_ENV;

  if (value === 'local' || value === 'production') {
    return value;
  }

  throw new Error(
    'NEXT_PUBLIC_APP_ENV must be explicitly set to "local" or "production".'
  );
}

export function getFirebaseProjectId(): string {
  return getFirebaseEnvironment() === 'local'
    ? LOCAL_PROJECT_ID
    : PRODUCTION_PROJECT_ID;
}

export function getFirestoreEmulatorHost(): string {
  const host = process.env.FIRESTORE_EMULATOR_HOST;

  if (!host) {
    throw new Error(
      `Local Firebase mode requires FIRESTORE_EMULATOR_HOST=${DEFAULT_FIRESTORE_EMULATOR_HOST}.`
    );
  }

  if (host.includes('://')) {
    throw new Error('FIRESTORE_EMULATOR_HOST must not include a URL protocol.');
  }

  return host;
}

export function assertServerFirebaseEnvironment(): FirebaseEnvironment {
  const environment = getFirebaseEnvironment();

  if (environment === 'local') {
    getFirestoreEmulatorHost();
    return environment;
  }

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'Production Firebase mode cannot run with FIRESTORE_EMULATOR_HOST set.'
    );
  }

  const configuredProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (configuredProjectId !== PRODUCTION_PROJECT_ID) {
    throw new Error(
      `Production Firebase project must be ${PRODUCTION_PROJECT_ID}; received ${configuredProjectId || 'unset'}.`
    );
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawServiceAccount) {
    throw new Error('Production Firebase mode requires FIREBASE_SERVICE_ACCOUNT_KEY.');
  }

  let serviceAccount: { project_id?: string };
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.');
  }

  if (serviceAccount.project_id !== PRODUCTION_PROJECT_ID) {
    throw new Error(
      `Firebase service account must belong to ${PRODUCTION_PROJECT_ID}; received ${serviceAccount.project_id || 'unset'}.`
    );
  }

  return environment;
}

export function assertProductionCloudOperation(operation: string): void {
  if (assertServerFirebaseEnvironment() !== 'production') {
    throw new Error(`${operation} is disabled outside production.`);
  }
}

export const firebaseEnvironmentConstants = {
  localProjectId: LOCAL_PROJECT_ID,
  productionProjectId: PRODUCTION_PROJECT_ID,
  defaultFirestoreEmulatorHost: DEFAULT_FIRESTORE_EMULATOR_HOST,
} as const;
