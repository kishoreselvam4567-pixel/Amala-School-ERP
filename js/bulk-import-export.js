// ============================================================
// AMALA SCHOOL ERP - BULK IMPORT / EXPORT & DATA PURGE ENGINE
// Supports: Excel (.xlsx, .xls) via SheetJS + RFC 4180 CSV
// Modules: Students, Staff, Notes, Attendance, Marks, Classes, Parents
// ============================================================

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ERPBulk = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ADMIN_PROTECTED_EMAILS = [
    'amala@123.gmail.com',
    'admin@kishore.gmail.com',
    'amala123@gmail.com'
  ];

  // ---------------- CSV & UTF-8 UTILITIES ----------------
  function escapeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    const s = String(val);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return '"' + s + '"';
  }

  function downloadCsv(filename, csvContent) {
    // Prefix with UTF-8 BOM so Excel on Windows opens UTF-8 characters without garbling
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : filename + '.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function downloadExcel(filename, headers, rows) {
    const safeName = filename.endsWith('.xlsx') ? filename : filename + '.xlsx';
    if (typeof window !== 'undefined' && window.XLSX) {
      const aoa = [headers, ...rows];
      const ws = window.XLSX.utils.aoa_to_sheet(aoa);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      window.XLSX.writeFile(wb, safeName);
    } else {
      // Fallback to UTF-8 CSV if SheetJS isn't available
      const csvStr = headers.map(escapeCsvCell).join(',') + '\n' +
        rows.map(r => r.map(escapeCsvCell).join(',')).join('\n');
      downloadCsv(safeName.replace(/\.xlsx$/i, '.csv'), csvStr);
    }
  }

  // Robust RFC 4180 CSV Parser (Handles quotes, commas, multiline strings, CRLF)
  function parseCsvText(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    // Strip BOM
    const cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentCell += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          currentCell += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentCell.trim());
          currentCell = '';
        } else if (char === '\r') {
          if (nextChar === '\n') i++;
          currentRow.push(currentCell.trim());
          if (currentRow.some(c => c.length > 0)) rows.push(currentRow);
          currentRow = [];
          currentCell = '';
        } else if (char === '\n') {
          currentRow.push(currentCell.trim());
          if (currentRow.some(c => c.length > 0)) rows.push(currentRow);
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
    }
    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) rows.push(currentRow);
    }
    return rows;
  }

  // Parse Excel or CSV file into 2D array
  function parseFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file provided'));
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      const reader = new FileReader();

      if (isExcel && typeof window !== 'undefined' && window.XLSX) {
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = window.XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const aoa = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            if (!aoa.length) throw new Error('Selected Excel worksheet is completely empty.');
            const headers = (aoa[0] || []).map(h => String(h || '').trim());
            const rows = aoa.slice(1).filter(r => r.some(c => String(c || '').trim().length > 0));
            resolve({ headers, rows, rawName: file.name });
          } catch (err) {
            reject(new Error('Failed to parse Excel file: ' + err.message));
          }
        };
        reader.onerror = () => reject(new Error('File reading failed.'));
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = (e) => {
          try {
            const text = e.target.result;
            let aoa = [];
            if (isExcel && typeof window !== 'undefined' && window.XLSX) {
              const workbook = window.XLSX.read(text, { type: 'string' });
              const worksheet = workbook.Sheets[workbook.SheetNames[0]];
              aoa = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            } else {
              aoa = parseCsvText(text);
            }
            if (!aoa.length) throw new Error('File has no readable rows.');
            const headers = (aoa[0] || []).map(h => String(h || '').trim());
            const rows = aoa.slice(1).filter(r => r.some(c => String(c || '').trim().length > 0));
            resolve({ headers, rows, rawName: file.name });
          } catch (err) {
            reject(new Error('Failed to parse CSV file: ' + err.message));
          }
        };
        reader.onerror = () => reject(new Error('File reading failed.'));
        reader.readAsText(file);
      }
    });
  }

  // ---------------- TEMPLATES ----------------
  const TEMPLATES = {
    student: {
      headers: [
        'Full Name',
        'Admission No',
        'Roll No',
        'Class Section',
        'Gender',
        'Date of Birth (YYYY-MM-DD)',
        'Blood Group',
        'Aadhaar No',
        'Student Email',
        'Student Password',
        'Father Name',
        'Father Phone',
        'Mother Name',
        'Mother Phone',
        'Parent Email',
        'Parent Password',
        'Address',
        'City',
        'Pincode'
      ],
      samples: [
        [
          'Kishore S',
          'ADM-2026-001',
          '101',
          'Class 10 - Section A',
          'Male',
          '2009-05-15',
          'O+',
          '452189012345',
          'kishore.student@amalaschool.edu.in',
          'Student@123',
          'Selvam K',
          '9876543210',
          'Priya S',
          '9876543211',
          'selvam.parent@amalaschool.edu.in',
          'Parent@123',
          '12 Anna Nagar West',
          'Tiruchirappalli',
          '620001'
        ],
        [
          'Ananya Raman',
          'ADM-2026-002',
          '102',
          'Class 10 - Section A',
          'Female',
          '2009-08-22',
          'B+',
          '671234567890',
          'ananya.student@amalaschool.edu.in',
          'Student@123',
          'Ramanathan V',
          '9845012345',
          'Kavitha R',
          '9845012346',
          'raman.parent@amalaschool.edu.in',
          'Parent@123',
          '45 Gandhi Road',
          'Tiruchirappalli',
          '620002'
        ]
      ]
    },
    staff: {
      headers: [
        'Full Name',
        'Staff ID / Username',
        'Gender',
        'Contact Number',
        'Major Subject',
        'Login Email',
        'Temp Password',
        'Role'
      ],
      samples: [
        [
          'Dr. K. Ramesh',
          'ramesh_k',
          'Male',
          '9876501234',
          'Mathematics',
          'ramesh.maths@amalaschool.edu.in',
          'Faculty@123',
          'staff'
        ],
        [
          'Mrs. Deepa Sundaram',
          'deepa_s',
          'Female',
          '9876505678',
          'Physics',
          'deepa.physics@amalaschool.edu.in',
          'Faculty@123',
          'staff'
        ]
      ]
    },
    notes: {
      headers: [
        'Class Section',
        'Subject',
        'Title',
        'Description',
        'Document Link / PDF URL'
      ],
      samples: [
        [
          'Class 10 - Section A',
          'Mathematics',
          'Chapter 1 Real Numbers Master Study Notes',
          'Includes theorem explanations, Euclid lemma step-by-step proofs, and 15 solved practice questions.',
          'https://drive.google.com/sample-notes-maths-ch1.pdf'
        ],
        [
          'Class 10 - Section A',
          'Physics',
          'Chapter 2 Light Reflection & Refraction Quick Formula Sheet',
          'Mirror formula, lens maker formula, sign conventions, and ray diagram summaries.',
          'https://drive.google.com/sample-notes-physics-ch2.pdf'
        ]
      ]
    },
    attendance: {
      headers: [
        'Admission No',
        'Roll No',
        'Student Name',
        'Date (YYYY-MM-DD)',
        'Status (Present/Absent/Late)',
        'Remarks'
      ],
      samples: [
        ['ADM-2026-001', '101', 'Kishore S', '2026-10-03', 'Present', 'On time'],
        ['ADM-2026-002', '102', 'Ananya Raman', '2026-10-03', 'Present', 'On time']
      ]
    },
    marks: {
      headers: [
        'Admission No',
        'Roll No',
        'Student Name',
        'Class Section',
        'Exam Name',
        'Subject',
        'Marks Obtained',
        'Max Marks'
      ],
      samples: [
        ['ADM-2026-001', '101', 'Kishore S', 'Class 10 - Section A', 'Mid-Term Examination', 'Mathematics', '94', '100'],
        ['ADM-2026-001', '101', 'Kishore S', 'Class 10 - Section A', 'Mid-Term Examination', 'Physics', '88', '100'],
        ['ADM-2026-002', '102', 'Ananya Raman', 'Class 10 - Section A', 'Mid-Term Examination', 'Mathematics', '98', '100'],
        ['ADM-2026-002', '102', 'Ananya Raman', 'Class 10 - Section A', 'Mid-Term Examination', 'Physics', '95', '100']
      ]
    }
  };

  function downloadTemplate(moduleKey, format = 'csv') {
    const tpl = TEMPLATES[moduleKey];
    if (!tpl) throw new Error('Unknown template type: ' + moduleKey);
    const fname = `Amala_School_${moduleKey.toUpperCase()}_Template`;
    if (format === 'xlsx') {
      downloadExcel(fname, tpl.headers, tpl.samples);
    } else {
      const csv = tpl.headers.map(escapeCsvCell).join(',') + '\n' +
        tpl.samples.map(r => r.map(escapeCsvCell).join(',')).join('\n');
      downloadCsv(fname, csv);
    }
  }

  // ---------------- EXPORT FUNCTIONS ----------------
  function exportStudentsToCsv(studentsList, filename = 'Amala_Students_Directory') {
    const headers = [
      'Full Name', 'Admission No', 'Roll No', 'Class Section', 'Gender',
      'Date of Birth', 'Blood Group', 'Aadhaar No', 'Student Email',
      'Father Name', 'Father Phone', 'Mother Name', 'Mother Phone',
      'Parent Email', 'Address', 'City', 'Pincode'
    ];
    const rows = (studentsList || []).map(s => [
      s.name || '',
      s.admissionNo || '',
      s.rollNo || '',
      s.className || '',
      s.gender || '',
      s.dob || '',
      s.bloodGroup || '',
      s.aadhaarNo || '',
      s.email || '',
      s.fatherName || '',
      s.fatherPhone || s.phone || '',
      s.motherName || '',
      s.motherPhone || '',
      s.parentEmail || '',
      s.address || '',
      s.city || '',
      s.pincode || ''
    ]);
    const csv = headers.map(escapeCsvCell).join(',') + '\n' +
      rows.map(r => r.map(escapeCsvCell).join(',')).join('\n');
    downloadCsv(filename, csv);
  }

  function exportStaffToCsv(staffList, filename = 'Amala_Faculty_Directory') {
    const headers = [
      'Faculty Name', 'Staff ID / Username', 'Gender', 'Contact Number',
      'Login Email', 'Major Subject', 'Class In-Charge', 'Assigned Teaching Subjects'
    ];
    const rows = (staffList || []).map(st => {
      const teaching = (st.subjects || []).map(s => `${s.subject || ''} (${s.className || ''})`).join('; ');
      return [
        st.name || '',
        st.username || '',
        st.gender || '',
        st.phone || '',
        st.email || '',
        st.majorSubject || '',
        st.classTeacherClassName || st.classTeacherOf || '-',
        teaching || '-'
      ];
    });
    const csv = headers.map(escapeCsvCell).join(',') + '\n' +
      rows.map(r => r.map(escapeCsvCell).join(',')).join('\n');
    downloadCsv(filename, csv);
  }

  function exportNotesToCsv(notesList, filename = 'Amala_Study_Materials_Notes') {
    const headers = [
      'Class Section', 'Subject', 'Note Title', 'Description', 'Study Material URL', 'Uploaded By', 'Date'
    ];
    const rows = (notesList || []).map(n => [
      n.className || '',
      n.subject || '',
      n.title || '',
      n.description || '',
      n.fileUrl || '',
      n.uploadedByName || n.uploadedBy || 'Faculty',
      n.createdAt ? (n.createdAt.toDate ? n.createdAt.toDate().toLocaleDateString('en-GB') : String(n.createdAt)) : ''
    ]);
    const csv = headers.map(escapeCsvCell).join(',') + '\n' +
      rows.map(r => r.map(escapeCsvCell).join(',')).join('\n');
    downloadCsv(filename, csv);
  }

  function exportAttendanceToCsv(attList, filename = 'Amala_Attendance_Report') {
    const headers = ['Class Section', 'Date', 'Admission No', 'Roll No', 'Student Name', 'Status', 'Remarks'];
    const rows = (attList || []).map(a => [
      a.className || '',
      a.date || '',
      a.admissionNo || '',
      a.rollNo || '',
      a.studentName || '',
      a.status || 'Present',
      a.remarks || ''
    ]);
    const csv = headers.map(escapeCsvCell).join(',') + '\n' +
      rows.map(r => r.map(escapeCsvCell).join(',')).join('\n');
    downloadCsv(filename, csv);
  }

  function exportMarksToCsv(marksList, filename = 'Amala_Examination_Marks_Register') {
    const headers = [
      'Class Section', 'Exam Name', 'Admission No', 'Roll No', 'Student Name',
      'Subject', 'Marks Obtained', 'Max Marks', 'Percentage', 'Grade', 'Result'
    ];
    const rows = (marksList || []).map(m => {
      const ob = parseFloat(m.marksObtained) || 0;
      const mx = parseFloat(m.maxMarks) || 100;
      const pct = mx > 0 ? Math.round((ob / mx) * 100) : 0;
      let grade = 'F';
      if (pct >= 90) grade = 'A+';
      else if (pct >= 80) grade = 'A';
      else if (pct >= 70) grade = 'B';
      else if (pct >= 60) grade = 'C';
      else if (pct >= 50) grade = 'D';
      const result = pct >= 35 ? 'PASSED' : 'FAIL';
      return [
        m.className || '',
        m.examName || '',
        m.admissionNo || '',
        m.rollNo || '',
        m.studentName || '',
        m.subject || '',
        ob,
        mx,
        pct + '%',
        grade,
        result
      ];
    });
    const csv = headers.map(escapeCsvCell).join(',') + '\n' +
      rows.map(r => r.map(escapeCsvCell).join(',')).join('\n');
    downloadCsv(filename, csv);
  }

  // ---------------- PURGE ALL DEMO DATA ----------------
  async function purgeAllDemoData({ supabase, progressCb }) {
    const tables = [
      'marks',
      'attendance',
      'homework',
      'notes',
      'exams',
      'students',
      'parents',
      'staff',
      'classes'
    ];

    const report = { deleted: {}, errors: [] };
    const totalSteps = tables.length + 2; // + users cleanup + login_lookup cleanup
    let currentStep = 0;

    for (const tbl of tables) {
      currentStep++;
      if (progressCb) progressCb(currentStep, totalSteps, `Purging ${tbl}...`);
      try {
        const { error, count } = await supabase
          .from(tbl)
          .delete()
          .neq('id', '___NEVER_MATCH___');
        if (error) throw error;
        report.deleted[tbl] = count || 'all';
      } catch (err) {
        console.warn(`Purge error on table ${tbl}:`, err.message);
        report.errors.push(`${tbl}: ${err.message}`);
      }
    }

    // Purge non-admin users
    currentStep++;
    if (progressCb) progressCb(currentStep, totalSteps, 'Clearing non-admin user credentials...');
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .neq('role', 'admin');
      if (error) throw error;
      report.deleted.users = 'non-admin';
    } catch (uErr) {
      report.errors.push(`users: ${uErr.message}`);
    }

    // Purge non-admin login_lookup keys
    currentStep++;
    if (progressCb) progressCb(currentStep, totalSteps, 'Purging identifier lookup index...');
    try {
      let query = supabase.from('login_lookup').delete();
      for (const aEmail of ADMIN_PROTECTED_EMAILS) {
        query = query.neq('email', aEmail.toLowerCase().trim());
      }
      const { error } = await query;
      if (error) throw error;
      report.deleted.login_lookup = 'non-admin';
    } catch (lErr) {
      report.errors.push(`login_lookup: ${lErr.message}`);
    }

    return report;
  }

  return {
    downloadTemplate,
    parseFile,
    parseCsvText,
    downloadCsv,
    downloadExcel,
    exportStudentsToCsv,
    exportStaffToCsv,
    exportNotesToCsv,
    exportAttendanceToCsv,
    exportMarksToCsv,
    purgeAllDemoData,
    ADMIN_PROTECTED_EMAILS,
    TEMPLATES
  };
});
