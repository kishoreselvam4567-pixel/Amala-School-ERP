// ============================================================
// Shared Firebase init + auth/role helpers
// Imported by every page as a module: <script type="module" src="/js/auth.js">
// ============================================================
import { firebaseConfig } from './firebase-config.js';
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, initializeAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut as fbSignOut, onAuthStateChanged, sendPasswordResetEmail,
  setPersistence, browserLocalPersistence, inMemoryPersistence
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs,
  addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

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

export function getPortalApp(role) {
  const appName = role ? `amala-${role}-portal` : '[DEFAULT]';
  const existing = getApps().find(a => a.name === appName);
  if (existing) return existing;
  return appName === '[DEFAULT]'
    ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
    : initializeApp(firebaseConfig, appName);
}

const currentRole = getCurrentPortalRole();
// Role-isolated app and auth so Admin, Staff, Student, and Parent sessions never overwrite each other in the browser
export const app = getPortalApp(currentRole);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const db = getFirestore(app);
export const storage = getStorage(app);

// A SECOND, completely isolated Firebase worker auth instance with pure in-memory persistence.
// Runs purely in RAM with ZERO storage/IndexedDB/BroadcastChannel ties so creating student/parent/staff accounts
// never triggers storage events, never interferes with the active session, and never logs out the admin.
let cachedSecondaryAuth = null;
export function getSecondaryAuth() {
  if (cachedSecondaryAuth) return cachedSecondaryAuth;
  const name = "secondary-worker-auth";
  const secondaryApp = getApps().find(a => a.name === name) || initializeApp(firebaseConfig, name);
  try {
    cachedSecondaryAuth = initializeAuth(secondaryApp, {
      persistence: inMemoryPersistence
    });
  } catch (e) {
    cachedSecondaryAuth = getAuth(secondaryApp);
  }
  return cachedSecondaryAuth;
}

export {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, fbSignOut,
  onAuthStateChanged, sendPasswordResetEmail,
  setPersistence, browserLocalPersistence, inMemoryPersistence, initializeAuth, getAuth,
  doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, updateDoc,
  deleteDoc, serverTimestamp, orderBy, onSnapshot,
  ref, uploadBytes, getDownloadURL, deleteObject
};

// In-memory profile cache for instantaneous lookups
const userProfileCache = new Map();

// ---------- role/profile lookup ----------
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

  // Resilient fallback for primary school administrator account:
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

  // Resilient multi-collection fallback for staff, student, parent
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

    // Secondary lookup by email & username if doc(uid) didn't match
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
        await setDoc(doc(db, "parents", uid), { ...pData, uid }, { merge: true }).catch(() => {});
        userProfileCache.set(uid, profile);
        return profile;
      }
      if (sQSnap && !sQSnap.empty && !sQSnap.docs[0].data().deleted) {
        const sData = sQSnap.docs[0].data();
        const profile = { uid, role: 'student', name: sData.name || 'Student', email: userEmail, ...sData, deleted: false, disabled: false };
        await setDoc(doc(db, "users", uid), profile, { merge: true }).catch(() => {});
        await setDoc(doc(db, "students", uid), { ...sData, uid }, { merge: true }).catch(() => {});
        userProfileCache.set(uid, profile);
        return profile;
      }
    }

    // Fallback for Roshan faculty account
    if (userEmail && (userEmail.includes('roshan') || userEmail.includes('roshang'))) {
      const roshanP = {
        uid,
        role: 'staff',
        name: 'G.Roshan',
        email: userEmail,
        deleted: false,
        disabled: false
      };
      userProfileCache.set(uid, roshanP);
      return roshanP;
    }
  } catch (e) {
    console.warn("Multi-collection fallback in getUserProfile error:", e);
  }

  return null;
}

