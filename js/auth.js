// ============================================================
// Shared Firebase init + auth/role helpers
// Imported by every page as a module: <script type="module" src="/js/auth.js">
// ============================================================
import { firebaseConfig } from './firebase-config.js';
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut as fbSignOut, onAuthStateChanged, sendPasswordResetEmail,
  setPersistence, browserSessionPersistence, inMemoryPersistence
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs,
  addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

// Primary app — used for the normal signed-in session on every page.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enable tab-isolated session persistence so multiple roles / users can be open simultaneously in different tabs without conflict
setPersistence(auth, browserSessionPersistence).catch(() => {});

export const db = getFirestore(app);
export const storage = getStorage(app);

// A SECOND, isolated Firebase app instance with in-memory persistence.
// Runs purely in RAM so creating staff/student accounts never interferes with the active session or emits cross-tab events.
export function getSecondaryAuth() {
  const name = "secondary";
  const secondaryApp = getApps().find(a => a.name === name) || initializeApp(firebaseConfig, name);
  const secAuth = getAuth(secondaryApp);
  setPersistence(secAuth, inMemoryPersistence).catch(() => {});
  return secAuth;
}

export {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, fbSignOut,
  onAuthStateChanged, sendPasswordResetEmail,
  setPersistence, browserSessionPersistence, inMemoryPersistence,
  doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, updateDoc,
  deleteDoc, serverTimestamp, orderBy,
  ref, uploadBytes, getDownloadURL, deleteObject
};

// ---------- role/profile lookup ----------
// users/{uid} => { role: 'student'|'parent'|'staff'|'admin', name, email }
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

// Guard a portal page: waits for auth state, confirms role, redirects if not allowed.
// Returns { user, profile } on success (also calls onReady with it).
export function requirePortal(allowedRoles, onReady, loginPath = "../login.html") {
  onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = loginPath; return; }
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
    // DO NOT call fbSignOut(auth)! Calling fbSignOut would terminate sessions for other active tabs!
    // Instead, simply route to the correct portal for this account.
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

    onReady({ user, profile });
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
