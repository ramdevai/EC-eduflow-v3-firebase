import { initializeApp, getApps, getApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getAuth as getClientAuth } from 'firebase/auth';

const isLocal = process.env.NEXT_PUBLIC_APP_ENV === 'local';

if (
  process.env.NEXT_PUBLIC_APP_ENV !== 'local' &&
  process.env.NEXT_PUBLIC_APP_ENV !== 'production'
) {
  throw new Error(
    'NEXT_PUBLIC_APP_ENV must be explicitly set to "local" or "production".'
  );
}

if (
  !isLocal &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'eduflow-689c0'
) {
  throw new Error(
    'Production browser Firebase configuration must target eduflow-689c0.'
  );
}

const firebaseConfig = isLocal
  ? {
      apiKey: 'demo-api-key',
      authDomain: 'demo-eduflow-local.firebaseapp.com',
      projectId: 'demo-eduflow-local',
      storageBucket: 'demo-eduflow-local.appspot.com',
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:local',
    }
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const db = getFirestore(app);
export const clientAuth = getClientAuth(app);

declare global {
  interface Window {
    __firestoreEmulatorConnected?: boolean;
  }
}

if (isLocal && typeof window !== 'undefined' && !window.__firestoreEmulatorConnected) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  window.__firestoreEmulatorConnected = true;
}
