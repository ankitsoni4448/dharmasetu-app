// DharmaSetu — Firebase Config
// Reads from EXPO_PUBLIC_FIREBASE_* env vars for security.
// Falls back to hardcoded values so existing dev builds don't break.

import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            || "AIzaSyBp_p-Rfk0Mxrtyrcs1NDPg74g7UBvSY3w",
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        || "dharmasetu-296f8.firebaseapp.com",
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         || "dharmasetu-296f8",
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     || "dharmasetu-296f8.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID|| "950437813423",
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             || "1:950437813423:web:0898831b101ae8c176885a",
};

// Guard against double-init (hot reload / Fast Refresh)
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);