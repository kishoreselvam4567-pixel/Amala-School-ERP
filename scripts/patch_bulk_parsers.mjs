import fs from 'fs';
import path from 'path';

// 1. Update bulk-import-export.js files
const bulkFiles = [
  'js/bulk-import-export.js',
  'internal/js/bulk-import-export.js',
  'public/js/bulk-import-export.js',
  'public/internal/js/bulk-import-export.js'
];

bulkFiles.forEach(fileRel => {
  const filePath = path.resolve(fileRel);
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');

  // Add raw: false and safe string mapping
  code = code.replace(
    /const aoa = window\.XLSX\.utils\.sheet_to_json\(worksheet, \{ header: 1, defval: '' \}\);/g,
    "const aoa = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });"
  );

  code = code.replace(
    /const headers = \(aoa\[0\] \|\| \[\]\)\.map\(h => String\(h \|\| ''\)\.trim\(\)\);[\r\n\s]+const rows = aoa\.slice\(1\)\.filter\(r => r\.some\(c => String\(c \|\| ''\)\.trim\(\)\.length > 0\)\);/g,
    `const headers = (aoa[0] || []).map(h => (h !== undefined && h !== null ? String(h).trim() : ''));
            const rows = aoa.slice(1)
              .filter(r => Array.isArray(r) && r.some(c => c !== null && c !== undefined && String(c).trim().length > 0))
              .map(r => r.map(c => (c !== null && c !== undefined ? String(c).trim() : '')));`
  );

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`Updated ${fileRel}`);
});

// 2. Update dashboard.html files (internal/admin/dashboard.html and public/internal/admin/dashboard.html)
const adminFiles = [
  'internal/admin/dashboard.html',
  'public/internal/admin/dashboard.html'
];

