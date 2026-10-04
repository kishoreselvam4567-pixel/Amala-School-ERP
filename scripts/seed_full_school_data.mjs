import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://jfmawxozfgnmddblpqow.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbWF3eG96ZmdubWRkYmxwcW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTg3NjUsImV4cCI6MjEwNjA5NDc2NX0.E2f6Wy1ZShm58MIZwu8v1Pq7NdRobbCzLk7D2EwJLjk";

const admin = createClient(supabaseUrl, anonKey);

// 12 Classes configuration
const CLASSES = [
  { id: 'cls_1a', name: 'Class 1-A', code: 'C1A', grade: 1 },
  { id: 'cls_2a', name: 'Class 2-A', code: 'C2A', grade: 2 },
  { id: 'cls_3a', name: 'Class 3-A', code: 'C3A', grade: 3 },
  { id: 'cls_4a', name: 'Class 4-A', code: 'C4A', grade: 4 },
  { id: 'cls_5a', name: 'Class 5-A', code: 'C5A', grade: 5 },
  { id: 'cls_6a', name: 'Class 6-A', code: 'C6A', grade: 6 },
  { id: 'cls_7a', name: 'Class 7-A', code: 'C7A', grade: 7 },
  { id: 'cls_8a', name: 'Class 8-A', code: 'C8A', grade: 8 },
  { id: 'cls_9a', name: 'Class 9-A', code: 'C9A', grade: 9 },
  { id: 'cls_10a', name: 'Class 10-A', code: 'C10A', grade: 10 },
  { id: 'cls_11a', name: 'Class 11-A', code: 'C11A', grade: 11 },
  { id: 'cls_12a', name: 'Class 12-A', code: 'C12A', grade: 12 },
];

// 12 Teachers configuration (1 per class)
const TEACHERS = [
  { id: 'stf_1', name: 'T. Senthil Kumar', username: 'teacher1', email: 'teacher1@amalahss.in', phone: '9840001001', majorSubject: 'Mathematics', gender: 'Male', classId: 'cls_1a' },
  { id: 'stf_2', name: 'R. Meenakshi', username: 'teacher2', email: 'teacher2@amalahss.in', phone: '9840001002', majorSubject: 'English', gender: 'Female', classId: 'cls_2a' },
  { id: 'stf_3', name: 'K. Suresh', username: 'teacher3', email: 'teacher3@amalahss.in', phone: '9840001003', majorSubject: 'Tamil', gender: 'Male', classId: 'cls_3a' },
  { id: 'stf_4', name: 'P. Anitha', username: 'teacher4', email: 'teacher4@amalahss.in', phone: '9840001004', majorSubject: 'Science', gender: 'Female', classId: 'cls_4a' },
  { id: 'stf_5', name: 'M. Divya', username: 'teacher5', email: 'teacher5@amalahss.in', phone: '9840001005', majorSubject: 'Social Science', gender: 'Female', classId: 'cls_5a' },
  { id: 'stf_6', name: 'S. Karthik', username: 'teacher6', email: 'teacher6@amalahss.in', phone: '9840001006', majorSubject: 'Mathematics', gender: 'Male', classId: 'cls_6a' },
  { id: 'stf_7', name: 'G. Lakshmi', username: 'teacher7', email: 'teacher7@amalahss.in', phone: '9840001007', majorSubject: 'Science', gender: 'Female', classId: 'cls_7a' },
  { id: 'stf_8', name: 'V. Rajesh', username: 'teacher8', email: 'teacher8@amalahss.in', phone: '9840001008', majorSubject: 'Social Science', gender: 'Male', classId: 'cls_8a' },
  { id: 'stf_9', name: 'B. Priya', username: 'teacher9', email: 'teacher9@amalahss.in', phone: '9840001009', majorSubject: 'English', gender: 'Female', classId: 'cls_9a' },
  { id: 'stf_10', name: 'N. Vijay', username: 'teacher10', email: 'teacher10@amalahss.in', phone: '9840001010', majorSubject: 'Mathematics', gender: 'Male', classId: 'cls_10a' },
  { id: 'stf_11', name: 'D. Kavitha', username: 'teacher11', email: 'teacher11@amalahss.in', phone: '9840001011', majorSubject: 'Physics', gender: 'Female', classId: 'cls_11a' },
  { id: 'stf_12', name: 'A. Murugan', username: 'teacher12', email: 'teacher12@amalahss.in', phone: '9840001012', majorSubject: 'Chemistry', gender: 'Male', classId: 'cls_12a' },
];

