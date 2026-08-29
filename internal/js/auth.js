// ============================================================
// Shared Firebase init + auth/role helpers
// Imported by every page as a module: <script type="module" src="/js/auth.js">
// ============================================================
import { firebaseConfig } from './firebase-config.js';
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut as fbSignOut, onAuthStateChanged, sendPasswordResetEmail
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
export const db = getFirestore(app);
export const storage = getStorage(app);

// A SECOND, isolated Firebase app instance.
// Needed only when Admin/Class-Teacher creates a new login for someone else —
// createUserWithEmailAndPassword() auto-signs-in as the new user, which would
// otherwise kick the admin out of their own session. Using a second app avoids that.
export function getSecondaryAuth() {
  const name = "secondary";
  const secondaryApp = getApps().find(a => a.name === name) || initializeApp(firebaseConfig, name);
  return getAuth(secondaryApp);
}

export {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, fbSignOut,
  onAuthStateChanged, sendPasswordResetEmail,
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
    if (!profile || !allowedRoles.includes(profile.role)) {
      alert("You don't have access to this portal.");
      await fbSignOut(auth);
      window.location.href = loginPath;
      return;
    }
    onReady({ user, profile });
  });
}

// Central redirect used right after login on login.html
export function portalPathForRole(role) {
  switch (role) {
    case "student": return "student/dashboard.html";
    case "parent": return "parent/dashboard.html";
    case "staff": return "staff/dashboard.html";
    case "admin": return "admin/dashboard.html";
    default: return "login.html";
  }
}

export function logout(loginPath = "../login.html") {
  fbSignOut(auth).then(() => window.location.href = loginPath);
}

export function showBox(el, msg) {
  el.textContent = msg;
  el.style.display = msg ? "block" : "none";
}
