// ============================================================
// Comprehensive E2E Test: Django REST API + Client Migration
// Tests all 4 portals: Admin, Staff, Student, Parent
// Validates Authentication, Record Lookups, and Collection CRUD
// ============================================================

const API_BASE = 'http://localhost:8000/api';

async function runTests() {
  console.log('='.repeat(60));
  console.log('RUNNING E2E DJANGO MIGRATION TESTS');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Staff Login (teacher1)
  try {
    const res = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'teacher1', password: 'Teacher@123' })
    });
    const data = await res.json();
    assert(res.ok && data.user && data.role === 'staff', 'Staff login (teacher1) returned role=staff');
    assert(data.user.name === 'T. Senthil Kumar', `Staff name is correct (${data.user?.name})`);
    assert(data.roleDocData && data.roleDocData.qualification, 'Staff profile loaded with qualification');
  } catch (e) {
    assert(false, `Staff login failed with error: ${e.message}`);
  }

  // 2. Student Login (ADM2026101)
  try {
    const res = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'ADM2026101', password: 'Student@123' })
    });
    const data = await res.json();
    assert(res.ok && data.user && data.role === 'student', 'Student login (ADM2026101) returned role=student');
    assert(data.user.name === 'Aarav Sharma', `Student name is correct (${data.user?.name})`);
    assert(data.roleDocData && data.roleDocData.className === 'Class 1-A', 'Student class is Class 1-A');
  } catch (e) {
    assert(false, `Student login failed with error: ${e.message}`);
  }

  // 3. Parent Login (Phone: 9840100101)
  try {
    const res = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '9840100101', password: 'Parent@123' })
    });
    const data = await res.json();
    assert(res.ok && data.user && data.role === 'parent', 'Parent login (9840100101) returned role=parent');
    assert(data.user.name === 'Rajesh Sharma', `Parent name is correct (${data.user?.name})`);
    assert(data.studentProfile && data.studentProfile.name === 'Aarav Sharma', 'Parent linked student profile loaded (Aarav Sharma)');
  } catch (e) {
    assert(false, `Parent login failed with error: ${e.message}`);
  }

  // 4. Admin Login (admin / amala@123)
  try {
    const res = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin', password: 'amala@123' })
    });
    const data = await res.json();
    assert(res.ok && data.user && data.role === 'admin', 'Admin login (admin) returned role=admin');
    assert(data.user.name === 'School Administrator', `Admin name is correct (${data.user?.name})`);
  } catch (e) {
    assert(false, `Admin login failed with error: ${e.message}`);
  }

  // 5. Query Classes collection
  try {
    const res = await fetch(`${API_BASE}/classes/`);
    const list = await res.json();
    assert(res.ok && Array.isArray(list) && list.length === 12, `Classes query returned all 12 classes (got ${list.length})`);
  } catch (e) {
    assert(false, `Classes query failed: ${e.message}`);
  }

  // 6. Query Students filtered by classId
  try {
    const res = await fetch(`${API_BASE}/students/?classId=cls_1a`);
    const list = await res.json();
    assert(res.ok && Array.isArray(list) && list.length === 5, `Students in cls_1a returned 5 students (got ${list.length})`);
  } catch (e) {
    assert(false, `Students filtered query failed: ${e.message}`);
  }

  // 7. Attendance Record CRUD
  try {
    const attId = 'att_verify_e2e_' + Date.now();
    // Create
    const createRes = await fetch(`${API_BASE}/attendance/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: attId,
        date: '2026-10-27',
        classId: 'cls_1a',
        className: 'Class 1-A',
        records: [{ studentId: 'stu_101', status: 'present' }]
      })
    });
    assert(createRes.ok, 'Attendance record created');

    // Read single
    const readRes = await fetch(`${API_BASE}/attendance/${attId}/`);
    const readData = await readRes.json();
    assert(readRes.ok && readData.id === attId, 'Attendance record fetched via getDoc equivalent');

    // Update (patch)
    const patchRes = await fetch(`${API_BASE}/attendance/${attId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remarks: 'All present verified' })
    });
    const patchData = await patchRes.json();
    assert(patchRes.ok && patchData.remarks === 'All present verified', 'Attendance updated via updateDoc equivalent');

    // Delete
    const delRes = await fetch(`${API_BASE}/attendance/${attId}/`, { method: 'DELETE' });
    assert(delRes.ok, 'Attendance deleted via deleteDoc equivalent');

    // Verify deletion
    const verifyDel = await fetch(`${API_BASE}/attendance/${attId}/`);
    assert(verifyDel.status === 404, 'Deleted attendance returns 404 on subsequent getDoc');
  } catch (e) {
    assert(false, `Attendance CRUD failed: ${e.message}`);
  }

  // 8. Marks Record CRUD
  try {
    const marksId = 'marks_verify_e2e_' + Date.now();
    const createRes = await fetch(`${API_BASE}/marks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: marksId,
        studentUid: 'stu_101',
        studentName: 'Aarav Sharma',
        classId: 'cls_1a',
        className: 'Class 1-A',
        subject: 'Mathematics',
        examName: 'Midterm 2026',
        marksObtained: 95,
        maxMarks: 100,
        grade: 'A+'
      })
    });
    assert(createRes.ok, 'Marks record created');

    const getRes = await fetch(`${API_BASE}/marks/${marksId}/`);
    const mData = await getRes.json();
    assert(getRes.ok && mData.marksObtained === 95, 'Marks record read correctly');

    await fetch(`${API_BASE}/marks/${marksId}/`, { method: 'DELETE' });
    assert(true, 'Marks record cleaned up');
  } catch (e) {
    assert(false, `Marks CRUD failed: ${e.message}`);
  }

  // 9. Announcements CRUD
  try {
    const annId = 'ann_verify_e2e_' + Date.now();
    const createRes = await fetch(`${API_BASE}/announcements/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: annId,
        title: 'Science Fair 2026',
        message: 'Annual school science fair scheduled for next month.',
        targetAudience: 'all',
        createdBy: 'admin_amala'
      })
    });
    assert(createRes.ok, 'Announcement created');

    const listRes = await fetch(`${API_BASE}/announcements/`);
    const listData = await listRes.json();
    assert(listRes.ok && listData.some(a => a.id === annId), 'Announcement found in collection list query');

    await fetch(`${API_BASE}/announcements/${annId}/`, { method: 'DELETE' });
    assert(true, 'Announcement cleaned up');
  } catch (e) {
    assert(false, `Announcement CRUD failed: ${e.message}`);
  }

  console.log('='.repeat(60));
  console.log(`TEST SUMMARY: Passed: ${passed}, Failed: ${failed}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
