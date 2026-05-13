import { initializeApp, getApps, getApp } from "firebase/app";

import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";

// Minimal RecaptchaVerifier for React Native/Expo
// Implements AppVerifier interface required by Firebase phone auth
export class RecaptchaVerifier {
  constructor() {
    this.sessionToken = null;
  }

  async render() {
    // In React Native, reCAPTCHA verification is handled by Firebase
    // No DOM element needed for invisible mode
    return;
  }

  async verify() {
    // Generate a mock token for Firebase
    // In production, this would integrate with reCAPTCHA API
    this.sessionToken = Math.random().toString(36).substring(2);
    return this.sessionToken;
  }

  reset() {
    this.sessionToken = null;
  }
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

export { app, auth, RecaptchaVerifier };