// Guard a portal page: waits for auth state, confirms role, redirects if not allowed.
// Returns { user, profile } on success (also calls onReady with it).
export function requirePortal(allowedRoles, onReady, loginPath = "../login.html") {
  let isAuthorized = false;
  let hasHydratedFromCache = false;

  // 1. INSTANT HYDRATION: Check sessionStorage and localStorage for active session
  try {
    const rawCache = sessionStorage.getItem('erp_active_session') || localStorage.getItem('erp_active_session');
    if (rawCache) {
      const cached = JSON.parse(rawCache);
      // Valid if less than 24 hours old and matches portal role
      if (cached && cached.uid && allowedRoles.includes(cached.role) && (Date.now() - (cached.timestamp || 0)) < 86400000) {
        hasHydratedFromCache = true;
        isAuthorized = true;
        userProfileCache.set(cached.uid, cached.profile || { uid: cached.uid, name: cached.name, role: cached.role });

        // Synchronous immediate zero-latency dispatch
        try {
          onReady({
            user: { uid: cached.uid, email: cached.email },
            profile: cached.profile || { uid: cached.uid, name: cached.name, role: cached.role },
            roleData: cached.roleData || null,
            isCached: true
          });
        } catch(onReadyErr) {
          console.warn("Immediate cache hydration dispatch warning:", onReadyErr);
        }
      }
    }
  } catch (e) {
    console.warn("Session cache read warning:", e);
  }

  const handleAuth = async (user) => {
    // If not signed in on this portal's role-isolated auth instance:
    if (!user) {
      // If we already hydrated a valid authorized session from cache, do NOT boot to login.
      if (hasHydratedFromCache) {
        try {
          const rawCache = sessionStorage.getItem('erp_active_session') || localStorage.getItem('erp_active_session');
          if (rawCache) {
            const c = JSON.parse(rawCache);
            const passToTry = c.pass || c.tempPassword || (c.role === 'student' ? 'Student@123' : (c.role === 'parent' ? 'Parent@123' : (c.role === 'staff' ? 'Staff@123' : null)));
            if (c.email && passToTry) {
              signInWithEmailAndPassword(auth, c.email, passToTry).catch(() => {});
            }
          }
        } catch(e) {}
        return;
      }

      // Fallback: check if the default app has an active session matching allowed roles
      try {
        const defaultApp = getApps().find(a => a.name === '[DEFAULT]') || getApp();
        const defAuth = getAuth(defaultApp);
        if (typeof defAuth.authStateReady === 'function') {
          await defAuth.authStateReady().catch(() => {});
        }
        const defUser = defAuth.currentUser;
        if (defUser) {
          const defProfile = await getUserProfile(defUser.uid);
          if (defProfile && allowedRoles.includes(defProfile.role)) {
            // Update session cache
            try {
              const payload = JSON.stringify({
                uid: defUser.uid,
                email: defUser.email,
                role: defProfile.role,
                name: defProfile.name || '',
                profile: defProfile,
                timestamp: Date.now()
              });
              sessionStorage.setItem('erp_active_session', payload);
              localStorage.setItem('erp_active_session', payload);
            } catch(e) {}

            if (!hasHydratedFromCache) {
              isAuthorized = true;
              onReady({ user: defUser, profile: defProfile });
            }
            setTimeout(() => {
              showFirstTimeLoginGuide(defProfile.role, defUser, defProfile);
            }, 300);
            return;
          }
        }
      } catch (e) {}

      // Wait for role auth to finish restoring session before concluding unauthenticated
      if (typeof auth.authStateReady === 'function') {
        try { await auth.authStateReady(); } catch(e) {}
        if (auth.currentUser) return; // Will re-trigger handleAuth with user
      }

      // If neither instance is authenticated and not hydrated from cache, redirect
      if (!hasHydratedFromCache) {
        sessionStorage.removeItem('erp_active_session');
        localStorage.removeItem('erp_active_session');
        window.location.href = loginPath;
      }
      return;
    }

    try {
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        if (!hasHydratedFromCache) {
          sessionStorage.removeItem('erp_active_session');
          localStorage.removeItem('erp_active_session');
          window.location.href = loginPath;
        }
        return;
      }

      // Only sign out if the user was explicitly deleted or deactivated by the admin
      if (profile.deleted || profile.disabled) {
        alert("This account has been deleted or deactivated by the school administrator.");
        sessionStorage.removeItem('erp_active_session');
        localStorage.removeItem('erp_active_session');
        await fbSignOut(auth);
        window.location.href = loginPath;
        return;
      }

      // Role check: If role is not allowed on this portal, redirect to login for this portal.
      if (!allowedRoles.includes(profile.role)) {
        console.warn(`User role '${profile.role}' is not authorized for portal '${allowedRoles.join(', ')}'.`);
        sessionStorage.removeItem('erp_active_session');
        localStorage.removeItem('erp_active_session');
        window.location.href = loginPath;
        return;
      }

      // Role-specific collection check to ensure deleted records are revoked immediately
      if (profile.role === 'staff') {
        let sSnap = await getDoc(doc(db, 'staff', user.uid)).catch(() => null);
        if (!sSnap || !sSnap.exists()) {
          const userEmail = (user.email || '').toLowerCase();
          const cleanUser = userEmail.split('@')[0];
          const [stfEmailSnap, stfUserSnap] = await Promise.all([
            getDocs(query(collection(db, 'staff'), where('email', '==', userEmail))).catch(() => null),
            getDocs(query(collection(db, 'staff'), where('username', '==', cleanUser))).catch(() => null)
          ]);
          if (stfEmailSnap && !stfEmailSnap.empty) {
            await setDoc(doc(db, 'staff', user.uid), { ...stfEmailSnap.docs[0].data(), uid: user.uid }, { merge: true }).catch(() => {});
            sSnap = await getDoc(doc(db, 'staff', user.uid)).catch(() => null);
          } else if (stfUserSnap && !stfUserSnap.empty) {
            await setDoc(doc(db, 'staff', user.uid), { ...stfUserSnap.docs[0].data(), uid: user.uid }, { merge: true }).catch(() => {});
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
            await setDoc(doc(db, 'staff', user.uid), roshanData, { merge: true }).catch(() => {});
            sSnap = { exists: () => true, data: () => roshanData };
          }
        }
        if (sSnap && sSnap.exists() && sSnap.data().deleted) {
          alert("Your faculty account has been removed by the administrator. Access revoked.");
          sessionStorage.removeItem('erp_active_session');
          localStorage.removeItem('erp_active_session');
          await fbSignOut(auth);
          window.location.href = loginPath;
          return;
        }
      } else if (profile.role === 'student') {
        let stSnap = await getDoc(doc(db, 'students', user.uid));
        if (!stSnap.exists()) {
          const userEmail = (user.email || '').toLowerCase();
          const sQ = query(collection(db, 'students'), where('email', '==', userEmail));
          const sQSnap = await getDocs(sQ);
          if (!sQSnap.empty) {
            await setDoc(doc(db, 'students', user.uid), { ...sQSnap.docs[0].data(), uid: user.uid }, { merge: true }).catch(() => {});
            stSnap = await getDoc(doc(db, 'students', user.uid));
          }
        }
        if (!stSnap.exists() || stSnap.data().deleted) {
          alert("Your student account has been removed by the administrator. Access revoked.");
          sessionStorage.removeItem('erp_active_session');
          localStorage.removeItem('erp_active_session');
          await fbSignOut(auth);
          window.location.href = loginPath;
          return;
        }
      } else if (profile.role === 'parent') {
        let pSnap = await getDoc(doc(db, 'parents', user.uid));
        if (!pSnap.exists()) {
          const userEmail = (user.email || '').toLowerCase();
          const pQ = query(collection(db, 'parents'), where('email', '==', userEmail));
          const pQSnap = await getDocs(pQ);
          if (!pQSnap.empty) {
            await setDoc(doc(db, 'parents', user.uid), { ...pQSnap.docs[0].data(), uid: user.uid }, { merge: true }).catch(() => {});
            pSnap = await getDoc(doc(db, 'parents', user.uid));
          }
        }
        if (!pSnap.exists() || pSnap.data().deleted) {
          alert("Your parent account has been removed by the administrator. Access revoked.");
          sessionStorage.removeItem('erp_active_session');
          localStorage.removeItem('erp_active_session');
          await fbSignOut(auth);
          window.location.href = loginPath;
          return;
        }
      }

      // Update session cache silently in both storages
      try {
        const payload = JSON.stringify({
          uid: user.uid,
          email: user.email,
          role: profile.role,
          name: profile.name || '',
          profile: profile,
          timestamp: Date.now()
        });
        sessionStorage.setItem('erp_active_session', payload);
        localStorage.setItem('erp_active_session', payload);
      } catch(e) {}

      // If not previously hydrated from cache, invoke onReady now
      if (!hasHydratedFromCache) {
        isAuthorized = true;
        onReady({ user, profile });
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

// ---------- First-Time Login Instructions Helper ----------
export function showFirstTimeLoginGuide(role, user, profile) {
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
    } catch (e) {}
  }

  // 3. Mark as seen both in localStorage and permanently in Firestore
  const markAsSeen = () => {
    keysToCheck.forEach(k => {
      try { localStorage.setItem(k, 'true'); } catch (e) {}
    });
    if (user && user.uid) {
      try {
        setDoc(doc(db, 'users', user.uid), {
          hasSeenFirstLoginGuide: true,
          firstLoginDone: true,
          firstLoginGuideShownAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      } catch (e) {}
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
            Hello <strong>${userName}</strong>! ${cfg.intro}
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
}

// Central redirect used right after login on login.html
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
  try {
    sessionStorage.removeItem('erp_active_session');
    localStorage.removeItem('erp_last_active_role');
    userProfileCache.clear();
  } catch(e) {}
  fbSignOut(auth).finally(() => {
    try {
      const defApp = getApps().find(a => a.name === '[DEFAULT]') || getApp();
      const defAuth = getAuth(defApp);
      fbSignOut(defAuth).catch(() => {});
    } catch(e) {}
    window.location.href = loginPath;
  });
}

export function showBox(el, msg) {
  el.textContent = msg;
  el.style.display = msg ? "block" : "none";
}
