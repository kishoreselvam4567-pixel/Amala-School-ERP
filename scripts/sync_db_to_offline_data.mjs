import fs from 'fs';
import path from 'path';

const base = 'http://127.0.0.1:8000/api';

async function syncOfflineData() {
  const endpoints = [
    'classes',
    'staff',
    'students',
    'parents',
    'users',
    'login_lookup',
    'attendance',
    'marks',
    'assignments',
    'timetables',
    'announcements'
  ];

  const offlineData = {};

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${base}/${ep}/`);
      if (res.ok) {
        offlineData[ep] = await res.json();
        console.log(`Fetched ${ep}: ${offlineData[ep].length} items`);
      } else {
        console.warn(`Failed to fetch ${ep}: HTTP ${res.status}`);
        offlineData[ep] = [];
      }
    } catch (err) {
      console.warn(`Error fetching ${ep}:`, err.message);
      offlineData[ep] = [];
    }
  }

  const fileContent = `// Amala School ERP - Offline Fallback Data Engine (Auto-synced with Django Backend)
export const OFFLINE_DATA = ${JSON.stringify(offlineData, null, 2)};

export function seedOfflineStore(force = false) {
  for (const [key, val] of Object.entries(OFFLINE_DATA)) {
    const storeKey = 'erp_fallback_table_' + key;
    if (force || !localStorage.getItem(storeKey)) {
      try { localStorage.setItem(storeKey, JSON.stringify(val)); } catch (e) {}
    }
  }
}

export function verifyOfflineCredentials(rawUser, pass) {
  seedOfflineStore(false);
  const userTrim = String(rawUser || '').trim().toLowerCase();
  const passTrim = String(pass || '').trim();

  // 1. Resolve email
  let targetEmail = userTrim;
  const isEmail = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(userTrim);
  if (!isEmail) {
    const lkp = (OFFLINE_DATA.login_lookup || []).find(x => x.id && x.id.toLowerCase() === userTrim);
    if (lkp) targetEmail = lkp.email.toLowerCase();
  }

  // 2. Find user doc
  let user = (OFFLINE_DATA.users || []).find(u => 
    (u.email && u.email.toLowerCase() === targetEmail) || 
    (u.username && u.username.toLowerCase() === userTrim) || 
    (u.phone && u.phone === userTrim) ||
    (u.id && u.id.toLowerCase() === userTrim)
  );

  // 2b. Fallback: if user entered an email prefix like teacher1@gmail.com
  if (!user && userTrim.includes('@')) {
    const prefix = userTrim.split('@')[0].trim();
    const lkp = (OFFLINE_DATA.login_lookup || []).find(x => x.id && x.id.toLowerCase() === prefix);
    if (lkp) {
      targetEmail = lkp.email.toLowerCase();
      user = (OFFLINE_DATA.users || []).find(u => u.email && u.email.toLowerCase() === targetEmail);
    }
    if (!user) {
      user = (OFFLINE_DATA.users || []).find(u => 
        (u.username && u.username.toLowerCase() === prefix) ||
        (u.phone && u.phone === prefix) ||
        (u.id && u.id.toLowerCase() === prefix)
      );
    }
  }

  if (!user) return null;

  // 3. Verify password
  const storedPass = (user.data && user.data.password) || user.password;
  if (!storedPass) return null;

  const validPasswords = [storedPass];

  // DOB matching for students
  const digits = passTrim.replace(/\\D/g, '');
  if (digits.length === 8) {
    validPasswords.push(digits);
  }

  const isMatch = validPasswords.some(p => p.toLowerCase() === passTrim.toLowerCase());
  if (!isMatch) return null;

  // 4. Find role-specific document
  const role = user.role;
  let roleDocData = null;
  let studentProfile = null;
  if (role === 'staff') {
    roleDocData = (OFFLINE_DATA.staff || []).find(s => s.id === user.id || s.email.toLowerCase() === user.email.toLowerCase());
  } else if (role === 'student') {
    roleDocData = (OFFLINE_DATA.students || []).find(s => s.id === user.id || s.email.toLowerCase() === user.email.toLowerCase());
  } else if (role === 'parent') {
    roleDocData = (OFFLINE_DATA.parents || []).find(p => p.id === user.id || p.email.toLowerCase() === user.email.toLowerCase());
    if (roleDocData && roleDocData.childUid) {
      studentProfile = (OFFLINE_DATA.students || []).find(s => s.id === roleDocData.childUid);
    }
  }

  return {
    user: {
      id: user.id,
      uid: user.id,
      email: user.email
    },
    userData: user,
    role: user.role,
    roleDocData,
    studentProfile
  };
}

if (typeof window !== 'undefined') {
  window.OFFLINE_DATA = OFFLINE_DATA;
  window.seedOfflineStore = seedOfflineStore;
  window.verifyOfflineCredentials = verifyOfflineCredentials;
}
`;

  const targetFiles = [
    'js/school-offline-data.js',
    'internal/js/school-offline-data.js',
    'public/js/school-offline-data.js',
    'public/internal/js/school-offline-data.js'
  ];

  for (const rel of targetFiles) {
    const fullPath = path.resolve(rel);
    fs.writeFileSync(fullPath, fileContent, 'utf8');
    console.log(`Synced offline data to ${rel}`);
  }
}

syncOfflineData().catch(err => {
  console.error('Failed to sync offline data:', err);
  process.exit(1);
});

