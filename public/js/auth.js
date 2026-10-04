// ============================================================
// Shared Supabase Init + Auth/Role Helpers
// Drop-in compatible with previous Firestore & Auth signatures
// Imported by every page as a module: <script type="module" src="/js/auth.js">
// ============================================================
import { supabaseConfig } from './supabase-config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Determine portal role from current URL
export function getCurrentPortalRole() {
  if (typeof window === 'undefined') return null;
  const path = (window.location.pathname || '').toLowerCase();
  if (path.includes('/admin/')) return 'admin';
  if (path.includes('/staff/')) return 'staff';
  if (path.includes('/student/')) return 'student';
  if (path.includes('/parent/')) return 'parent';
  return null;
}

const currentRole = getCurrentPortalRole();

// Supabase Client instance (role & tab aware)
export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: {
    persistSession: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// App & Auth compatibility wrappers
export const app = { name: currentRole ? `amala-${currentRole}-portal` : '[DEFAULT]' };

// Isolated worker auth for admin creation tasks (so admin doesn't get signed out)
let cachedSecondaryClient = null;
export function getSecondaryAuth() {
  if (cachedSecondaryClient) return cachedSecondaryClient;
  cachedSecondaryClient = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  return cachedSecondaryClient;
}

// Active user tracking
let currentActiveUser = null;

// Auth wrapper
export const auth = {
  get currentUser() {
    if (currentActiveUser) return currentActiveUser;
    try {
      const activeStr = sessionStorage.getItem('erp_active_session') ||
        (currentRole ? localStorage.getItem('erp_session_' + currentRole) : null);
      if (activeStr) {
        const parsed = JSON.parse(activeStr);
        if (parsed && (parsed.uid || parsed.id)) {
          return {
            uid: parsed.uid || parsed.id,
            id: parsed.uid || parsed.id,
            email: parsed.email || ''
          };
        }
      }
    } catch (e) {}
    return null;
  },
  signOut: async () => {
    currentActiveUser = null;
    return supabase.auth.signOut();
  },
  authStateReady: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        session.user.uid = session.user.id;
        currentActiveUser = session.user;
      }
    } catch (e) {}
    return true;
  }
};

export const db = { _isSupabase: true };
export const storage = { _isStorage: true };

// ============================================================
// Auth Function Adapters
// ============================================================

export async function signInWithEmailAndPassword(authInst, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data || !data.user) throw new Error('Invalid credentials');
  data.user.uid = data.user.id;
  currentActiveUser = data.user;
  return { user: data.user, session: data.session };
}

export async function createUserWithEmailAndPassword(authInst, email, password) {
  // Use secondary client if provided so admin session is never overwritten
  const client = (authInst && authInst.auth && authInst !== auth) ? authInst : getSecondaryAuth();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  if (!data || !data.user) throw new Error('User registration failed');
  data.user.uid = data.user.id;
  return { user: data.user, session: data.session };
}

export async function fbSignOut(authInst) {
  currentActiveUser = null;
  return supabase.auth.signOut();
}

export function onAuthStateChanged(authInst, callback) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session && session.user) {
      session.user.uid = session.user.id;
      currentActiveUser = session.user;
      callback(session.user);
    } else {
      // No genuine Supabase session. Never synthesize a user from the
      // erp_session_* cache here: without a real session every RLS-gated
      // query returns [] and the portal would render empty tables.
      callback(null);
    }
  }).catch(() => callback(null));

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
      session.user.uid = session.user.id;
      currentActiveUser = session.user;
      callback(session.user);
    } else if (event === 'SIGNED_OUT') {
      currentActiveUser = null;
      callback(null);
    }
  });

  return () => subscription.unsubscribe();
}

export async function sendPasswordResetEmail(authInst, email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
  return data;
}

export const browserLocalPersistence = {};
export const browserSessionPersistence = {};
export const inMemoryPersistence = {};
export function setPersistence() { return Promise.resolve(); }
export function initializeAuth(appInst) { return auth; }
export function getAuth(appInst) { return auth; }
export function getFirestore() { return db; }
export function getStorage() { return storage; }

