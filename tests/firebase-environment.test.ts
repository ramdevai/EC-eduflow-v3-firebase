import { afterEach, describe, expect, it } from 'vitest';
import {
  assertProductionCloudOperation,
  assertServerFirebaseEnvironment,
  getFirebaseProjectId,
} from '@/lib/firebase-environment';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('Firebase environment isolation', () => {
  it('requires an explicit application environment', () => {
    delete process.env.NEXT_PUBLIC_APP_ENV;

    expect(() => getFirebaseProjectId()).toThrow(
      'NEXT_PUBLIC_APP_ENV must be explicitly set'
    );
  });

  it('uses the demo project and requires the emulator in local mode', () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'local';
    delete process.env.FIRESTORE_EMULATOR_HOST;

    expect(getFirebaseProjectId()).toBe('demo-eduflow-local');
    expect(() => assertServerFirebaseEnvironment()).toThrow(
      'Local Firebase mode requires FIRESTORE_EMULATOR_HOST'
    );

    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    expect(assertServerFirebaseEnvironment()).toBe('local');
  });

  it('rejects emulator configuration in production', () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'production';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

    expect(() => assertServerFirebaseEnvironment()).toThrow(
      'Production Firebase mode cannot run with FIRESTORE_EMULATOR_HOST'
    );
  });

  it('rejects a production service account from another project', () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'production';
    delete process.env.FIRESTORE_EMULATOR_HOST;
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'eduflow-689c0';
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: 'wrong-project',
    });

    expect(() => assertServerFirebaseEnvironment()).toThrow(
      'Firebase service account must belong to eduflow-689c0'
    );
  });

  it('allows cloud backup operations only in production', () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'local';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    expect(() => assertProductionCloudOperation('Firestore backup')).toThrow(
      'disabled outside production'
    );

    process.env.NEXT_PUBLIC_APP_ENV = 'production';
    delete process.env.FIRESTORE_EMULATOR_HOST;
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'eduflow-689c0';
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: 'eduflow-689c0',
    });
    expect(() => assertProductionCloudOperation('Firestore backup')).not.toThrow();
  });
});
