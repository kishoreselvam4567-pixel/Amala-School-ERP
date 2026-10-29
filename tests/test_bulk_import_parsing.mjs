import assert from 'assert';

// Simulate parsing with cellStr
const cellStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');

// Test 1: Diverse row inputs (numbers, nulls, undefined, objects)
const mockHeaders = ['Name', 'Admission No', 'Roll No', 'Class', 'Gender', 'DOB', 'Blood Group', 'Father Phone', 'Pincode'];
const normH = mockHeaders.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

const idxName = normH.findIndex(h => h.includes('name') && !h.includes('father') && !h.includes('mother') && !h.includes('parent'));
const idxAdm = normH.findIndex(h => h.includes('admission') || h.includes('admno') || h.includes('regno') || h.includes('registerno'));
const idxRoll = normH.findIndex(h => h.includes('roll') || h.includes('rollno') || h.includes('rollnumber'));
const idxClass = normH.findIndex(h => h.includes('class') || h.includes('standard') || h.includes('grade'));
const idxGender = normH.findIndex(h => h.includes('gender') || h.includes('sex'));
const idxDob = normH.findIndex(h => h.includes('dob') || h.includes('birth'));
const idxBlood = normH.findIndex(h => h.includes('blood'));
const idxFatherPhone = normH.findIndex(h => h.includes('fatherphone') || (h.includes('phone') && !h.includes('mother')) || h.includes('contact') || h.includes('mobile'));
const idxPin = normH.findIndex(h => h.includes('pin') || h.includes('postal'));

// Mock rows where Excel parsed Roll No as Number 101, Phone as Number, Pin as Number
const testRows = [
  ['Aarav Sharma', 2026001, 1, '10-A', 'Male', '2010-04-12', 'B+', 9876543210, 600028],
  ['Diya Patel', 2026002, 2, '10-A', 'Female', '2010-09-25', 'O+', 9812345678, 600020],
  ['Kavya Nair', 2026003, 3, '10-A', 'Female', '2010-11-03', 'A+', 9444123456, 600004],
  ['Rahul Verma', null, 4, '10-B', 'Male', null, null, null, null],
  ['Sneha Reddy', 'ADM-2026-005', '5', '10-B', 'Female', '2010-01-15', 'AB+', '9123456789', '600001']
];

const parsedBulkStudents = [];

testRows.forEach((r, rowIdx) => {
  const name = idxName !== -1 ? cellStr(r[idxName]) : cellStr(r[0]);
  if (!name) return;
  const admNo = idxAdm !== -1 ? cellStr(r[idxAdm]) : `ADM-2026-${String(rowIdx + 1).padStart(3, '0')}`;
  const rollNo = idxRoll !== -1 ? cellStr(r[idxRoll]) : String(rowIdx + 1);
  const className = idxClass !== -1 ? cellStr(r[idxClass]) : '';
  const gender = idxGender !== -1 && cellStr(r[idxGender]) ? cellStr(r[idxGender]) : 'Male';
  const dob = idxDob !== -1 ? cellStr(r[idxDob]) : '';
  const blood = idxBlood !== -1 && cellStr(r[idxBlood]) ? cellStr(r[idxBlood]) : 'O+';
  const fatherPhone = idxFatherPhone !== -1 ? cellStr(r[idxFatherPhone]).replace(/\D/g, '') : '';
  const pincode = idxPin !== -1 ? cellStr(r[idxPin]) : '';

  parsedBulkStudents.push({
    name, admNo, rollNo, className, gender, dob, bloodGroup: blood,
    fatherPhone, pincode
  });
});

assert.strictEqual(parsedBulkStudents.length, 5);
assert.strictEqual(parsedBulkStudents[0].rollNo, '1');
assert.strictEqual(parsedBulkStudents[0].admNo, '2026001');
assert.strictEqual(parsedBulkStudents[0].fatherPhone, '9876543210');
assert.strictEqual(parsedBulkStudents[0].pincode, '600028');

// Row 4 fallback checks
assert.strictEqual(parsedBulkStudents[3].rollNo, '4');
assert.strictEqual(parsedBulkStudents[3].admNo, '');
assert.strictEqual(parsedBulkStudents[3].fatherPhone, '');

console.log('PASS: All student bulk import numeric edge cases parsed successfully without errors!');