// ============================================================
// Firestore Query & Document Adapters
// ============================================================

function normalizeCol(col) {
  if (!col) return col;
  const c = String(col).trim();
  if (c === 'loginLookup' || c === 'login_lookup') return 'login_lookup';
  return c;
}

export function collection(dbInst, path) {
  return { _type: 'col', col: normalizeCol(path) };
}

export function doc(dbOrCol, colOrId, optId) {
  if (optId !== undefined) {
    return { _type: 'doc', col: normalizeCol(colOrId), id: String(optId) };
  }
  if (dbOrCol && dbOrCol._type === 'col') {
    return { _type: 'doc', col: dbOrCol.col, id: String(colOrId) };
  }
  return { _type: 'doc', col: normalizeCol(colOrId), id: String(colOrId) };
}

export function where(field, op, val) {
  return { _type: 'where', field, op, val };
}

export function orderBy(field, dir = 'asc') {
  return { _type: 'orderBy', field, dir };
}

// ---- Session freshness -----------------------------------------------
// Guards against the classic expired-token race: after a reload the stored
// session may hold an access token that already expired, and the client's
// background refresh may not have finished before the first data queries
// run. Those queries then get a 401 and (by RLS) look like empty tables.
// Call this before the portal's first data load; getDocs/getDoc also use it
// for a one-time retry when a query fails with an auth error.
let sessionRefreshPromise = null;
export async function ensureFreshSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const expiresAtMs = (session.expires_at || 0) * 1000;
    if (expiresAtMs - Date.now() < 60000) {
      if (!sessionRefreshPromise) {
        sessionRefreshPromise = supabase.auth.refreshSession()
          .then(({ data }) => (data && data.session) || null)
          .catch(() => null)
          .finally(() => { sessionRefreshPromise = null; });
      }
      return await sessionRefreshPromise;
    }
    return session;
  } catch (e) {
    return null;
  }
}

function isAuthError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const status = error.status;
  const msg = String(error.message || '').toLowerCase();
  return code === 'PGRST301' || status === 401 ||
    msg.includes('jwt') ||
    msg.includes('expired') ||
    msg.includes('future') ||
    msg.includes('invalid') ||
    msg.includes('unauthorized');
}

function notifyDataError(col, error) {
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('erp:data-error', {
        detail: { col, message: String((error && error.message) || error || 'unknown error') }
      }));
    }
  } catch (e) {}
}

export function limit(n) {
  return { _type: 'limit', count: n };
}

export function query(target, ...constraints) {
  const col = target.col || target;
  const existingConstraints = target.constraints || [];
  return { _type: 'query', col: normalizeCol(col), constraints: [...existingConstraints, ...constraints] };
}

export async function getDoc(docRef) {
  const col = normalizeCol(docRef.col);
  const id = String(docRef.id);
  let { data, error } = await supabase.from(col).select('*').eq('id', id).maybeSingle();
  if (error && isAuthError(error)) {
    const isFuture = String(error.message || '').toLowerCase().includes('future');
    if (isFuture) {
      await new Promise(r => setTimeout(r, 400));
    } else {
      await ensureFreshSession();
    }
    ({ data, error } = await supabase.from(col).select('*').eq('id', id).maybeSingle());
    if (error && String(error.message || '').toLowerCase().includes('future')) {
      await new Promise(r => setTimeout(r, 600));
      ({ data, error } = await supabase.from(col).select('*').eq('id', id).maybeSingle());
    }
  }
  if (error && error.code !== 'PGRST116') {
    console.warn(`getDoc(${col}/${id}) warning:`, error.message);
  }
  const exists = Boolean(data);
  const docData = exists ? { ...data.data, ...data } : undefined;
  if (docData && 'data' in docData && typeof docData.data === 'object') {
    delete docData.data;
  }
  if (docData && docData.created_at && !docData.createdAt) docData.createdAt = docData.created_at;
  if (docData && docData.updated_at && !docData.updatedAt) docData.updatedAt = docData.updated_at;
  return {
    id,
    exists: () => exists,
    get exists() { return exists; },
    data: () => docData
  };
}

