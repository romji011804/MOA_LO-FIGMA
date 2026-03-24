// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // TODO: Add your Firebase project configuration here
  // You can find this in your Firebase Console > Project Settings > General > Your apps
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'your-api-key'
);

// Initialize Firebase (only when configured)
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

// Initialize Cloud Firestore and get a reference to the service
export const db = app ? getFirestore(app) : null;

// Initialize Cloud Storage and get a reference to the service
export const storage = app ? getStorage(app) : null;

export default app;