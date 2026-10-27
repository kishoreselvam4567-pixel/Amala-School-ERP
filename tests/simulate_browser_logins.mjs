// tests/simulate_browser_logins.mjs
// Simulates the exact client login and dashboard hydration workflow for all 4 roles

const SUPABASE_URL = "https://jfmawxozfgnmddblpqow.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbWF3eG96ZmdubWRkYmxwcW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTg3NjUsImV4cCI6MjEwNjA5NDc2NX0.E2f6Wy1ZShm58MIZwu8v1Pq7NdRobbCzLk7D2EwJLjk";

const restUrl = `${SUPABASE_URL}/rest/v1`;
const anonHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

const ROLE_ROUTES = {
  student: 'student/dashboard.html',
  parent: 'parent/dashboard.html',
  staff: 'internal/staff/dashboard.html',
  admin: 'internal/admin/dashboard.html'
};


async function simulateLogin(rawUser, pass) {
  console.log(`\n--------------------------------------------------`);
  console.log(`Attempting login for: User="${rawUser}", Pass="${pass}"`);

  // 1. Resolve authEmail
  let authEmail = rawUser;
  const normUser = rawUser.toLowerCase().trim();
  const isFullEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawUser);

  if (!isFullEmail) {
    const digitsOnly = rawUser.replace(/\D/g, '');
      const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
      const lookupKeys = [...new Set([normUser, digitsOnly.length >= 7 ? last10 : null].filter(Boolean))];

      let resolved = false;
      for (const key of lookupKeys) {
        const res = await fetch(`${restUrl}/login_lookup?id=eq.${encodeURIComponent(key)}&select=email`, { headers: anonHeaders });
        const rows = await res.json();
        if (res.ok && rows.length > 0 && rows[0].email) {
          authEmail = rows[0].email;
          resolved = true;
          break;
        }
      }
      if (!resolved) {
        throw new Error(`Login lookup failed for '${rawUser}'`);
      }
    }
  console.log(`Resolved Email: ${authEmail}`);

  // 2. Candidate passwords
  const candidatePasswords = [pass];
  const cleanDigits = pass.replace(/\D/g, '');
  if (cleanDigits.length === 8) {
    const dd = cleanDigits.slice(0, 2), mm = cleanDigits.slice(2, 4), yyyy = cleanDigits.slice(4, 8);
    candidatePasswords.push(`${dd}-${mm}-${yyyy}`, `${yyyy}-${mm}-${dd}`, `${dd}/${mm}/${yyyy}`, cleanDigits);
  }
  const uniquePasswords = [...new Set(candidatePasswords)];

  // 3. Supabase Auth direct sign-in attempt
  let authUser = null;
  let authError = null;

  for (const tryPass of uniquePasswords) {
    const sRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: anonHeaders,
      body: JSON.stringify({ email: authEmail, password: tryPass })
    });
    const sData = await sRes.json();
    if (sRes.ok && sData.user) {
      authUser = sData.user;
      break;
    } else {
      authError = sData;
    }
  }

  let userData = null;

  // Offline verification fallback
  if (!authUser) {
    const { verifyOfflineCredentials } = await import('../js/school-offline-data.js');
    const off = verifyOfflineCredentials(rawUser, pass);
    if (off) {
      authUser = off.user;
      userData = off.userData;
    }
  }

  if (!authUser) {
    throw new Error(`Authentication rejected: Invalid User ID or Password`);
  }

  const role = userData ? userData.role : 'admin';
  const dest = ROLE_ROUTES[role];
  console.log(`SUCCESS! Authenticated as: ${userData?.name || authUser.email} (Role: ${role})`);
  console.log(`Redirecting to: /${dest}`);

  return { authUser, userData, role, dest };
}

async function run() {
  console.log('Testing Realistic Login Journeys Across All Roles:');
  const testUsers = [
    { u: 'amala', p: 'amala@123', expectedRole: 'admin' },
    { u: 'teacher1', p: 'Teacher@123', expectedRole: 'staff' },
    { u: 'adm2026101', p: 'Student@123', expectedRole: 'student' },
    { u: '101', p: 'Student@123', expectedRole: 'student' },
    { u: 'parent101', p: 'Parent@123', expectedRole: 'parent' },
    { u: '9840100101', p: 'Parent@123', expectedRole: 'parent' }
  ];

  for (const t of testUsers) {
    try {
      const res = await simulateLogin(t.u, t.p);
      if (res.role === t.expectedRole) {
        console.log(`>>> VERIFIED: Role '${res.role}' matches expected '${t.expectedRole}'`);
      } else {
        console.error(`>>> MISMATCH: Expected '${t.expectedRole}', got '${res.role}'`);
      }
    } catch (e) {
      console.error(`>>> FAILED: ${e.message}`);
    }
  }

  console.log('\nTesting Invalid Login Scenarios:');
  const invalidTests = [
    { u: 'adm2026101', p: 'WrongPass@999', desc: 'Valid user with wrong password' },
    { u: 'non_existent_student_99', p: 'Student@123', desc: 'Non-existent user ID' }
  ];

  for (const it of invalidTests) {
    try {
      await simulateLogin(it.u, it.p);
      console.error(`>>> SECURITY FAIL: Invalid login '${it.desc}' succeeded unexpectedly!`);
    } catch (e) {
      console.log(`>>> SECURITY PASS: '${it.desc}' correctly rejected: ${e.message}`);
    }
  }
}

run();