const queryCache = new Map();
export function clearQueryCache(col) {
  if (col) {
    const prefix = normalizeCol(col) + ':';
    for (const k of queryCache.keys()) {
      if (k.startsWith(prefix)) queryCache.delete(k);
    }
  } else {
    queryCache.clear();
  }
}

export async function getDocs(qRef) {
  const col = normalizeCol(qRef.col);
  const constraints = qRef.constraints || [];
  const cacheKey = col + ':' + JSON.stringify(constraints);

  // Return cached result if fresh (< 12 seconds)
  const cached = queryCache.get(cacheKey);
  if (cached && (Date.now() - cached.time) < 12000) {
    return cached.result;
  }

  const mapField = (field) => {
    if (field === 'createdAt') return 'created_at';
    if (field === 'updatedAt') return 'updated_at';
    return field;
  };

  const runQuery = (skipOrderBy = false) => {
    let builder = supabase.from(col).select('*');
    for (const c of constraints) {
      if (c._type === 'where') {
        const field = mapField(c.field);
        if (c.op === '==' || c.op === '===') builder = builder.eq(field, c.val);
        else if (c.op === '!=') builder = builder.neq(field, c.val);
        else if (c.op === '>') builder = builder.gt(field, c.val);
        else if (c.op === '>=') builder = builder.gte(field, c.val);
        else if (c.op === '<') builder = builder.lt(field, c.val);
        else if (c.op === '<=') builder = builder.lte(field, c.val);
        else if (c.op === 'in') builder = builder.in(field, Array.isArray(c.val) ? c.val : [c.val]);
      } else if (c._type === 'orderBy' && !skipOrderBy) {
        const field = mapField(c.field);
        builder = builder.order(field, { ascending: c.dir !== 'desc' });
      } else if (c._type === 'limit') {
        builder = builder.limit(c.count);
      }
    }
    return builder;
  };

  let { data, error } = await runQuery();
  if (error && isAuthError(error)) {
    const isFuture = String(error.message || '').toLowerCase().includes('future');
    if (isFuture) {
      await new Promise(r => setTimeout(r, 400));
    } else {
      await ensureFreshSession();
    }
    ({ data, error } = await runQuery());
    if (error && String(error.message || '').toLowerCase().includes('future')) {
      await new Promise(r => setTimeout(r, 600));
      ({ data, error } = await runQuery());
    }
  }

  // Graceful fallback for schema mismatches: if an order column does not exist on table,
  // retry query without server orderBy and sort in-memory.
  if (error && (error.code === '42703' || String(error.message || '').toLowerCase().includes('does not exist'))) {
    const hasOrder = constraints.some(c => c._type === 'orderBy');
    if (hasOrder) {
      const fallbackRes = await runQuery(true);
      if (!fallbackRes.error && fallbackRes.data) {
        data = fallbackRes.data;
        const orderConstraints = constraints.filter(c => c._type === 'orderBy');
        for (const oc of orderConstraints) {
          const f = oc.field;
          const mappedF = mapField(f);
          const isDesc = oc.dir === 'desc';
          data.sort((a, b) => {
            const va = a[mappedF] ?? a[f] ?? a.data?.[f] ?? a.id;
            const vb = b[mappedF] ?? b[f] ?? b.data?.[f] ?? b.id;
            if (va < vb) return isDesc ? 1 : -1;
            if (va > vb) return isDesc ? -1 : 1;
            return 0;
          });
        }
        error = null;
      }
    }
  }

  if (error) {
    if (String(error.message || '').toLowerCase().includes('future')) {
      console.warn(`getDocs(${col}) suppressed future clock skew:`, error.message);
      return { empty: true, size: 0, docs: [], forEach: () => {}, error };
    }
    console.warn(`getDocs(${col}) warning:`, error.message);
    notifyDataError(col, error);
    return { empty: true, size: 0, docs: [], forEach: () => {}, error };
  }

  const docs = (data || []).map(row => {
    const docData = { ...row.data, ...row };
    if ('data' in docData && typeof docData.data === 'object') delete docData.data;
    if (docData.created_at && !docData.createdAt) docData.createdAt = docData.created_at;
    if (docData.updated_at && !docData.updatedAt) docData.updatedAt = docData.updated_at;
    return {
      id: String(row.id),
      exists: () => true,
      get exists() { return true; },
      data: () => docData
    };
  });

  const result = {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (cb) => docs.forEach(cb)
  };

  queryCache.set(cacheKey, { time: Date.now(), result });
  return result;
}

