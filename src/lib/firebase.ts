import { getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

const requiredConfig = [
  ['NEXT_PUBLIC_FIREBASE_API_KEY', firebaseConfig.apiKey],
  ['NEXT_PUBLIC_FIREBASE_APP_ID', firebaseConfig.appId],
  ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
  ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
] as const;

let cachedAuth: Auth | null = null;

export function getFirebaseAuth() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth is only available in the browser.');
  }

  const missing = requiredConfig
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(
      `Firebase Auth is not configured. Missing ${missing.join(', ')}.`,
    );
  }

  if (cachedAuth) return cachedAuth;

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  cachedAuth = getAuth(app);
  return cachedAuth;
}
