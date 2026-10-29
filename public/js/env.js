// Local environment overrides for static serving (ignored by git)
window.__ENV__ = window.__ENV__ || {
  DJANGO_API_URL: "http://localhost:8000/api",
  VITE_FIREBASE_API_KEY: "AIzaSyA-TUNX2PLfWcGkOHaeZMvS7YYWDl2db3o",
  VITE_FIREBASE_AUTH_DOMAIN: "school-erp-59865.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "school-erp-59865",
  VITE_FIREBASE_STORAGE_BUCKET: "school-erp-59865.firebasestorage.app",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "814200800763",
  VITE_FIREBASE_APP_ID: "1:814200800763:web:66ee8f726fae707d87775e",
  VITE_FIREBASE_MEASUREMENT_ID: "G-KFVS0TXHH9",
  NEXT_PUBLIC_SUPABASE_URL: "https://jfmawxozfgnmddblpqow.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbWF3eG96ZmdubWRkYmxwcW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTg3NjUsImV4cCI6MjEwNjA5NDc2NX0.E2f6Wy1ZShm58MIZwu8v1Pq7NdRobbCzLk7D2EwJLjk"
};
if (typeof window !== 'undefined') {
  window.__DJANGO_API_URL__ = window.__ENV__.DJANGO_API_URL || 'http://localhost:8000/api';
}