export async function setDoc(docRef, data, options = {}) {
  const col = normalizeCol(docRef.col);
  const id = String(docRef.id);
  const payload = { id, ...data };
  if (payload.createdAt && !payload.created_at) payload.created_at = payload.createdAt;
  if (payload.updatedAt && !payload.updated_at) payload.updated_at = payload.updatedAt;
  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined) delete payload[k];
  }
  const { error } = await supabase.from(col).upsert(payload);
  if (error) {
    console.error(`setDoc(${col}/${id}) error:`, error);
    throw error;
  }
  clearQueryCache(col);
}

export async function addDoc(colRef, data) {
  const col = normalizeCol(colRef.col);
  const id = data.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
  const payload = { id, ...data };
  if (payload.createdAt && !payload.created_at) payload.created_at = payload.createdAt;
  if (payload.updatedAt && !payload.updated_at) payload.updated_at = payload.updatedAt;
  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined) delete payload[k];
  }
  const { error } = await supabase.from(col).insert(payload);
  if (error) {
    console.error(`addDoc(${col}) error:`, error);
    throw error;
  }
  clearQueryCache(col);
  return { id, col };
}

export async function updateDoc(docRef, data) {
  const col = normalizeCol(docRef.col);
  const id = String(docRef.id);
  const payload = { ...data };
  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined) delete payload[k];
  }
  const { error } = await supabase.from(col).update(payload).eq('id', id);
  if (error) {
    console.error(`updateDoc(${col}/${id}) error:`, error);
    throw error;
  }
  clearQueryCache(col);
}

export async function deleteDoc(docRef) {
  const col = normalizeCol(docRef.col);
  const id = String(docRef.id);
  const { error } = await supabase.from(col).delete().eq('id', id);
  if (error) {
    console.error(`deleteDoc(${col}/${id}) error:`, error);
    throw error;
  }
  clearQueryCache(col);
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export function onSnapshot(target, onNext, onError) {
  let isSubscribed = true;
  const col = normalizeCol(target.col);

  const refresh = async () => {
    try {
      if (target._type === 'doc') {
        const snap = await getDoc(target);
        if (isSubscribed) onNext(snap);
      } else {
        const snap = await getDocs(target);
        if (isSubscribed) onNext(snap);
      }
    } catch (err) {
      if (isSubscribed && onError) onError(err);
    }
  };

  refresh();

  const channelName = `realtime_${col}_${Math.random().toString(36).substr(2, 9)}`;
  const channel = supabase.channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: col }, () => {
      refresh();
    })
    .subscribe();

  return () => {
    isSubscribed = false;
    supabase.removeChannel(channel);
  };
}

// ============================================================
// Storage Adapters
// ============================================================

export function ref(storageInst, path) {
  return {
    _type: 'storageRef',
    bucket: 'school-files',
    path: String(path).replace(/^\/+/, '')
  };
}

export async function uploadBytes(storageRef, file) {
  const bucket = storageRef.bucket || 'school-files';
  const path = storageRef.path;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return { ref: storageRef };
}

export async function getDownloadURL(storageRef) {
  const bucket = storageRef.bucket || 'school-files';
  const path = storageRef.path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || '';
}

