import { createClient } from '@supabase/supabase-js';

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || (typeof window !== 'undefined' && window.__ENV__?.NEXT_PUBLIC_SUPABASE_URL) || "https://jfmawxozfgnmddblpqow.supabase.co",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (typeof window !== 'undefined' && window.__ENV__?.NEXT_PUBLIC_SUPABASE_ANON_KEY) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbWF3eG96ZmdubWRkYmxwcW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTg3NjUsImV4cCI6MjEwNjA5NDc2NX0.E2f6Wy1ZShm58MIZwu8v1Pq7NdRobbCzLk7D2EwJLjk"
};

export const SCHOOL = {
  name: "Amala Higher Secondary School",
  tagline: "Be a creative learner",
  address: "Amala Higher Secondary School Campus, Tamil Nadu, India",
  phone: "+91 431 2000000",
  email: "contact@amalahss.edu"
};

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: {
    persistSession: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
