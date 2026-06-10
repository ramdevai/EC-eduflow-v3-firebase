import 'server-only';
import * as admin from 'firebase-admin';
import {
  assertServerFirebaseEnvironment,
  getFirebaseProjectId,
} from './firebase-environment';

// Cache on globalThis to survive Next.js HMR/module re-evaluation in dev mode
declare global {
  // eslint-disable-next-line no-var
  var __firebaseAdminCache: {
    db?: FirebaseFirestore.Firestore;
    auth?: admin.auth.Auth;
  } | undefined;
}

function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    const environment = assertServerFirebaseEnvironment();

    if (environment === 'local') {
      admin.initializeApp({
        projectId: getFirebaseProjectId(),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(
          JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)
        ),
        projectId: getFirebaseProjectId(),
      });
    }
  }
}

if (!globalThis.__firebaseAdminCache) {
  initializeFirebaseAdmin();
  globalThis.__firebaseAdminCache = {
    db: admin.firestore(),
    auth: admin.auth(),
  };
}

export const adminDb = globalThis.__firebaseAdminCache.db!;
export const adminAuth = globalThis.__firebaseAdminCache.auth!;