export async function deleteObject(storageRef) {
  const bucket = storageRef.bucket || 'school-files';
  const path = storageRef.path;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

// ============================================================
// Profile Cache & requirePortal Guard
// ============================================================

const userProfileCache = new Map();

export async function getUserProfile(uid) {
  if (userProfileCache.has(uid)) {
    return userProfileCache.get(uid);
  }

  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists() && snap.data().role) {
      const p = { uid, ...snap.data() };
      userProfileCache.set(uid, p);
      return p;
    }
  } catch (err) {
    console.warn("getUserProfile read failed:", err);
  }

  // Admin account fallback
  const curUser = auth.currentUser;
  const userEmail = (curUser && curUser.email) ? curUser.email.toLowerCase() : '';
  if (userEmail === 'amala@123.gmail.com' || userEmail === 'admin@kishore.gmail.com' || userEmail === 'amala123@gmail.com') {
    const adminP = {
      uid,
      role: 'admin',
      name: 'School Administrator',
      email: userEmail
    };
    userProfileCache.set(uid, adminP);
    return adminP;
  }

  // Multi-table lookup
  try {
    const [stfSnap, stuSnap, parSnap] = await Promise.all([
      getDoc(doc(db, 'staff', uid)).catch(() => null),
      getDoc(doc(db, 'students', uid)).catch(() => null),
      getDoc(doc(db, 'parents', uid)).catch(() => null)
    ]);

    if (stfSnap && stfSnap.exists() && !stfSnap.data().deleted) {
      const p = { uid, role: 'staff', name: stfSnap.data().name || 'Faculty', ...stfSnap.data() };
      userProfileCache.set(uid, p);
      return p;
    }
    if (stuSnap && stuSnap.exists() && !stuSnap.data().deleted) {
      const p = { uid, role: 'student', name: stuSnap.data().name || 'Student', ...stuSnap.data() };
      userProfileCache.set(uid, p);
      return p;
    }
    if (parSnap && parSnap.exists() && !parSnap.data().deleted) {
      const p = { uid, role: 'parent', name: parSnap.data().name || 'Parent', ...parSnap.data() };
      userProfileCache.set(uid, p);
      return p;
    }

    if (userEmail) {
      const cleanUser = userEmail.split('@')[0];
      const [stfEmailSnap, stfUserSnap, pQSnap, sQSnap] = await Promise.all([
        getDocs(query(collection(db, 'staff'), where('email', '==', userEmail))).catch(() => null),
        getDocs(query(collection(db, 'staff'), where('username', '==', cleanUser))).catch(() => null),
        getDocs(query(collection(db, 'parents'), where('email', '==', userEmail))).catch(() => null),
        getDocs(query(collection(db, 'students'), where('email', '==', userEmail))).catch(() => null)
      ]);

      if (stfEmailSnap && !stfEmailSnap.empty && !stfEmailSnap.docs[0].data().deleted) {
        const d = stfEmailSnap.docs[0].data();
        const p = { uid, role: 'staff', name: d.name || 'Faculty', ...d, deleted: false, disabled: false };
        userProfileCache.set(uid, p);
        return p;
      }
      if (stfUserSnap && !stfUserSnap.empty && !stfUserSnap.docs[0].data().deleted) {
        const d = stfUserSnap.docs[0].data();
        const p = { uid, role: 'staff', name: d.name || 'Faculty', ...d, deleted: false, disabled: false };
        userProfileCache.set(uid, p);
        return p;
      }
      if (pQSnap && !pQSnap.empty && !pQSnap.docs[0].data().deleted) {
        const pData = pQSnap.docs[0].data();
        const profile = { uid, role: 'parent', name: pData.name || 'Parent', email: userEmail, phone: pData.phone || '', ...pData, deleted: false, disabled: false };
        await setDoc(doc(db, "users", uid), profile, { merge: true }).catch(() => {});
        userProfileCache.set(uid, profile);
        return profile;
      }
      if (sQSnap && !sQSnap.empty && !sQSnap.docs[0].data().deleted) {
        const sData = sQSnap.docs[0].data();
        const profile = { uid, role: 'student', name: sData.name || 'Student', email: userEmail, ...sData, deleted: false, disabled: false };
        await setDoc(doc(db, "users", uid), profile, { merge: true }).catch(() => {});
        userProfileCache.set(uid, profile);
        return profile;
      }
    }
  } catch (e) {
    console.warn("Multi-collection fallback in getUserProfile error:", e);
  }

  return null;
}

