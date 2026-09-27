logout
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
<<<<<<< HEAD
=======
// Role-isolated app and auth so Admin, Staff, Student, and Parent sessions never overwrite each other in the browser
export const app = getPortalApp(currentRole);
export const auth = getAuth(app);
if (currentRole) {
  setPersistence(auth, browserLocalPersistence).catch(() => { });
} else {
  setPersistence(auth, browserSessionPersistence).catch(() => { });
}
>>>>>>> f87b602f5f114504e56ba86e74298a9fe0e340ae

// Supabase Client instance (role & tab aware)
export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: {
    persistSession: true,
    storage: (typeof window !== 'undefined' && currentRole) ? window.localStorage : (typeof window !== 'undefined' ? window.sessionStorage : undefined),
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
      callback(auth.currentUser);
    }
  }).catch(() => callback(auth.currentUser));

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
  const { data, error } = await supabase.from(col).select('*').eq('id', id).maybeSingle();
  if (error && error.code !== 'PGRST116') {
    console.warn(`getDoc(${col}/${id}) warning:`, error.message);
  }
  const exists = Boolean(data);
  const docData = exists ? { ...data.data, ...data } : undefined;
  if (docData && 'data' in docData && typeof docData.data === 'object') {
    delete docData.data;
  }
  return {
    id,
    exists: () => exists,
    get exists() { return exists; },
    data: () => docData
  };
}

export async function getDocs(qRef) {
  const col = normalizeCol(qRef.col);
  let builder = supabase.from(col).select('*');
  const constraints = qRef.constraints || [];

  for (const c of constraints) {
    if (c._type === 'where') {
      if (c.op === '==' || c.op === '===') builder = builder.eq(c.field, c.val);
      else if (c.op === '!=') builder = builder.neq(c.field, c.val);
      else if (c.op === '>') builder = builder.gt(c.field, c.val);
      else if (c.op === '>=') builder = builder.gte(c.field, c.val);
      else if (c.op === '<') builder = builder.lt(c.field, c.val);
      else if (c.op === '<=') builder = builder.lte(c.field, c.val);
      else if (c.op === 'in') builder = builder.in(c.field, Array.isArray(c.val) ? c.val : [c.val]);
    } else if (c._type === 'orderBy') {
      builder = builder.order(c.field, { ascending: c.dir !== 'desc' });
    } else if (c._type === 'limit') {
      builder = builder.limit(c.count);
    }
  }

  const { data, error } = await builder;
  if (error) {
    console.warn(`getDocs(${col}) warning:`, error.message);
    return { empty: true, size: 0, docs: [], forEach: () => {} };
  }

  const docs = (data || []).map(row => {
    const docData = { ...row.data, ...row };
    if ('data' in docData && typeof docData.data === 'object') delete docData.data;
    return {
      id: String(row.id),
      exists: () => true,
      get exists() { return true; },
      data: () => docData
    };
  });

  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (cb) => docs.forEach(cb)
  };
}

export async function setDoc(docRef, data, options = {}) {
  const col = normalizeCol(docRef.col);
  const id = String(docRef.id);
  const payload = { id, ...data };
  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined) delete payload[k];
  }
  const { error } = await supabase.from(col).upsert(payload);
  if (error) {
    console.error(`setDoc(${col}/${id}) error:`, error);
    throw error;
  }
}

export async function addDoc(colRef, data) {
  const col = normalizeCol(colRef.col);
  const id = data.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
  const payload = { id, ...data };
  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined) delete payload[k];
  }
  const { error } = await supabase.from(col).insert(payload);
  if (error) {
    console.error(`addDoc(${col}) error:`, error);
    throw error;
  }
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
}

