// ==============================================================================
// Automated Test Suite: Class Incharge & Subject Teacher Management System
// Validates: Admin Assignments, Teacher Incharge Dashboard, Subject Teacher
// Permissions, Separation of Responsibilities, IDOR Defense, and Audit Logs.
// ==============================================================================

const API_BASE = 'http://localhost:8000/api';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName} ${details ? '- ' + details : ''}`);
  }
}

async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('   CLASS INCHARGE & SUBJECT TEACHER VERIFICATION TEST SUITE  ');
  console.log('=============================================================\n');

  try {
    // -------------------------------------------------------------
    // SECTION 1: ADMIN - CLASS INCHARGE MANAGEMENT
    // -------------------------------------------------------------
    console.log('--- 1. Admin: Class Incharge Management ---');

    // 1.1 List classes with incharge status
    const listRes = await request('/assignments/incharge/');
    assert(listRes.status === 200 && Array.isArray(listRes.data), '1.1 Admin lists all classes with incharge status');

    // 1.2 Assign stf_5 to cls_6a as Class Incharge
    const assignRes = await request('/assignments/incharge/', {
      method: 'POST',
      body: JSON.stringify({
        classId: 'cls_6a',
        teacherUid: 'stf_5',
        actorRole: 'admin',
        actorName: 'Admin Principal'
      })
    });
    assert(assignRes.status === 200 && assignRes.data.success, '1.2 Admin assigns Class Incharge (stf_5 -> cls_6a)');

    // 1.3 Change Class Incharge atomically to stf_6
    const changeRes = await request('/assignments/incharge/', {
      method: 'POST',
      body: JSON.stringify({
        classId: 'cls_6a',
        teacherUid: 'stf_6',
        actorRole: 'admin',
        actorName: 'Admin Principal'
      })
    });
    assert(changeRes.status === 200 && changeRes.data.teacherUid === 'stf_6', '1.3 Admin changes Class Incharge to another teacher (stf_6 -> cls_6a)');

    // 1.4 Remove Class Incharge
    const removeRes = await request('/assignments/incharge/', {
      method: 'DELETE',
      body: JSON.stringify({
        classId: 'cls_6a',
        actorRole: 'admin',
        actorName: 'Admin Principal'
      })
    });
    assert(removeRes.status === 200 && removeRes.data.success, '1.4 Admin removes Class Incharge from cls_6a');

    // -------------------------------------------------------------
    // SECTION 2: ADMIN - SUBJECT TEACHER ALLOCATIONS
    // -------------------------------------------------------------
    console.log('\n--- 2. Admin: Subject Teacher Management ---');

    // Clean up any existing assignment to guarantee fresh assign test
    await request('/assignments/subjects/', {
      method: 'DELETE',
      body: JSON.stringify({
        classId: 'cls_10a',
        subject: 'Science',
        teacherUid: 'stf_3',
        actorRole: 'admin',
        actorName: 'Admin Principal'
      })
    });

    // 2.1 Assign stf_3 to Science in cls_10a
    const subAssignRes = await request('/assignments/subjects/', {
      method: 'POST',
      body: JSON.stringify({
        classId: 'cls_10a',
        subject: 'Science',
        teacherUid: 'stf_3',
        actorRole: 'admin',
        actorName: 'Admin Principal'
      })
    });
    assert(subAssignRes.status === 201 || (subAssignRes.status === 200 && subAssignRes.data.assignment), '2.1 Admin assigns Subject Teacher (stf_3 -> Science in cls_10a)');

    // 2.2 Reject duplicate subject teacher assignment
    const dupRes = await request('/assignments/subjects/', {
      method: 'POST',
      body: JSON.stringify({
        classId: 'cls_10a',
        subject: 'Science',
        teacherUid: 'stf_3',
        actorRole: 'admin',
        actorName: 'Admin Principal'
      })
    });
    assert(dupRes.status === 400 && dupRes.data.error.includes('already assigned'), '2.2 Duplicate Subject Teacher assignment rejected with HTTP 400', dupRes.data?.error);

    // 2.3 List subject assignments for class
    const subListRes = await request('/assignments/subjects/?classId=cls_10a');
    assert(subListRes.status === 200 && Array.isArray(subListRes.data) && subListRes.data.some(a => a.subject === 'Science'), '2.3 Subject assignments list includes allocated teacher');

    // 2.4 Clean up / Remove subject teacher assignment
    const subDelRes = await request('/assignments/subjects/', {
      method: 'DELETE',
      body: JSON.stringify({
        classId: 'cls_10a',
        subject: 'Science',
        teacherUid: 'stf_3',
        actorRole: 'admin',
        actorName: 'Admin Principal'
      })
    });
    assert(subDelRes.status === 200 && subDelRes.data.success, '2.4 Admin removes Subject Teacher assignment');

    // -------------------------------------------------------------
    // SECTION 3: TEACHER - CLASS INCHARGE DASHBOARD & ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- 3. Teacher: Class Incharge Dashboard & Isolation ---');

    // Ensure stf_10 is incharge of cls_10a
    await request('/assignments/incharge/', {
      method: 'POST',
      body: JSON.stringify({ classId: 'cls_10a', teacherUid: 'stf_10', actorRole: 'admin' })
    });

    // 3.1 Authorized incharge dashboard access
    const incDashRes = await request('/teacher/incharge-dashboard/?teacherUid=stf_10');
    assert(
      incDashRes.status === 200 &&
      incDashRes.data.isClassIncharge === true &&
      incDashRes.data.class.id === 'cls_10a' &&
      Array.isArray(incDashRes.data.students) &&
      incDashRes.data.students.length > 0,
      '3.1 Class Incharge (stf_10) receives isolated dashboard for assigned class (cls_10a)'
    );

    // 3.2 Non-incharge teacher access
    const nonIncRes = await request('/teacher/incharge-dashboard/?teacherUid=stf_99');
    assert(
      nonIncRes.status === 200 && nonIncRes.data.isClassIncharge === false,
      '3.2 Non-incharge teacher is blocked from Class Incharge dashboard (isClassIncharge: false)'
    );

    // -------------------------------------------------------------
    // SECTION 4: MARKS AUTHORIZATION & SEPARATION OF RESPONSIBILITIES
    // -------------------------------------------------------------
    console.log('\n--- 4. Marks Authorization & Separation of Duties ---');

    // Setup: Assign stf_1 to Mathematics in cls_10a
    await request('/assignments/subjects/', {
      method: 'POST',
      body: JSON.stringify({ classId: 'cls_10a', subject: 'Mathematics', teacherUid: 'stf_1', actorRole: 'admin' })
    });

    // 4.1 Allow marks entry by authorized subject teacher (stf_1) for enrolled student stu_146
    const validMarksRes = await request('/teacher/marks/', {
      method: 'POST',
      headers: {
        'X-Teacher-Uid': 'stf_1',
        'X-Teacher-Name': 'T. Senthil Kumar'
      },
      body: JSON.stringify({
        teacherUid: 'stf_1',
        classId: 'cls_10a',
        subject: 'Mathematics',
        examName: 'Midterm Test',
        maxMarks: 100,
        records: [{ studentUid: 'stu_146', marksObtained: 95 }]
      })
    });
    assert(validMarksRes.status === 200 && validMarksRes.data.success === true && validMarksRes.data.savedCount === 1, '4.1 Assigned Subject Teacher (stf_1) successfully submits marks');

    // 4.2 CLASS INCHARGE FULL PERMISSION:
    // stf_10 is Class Incharge of cls_10a.
    // Has full authority to enter/edit marks for any subject in their class section.
    const inchargeMarksRes = await request('/teacher/marks/', {
      method: 'POST',
      headers: {
        'X-Teacher-Uid': 'stf_10',
        'X-Teacher-Name': 'K. Meenakshi Sundaram'
      },
      body: JSON.stringify({
        teacherUid: 'stf_10',
        classId: 'cls_10a',
        subject: 'Social Science',
        examName: 'Midterm Test',
        maxMarks: 100,
        records: [{ studentUid: 'stu_146', marksObtained: 99 }]
      })
    });
    assert(
      inchargeMarksRes.status === 200 && inchargeMarksRes.data.success === true,
      '4.2 Class Incharge Full Authority: Class Incharge (stf_10) successfully submits marks for any subject in their class (cls_10a)'
    );

    // 4.2b CLASS INCHARGE PERMISSION DELEGATION:
    // stf_10 (Class Incharge of cls_10a) grants subject teacher permission to stf_3 for Science in cls_10a.
    const grantPermRes = await request('/assignments/subjects/', {
      method: 'POST',
      headers: {
        'X-Teacher-Uid': 'stf_10',
        'X-Teacher-Name': 'K. Meenakshi Sundaram'
      },
      body: JSON.stringify({
        classId: 'cls_10a',
        subject: 'Science',
        teacherUid: 'stf_3',
        academicYear: '2025-2026'
      })
    });
    assert(
      grantPermRes.status === 201 && grantPermRes.data.teacherUid === 'stf_3',
      '4.2b Class Incharge Permission Delegation: Class Incharge (stf_10) grants subject permission to stf_3 for Science in cls_10a'
    );

    // 4.2c NON-INCHARGE TEACHER IS BLOCKED FROM GRANTING PERMISSIONS:
    // stf_7 is not the incharge of cls_10a and cannot grant subject permissions in cls_10a.
    const nonIncGrantRes = await request('/assignments/subjects/', {
      method: 'POST',
      headers: {
        'X-Teacher-Uid': 'stf_7',
        'X-Teacher-Name': 'Other Teacher'
      },
      body: JSON.stringify({
        classId: 'cls_10a',
        subject: 'English',
        teacherUid: 'stf_4',
        academicYear: '2025-2026'
      })
    });
    assert(
      nonIncGrantRes.status === 403,
      '4.2c Non-incharge teacher is BLOCKED (HTTP 403) from granting subject permissions for another class'
    );

    // 4.2d CLASS INCHARGE REVOKES PERMISSION:
    const revokePermRes = await request('/assignments/subjects/', {
      method: 'DELETE',
      headers: {
        'X-Teacher-Uid': 'stf_10',
        'X-Teacher-Name': 'K. Meenakshi Sundaram'
      },
      body: JSON.stringify({
        classId: 'cls_10a',
        subject: 'Science',
        teacherUid: 'stf_3'
      })
    });
    assert(
      revokePermRes.status === 200 && revokePermRes.data.success,
      '4.2d Class Incharge Revocation: Class Incharge (stf_10) successfully revokes subject permission from stf_3'
    );

    // 4.3 Unassigned regular faculty (neither subject teacher nor class incharge) is BLOCKED
    const unassignedMarksRes = await request('/teacher/marks/', {
      method: 'POST',
      headers: { 'X-Teacher-Uid': 'stf_7' },
      body: JSON.stringify({
        teacherUid: 'stf_7',
        classId: 'cls_10a',
        subject: 'Mathematics',
        examName: 'Midterm Test',
        maxMarks: 100,
        records: [{ studentUid: 'stu_146', marksObtained: 70 }]
      })
    });
    assert(unassignedMarksRes.status === 403, '4.3 Unassigned teacher (neither Incharge nor Subject Teacher) blocked with HTTP 403');

    // 4.4 Boundary validation: marks > maxMarks (120/100)
    const invalidBoundMarksRes = await request('/teacher/marks/', {
      method: 'POST',
      headers: { 'X-Teacher-Uid': 'stf_1' },
      body: JSON.stringify({
        teacherUid: 'stf_1',
        classId: 'cls_10a',
        subject: 'Mathematics',
        examName: 'Midterm Test',
        maxMarks: 100,
        records: [{ studentUid: 'stu_146', marksObtained: 120 }]
      })
    });
    assert(invalidBoundMarksRes.status === 400 && invalidBoundMarksRes.data.error.includes('between 0 and 100'), '4.4 Out-of-bounds marks (120/100) rejected with HTTP 400', invalidBoundMarksRes.data?.error);

    // -------------------------------------------------------------
    // SECTION 5: STUDENT PORTAL - SECURE READ-ONLY MARKS
    // -------------------------------------------------------------
    console.log('\n--- 5. Student Portal: Secure Read-Only Access ---');

    const stuMarksRes = await request('/student/my-marks/?studentUid=stu_146');
    assert(
      stuMarksRes.status === 200 &&
      stuMarksRes.data.student &&
      stuMarksRes.data.student.id === 'stu_146' &&
      Array.isArray(stuMarksRes.data.marks),
      '5.1 Student views own academic marks records'
    );

    const stuMissingRes = await request('/student/my-marks/');
    assert(stuMissingRes.status === 400, '5.2 Query without student UID rejected with HTTP 400');

    // -------------------------------------------------------------
    // SECTION 6: PARENT PORTAL - IDOR DEFENSE & AUTHORIZATION
    // -------------------------------------------------------------
    console.log('\n--- 6. Parent Portal: Verified Link & IDOR Defense ---');

    // 6.1 Authorized parent accessing linked child (par_114 -> stu_114)
    const parentAuthRes = await request('/parent/child-academics/?parentUid=par_114&childUid=stu_114');
    assert(
      parentAuthRes.status === 200 &&
      parentAuthRes.data.child &&
      parentAuthRes.data.child.id === 'stu_114' &&
      Array.isArray(parentAuthRes.data.marks) &&
      Array.isArray(parentAuthRes.data.attendance),
      '6.1 Authorized parent views linked child marks & attendance'
    );

    // 6.2 IDOR ATTACK DEFENSE: Parent par_114 attempts to query unrelated student stu_146
    const parentIdorRes = await request('/parent/child-academics/?parentUid=par_114&childUid=stu_146');
    assert(
      parentIdorRes.status === 403 &&
      parentIdorRes.data.error.includes('Forbidden'),
      '6.2 IDOR Defense: Parent query for unlinked child is BLOCKED with HTTP 403 Forbidden',
      parentIdorRes.data?.error
    );

    // -------------------------------------------------------------
    // SECTION 7: AUDIT LOGGING VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 7. Audit Logging Verification ---');

    const auditRes = await request('/audit-logs/?_limit=50');
    assert(auditRes.status === 200 && Array.isArray(auditRes.data), '7.1 Retrieve audit logs');

    const actions = new Set((auditRes.data || []).map(a => a.action));
    console.log('    Recorded Audit Actions:', Array.from(actions).join(', '));

    assert(actions.has('ASSIGN_CLASS_INCHARGE'), '7.2 ASSIGN_CLASS_INCHARGE action logged');
    assert(actions.has('REMOVE_CLASS_INCHARGE'), '7.3 REMOVE_CLASS_INCHARGE action logged');
    assert(actions.has('ASSIGN_SUBJECT_TEACHER'), '7.4 ASSIGN_SUBJECT_TEACHER action logged');
    assert(actions.has('REMOVE_SUBJECT_TEACHER'), '7.5 REMOVE_SUBJECT_TEACHER action logged');
    assert(actions.has('MARKS_ENTRY'), '7.6 MARKS_ENTRY action logged');
    assert(actions.has('UNAUTHORIZED_MARKS_ENTRY_ATTEMPT'), '7.7 UNAUTHORIZED_MARKS_ENTRY_ATTEMPT security alert logged');
    assert(actions.has('UNAUTHORIZED_PARENT_ACCESS_ATTEMPT'), '7.8 UNAUTHORIZED_PARENT_ACCESS_ATTEMPT security alert logged');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n=============================================================');
    console.log(`TEST SUITE RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log('=============================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal Test Execution Error:', error);
    process.exit(1);
  }
}

runTestSuite();