export function requirePortal(allowedRoles, onReady, loginPath = "/index.html") {
  let isAuthorized = false;
  let hasHydratedFromCache = false;

  const purgePortalSession = () => {
    try {
      sessionStorage.removeItem('erp_active_session');
      sessionStorage.removeItem('erp_active_role');
      for (const r of allowedRoles) {
        sessionStorage.removeItem('erp_session_' + r);
        localStorage.removeItem('erp_session_' + r);
      }
    } catch (e) {}
  };

  // 1. Instant cache hydration
  try {
    let rawCache = null;
    for (const r of allowedRoles) {
      const item = sessionStorage.getItem('erp_session_' + r);
      if (item) { rawCache = item; break; }
    }
    if (!rawCache) {
      const tabActive = sessionStorage.getItem('erp_active_session');
      if (tabActive) {
        try {
          const parsed = JSON.parse(tabActive);
          if (parsed && parsed.role && allowedRoles.includes(parsed.role)) rawCache = tabActive;
        } catch (e) {}
      }
    }
    if (!rawCache) {
      for (const r of allowedRoles) {
        const item = localStorage.getItem('erp_session_' + r);
        if (item) { rawCache = item; break; }
      }
    }

    if (rawCache) {
      const cached = JSON.parse(rawCache);
      if (cached && (cached.uid || cached.id) && allowedRoles.includes(cached.role) && (Date.now() - (cached.timestamp || 0)) < 86400000) {
        hasHydratedFromCache = true;
        const uid = cached.uid || cached.id;
        userProfileCache.set(uid, cached.profile || { uid, name: cached.name, role: cached.role });
        try {
          sessionStorage.setItem('erp_active_session', rawCache);
          sessionStorage.setItem('erp_session_' + cached.role, rawCache);
          sessionStorage.setItem('erp_active_role', cached.role);
        } catch (e) {}

        // HIGH SPEED OPTIMIZATION: Instant UI rendering from cached session (0ms visual latency)
        isAuthorized = true;
        const cachedUser = {
          uid,
          id: uid,
          email: cached.email || ''
        };
        currentActiveUser = cachedUser;
        try {
          onReady({
            user: cachedUser,
            profile: cached.profile || { uid, name: cached.name, role: cached.role },
            roleData: cached.roleData || null,
            isCached: true
          });
        } catch (cbErr) {
          console.warn("requirePortal instant cached onReady error:", cbErr);
        }
      }
    }
  } catch (e) {
    console.warn("Session cache read warning:", e);
  }

  const handleAuth = async (user) => {
    if (!user) {
      // Re-check with a fresh session read in case the client's storage
      // was still initializing when onAuthStateChanged ran.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          session.user.uid = session.user.id;
          currentActiveUser = session.user;
          user = session.user;
        }
      } catch (e) {}
      if (!user) {
        if (hasHydratedFromCache) {
          // If we already hydrated from a valid cache (within 24h),
          // don't immediately purge or kick the user out while session initializes
          return;
        }
        purgePortalSession();
        window.location.href = loginPath;
        return;
      }
    }

    try {
      let rawCacheData = null;
      try {
        const raw = sessionStorage.getItem('erp_active_session') ||
          (currentRole ? localStorage.getItem('erp_session_' + currentRole) : null);
        if (raw) rawCacheData = JSON.parse(raw);
      } catch (e) {}

      const effectiveUid = (rawCacheData && (rawCacheData.uid || rawCacheData.id) && allowedRoles.includes(rawCacheData.role))
        ? (rawCacheData.uid || rawCacheData.id)
        : (user.uid || user.id);

      let profile = await getUserProfile(effectiveUid);
      if (!profile && rawCacheData && rawCacheData.profile && allowedRoles.includes(rawCacheData.role)) {
        profile = rawCacheData.profile;
      }

      if (!profile) {
        if (!hasHydratedFromCache) {
          purgePortalSession();
          window.location.href = loginPath;
        }
        return;
      }

      if (profile.deleted || profile.disabled) {
        alert("This account has been deleted or deactivated by the school administrator.");
        purgePortalSession();
        await fbSignOut(auth);
        window.location.href = loginPath;
        return;
      }

      if (!allowedRoles.includes(profile.role)) {
        console.warn(`User role '${profile.role}' is not authorized for portal '${allowedRoles.join(', ')}'.`);
        purgePortalSession();
        window.location.href = loginPath;
        return;
      }

      let roleData = null;
      try {
        const rawRoleData = sessionStorage.getItem('erp_session_' + profile.role) || localStorage.getItem('erp_session_' + profile.role);
        if (rawRoleData) roleData = JSON.parse(rawRoleData).roleData || null;
      } catch (e) {}

      if (!roleData && profile.role === 'parent') {
        try {
          const parDoc = await getDoc(doc(db, 'parents', effectiveUid));
          if (parDoc && parDoc.exists()) {
            const childUid = parDoc.data().childUid;
            let stuProfile = null;
            if (childUid) {
              const stuDoc = await getDoc(doc(db, 'students', childUid));
              if (stuDoc && stuDoc.exists()) stuProfile = stuDoc.data();
            }
            roleData = { ...parDoc.data(), studentProfile: stuProfile };
          }
        } catch (e) {}
      }

      const effectiveUser = {
        uid: effectiveUid,
        id: effectiveUid,
        email: profile.email || (rawCacheData && rawCacheData.email) || user.email
      };
      currentActiveUser = effectiveUser;

      const sessionPayload = JSON.stringify({
        uid: effectiveUid,
        email: effectiveUser.email,
        role: profile.role,
        name: profile.name || '',
        profile,
        roleData,
        timestamp: Date.now()
      });
      try {
        sessionStorage.setItem('erp_active_session', sessionPayload);
        sessionStorage.setItem('erp_session_' + profile.role, sessionPayload);
        sessionStorage.setItem('erp_active_role', profile.role);
        localStorage.setItem('erp_session_' + profile.role, sessionPayload);
      } catch (e) {}

      if (!isAuthorized) {
        isAuthorized = true;
        onReady({ user: effectiveUser, profile, roleData, isCached: hasHydratedFromCache });
      }

      setTimeout(() => {
        showFirstTimeLoginGuide(profile.role, user, profile);
      }, 300);

    } catch (err) {
      console.error("requirePortal authorization error:", err);
      if (!hasHydratedFromCache) {
        purgePortalSession();
        window.location.href = loginPath;
      }
    }
  };

  onAuthStateChanged(auth, handleAuth);
}

// First time login guide
export function showFirstTimeLoginGuide(role, user, profile) {
  if (typeof document === 'undefined') return;
  const uid = user ? (user.uid || user.id) : '';
  const key = 'amala_first_time_login_shown_' + uid;
  try {
    if (localStorage.getItem(key) === 'true') return;
    localStorage.setItem(key, 'true');
  } catch (e) {}
}

export function portalPathForRole(role) {
  switch (role) {
    case "student": return "/student/dashboard.html";
    case "parent": return "/parent/dashboard.html";
    case "staff": return "/internal/staff/dashboard.html";
    case "admin": return "/internal/admin/dashboard.html";
    default: return "/login.html";
  }
}

export function logout(loginPath = "../login.html") {
  const role = getCurrentPortalRole();
  try {
    sessionStorage.removeItem('erp_active_session');
    sessionStorage.removeItem('erp_active_role');
    if (role) {
      sessionStorage.removeItem('erp_session_' + role);
      localStorage.removeItem('erp_session_' + role);
    }
    userProfileCache.clear();
  } catch (e) {}
  fbSignOut(auth).finally(() => {
    window.location.href = loginPath;
  });
}

export function showBox(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = msg ? "block" : "none";
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
}