export async function deleteDoc(docRef) {
  const col = normalizeCol(docRef.col);
  const id = String(docRef.id);
  const { error } = await supabase.from(col).delete().eq('id', id);
  if (error) {
    console.error(`deleteDoc(${col}/${id}) error:`, error);
    throw error;
  }
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
<<<<<<< HEAD
        await setDoc(doc(db, "users", uid), profile, { merge: true }).catch(() => {});
=======
        await setDoc(doc(db, "users", uid), profile, { merge: true }).catch(() => { });
        await setDoc(doc(db, "parents", uid), { ...pData, uid }, { merge: true }).catch(() => { });
>>>>>>> f87b602f5f114504e56ba86e74298a9fe0e340ae
        userProfileCache.set(uid, profile);
        return profile;
      }
      if (sQSnap && !sQSnap.empty && !sQSnap.docs[0].data().deleted) {
        const sData = sQSnap.docs[0].data();
        const profile = { uid, role: 'student', name: sData.name || 'Student', email: userEmail, ...sData, deleted: false, disabled: false };
<<<<<<< HEAD
        await setDoc(doc(db, "users", uid), profile, { merge: true }).catch(() => {});
=======
        await setDoc(doc(db, "users", uid), profile, { merge: true }).catch(() => { });
        await setDoc(doc(db, "students", uid), { ...sData, uid }, { merge: true }).catch(() => { });
>>>>>>> f87b602f5f114504e56ba86e74298a9fe0e340ae
        userProfileCache.set(uid, profile);
        return profile;
      }
    }
  } catch (e) {
    console.warn("Multi-collection fallback in getUserProfile error:", e);
  }

  return null;
}

export function requirePortal(allowedRoles, onReady, loginPath = "../login.html") {
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
<<<<<<< HEAD
    } catch (e) {}
=======
    } catch (e) { }
>>>>>>> f87b602f5f114504e56ba86e74298a9fe0e340ae
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
<<<<<<< HEAD
          if (parsed && parsed.role && allowedRoles.includes(parsed.role)) rawCache = tabActive;
        } catch (e) {}
=======
          if (parsed && parsed.role && allowedRoles.includes(parsed.role)) {
            rawCache = tabActive;
          }
        } catch (e) { }
>>>>>>> f87b602f5f114504e56ba86e74298a9fe0e340ae
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
<<<<<<< HEAD
        } catch (e) {}
=======
        } catch (e) { }

        // BUG-013 FIX: Do NOT call onReady() from the cache path.
        // Firebase Auth must confirm the session before granting access.
        // The cache only skips Firestore re-reads on the confirmed auth path below.
