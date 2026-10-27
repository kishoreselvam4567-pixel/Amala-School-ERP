// tests/simulate_browser_logins.mjs
// Simulates browser client login and dashboard hydration workflow via Django REST backend

const API_BASE = 'http://localhost:8000/api';

const ROLE_ROUTES = {
  student: 'student/dashboard.html',
  parent: 'parent/dashboard.html',
  staff: 'internal/staff/dashboard.html',
  admin: 'internal/admin/dashboard.html'
};

async function simulateLogin(rawUser, pass) {
  console.log(`\n--------------------------------------------------`);
  console.log(`Simulating browser login for: User="${rawUser}", Pass="${pass}"`);

  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: rawUser, password: pass })
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  const role = data.role;
  const dest = ROLE_ROUTES[role];
  console.log(`[AUTH OK] Role: ${role}, Dest: ${dest}`);
  console.log(`[USER OK] Name: "${data.user.name}", Email: "${data.user.email}"`);

  if (role === 'parent' && data.studentProfile) {
    console.log(`[PARENT HYDRATION OK] Linked Student: ${data.studentProfile.name} (${data.studentProfile.className})`);
  }

  // Hydrate session storage payload
  const sessionPayload = {
    uid: data.user.id,
    id: data.user.id,
    email: data.user.email,
    role,
    name: data.user.name,
    profile: data.userData,
    roleData: data.roleDocData ? { ...data.roleDocData, studentProfile: data.studentProfile || null } : null,
    timestamp: Date.now()
  };

  console.log(`[SESSION PAYLOAD READY] Size: ${JSON.stringify(sessionPayload).length} bytes`);
  return { success: true, role, dest };
}

async function run() {
  console.log('STARTING DJANGO BROWSER LOGIN SIMULATION');
  const testCases = [
    { user: 'teacher1', pass: 'Teacher@123', expectedRole: 'staff' },
    { user: 'ADM2026101', pass: 'Student@123', expectedRole: 'student' },
    { user: '9840100101', pass: 'Parent@123', expectedRole: 'parent' },
    { user: 'admin', pass: 'amala@123', expectedRole: 'admin' },
  ];

  for (const tc of testCases) {
    const res = await simulateLogin(tc.user, tc.pass);
    if (res.role !== tc.expectedRole) {
      console.error(`Mismatch for ${tc.user}: expected ${tc.expectedRole}, got ${res.role}`);
      process.exit(1);
    }
  }

  console.log('\n==================================================');
  console.log('ALL BROWSER LOGIN SIMULATIONS PASSED VIA DJANGO REST!');
  console.log('==================================================');
}

run().catch(err => {
  console.error('Fatal simulation error:', err);
  process.exit(1);
});
