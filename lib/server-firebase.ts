import * as admin from 'firebase-admin';

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

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
