// ============================================================
// Amala School ERP - Next.js Django REST Client Shim
// Replaces Supabase dependency for Next.js app routes
// ============================================================

export const DJANGO_API_BASE = (typeof window !== 'undefined' && window.__DJANGO_API_URL__)
  ? window.__DJANGO_API_URL__.replace(/\/+$/, '')
  : (process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api');

export const SCHOOL = {
  name: "Amala Higher Secondary School",
  tagline: "Be a creative learner",
  address: "Amala Higher Secondary School Campus, Tamil Nadu, India",
  phone: "+91 431 2000000",
  email: "contact@amalahss.edu"
};

export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }) => {
      try {
        const res = await fetch(`${DJANGO_API_BASE}/auth/login/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: email, password })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          return { data: null, error: new Error(data.error || 'Authentication failed') };
        }
        return { data: { user: data.user, session: { access_token: data.token, user: data.user } }, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null })
  },
  from: (col) => ({
    select: () => ({
      eq: (field, val) => ({
        maybeSingle: async () => {
          try {
            if (field === 'id') {
              const res = await fetch(`${DJANGO_API_BASE}/${col}/${encodeURIComponent(val)}/`);
              if (res.ok) {
                const data = await res.json();
                return { data, error: null };
              }
            } else {
              const res = await fetch(`${DJANGO_API_BASE}/${col}/?${encodeURIComponent(field)}=${encodeURIComponent(val)}&_limit=1`);
              if (res.ok) {
                const items = await res.json();
                return { data: Array.isArray(items) && items.length > 0 ? items[0] : null, error: null };
              }
            }
          } catch (e) {}
          return { data: null, error: null };
        }
      })
    })
  })
};