adminFiles.forEach(fileRel => {
  const filePath = path.resolve(fileRel);
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');

  // A. Patch handleStudentBulkFile rows.forEach
  const targetStudentBlock = `        rows.forEach((r, rowIdx) => {
          const name = idxName !== -1 ? (r[idxName] || '').trim() : (r[0] || '').trim();
          if (!name) return;
          const admNo = idxAdm !== -1 ? (r[idxAdm] || '').trim() : \`ADM-2026-\${String(rowIdx + 1).padStart(3, '0')}\`;
          const rollNo = idxRoll !== -1 ? (r[idxRoll] || '').trim() : String(rowIdx + 1);
          const className = idxClass !== -1 ? (r[idxClass] || '').trim() : '';
          const gender = idxGender !== -1 && r[idxGender] ? r[idxGender].trim() : 'Male';
          const dob = idxDob !== -1 && r[idxDob] ? r[idxDob].trim() : '';
          const blood = idxBlood !== -1 && r[idxBlood] ? r[idxBlood].trim() : 'O+';
          const aadhaar = idxAadhaar !== -1 && r[idxAadhaar] ? r[idxAadhaar].trim() : '';
          const stuEmail = idxStuEmail !== -1 && r[idxStuEmail] ? r[idxStuEmail].trim() : '';
          const cleanAdmCode = (admNo || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const stuPass = (idxStuPass !== -1 && r[idxStuPass] && r[idxStuPass].trim())
            ? r[idxStuPass].trim()
            : ((dob && dob.replace(/\\D/g, '').length >= 6) ? dob.replace(/\\D/g, '') : (cleanAdmCode ? cleanAdmCode.toUpperCase() + '@' + new Date().getFullYear() : 'Stu@' + Math.floor(1000 + Math.random() * 9000)));
          const fatherName = idxFather !== -1 && r[idxFather] ? r[idxFather].trim() : '';
          const fatherPhone = idxFatherPhone !== -1 && r[idxFatherPhone] ? String(r[idxFatherPhone]).replace(/\\D/g, '') : '';
          const motherName = idxMother !== -1 && r[idxMother] ? r[idxMother].trim() : '';
          const motherPhone = idxMotherPhone !== -1 && r[idxMotherPhone] ? String(r[idxMotherPhone]).replace(/\\D/g, '') : '';
          const parEmail = idxParEmail !== -1 && r[idxParEmail] ? r[idxParEmail].trim() : '';
          const parPass = (idxParPass !== -1 && r[idxParPass] && r[idxParPass].trim())
            ? r[idxParPass].trim()
            : (fatherPhone && fatherPhone.length >= 6 ? fatherPhone : (cleanAdmCode ? 'Par@' + cleanAdmCode.toUpperCase() : 'Par@' + Math.floor(1000 + Math.random() * 9000)));
          const address = idxAddr !== -1 && r[idxAddr] ? r[idxAddr].trim() : '';
          const city = idxCity !== -1 && r[idxCity] ? r[idxCity].trim() : '';
          const pincode = idxPin !== -1 && r[idxPin] ? r[idxPin].trim() : '';`;

  const replStudentBlock = `        const cellStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');

        rows.forEach((r, rowIdx) => {
          const name = idxName !== -1 ? cellStr(r[idxName]) : cellStr(r[0]);
          if (!name) return;
          const admNo = idxAdm !== -1 ? cellStr(r[idxAdm]) : \`ADM-2026-\${String(rowIdx + 1).padStart(3, '0')}\`;
          const rollNo = idxRoll !== -1 ? cellStr(r[idxRoll]) : String(rowIdx + 1);
          const className = idxClass !== -1 ? cellStr(r[idxClass]) : '';
          const gender = idxGender !== -1 && cellStr(r[idxGender]) ? cellStr(r[idxGender]) : 'Male';
          const dob = idxDob !== -1 ? cellStr(r[idxDob]) : '';
          const blood = idxBlood !== -1 && cellStr(r[idxBlood]) ? cellStr(r[idxBlood]) : 'O+';
          const aadhaar = idxAadhaar !== -1 ? cellStr(r[idxAadhaar]) : '';
          const stuEmail = idxStuEmail !== -1 ? cellStr(r[idxStuEmail]) : '';
          const cleanAdmCode = cellStr(admNo).toLowerCase().replace(/[^a-z0-9]/g, '');
          const stuPassFromRow = idxStuPass !== -1 ? cellStr(r[idxStuPass]) : '';
          const stuPass = stuPassFromRow
            ? stuPassFromRow
            : ((dob && dob.replace(/\\D/g, '').length >= 6) ? dob.replace(/\\D/g, '') : (cleanAdmCode ? cleanAdmCode.toUpperCase() + '@' + new Date().getFullYear() : 'Stu@' + Math.floor(1000 + Math.random() * 9000)));
          const fatherName = idxFather !== -1 ? cellStr(r[idxFather]) : '';
          const fatherPhone = idxFatherPhone !== -1 ? cellStr(r[idxFatherPhone]).replace(/\\D/g, '') : '';
          const motherName = idxMother !== -1 ? cellStr(r[idxMother]) : '';
          const motherPhone = idxMotherPhone !== -1 ? cellStr(r[idxMotherPhone]).replace(/\\D/g, '') : '';
          const parEmail = idxParEmail !== -1 ? cellStr(r[idxParEmail]) : '';
          const parPassFromRow = idxParPass !== -1 ? cellStr(r[idxParPass]) : '';
          const parPass = parPassFromRow
            ? parPassFromRow
            : (fatherPhone && fatherPhone.length >= 6 ? fatherPhone : (cleanAdmCode ? 'Par@' + cleanAdmCode.toUpperCase() : 'Par@' + Math.floor(1000 + Math.random() * 9000)));
          const address = idxAddr !== -1 ? cellStr(r[idxAddr]) : '';
          const city = idxCity !== -1 ? cellStr(r[idxCity]) : '';
          const pincode = idxPin !== -1 ? cellStr(r[idxPin]) : '';`;

  // Normalize CRLF to LF for matching
  const normalizedCode = code.replace(/\r\n/g, '\n');
  const normalizedTarget = targetStudentBlock.replace(/\r\n/g, '\n');
  if (normalizedCode.includes(normalizedTarget)) {
    code = normalizedCode.replace(normalizedTarget, replStudentBlock);
    console.log(`Patched student bulk parser in ${fileRel}`);
  } else {
    console.warn(`Could not match student bulk block in ${fileRel}`);
  }

  // B. Patch handleStaffBulkFile
  const targetStaffBlock = `        rows.forEach((r, rowIdx) => {
          const name = idxName !== -1 ? (r[idxName] || '').trim() : (r[0] || '').trim();
          if (!name) return;
          let username = idxUser !== -1 ? (r[idxUser] || '').trim() : '';
          if (!username) {
            username = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 15);
          }
          const gender = idxGender !== -1 && r[idxGender] ? r[idxGender].trim() : 'Male';
          const phone = idxPhone !== -1 && r[idxPhone] ? String(r[idxPhone]).replace(/\\D/g, '') : '';
          const majorSubject = idxSub !== -1 && r[idxSub] ? r[idxSub].trim() : 'General';
          const email = idxEmail !== -1 && r[idxEmail] ? r[idxEmail].trim() : \`\${username}@amalaschool.edu.in\`;
          const pass = idxPass !== -1 && r[idxPass] ? r[idxPass].trim() : 'Faculty@123';
          const role = idxRole !== -1 && r[idxRole] ? r[idxRole].trim() : 'staff';`;

  const replStaffBlock = `        const cellStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');

        rows.forEach((r, rowIdx) => {
          const name = idxName !== -1 ? cellStr(r[idxName]) : cellStr(r[0]);
          if (!name) return;
          let username = idxUser !== -1 ? cellStr(r[idxUser]) : '';
          if (!username) {
            username = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 15);
          }
          const gender = idxGender !== -1 && cellStr(r[idxGender]) ? cellStr(r[idxGender]) : 'Male';
          const phone = idxPhone !== -1 ? cellStr(r[idxPhone]).replace(/\\D/g, '') : '';
          const majorSubject = idxSub !== -1 && cellStr(r[idxSub]) ? cellStr(r[idxSub]) : 'General';
          const email = idxEmail !== -1 && cellStr(r[idxEmail]) ? cellStr(r[idxEmail]) : \`\${username}@amalaschool.edu.in\`;
          const pass = idxPass !== -1 && cellStr(r[idxPass]) ? cellStr(r[idxPass]) : 'Faculty@123';
          const role = idxRole !== -1 && cellStr(r[idxRole]) ? cellStr(r[idxRole]) : 'staff';`;

  if (code.includes(targetStaffBlock.replace(/\r\n/g, '\n'))) {
    code = code.replace(targetStaffBlock.replace(/\r\n/g, '\n'), replStaffBlock);
    console.log(`Patched staff bulk parser in ${fileRel}`);
  } else {
    console.warn(`Could not match staff bulk block in ${fileRel}`);
  }

  // C. Patch handleNotesBulkFile
  const targetNotesBlock = `        rows.forEach((r, rowIdx) => {
          const className = idxClass !== -1 ? (r[idxClass] || '').trim() : '';
          const subject = idxSub !== -1 ? (r[idxSub] || '').trim() : 'General';
          const title = idxTitle !== -1 ? (r[idxTitle] || '').trim() : (r[0] || '').trim();
          if (!title) return;
          const description = idxDesc !== -1 ? (r[idxDesc] || '').trim() : '';
          const fileUrl = idxLink !== -1 ? (r[idxLink] || '').trim() : '';`;

  const replNotesBlock = `        const cellStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');

        rows.forEach((r, rowIdx) => {
          const className = idxClass !== -1 ? cellStr(r[idxClass]) : '';
          const subject = idxSub !== -1 ? cellStr(r[idxSub]) : 'General';
          const title = idxTitle !== -1 ? cellStr(r[idxTitle]) : cellStr(r[0]);
          if (!title) return;
          const description = idxDesc !== -1 ? cellStr(r[idxDesc]) : '';
          const fileUrl = idxLink !== -1 ? cellStr(r[idxLink]) : '';`;

  if (code.includes(targetNotesBlock.replace(/\r\n/g, '\n'))) {
    code = code.replace(targetNotesBlock.replace(/\r\n/g, '\n'), replNotesBlock);
    console.log(`Patched notes bulk parser in ${fileRel}`);
  } else {
    console.warn(`Could not match notes bulk block in ${fileRel}`);
  }

  // D. Patch handleAttBulkFile
  const targetAttBlock = `        rows.forEach((r, rowIdx) => {
          const admNo = idxAdm !== -1 ? (r[idxAdm] || '').trim() : '';
          const rollNo = idxRoll !== -1 ? (r[idxRoll] || '').trim() : '';
          const name = idxName !== -1 ? (r[idxName] || '').trim() : '';
          let status = idxStatus !== -1 && r[idxStatus] ? r[idxStatus].trim() : 'Present';
          if (/^p/i.test(status)) status = 'Present';
          else if (/^a/i.test(status)) status = 'Absent';
          else if (/^l/i.test(status)) status = 'Late';
          const remarks = idxRemarks !== -1 && r[idxRemarks] ? r[idxRemarks].trim() : '';`;

  const replAttBlock = `        const cellStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');

        rows.forEach((r, rowIdx) => {
          const admNo = idxAdm !== -1 ? cellStr(r[idxAdm]) : '';
          const rollNo = idxRoll !== -1 ? cellStr(r[idxRoll]) : '';
          const name = idxName !== -1 ? cellStr(r[idxName]) : '';
          let status = idxStatus !== -1 && cellStr(r[idxStatus]) ? cellStr(r[idxStatus]) : 'Present';
          if (/^p/i.test(status)) status = 'Present';
          else if (/^a/i.test(status)) status = 'Absent';
          else if (/^l/i.test(status)) status = 'Late';
          const remarks = idxRemarks !== -1 ? cellStr(r[idxRemarks]) : '';`;

  if (code.includes(targetAttBlock.replace(/\r\n/g, '\n'))) {
    code = code.replace(targetAttBlock.replace(/\r\n/g, '\n'), replAttBlock);
    console.log(`Patched attendance bulk parser in ${fileRel}`);
  } else {
    console.warn(`Could not match attendance bulk block in ${fileRel}`);
  }

  // E. Patch handleMarksBulkFile
  const targetMarksBlock = `        rows.forEach(r => {
          const admNo = idxAdm !== -1 ? (r[idxAdm] || '').trim() : '';
          const rollNo = idxRoll !== -1 ? (r[idxRoll] || '').trim() : '';
          const name = idxName !== -1 ? (r[idxName] || '').trim() : '';
          const subject = idxSub !== -1 ? (r[idxSub] || '').trim() : 'General';`;

  const replMarksBlock = `        const cellStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');

        rows.forEach(r => {
          const admNo = idxAdm !== -1 ? cellStr(r[idxAdm]) : '';
          const rollNo = idxRoll !== -1 ? cellStr(r[idxRoll]) : '';
          const name = idxName !== -1 ? cellStr(r[idxName]) : '';
          const subject = idxSub !== -1 ? cellStr(r[idxSub]) : 'General';`;

  if (code.includes(targetMarksBlock.replace(/\r\n/g, '\n'))) {
    code = code.replace(targetMarksBlock.replace(/\r\n/g, '\n'), replMarksBlock);
    console.log(`Patched marks bulk parser in ${fileRel}`);
  } else {
    console.warn(`Could not match marks bulk block in ${fileRel}`);
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`Saved ${fileRel}`);
});