// 60 Students data template (5 per class)
const STUDENT_NAMES_BY_CLASS = [
  // Class 1
  [
    { name: 'Aarav Sharma', gender: 'Male', blood: 'O+', dob: '2019-04-12', father: 'Rajesh Sharma', mother: 'Sunita Sharma' },
    { name: 'Diya Krishnan', gender: 'Female', blood: 'A+', dob: '2019-07-25', father: 'Gopal Krishnan', mother: 'Radha Krishnan' },
    { name: 'Kavin Balaji', gender: 'Male', blood: 'B+', dob: '2019-02-18', father: 'Balaji Natarajan', mother: 'Geetha Balaji' },
    { name: 'Ananya Ramesh', gender: 'Female', blood: 'AB+', dob: '2019-09-05', father: 'Ramesh Sundaram', mother: 'Deepa Ramesh' },
    { name: 'Sai Saran', gender: 'Male', blood: 'O-', dob: '2019-11-30', father: 'Saravanan Paul', mother: 'Kavitha Saravanan' },
  ],
  // Class 2
  [
    { name: 'Advaith Nair', gender: 'Male', blood: 'B+', dob: '2018-05-14', father: 'Praveen Nair', mother: 'Asha Nair' },
    { name: 'Ishita Sundar', gender: 'Female', blood: 'A+', dob: '2018-08-21', father: 'Sundaram Mani', mother: 'Janaki Sundaram' },
    { name: 'Harish Kumar', gender: 'Male', blood: 'O+', dob: '2018-03-10', father: 'Kumar Velu', mother: 'Shanthi Kumar' },
    { name: 'Nandhini Prakash', gender: 'Female', blood: 'B-', dob: '2018-10-19', father: 'Prakash Raman', mother: 'Sumathi Prakash' },
    { name: 'Rithvik Reddy', gender: 'Male', blood: 'AB+', dob: '2018-12-04', father: 'Srinivas Reddy', mother: 'Latha Reddy' },
  ],
  // Class 3
  [
    { name: 'Pranav Murthy', gender: 'Male', blood: 'O+', dob: '2017-06-11', father: 'Krishnamurthy S', mother: 'Bhavani Murthy' },
    { name: 'Samyuktha Menon', gender: 'Female', blood: 'A+', dob: '2017-01-29', father: 'Narayan Menon', mother: 'Lalitha Menon' },
    { name: 'Gautham Selvam', gender: 'Male', blood: 'B+', dob: '2017-09-17', father: 'Selvam Arumugam', mother: 'Menaka Selvam' },
    { name: 'Keerthana Anand', gender: 'Female', blood: 'O+', dob: '2017-04-03', father: 'Anand Chandran', mother: 'Vidya Anand' },
    { name: 'Tejas Subramanian', gender: 'Male', blood: 'A-', dob: '2017-11-22', father: 'Subramanian Swamy', mother: 'Gayathri Subramanian' },
  ],
  // Class 4
  [
    { name: 'Varun Swaminathan', gender: 'Male', blood: 'B+', dob: '2016-03-15', father: 'Swaminathan R', mother: 'Malathi Swaminathan' },
    { name: 'Shruti Venkat', gender: 'Female', blood: 'O+', dob: '2016-07-08', father: 'Venkat Raman', mother: 'Usha Venkat' },
    { name: 'Tarun Varma', gender: 'Male', blood: 'AB+', dob: '2016-12-14', father: 'Ravindra Varma', mother: 'Archana Varma' },
    { name: 'Pavithra Mohan', gender: 'Female', blood: 'A+', dob: '2016-05-20', father: 'Mohan Dass', mother: 'Nalini Mohan' },
    { name: 'Naveen Vignesh', gender: 'Male', blood: 'O+', dob: '2016-09-02', father: 'Vignesh Chelliah', mother: 'Sujatha Vignesh' },
  ],
  // Class 5
  [
    { name: 'Dharun Raj', gender: 'Male', blood: 'A+', dob: '2015-02-17', father: 'Rajagopal P', mother: 'Sudha Rajagopal' },
    { name: 'Miruna Devi', gender: 'Female', blood: 'B+', dob: '2015-06-30', father: 'Chandrasekar V', mother: 'Vasantha Chandrasekar' },
    { name: 'Abhinav Chandran', gender: 'Male', blood: 'O+', dob: '2015-10-12', father: 'Chandran Jayaraman', mother: 'Revathi Chandran' },
    { name: 'Harini Madhavan', gender: 'Female', blood: 'AB-', dob: '2015-04-05', father: 'Madhavan Iyengar', mother: 'Chitra Madhavan' },
    { name: 'Roshan Daniel', gender: 'Male', blood: 'B+', dob: '2015-08-23', father: 'Daniel Joseph', mother: 'Mary Daniel' },
  ],
  // Class 6
  [
    { name: 'Karthikeyan S', gender: 'Male', blood: 'O+', dob: '2014-03-09', father: 'Srinivasan K', mother: 'Padma Srinivasan' },
    { name: 'Sneha Thirumalai', gender: 'Female', blood: 'A+', dob: '2014-07-14', father: 'Thirumalai N', mother: 'Hemalatha Thirumalai' },
    { name: 'Deepak Raghavan', gender: 'Male', blood: 'B+', dob: '2014-11-28', father: 'Raghavan S', mother: 'Kasturi Raghavan' },
    { name: 'Pooja Venkatesh', gender: 'Female', blood: 'O-', dob: '2014-01-19', father: 'Venkatesh Babu', mother: 'Anupama Venkatesh' },
    { name: 'Surya Narayanan', gender: 'Male', blood: 'AB+', dob: '2014-09-06', father: 'Narayanan R', mother: 'Vijaya Narayanan' },
  ],
  // Class 7
  [
    { name: 'Vimal Rajan', gender: 'Male', blood: 'B+', dob: '2013-05-18', father: 'Rajan Isaac', mother: 'Stella Rajan' },
    { name: 'Nivetha Balamurugan', gender: 'Female', blood: 'O+', dob: '2013-08-03', father: 'Balamurugan P', mother: 'Kalaivani Balamurugan' },
    { name: 'Rahul Chidambaram', gender: 'Male', blood: 'A+', dob: '2013-02-24', father: 'Chidambaram M', mother: 'Alamelu Chidambaram' },
    { name: 'Lavanya Sridhar', gender: 'Female', blood: 'AB+', dob: '2013-10-15', father: 'Sridhar Kesavan', mother: 'Meera Sridhar' },
    { name: 'Ashwin Karthik', gender: 'Male', blood: 'O+', dob: '2013-12-31', father: 'Karthik Muthu', mother: 'Renuka Karthik' },
  ],
  // Class 8
  [
    { name: 'Akash Govind', gender: 'Male', blood: 'A+', dob: '2012-04-10', father: 'Govindarajan T', mother: 'Jayanthi Govind' },
    { name: 'Bhavana Shankar', gender: 'Female', blood: 'B+', dob: '2012-09-22', father: 'Shankar Mahadevan', mother: 'Sharanya Shankar' },
    { name: 'Manoj Prabhakar', gender: 'Male', blood: 'O+', dob: '2012-01-14', father: 'Prabhakar Rao', mother: 'Shobha Prabhakar' },
    { name: 'Shalini Jayakumar', gender: 'Female', blood: 'B-', dob: '2012-06-18', father: 'Jayakumar D', mother: 'Pushpa Jayakumar' },
    { name: 'Siddharth Natarajan', gender: 'Male', blood: 'AB+', dob: '2012-11-05', father: 'Natarajan S', mother: 'Sundari Natarajan' },
  ],
  // Class 9
  [
    { name: 'Vishal Kalyan', gender: 'Male', blood: 'O+', dob: '2011-03-12', father: 'Kalyanasundaram', mother: 'Gowri Kalyan' },
    { name: 'Meera Gopal', gender: 'Female', blood: 'A+', dob: '2011-08-07', father: 'Gopalakrishnan', mother: 'Jayashree Gopal' },
    { name: 'Dinesh Balasubramanian', gender: 'Male', blood: 'B+', dob: '2011-12-19', father: 'Balasubramanian', mother: 'Bhuvaneshwari Bala' },
    { name: 'Ananya Sriram', gender: 'Female', blood: 'O-', dob: '2011-05-25', father: 'Sriram Ramanathan', mother: 'Raji Sriram' },
    { name: 'Kishore Kumar S', gender: 'Male', blood: 'AB+', dob: '2011-10-30', father: 'Selvamurugan C', mother: 'Kanimozhi Selvam' },
  ],
  // Class 10
  [
    { name: 'Adithya Venkataraman', gender: 'Male', blood: 'B+', dob: '2010-02-14', father: 'Venkataraman G', mother: 'Shanthi Venkat' },
    { name: 'Swetha Parthasarathy', gender: 'Female', blood: 'O+', dob: '2010-07-09', father: 'Parthasarathy N', mother: 'Vaidehi Partha' },
    { name: 'Madhavan Thirugnanam', gender: 'Male', blood: 'A+', dob: '2010-11-01', father: 'Thirugnanam M', mother: 'Mangai Thirugnanam' },
    { name: 'Varsha Senthil', gender: 'Female', blood: 'AB+', dob: '2010-04-20', father: 'Senthil Nathan', mother: 'Punitha Senthil' },
    { name: 'Yogeshwaran K', gender: 'Male', blood: 'O+', dob: '2010-09-15', father: 'Kannan Palani', mother: 'Thamaraiselvi Kannan' },
  ],
  // Class 11
  [
    { name: 'Sudharshan Raman', gender: 'Male', blood: 'A+', dob: '2009-01-26', father: 'Ramanathan V', mother: 'Lakshmi Ramanathan' },
    { name: 'Rithika Elangovan', gender: 'Female', blood: 'B+', dob: '2009-06-18', father: 'Elangovan K', mother: 'Thenmozhi Elangovan' },
    { name: 'Ajay Vigneshwar', gender: 'Male', blood: 'O+', dob: '2009-10-11', father: 'Vigneshwar Rao', mother: 'Sujatha Vignesh' },
    { name: 'Monisha Jagadeesan', gender: 'Female', blood: 'AB-', dob: '2009-03-31', father: 'Jagadeesan S', mother: 'Geetha Jagadeesan' },
    { name: 'Srihari Vasudevan', gender: 'Male', blood: 'B+', dob: '2009-08-04', father: 'Vasudevan P', mother: 'Sita Vasudevan' },
  ],
  // Class 12
  [
    { name: 'Rohit Chandrasekaran', gender: 'Male', blood: 'O+', dob: '2008-02-28', father: 'Chandrasekaran M', mother: 'Kamala Chandra' },
    { name: 'Janani Radhakrishnan', gender: 'Female', blood: 'A+', dob: '2008-05-16', father: 'Radhakrishnan T', mother: 'Bhagyam Radha' },
    { name: 'Sanjay Gurumurthy', gender: 'Male', blood: 'B+', dob: '2008-09-24', father: 'Gurumurthy S', mother: 'Vijayalakshmi Guru' },
    { name: 'Aparna Devarajan', gender: 'Female', blood: 'AB+', dob: '2008-11-12', father: 'Devarajan V', mother: 'Kowsalya Devarajan' },
    { name: 'Nithin Prabhakaran', gender: 'Male', blood: 'O+', dob: '2008-07-07', father: 'Prabhakaran K', mother: 'Devaki Prabhakaran' },
  ],
];

