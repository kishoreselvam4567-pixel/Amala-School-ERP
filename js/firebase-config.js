// ============================================================
// Firebase Project Configuration
// Supports Vite environment variables (import.meta.env) and window.__ENV__
// ============================================================

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
const globalEnv = (typeof window !== 'undefined' && (window.__ENV__ || window.ENV)) ? (window.__ENV__ || window.ENV) : {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || globalEnv.VITE_FIREBASE_API_KEY || "AIzaSyA-TUNX2PLfWcGkOHaeZMvS7YYWDl2db3o",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || globalEnv.VITE_FIREBASE_AUTH_DOMAIN || "school-erp-59865.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || globalEnv.VITE_FIREBASE_PROJECT_ID || "school-erp-59865",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || globalEnv.VITE_FIREBASE_STORAGE_BUCKET || "school-erp-59865.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || globalEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "814200800763",
  appId: env.VITE_FIREBASE_APP_ID || globalEnv.VITE_FIREBASE_APP_ID || "1:814200800763:web:66ee8f726fae707d87775e",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || globalEnv.VITE_FIREBASE_MEASUREMENT_ID || "G-KFVS0TXHH9"
};

// Safe validation function to check if a valid API key has been provided
export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
    typeof firebaseConfig.apiKey === 'string' &&
    firebaseConfig.apiKey.trim() !== '' &&
    firebaseConfig.apiKey !== 'YOUR_REAL_FIREBASE_WEB_API_KEY' &&
    !firebaseConfig.apiKey.startsWith('YOUR_')
  );
}

// Expose on window for scripts that consume global configuration
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
  window.isFirebaseConfigured = isFirebaseConfigured;
}

export const SCHOOL = {
  name: "Amala Higher Secondary School",
  tagline: "Be a creative learner",
  address: "School address here",
  phone: "+91 00000 00000",
  email: "info@yourschool.edu.in"
};