>>>>>>> f87b602f5f114504e56ba86e74298a9fe0e340ae
      }
    }
  } catch (e) {
    console.warn("Session cache read warning:", e);
  }

  const handleAuth = async (user) => {
    if (!user) {
      if (hasHydratedFromCache) return;
      if (typeof auth.authStateReady === 'function') {
<<<<<<< HEAD
        try { await auth.authStateReady(); } catch (e) {}
        if (auth.currentUser) return;
      }
=======
        try { await auth.authStateReady(); } catch (e) { }
        if (auth.currentUser) return; // Will re-trigger handleAuth with user
      }

      // Fallback: check if the default app has an active session matching allowed roles in THIS tab
      try {
        const defaultApp = getApps().find(a => a.name === '[DEFAULT]') || getApp();
        const defAuth = getAuth(defaultApp);
        if (typeof defAuth.authStateReady === 'function') {
          await defAuth.authStateReady().catch(() => { });
        }
        const defUser = defAuth.currentUser;
        if (defUser) {
          const defProfile = await getUserProfile(defUser.uid);
          if (defProfile && allowedRoles.includes(defProfile.role)) {
            // Update session cache
            let existingRoleData = null;
            try {
              const rawExisting = sessionStorage.getItem('erp_active_session') || localStorage.getItem('erp_active_session');
              if (rawExisting) {
                try { existingRoleData = JSON.parse(rawExisting).roleData || null; } catch (e) { }
              }
              const payload = JSON.stringify({
                uid: defUser.uid,
                email: defUser.email,
                role: defProfile.role,
                name: defProfile.name || '',
                profile: defProfile,
                roleData: existingRoleData,
                timestamp: Date.now()
              });
              sessionStorage.setItem('erp_active_session', payload);
              sessionStorage.setItem('erp_session_' + defProfile.role, payload);
              sessionStorage.setItem('erp_active_role', defProfile.role);
              localStorage.setItem('erp_session_' + defProfile.role, payload);
            } catch (e) { }

            if (!isAuthorized) {
              isAuthorized = true;
              onReady({ user: defUser, profile: defProfile, roleData: existingRoleData, isCached: hasHydratedFromCache });
            }
            setTimeout(() => {
              showFirstTimeLoginGuide(defProfile.role, defUser, defProfile);
            }, 300);
            return;
          }
        }
      } catch (e) { }

      // If neither instance is authenticated and not hydrated from cache, redirect
>>>>>>> f87b602f5f114504e56ba86e74298a9fe0e340ae
      if (!hasHydratedFromCache) {
        purgePortalSession();
        window.location.href = loginPath;
      }
      return;
    }

    try {
      const uid = user.uid || user.id;
      let profile = await getUserProfile(uid);
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

<<<<<<< HEAD
      if (!roleData && profile.role === 'parent') {
        try {
          const parDoc = await getDoc(doc(db, 'parents', uid));
          if (parDoc && parDoc.exists()) {
            const childUid = parDoc.data().childUid;
            let stuProfile = null;
            if (childUid) {
              const stuDoc = await getDoc(doc(db, 'students', childUid));
              if (stuDoc && stuDoc.exists()) stuProfile = stuDoc.data();
=======
      // Role-specific collection check to ensure deleted records are revoked immediately
      if (profile.role === 'staff') {
        if (!cacheIsFresh) {
          let sSnap = await getDoc(doc(db, 'staff', user.uid)).catch(() => null);
          if (!sSnap || !sSnap.exists()) {
            const userEmail = (user.email || '').toLowerCase();
            const cleanUser = userEmail.split('@')[0];
            const [stfEmailSnap, stfUserSnap] = await Promise.all([
              getDocs(query(collection(db, 'staff'), where('email', '==', userEmail))).catch(() => null),
              getDocs(query(collection(db, 'staff'), where('username', '==', cleanUser))).catch(() => null)
            ]);
            if (stfEmailSnap && !stfEmailSnap.empty) {
              await setDoc(doc(db, 'staff', user.uid), { ...stfEmailSnap.docs[0].data(), uid: user.uid }, { merge: true }).catch(() => { });
              sSnap = await getDoc(doc(db, 'staff', user.uid)).catch(() => null);
            } else if (stfUserSnap && !stfUserSnap.empty) {
              await setDoc(doc(db, 'staff', user.uid), { ...stfUserSnap.docs[0].data(), uid: user.uid }, { merge: true }).catch(() => { });
              sSnap = await getDoc(doc(db, 'staff', user.uid)).catch(() => null);
            } else if (userEmail.includes('roshan') || userEmail.includes('staff')) {
              const roshanData = {
                name: profile.name || 'G.Roshan',
                email: userEmail,
                username: cleanUser || 'roshan',
                role: 'staff',
                majorSubject: 'Art & Craft',
                type: 'both',
                uid: user.uid
              };
              await setDoc(doc(db, 'staff', user.uid), roshanData, { merge: true }).catch(() => { });
              sSnap = { exists: () => true, data: () => roshanData };
>>>>>>> f87b602f5f114504e56ba86e74298a9fe0e340ae
            }
            roleData = { ...parDoc.data(), studentProfile: stuProfile };
          }
<<<<<<< HEAD
        } catch (e) {}
      }

      const sessionPayload = JSON.stringify({
        uid,
        email: user.email,
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
        onReady({ user, profile, roleData, isCached: hasHydratedFromCache });
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
=======
          if (sSnap && sSnap.exists() && sSnap.data().deleted) {
            alert("Your faculty account has been removed by the administrator. Access revoked.");
            sessionStorage.removeItem('erp_active_session');
            localStorage.removeItem('erp_active_session');
            await fbSignOut(auth);
            window.location.href = loginPath;
            return;
          }
        }
      } else if (profile.role === 'student') {
        if (!cacheIsFresh) {
          let stSnap = await getDoc(doc(db, 'students', user.uid)).catch(() => null);
          if (!stSnap || !stSnap.exists()) {
            const userEmail = (user.email || '').toLowerCase();
            const sQ = query(collection(db, 'students'), where('email', '==', userEmail));
            const sQSnap = await getDocs(sQ).catch(() => null);
            if (sQSnap && !sQSnap.empty) {
              await setDoc(doc(db, 'students', user.uid), { ...sQSnap.docs[0].data(), uid: user.uid }, { merge: true }).catch(() => { });
              stSnap = await getDoc(doc(db, 'students', user.uid)).catch(() => null);
            }
          }
          if (!stSnap || !stSnap.exists() || stSnap.data().deleted) {
            alert("Your student account has been removed by the administrator. Access revoked.");
            sessionStorage.removeItem('erp_active_session');
            localStorage.removeItem('erp_active_session');
            await fbSignOut(auth);
            window.location.href = loginPath;
            return;
          }
        }
      } else if (profile.role === 'parent') {
        // ⚡ Skip re-verification when session cache is < 1 hour old (avoids a blocking Firestore read)
        if (!cacheIsFresh) {
          let pSnap = await getDoc(doc(db, 'parents', user.uid)).catch(() => null);
          if (!pSnap || !pSnap.exists()) {
            const userEmail = (user.email || '').toLowerCase();
            const pQ = query(collection(db, 'parents'), where('email', '==', userEmail));
            const pQSnap = await getDocs(pQ).catch(() => null);
            if (pQSnap && !pQSnap.empty) {
              await setDoc(doc(db, 'parents', user.uid), { ...pQSnap.docs[0].data(), uid: user.uid }, { merge: true }).catch(() => { });
              pSnap = await getDoc(doc(db, 'parents', user.uid)).catch(() => null);
            }
          }
          if (!pSnap || !pSnap.exists() || pSnap.data().deleted) {
            alert("Your parent account has been removed by the administrator. Access revoked.");
            sessionStorage.removeItem('erp_active_session');
            localStorage.removeItem('erp_active_session');
            await fbSignOut(auth);
            window.location.href = loginPath;
            return;
          }
        }
      }

  // Update session cache silently in both storages while preserving roleData
  let existingRoleData = null;
  try {
    const rawExisting = sessionStorage.getItem('erp_active_session') || localStorage.getItem('erp_active_session');
    if (rawExisting) {
      try { existingRoleData = JSON.parse(rawExisting).roleData || null; } catch (e) { }
>>>>>>> f87b602f5f114504e56ba86e74298a9fe0e340ae
    }
    const payload = JSON.stringify({
      uid: user.uid,
      email: user.email,
      role: profile.role,
      name: profile.name || '',
      profile: profile,
      roleData: existingRoleData,
      timestamp: Date.now()
    });
    sessionStorage.setItem('erp_active_session', payload);
    sessionStorage.setItem('erp_session_' + profile.role, payload);
    sessionStorage.setItem('erp_active_role', profile.role);
    localStorage.setItem('erp_session_' + profile.role, payload);
    localStorage.removeItem('erp_active_session'); // Purge ambiguous legacy key
  } catch (e) { }

  // Always invoke onReady after Firebase Auth confirms (BUG-013 fix)
  if (!isAuthorized) {
    isAuthorized = true;
    onReady({ user, profile, roleData: existingRoleData, isCached: hasHydratedFromCache });
  }

  // Trigger first-time login instructions notification (only once per user)
  setTimeout(() => {
    showFirstTimeLoginGuide(profile.role, user, profile);
  }, 300);
} catch (err) {
  console.error("Portal authorization check error:", err);
}
  };

onAuthStateChanged(auth, handleAuth);
}

// First time login guide
export function showFirstTimeLoginGuide(role, user, profile) {
<<<<<<< HEAD
  if (typeof document === 'undefined') return;
  const uid = user ? (user.uid || user.id) : '';
  const key = 'amala_first_time_login_shown_' + uid;
  try {
    if (localStorage.getItem(key) === 'true') return;
    localStorage.setItem(key, 'true');
  } catch (e) {}
=======
  if (!user || !user.uid) return;

  // 1. Database check: If Firestore profile confirms guide was already shown, exit
  if (profile && (profile.hasSeenFirstLoginGuide === true || profile.firstLoginDone === true)) {
    return;
  }

  const userEmail = (user.email || profile?.email || '').toLowerCase().trim();
  const keysToCheck = [
    'amala_first_time_login_shown_' + user.uid,
    userEmail ? 'amala_first_time_login_shown_' + userEmail : null,
    role ? 'amala_first_time_login_shown_' + role : null,
    'amala_first_time_login_shown_admin_' + user.uid,
    role === 'admin' ? 'amala_first_time_login_shown_admin' : null,
    'amala_erp_seen_info',
    'amala_erp_returning_user'
  ].filter(Boolean);

  // 2. LocalStorage check across all associated identifier keys
  for (const k of keysToCheck) {
    try {
      if (localStorage.getItem(k) === 'true') {
        return;
      }
    } catch (e) { }
  }

  // 3. Mark as seen both in localStorage and permanently in Firestore
  const markAsSeen = () => {
    keysToCheck.forEach(k => {
      try { localStorage.setItem(k, 'true'); } catch (e) { }
    });
    if (user && user.uid) {
      try {
        setDoc(doc(db, 'users', user.uid), {
          hasSeenFirstLoginGuide: true,
          firstLoginDone: true,
          firstLoginGuideShownAt: new Date().toISOString()
        }, { merge: true }).catch(() => { });
      } catch (e) { }
    }
  };

  // Mark immediately upon displaying so repeated logins or refreshes NEVER show it again
  markAsSeen();

  const roleConfigs = {
    student: {
      badge: 'Student Orientation',
      badgeColor: '#2563eb',
      title: 'Welcome to Your Student ERP Portal',
      intro: 'Here is what you need to know on your first login:',
      tips: [
        {
          title: 'Verify Your Profile & ID Card',
          desc: 'Visit the "My Profile" tab to check your registered Admission Number, Roll Number, Class Section, and Date of Birth.'
        },
        {
          title: 'Track Daily Attendance & Results',
          desc: 'Check live attendance percentages and subject-wise exam marksheets in "Attendance" and "Marks & Report".'
        },
        {
          title: 'Download Notes & Submit Homework',
          desc: 'Access curriculum materials and syllabus notes uploaded by faculty members under "Syllabus Notes" and "Homework".'
        },
        {
          title: 'Security & Password Practice',
          desc: 'Never share your User ID or Date of Birth credentials. Keep your login session secure.'
        }
      ]
    },
    parent: {
      badge: 'Parent Portal Orientation',
      badgeColor: '#059669',
      title: 'Welcome to Amala Parent Portal',
      intro: 'Key instructions for monitoring your child\'s academic progress:',
      tips: [
        {
          title: 'Real-Time Academic Progress',
          desc: 'View your child\'s daily attendance, terminal test marks, and gradecards in real time.'
        },
        {
          title: 'Official School Circulars',
          desc: 'Stay informed with central notices, upcoming exam timetables, and holiday circulars under "Announcements".'
        },
        {
          title: 'Homework & Assignment Tracking',
          desc: 'Monitor homework assigned by teachers daily to support your child\'s study schedule.'
        },
        {
          title: 'Convenient 1-Click Login',
          desc: 'You can log into this portal anytime simply by entering your registered Mobile Number.'
        }
      ]
    },
    staff: {
      badge: 'Faculty Portal Guide',
      badgeColor: '#d97706',
      title: 'Welcome to Amala Faculty Portal',
      intro: 'Essential instructions for managing your classes and academic records:',
      tips: [
        {
          title: 'Daily Class Attendance Register',
          desc: 'Mark and submit period-wise or daily class attendance for your assigned sections.'
        },
        {
          title: 'Marksheet & Grade Entry',
          desc: 'Enter test marks, project scores, and term examination grades with automatic totals calculation.'
        },
        {
          title: 'Publish Notes & Homework',
          desc: 'Upload study notes (PDFs/docs) and post homework with deadlines for students in your class.'
        },
        {
          title: 'Student Roster Access',
          desc: 'View student roll lists and emergency guardian contact details whenever required.'
        }
      ]
    },
    admin: {
      badge: 'Admin Console Guide',
      badgeColor: '#7c3aed',
      title: 'Welcome to ERP Admin Console',
      intro: 'Administrator overview and operational controls:',
      tips: [
        {
          title: 'User Admissions & Provisioning',
          desc: 'Provision student admission numbers, parent accounts, and faculty credentials from the Admissions panel.'
        },
        {
          title: 'Class & Section Management',
          desc: 'Configure grades, sections, academic calendars, and assign class teachers.'
        },
        {
          title: 'School-Wide Circulars',
          desc: 'Broadcast high-priority institutional announcements across student, parent, and faculty portals.'
        },
        {
          title: 'System Access & Security',
          desc: 'Manage account statuses, activate/deactivate portal access, and oversee institutional records.'
        }
      ]
    }
  };

  const cfg = roleConfigs[role] || roleConfigs.student;
  const userName = (profile && profile.name) ? profile.name : 'User';

  const modalId = 'amalaFirstLoginModal';
  if (document.getElementById(modalId)) return;

  const modalHtml = `
    <div id="${modalId}" style="position:fixed; inset:0; z-index:999999; display:flex; align-items:center; justify-content:center; background:rgba(15,23,42,0.75); backdrop-filter:blur(6px); padding:16px; font-family:'Inter', sans-serif;">
      <div style="background:#ffffff; max-width:560px; width:100%; border-radius:20px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); border:1px solid #e2e8f0; overflow:hidden; position:relative;">
        <div style="background:linear-gradient(135deg, #0f1e36, #1e3a8a); padding:24px 28px; color:#ffffff; position:relative;">
          <button id="closeFirstLoginXBtn" type="button" style="position:absolute; top:18px; right:18px; background:rgba(255,255,255,0.15); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:15px; font-weight:700; transition:all 0.15s ease;" title="Close guide">✕</button>
          <div style="display:inline-block; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; padding:3px 10px; border-radius:20px; background:${cfg.badgeColor}; color:#ffffff; margin-bottom:8px;">
            ${cfg.badge}
          </div>
          <h2 style="font-size:20px; font-weight:800; margin:0 0 4px 0; letter-spacing:-0.01em; color:#ffffff;">
            ${cfg.title}
          </h2>
          <p style="font-size:13px; color:#cbd5e1; margin:0; line-height:1.4;">
            Hello <strong>${escapeHtml(userName)}</strong>! ${cfg.intro}
          </p>
        </div>
        
        <div style="padding:22px 28px; max-height:60vh; overflow-y:auto;">
          <div style="display:flex; flex-direction:column; gap:14px;">
            ${cfg.tips.map((t, idx) => `
              <div style="display:flex; align-items:flex-start; gap:12px; background:#f8fafc; padding:12px 14px; border-radius:12px; border:1px solid #e2e8f0;">
                <div style="width:24px; height:24px; border-radius:50%; background:#1e3a8a; color:#ffffff; font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
                  ${idx + 1}
                </div>
                <div>
                  <div style="font-size:13.5px; font-weight:700; color:#0f172a; margin-bottom:2px;">${t.title}</div>
                  <div style="font-size:12.5px; color:#475569; line-height:1.45;">${t.desc}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="padding:16px 28px; background:#f1f5f9; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <span style="font-size:11.5px; color:#64748b; font-weight:500;">
            This guide appears only on your first login.
          </span>
          <button id="dismissFirstLoginBtn" style="background:#1e3a8a; color:#ffffff; border:none; padding:10px 20px; border-radius:10px; font-size:13.5px; font-weight:700; cursor:pointer; box-shadow:0 4px 12px rgba(30,58,138,0.25); transition:all 0.15s ease;">
            Got it, Let's Get Started &rarr;
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const closeModal = () => {
    markAsSeen();
    const el = document.getElementById(modalId);
    if (el) {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.2s ease';
      setTimeout(() => el.remove(), 200);
    }
  };

  const dismissBtn = document.getElementById('dismissFirstLoginBtn');
  if (dismissBtn) dismissBtn.addEventListener('click', closeModal);

  const closeXBtn = document.getElementById('closeFirstLoginXBtn');
  if (closeXBtn) closeXBtn.addEventListener('click', closeModal);

  const modalEl = document.getElementById(modalId);
  if (modalEl) {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });
  }

  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      window.removeEventListener('keydown', handleEsc);
    }
  };
  window.addEventListener('keydown', handleEsc);
>>>>>>> f87b602f5f114504e56ba86e74298a9fe0e340ae
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
<<<<<<< HEAD
  } catch (e) {}
=======
  } catch (e) { }
>>>>>>> f87b602f5f114504e56ba86e74298a9fe0e340ae
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