const STANDARD_CORE_SUBJECTS = ['English', 'Tamil', 'Mathematics', 'Science', 'Social Science'];
const HS_SUBJECTS_11 = ['English', 'Tamil', 'Physics', 'Chemistry', 'Biology', 'Mathematics'];
const HS_SUBJECTS_12 = ['English', 'Tamil', 'Physics', 'Chemistry', 'Computer Science', 'Mathematics'];

async function seedData() {
  console.log('--- STARTING AMALA SCHOOL ERP COMPREHENSIVE SEEDING ---');
  
  // 1. Authenticate admin
  const { data: authData, error: authErr } = await admin.auth.signInWithPassword({
    email: 'amala@123.gmail.com',
    password: 'amala@123'
  });
  if (authErr) throw new Error('Admin auth failed: ' + authErr.message);
  console.log('✅ Authenticated as Admin:', authData.user.email);

  // 2. Clear old data from classes, staff, students, parents, and demo users
  console.log('Purging existing data collections...');
  await admin.from('classes').delete().neq('id', 'NONE');
  await admin.from('staff').delete().neq('id', 'NONE');
  await admin.from('students').delete().neq('id', 'NONE');
  await admin.from('parents').delete().neq('id', 'NONE');
  await admin.from('users').delete().neq('role', 'admin');
  await admin.from('login_lookup').delete().not('email', 'in', '("amala@123.gmail.com","amala123@gmail.com")');
  console.log('✅ Clean state prepared.');

  // 3. Insert 12 Classes
  console.log('Creating 12 Classes...');
  const classInserts = CLASSES.map((c, idx) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    section: 'A',
    classTeacherUid: TEACHERS[idx].id,
    classTeacherName: TEACHERS[idx].name,
    subjects: c.grade >= 11 ? (c.grade === 11 ? HS_SUBJECTS_11 : HS_SUBJECTS_12) : STANDARD_CORE_SUBJECTS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  const { error: errCls } = await admin.from('classes').insert(classInserts);
  if (errCls) throw new Error('Classes insert error: ' + errCls.message);
  console.log('✅ 12 Classes created successfully.');

  // 4. Insert 12 Teachers & Staff
  console.log('Creating 12 Teachers & Faculty accounts...');
  const staffInserts = [];
  const staffUserInserts = [];
  const teacherLookups = [];

  TEACHERS.forEach((t, idx) => {
    const assignedClass = CLASSES[idx];
    staffInserts.push({
      id: t.id,
      uid: t.id,
      name: t.name,
      username: t.username,
      email: t.email,
      phone: t.phone,
      majorSubject: t.majorSubject,
      gender: t.gender,
      role: 'staff',
      type: 'both',
      classTeacherOf: assignedClass.id,
      qualification: 'M.Sc., B.Ed.',
      assignedClasses: [assignedClass.name],
      subjects: [
        { subject: t.majorSubject, classId: assignedClass.id, className: assignedClass.name }
      ],
      deleted: false,
      disabled: false,
      data: {
        password: 'Teacher@123',
        classTeacherOfName: assignedClass.name
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    staffUserInserts.push({
      id: t.id,
      role: 'staff',
      name: t.name,
      username: t.username,
      email: t.email,
      phone: t.phone,
      majorSubject: t.majorSubject,
      gender: t.gender,
      deleted: false,
      disabled: false,
      data: { password: 'Teacher@123' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    teacherLookups.push(
      { id: t.username.toLowerCase(), email: t.email },
      { id: t.phone, email: t.email },
      { id: t.email.toLowerCase(), email: t.email }
    );
  });

  const { error: errStf } = await admin.from('staff').insert(staffInserts);
  if (errStf) throw new Error('Staff insert error: ' + errStf.message);
  const { error: errStfUsers } = await admin.from('users').insert(staffUserInserts);
  if (errStfUsers) throw new Error('Staff users insert error: ' + errStfUsers.message);
  console.log('✅ 12 Teachers & staff accounts created successfully.');

  // 5. Create 60 Students & 60 Linked Parents
  console.log('Creating 60 Students (5 per class) and 60 Parents (Father & Mother linked)...');
  const studentInserts = [];
  const studentUserInserts = [];
  const parentInserts = [];
  const parentUserInserts = [];
  const studentLookups = [];
  const parentLookups = [];

  let overallCounter = 101; // ADM2026101 to ADM2026160

  CLASSES.forEach((cls, classIdx) => {
    const studentList = STUDENT_NAMES_BY_CLASS[classIdx];
    
    studentList.forEach((stu, rollIdx) => {
      const rollNo = String(rollIdx + 1);
      const admNum = overallCounter;
      const admNo = `ADM2026${admNum}`;
      const stuId = `stu_${admNum}`;
      const parId = `par_${admNum}`;
      const stuEmail = `adm2026${admNum}@amalahss.in`;
      const parEmail = `parent${admNum}@amalahss.in`;
      
      const fatherPhone = `984010${String(admNum).padStart(4, '0')}`;
      const motherPhone = `984020${String(admNum).padStart(4, '0')}`;

      // Student Record
      studentInserts.push({
        id: stuId,
        uid: stuId,
        name: stu.name,
        email: stuEmail,
        admissionNo: admNo,
        rollNo: rollNo,
        dob: stu.dob,
        gender: stu.gender,
        bloodGroup: stu.blood,
        classId: cls.id,
        className: cls.name,
        section: 'A',
        parentUid: parId,
        parentName: stu.father,
        parentEmail: parEmail,
        fatherName: stu.father,
        fatherPhone: fatherPhone,
        motherName: stu.mother,
        motherPhone: motherPhone,
        phone: fatherPhone,
        address: `${10 + rollIdx}, Gandhi Road, Cantonment`,
        city: 'Tiruchirappalli',
        pincode: '620001',
        assignedSubjects: cls.grade >= 11 ? (cls.grade === 11 ? HS_SUBJECTS_11 : HS_SUBJECTS_12) : STANDARD_CORE_SUBJECTS,
        stream: cls.grade >= 11 ? 'bio_maths' : null,
        deleted: false,
        disabled: false,
        data: {
          password: 'Student@123',
          fatherName: stu.father,
          fatherPhone: fatherPhone,
          motherName: stu.mother,
          motherPhone: motherPhone,
          parentUid: parId
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Student User Record
      studentUserInserts.push({
        id: stuId,
        role: 'student',
        name: stu.name,
        email: stuEmail,
        phone: fatherPhone,
        username: admNo.toLowerCase(),
        deleted: false,
        disabled: false,
        data: { password: 'Student@123' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Student Lookups (admNo, adm number without prefix, email)
      studentLookups.push(
        { id: admNo.toLowerCase(), email: stuEmail },
        { id: String(admNum), email: stuEmail },
        { id: stuEmail.toLowerCase(), email: stuEmail }
      );

      // Parent Record (Both Mother & Father details linked to child)
      parentInserts.push({
        id: parId,
        uid: parId,
        name: stu.father,
        email: parEmail,
        phone: fatherPhone,
        motherPhone: motherPhone,
        childUid: stuId,
        childName: stu.name,
        childAdmissionNo: admNo,
        childClassName: cls.name,
        deleted: false,
        disabled: false,
        data: {
          password: 'Parent@123',
          fatherName: stu.father,
          fatherPhone: fatherPhone,
          motherName: stu.mother,
          motherPhone: motherPhone,
          childUid: stuId,
          childName: stu.name,
          childAdmissionNo: admNo,
          childClassName: cls.name,
          childRollNo: rollNo
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Parent User Record
      parentUserInserts.push({
        id: parId,
        role: 'parent',
        name: stu.father,
        email: parEmail,
        phone: fatherPhone,
        username: `parent${admNum}`,
        deleted: false,
        disabled: false,
        data: { password: 'Parent@123' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Parent Lookups (father mobile, mother mobile, parent email prefix, parent email)
      parentLookups.push(
        { id: fatherPhone, email: parEmail },
        { id: motherPhone, email: parEmail },
        { id: `parent${admNum}`, email: parEmail },
        { id: parEmail.toLowerCase(), email: parEmail }
      );

      overallCounter++;
    });
  });

  // Batch insert students
  console.log(`Inserting ${studentInserts.length} students...`);
  const { error: errStu } = await admin.from('students').insert(studentInserts);
  if (errStu) throw new Error('Students insert error: ' + errStu.message);

  const { error: errStuUsers } = await admin.from('users').insert(studentUserInserts);
  if (errStuUsers) throw new Error('Student users insert error: ' + errStuUsers.message);

  // Batch insert parents
  console.log(`Inserting ${parentInserts.length} parents...`);
  const { error: errPar } = await admin.from('parents').insert(parentInserts);
  if (errPar) throw new Error('Parents insert error: ' + errPar.message);

  const { error: errParUsers } = await admin.from('users').insert(parentUserInserts);
  if (errParUsers) throw new Error('Parent users insert error: ' + errParUsers.message);

  // Batch insert all login lookups
  console.log('Inserting login lookups...');
  const allLookups = [...teacherLookups, ...studentLookups, ...parentLookups];
  // Deduplicate lookup entries by ID
  const uniqueLookupMap = new Map();
  allLookups.forEach(l => uniqueLookupMap.set(l.id.toLowerCase(), l));
  const dedupedLookups = Array.from(uniqueLookupMap.values());

  // Insert in chunks of 50
  for (let i = 0; i < dedupedLookups.length; i += 50) {
    const chunk = dedupedLookups.slice(i, i + 50);
    const { error: errLkp } = await admin.from('login_lookup').upsert(chunk);
    if (errLkp) console.warn('Lookup chunk error:', errLkp.message);
  }

  // 6. Verify Totals
  const { count: countClasses } = await admin.from('classes').select('*', { count: 'exact', head: true });
  const { count: countStaff } = await admin.from('staff').select('*', { count: 'exact', head: true });
  const { count: countStudents } = await admin.from('students').select('*', { count: 'exact', head: true });
  const { count: countParents } = await admin.from('parents').select('*', { count: 'exact', head: true });
  const { count: countUsers } = await admin.from('users').select('*', { count: 'exact', head: true });
  const { count: countLookups } = await admin.from('login_lookup').select('*', { count: 'exact', head: true });

  console.log('\n================ DATA SEEDING COMPLETE ================');
  console.log(`Classes:       ${countClasses} (Target: 12)`);
  console.log(`Staff/Teachers:${countStaff} (Target: 12)`);
  console.log(`Students:      ${countStudents} (Target: 60, exactly 5 per class)`);
  console.log(`Parents:       ${countParents} (Target: 60, both Father & Mother recorded)`);
  console.log(`Total Users:   ${countUsers} (2 admins + 12 teachers + 60 students + 60 parents = 134)`);
  console.log(`Login Lookups: ${countLookups}`);
  console.log('========================================================\n');
}

seedData().catch(err => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
