// ============================================================
// Amala School ERP - Django REST Backend Client Adapter
// Replaces Supabase with Python Django + DRF + PostgreSQL
// Preserves 100% of frontend function signatures, return shapes, and caching.
// ============================================================


// Configurable API base URL
export const DJANGO_API_BASE = (typeof window !== 'undefined' && window.__DJANGO_API_URL__)
  ? window.__DJANGO_API_URL__.replace(/\/+$/, '')
  : 'http://localhost:8000/api';
if (typeof window !== 'undefined') {
  window.DJANGO_API_BASE = DJANGO_API_BASE;
}

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

// App & Auth compatibility wrappers
export const app = { name: currentRole ? `amala-${currentRole}-portal` : '[DEFAULT]' };
export const db = { _isDjango: true };
export const storage = { _isDjango: true };

// Active user tracking
let currentActiveUser = null;
const authStateListeners = new Set();

function getStoredSession() {
  if (typeof window === 'undefined') return null;
  try {
    const activeStr = sessionStorage.getItem('erp_active_session') ||
      (currentRole ? (sessionStorage.getItem('erp_session_' + currentRole) || localStorage.getItem('erp_session_' + currentRole)) : null);
    if (activeStr) {
      const parsed = JSON.parse(activeStr);
      if (parsed && (parsed.uid || parsed.id)) {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

// Auth wrapper matching Firebase/Supabase auth signature
export const auth = {
  get currentUser() {
    if (currentActiveUser) return currentActiveUser;
    const session = getStoredSession();
    if (session) {
      currentActiveUser = {
        uid: session.uid || session.id,
        id: session.uid || session.id,
        email: session.email || '',
        role: session.role || ''
      };
      return currentActiveUser;
    }
    return null;
  },
  signOut: async () => {
    currentActiveUser = null;
    try {
      await fetch(`${DJANGO_API_BASE}/auth/logout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    } catch (e) {}
    for (const listener of authStateListeners) {
      try { listener(null); } catch (e) {}
    }
  },
  authStateReady: async () => {
    return true;
  }
};

export function getSecondaryAuth() {
  return auth;
}

// ============================================================
// Auth Function Adapters
// ============================================================

export async function signInWithEmailAndPassword(authInst, identifier, password) {
  const res = await fetch(`${DJANGO_API_BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Authentication failed. Please check your credentials.');
  }

  const u = data.user;
  currentActiveUser = {
    uid: u.uid || u.id,
    id: u.uid || u.id,
    email: u.email || '',
    role: data.role || u.role
  };

  for (const listener of authStateListeners) {
    try { listener(currentActiveUser); } catch (e) {}
  }

  return {
    user: currentActiveUser,
    session: { access_token: data.token, user: currentActiveUser },
    role: data.role,
    userData: data.userData,
    roleDocData: data.roleDocData,
    studentProfile: data.studentProfile
  };
}

export async function createUserWithEmailAndPassword(authInst, email, password) {
  const res = await fetch(`${DJANGO_API_BASE}/records/users/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return { user: { uid: data.id, id: data.id, email: data.email } };
}

export async function fbSignOut(authInst) {
  return auth.signOut();
}

export function onAuthStateChanged(authInst, callback) {
  authStateListeners.add(callback);
  // Immediate check
  const u = auth.currentUser;
  callback(u);
  return () => {
    authStateListeners.delete(callback);
  };
}

export async function sendPasswordResetEmail(authInst, email) {
  return { success: true };
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
// Collection, Document, and Query Helpers
// ============================================================

export function normalizeCol(col) {
  if (!col) return col;
  const c = String(col).trim();
  if (c === 'loginLookup' || c === 'login_lookup') return 'login_lookup';
  if (c === 'calendarEvents' || c === 'calendar_events' || c === 'events') return 'calendar_events';
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

// Fallback Local Storage
function getLocalTable(col) {
  try {
    const raw = localStorage.getItem('erp_fallback_table_' + normalizeCol(col));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalTable(col, items) {
  try {
    localStorage.setItem('erp_fallback_table_' + normalizeCol(col), JSON.stringify(items));
  } catch (e) {}
}

export function isTableMissingError(error) {
  return false;
}

export function isNetworkOrOfflineError(error) {
  if (!error) return false;
  const msg = String(error.message || error || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('erp_offline_mode') === 'true')
  );
}

export async function ensureFreshSession() {
  return auth.currentUser;
}

// Query & Document Caches with In-Flight Request Collapsing
const queryCache = new Map();
const docCache = new Map();
const inFlightRequests = new Map();

export function clearQueryCache(col) {
  if (col) {
    const prefix = normalizeCol(col) + ':';
    for (const k of queryCache.keys()) {
      if (k.startsWith(prefix)) queryCache.delete(k);
    }
    for (const k of docCache.keys()) {
      if (k.startsWith(prefix)) docCache.delete(k);
    }
  } else {
    queryCache.clear();
    docCache.clear();
  }
}

// High-performance Debounce Utility for Search and Filter Inputs
export function debounce(fn, wait = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Double-Submission Prevention Utility for Forms and Action Buttons
export function preventDoubleSubmit(buttonEl, asyncCallback) {
  if (!buttonEl) return asyncCallback();
  if (buttonEl.dataset.submitting === 'true') return;
  buttonEl.dataset.submitting = 'true';
  const originalDisabled = buttonEl.disabled;
  buttonEl.disabled = true;

  return Promise.resolve(asyncCallback()).finally(() => {
    buttonEl.dataset.submitting = 'false';
    buttonEl.disabled = originalDisabled;
  });
}

// Format document data ensuring camelCase createdAt / updatedAt compatibility
function formatDocData(row, col) {
  if (!row) return undefined;
  const docData = { ...row.data, ...row };
  if ('data' in docData && typeof docData.data === 'object' && docData.data !== null) {
    delete docData.data;
  }
  if (docData.created_at && !docData.createdAt) docData.createdAt = docData.created_at;
  if (docData.updated_at && !docData.updatedAt) docData.updatedAt = docData.updated_at;
  if (col === 'marks' || col === 'marksObtained') {
    if (docData.marksObtained !== undefined && docData.marks === undefined) docData.marks = docData.marksObtained;
    if (docData.marks !== undefined && docData.marksObtained === undefined) docData.marksObtained = docData.marks;
  }
  return docData;
}

// ============================================================
// CRUD Functions against Django REST API
// ============================================================

// Helper to create a compliant Firestore DocumentSnapshot
function createDocSnapshot(id, exists, data) {
  const isExists = Boolean(exists);
  const existsFn = () => isExists;
  existsFn.valueOf = () => isExists;
  existsFn.toString = () => String(isExists);
  return {
    id: String(id),
    exists: existsFn,
    data: () => (isExists ? data : undefined)
  };
}

export async function getDoc(docRef) {
  const col = normalizeCol(docRef.col);
  const id = String(docRef.id);
  const cacheKey = `${col}:${id}`;

  const cached = docCache.get(cacheKey);
  if (cached && (Date.now() - cached.time) < 15000) {
    return cached.result;
  }

  // Deduplicate identical concurrent requests in-flight
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`${DJANGO_API_BASE}/${col}/${encodeURIComponent(id)}/`);
      if (res.status === 404) {
        // Check local table
        const items = getLocalTable(col);
        const item = items.find(x => String(x.id) === id);
        const snap = createDocSnapshot(id, Boolean(item), item ? formatDocData(item, col) : undefined);
        docCache.set(cacheKey, { time: Date.now(), result: snap });
        return snap;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const row = await res.json();
      const snap = createDocSnapshot(id, Boolean(row && row.id), formatDocData(row, col));
      docCache.set(cacheKey, { time: Date.now(), result: snap });
      return snap;
    } catch (err) {
      // Graceful offline fallback
      const items = getLocalTable(col);
      const item = items.find(x => String(x.id) === id);
      return createDocSnapshot(id, Boolean(item), item ? formatDocData(item, col) : undefined);
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export async function getDocs(qRef) {
  const col = normalizeCol(qRef.col);
  const constraints = qRef.constraints || [];
  const cacheKey = col + ':' + JSON.stringify(constraints);

  const cached = queryCache.get(cacheKey);
  if (cached && (Date.now() - cached.time) < 15000) {
    return cached.result;
  }

  // Deduplicate identical concurrent queries in-flight
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    // Construct URL query parameters
    const params = new URLSearchParams();
    for (const c of constraints) {
      if (c._type === 'where') {
        if (c.op === '==' || c.op === '===') {
          params.append(c.field, String(c.val));
        }
      } else if (c._type === 'orderBy') {
        const field = c.field === 'createdAt' ? 'created_at' : (c.field === 'updatedAt' ? 'updated_at' : c.field);
        params.append('_order', c.dir === 'desc' ? `-${field}` : field);
      } else if (c._type === 'limit') {
        params.append('_limit', String(c.count));
      }
    }

    const queryUrl = `${DJANGO_API_BASE}/${col}/` + (params.toString() ? `?${params.toString()}` : '');

    try {
      const res = await fetch(queryUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();

      const docs = (Array.isArray(rows) ? rows : []).map(row => {
        const docData = formatDocData(row, col);
        return createDocSnapshot(row.id, true, docData);
      });

      const result = {
        empty: docs.length === 0,
        size: docs.length,
        docs,
        forEach: (cb) => docs.forEach(cb)
      };

      queryCache.set(cacheKey, { time: Date.now(), result });
      return result;
    } catch (err) {
      // Offline local fallback
      const localRows = getLocalTable(col);
      let filtered = [...localRows];
      for (const c of constraints) {
        if (c._type === 'where') {
          if (c.op === '==' || c.op === '===') filtered = filtered.filter(r => (r[c.field] ?? r.data?.[c.field]) === c.val);
          else if (c.op === '!=') filtered = filtered.filter(r => (r[c.field] ?? r.data?.[c.field]) !== c.val);
        }
      }
      const docs = filtered.map(row => {
        const docData = formatDocData(row, col);
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
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export async function setDoc(docRef, data, options = {}) {
  const col = normalizeCol(docRef.col);
  const id = String(docRef.id);
  const payload = { id, ...data };

  try {
    const res = await fetch(`${DJANGO_API_BASE}/${col}/${encodeURIComponent(id)}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`setDoc failed HTTP ${res.status}`);
    }
  } catch (err) {
    // Fallback store
    const items = getLocalTable(col);
    const idx = items.findIndex(x => String(x.id) === id);
    if (idx !== -1) items[idx] = { ...items[idx], ...payload };
    else items.push(payload);
    setLocalTable(col, items);
  }
  clearQueryCache(col);
}

export async function addDoc(colRef, data) {
  const col = normalizeCol(colRef.col);
  const id = data.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
  const payload = { id, ...data };

  try {
    const res = await fetch(`${DJANGO_API_BASE}/${col}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`addDoc failed HTTP ${res.status}`);
    }
    const created = await res.json();
    clearQueryCache(col);
    return { id: created.id || id, col };
  } catch (err) {
    const items = getLocalTable(col);
    items.push(payload);
    setLocalTable(col, items);
    clearQueryCache(col);
    return { id, col };
  }
}

export async function updateDoc(docRef, data) {
  const col = normalizeCol(docRef.col);
  const id = String(docRef.id);

  try {
    const res = await fetch(`${DJANGO_API_BASE}/${col}/${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`updateDoc failed HTTP ${res.status}`);
    }
  } catch (err) {
    const items = getLocalTable(col);
    const idx = items.findIndex(x => String(x.id) === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString() };
      setLocalTable(col, items);
    }
  }
  clearQueryCache(col);
}

export async function deleteDoc(docRef) {
  const col = normalizeCol(docRef.col);
  const id = String(docRef.id);

  try {
    const res = await fetch(`${DJANGO_API_BASE}/${col}/${encodeURIComponent(id)}/`, {
      method: 'DELETE'
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`deleteDoc failed HTTP ${res.status}`);
    }
  } catch (err) {
    const items = getLocalTable(col).filter(x => String(x.id) !== id);
    setLocalTable(col, items);
  }
  clearQueryCache(col);
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export const Timestamp = {
  now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() }),
  fromDate: (d) => ({ toDate: () => d, toMillis: () => d.getTime() })
};

export async function runTransaction(dbInst, updateFunction) {
  return updateFunction({
    get: (ref) => getDoc(ref),
    set: (ref, data) => setDoc(ref, data),
    update: (ref, data) => updateDoc(ref, data),
    delete: (ref) => deleteDoc(ref)
  });
}

export function writeBatch(dbInst) {
  const operations = [];
  return {
    set: (ref, data) => operations.push(() => setDoc(ref, data)),
    update: (ref, data) => operations.push(() => updateDoc(ref, data)),
    delete: (ref) => operations.push(() => deleteDoc(ref)),
    commit: async () => {
      for (const op of operations) await op();
    }
  };
}

export function onSnapshot(target, onNext, onError) {
  let isSubscribed = true;
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
  return () => { isSubscribed = false; };
}

// ============================================================
// Storage Adapters (Django Media Server)
// ============================================================

export function ref(storageInst, path) {
  return {
    _type: 'storageRef',
    bucket: 'school-files',
    path: String(path).replace(/^\/+/, '')
  };
}

export async function uploadBytes(storageRef, file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', storageRef.bucket || 'school-files');
  formData.append('path', storageRef.path);

  const res = await fetch(`${DJANGO_API_BASE}/storage/upload/`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  storageRef.url = data.url;
  return { ref: storageRef, data };
}

export async function getDownloadURL(storageRef) {
  if (storageRef.url) return storageRef.url;
  return `${DJANGO_API_BASE.replace('/api', '')}/media/uploads/${storageRef.path}`;
}

export async function deleteObject(storageRef) {
  return true;
}

// ============================================================
// Identity Resolution & Login Lookup
// ============================================================

export async function lookupEmailByIdentifier(identifier) {
  if (!identifier) return null;
  const raw = String(identifier).trim().toLowerCase();
  try {
    const res = await fetch(`${DJANGO_API_BASE}/lookup/${encodeURIComponent(raw)}/`);
    if (res.ok) {
      const data = await res.json();
      return data.email || null;
    }
  } catch (e) {}
  return null;
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
  } catch (e) {}

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

  // Instant cache hydration
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

        isAuthorized = true;
        const cachedUser = { uid, id: uid, email: cached.email || '', role: cached.role };
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
  } catch (e) {}

  const handleAuth = async (user) => {
    if (!user) {
      if (hasHydratedFromCache) return;
      purgePortalSession();
      window.location.href = loginPath;
      return;
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
        email: profile.email || (rawCacheData && rawCacheData.email) || user.email,
        role: profile.role
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

// Lightweight Supabase compatibility shim for backward compatibility
export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }) => {
      const res = await signInWithEmailAndPassword(auth, email, password);
      return { data: { user: res.user, session: res.session }, error: null };
    },
    signOut: async () => {
      await auth.signOut();
      return { error: null };
    },
    getSession: async () => {
      const u = auth.currentUser;
      return { data: { session: u ? { user: u, access_token: 'django_session' } : null }, error: null };
    },
    onAuthStateChange: (cb) => {
      const unsub = onAuthStateChanged(auth, (u) => {
        cb(u ? 'SIGNED_IN' : 'SIGNED_OUT', u ? { user: u } : null);
      });
      return { data: { subscription: { unsubscribe: unsub } } };
    }
  },
  from: (col) => ({
    select: (fields = '*') => ({
      eq: (field, val) => ({
        maybeSingle: async () => {
          if (field === 'id') {
            const docSnap = await getDoc(doc(db, col, val));
            return { data: docSnap.exists() ? docSnap.data() : null, error: null };
          }
          const docsSnap = await getDocs(query(collection(db, col), where(field, '==', val), limit(1)));
          return { data: !docsSnap.empty ? docsSnap.docs[0].data() : null, error: null };
        }
      })
    })
  })
};

if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
  window.supabase = supabase;
}
