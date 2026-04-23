import 'server-only';
import * as admin from 'firebase-admin';

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
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT_KEY not found. Firebase Admin SDK not initialized.");
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
