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

// Primary app — used for the normal signed-in session on every page.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use robust browser local persistence so sessions persist reliably across phone, tablet, laptop, PC, TV
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const db = getFirestore(app);
export const storage = getStorage(app);
export { ref, uploadBytes, getDownloadURL, deleteObject };

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
  setPersistence, browserLocalPersistence, inMemoryPersistence, initializeAuth,
  doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, updateDoc,
  deleteDoc, serverTimestamp, orderBy, onSnapshot,
  ref, uploadBytes, getDownloadURL, deleteObject
};

// ---------- role/profile lookup ----------
export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      return { uid, ...snap.data() };
    }
  } catch (err) {
    console.warn("getUserProfile read failed:", err);
  }

  // Resilient fallback for primary school administrator account:
  const curUser = auth.currentUser;
  const userEmail = (curUser && curUser.email) ? curUser.email.toLowerCase() : '';
  if (userEmail === 'amala@123.gmail.com' || userEmail === 'admin@kishore.gmail.com' || userEmail === 'amala123@gmail.com') {
    return {
      uid,
      role: 'admin',
      name: 'School Administrator',
      email: userEmail
    };
  }

  return null;
}

// Guard a portal page: waits for auth state, confirms role, redirects if not allowed.
// Returns { user, profile } on success (also calls onReady with it).
export function requirePortal(allowedRoles, onReady, loginPath = "../login.html") {
  let isAuthorized = false;

  onAuthStateChanged(auth, async (user) => {
    // If not signed in:
    if (!user) {
      if (!isAuthorized) {
        window.location.href = loginPath;
      }
      return;
    }

    // Once already authorized and portal is running, don't re-run or kick user out on background token refreshes
    if (isAuthorized) return;

    try {
      const profile = await getUserProfile(user.uid);
      if (!profile) {
        window.location.href = loginPath;
        return;
      }

      // Only sign out if the user was explicitly deleted or deactivated by the admin
      if (profile.deleted || profile.disabled) {
        alert("This account has been deleted or deactivated by the school administrator.");
        await fbSignOut(auth);
        window.location.href = loginPath;
        return;
      }

      // If role does not match this portal (e.g. another tab or role was active):
      // Simply route to the correct portal for this account without signing out.
      if (!allowedRoles.includes(profile.role)) {
        const correctPath = portalPathForRole(profile.role);
        window.location.href = correctPath;
        return;
      }

      // Role-specific collection check to ensure deleted records are revoked immediately
      if (profile.role === 'staff') {
        const sSnap = await getDoc(doc(db, 'staff', user.uid));
        if (!sSnap.exists() || sSnap.data().deleted) {
          alert("Your faculty account has been removed by the administrator. Access revoked.");
          await fbSignOut(auth);
          window.location.href = loginPath;
          return;
        }
      } else if (profile.role === 'student') {
        const stSnap = await getDoc(doc(db, 'students', user.uid));
        if (!stSnap.exists() || stSnap.data().deleted) {
          alert("Your student account has been removed by the administrator. Access revoked.");
          await fbSignOut(auth);
          window.location.href = loginPath;
          return;
        }
      } else if (profile.role === 'parent') {
        const pSnap = await getDoc(doc(db, 'parents', user.uid));
        if (!pSnap.exists() || pSnap.data().deleted) {
          alert("Your parent account has been removed by the administrator. Access revoked.");
          await fbSignOut(auth);
          window.location.href = loginPath;
          return;
        }
      }

      isAuthorized = true;
      onReady({ user, profile });
    } catch (err) {
      console.error("Portal authorization check error:", err);
    }
  });
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
  fbSignOut(auth).then(() => window.location.href = loginPath);
}

export function showBox(el, msg) {
  el.textContent = msg;
  el.style.display = msg ? "block" : "none";
}
