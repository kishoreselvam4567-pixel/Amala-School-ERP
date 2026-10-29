// ============================================================
// Supabase Configuration
// ============================================================
export const supabaseConfig = {
  url: (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.NEXT_PUBLIC_SUPABASE_URL) || '',
  anonKey: (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY) || ''
};

export const SCHOOL = {
  name: "Amala Higher Secondary School",
  tagline: "Be a creative learner",
  address: "Amala Higher Secondary School Campus, Tamil Nadu, India",
  phone: "+91 431 2000000",
  email: "contact@amalahss.edu"
};
