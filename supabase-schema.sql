-- ============================================================
-- SUPABASE SCHEMA & SECURITY POLICIES FOR AMALA SCHOOL ERP
-- Replaces Firestore with exact collection structure & RLS
-- ============================================================

-- 0. Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. CREATE ALL TABLES FIRST
-- ============================================================

-- 1.1 login_lookup (for username / admission / phone lookup before login)
CREATE TABLE IF NOT EXISTS public.login_lookup (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 users (mirrors /users/{uid})
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'student',
  name TEXT,
  email TEXT,
  phone TEXT,
  username TEXT,
  deleted BOOLEAN DEFAULT false,
  disabled BOOLEAN DEFAULT false,
  "hasSeenFirstLoginGuide" BOOLEAN DEFAULT false,
  "firstLoginDone" BOOLEAN DEFAULT false,
  "firstLoginGuideShownAt" TIMESTAMPTZ,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 students (mirrors /students/{uid})
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  uid TEXT,
  name TEXT,
  email TEXT,
  "admissionNo" TEXT,
  "rollNo" TEXT,
  dob TEXT,
  gender TEXT,
  "bloodGroup" TEXT,
  "classId" TEXT,
  "className" TEXT,
  section TEXT,
  "parentUid" TEXT,
  "parentName" TEXT,
  "parentEmail" TEXT,
  phone TEXT,
  address TEXT,
  "assignedSubjects" JSONB DEFAULT '[]',
  stream TEXT,
  deleted BOOLEAN DEFAULT false,
  disabled BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.4 parents (mirrors /parents/{uid})
CREATE TABLE IF NOT EXISTS public.parents (
  id TEXT PRIMARY KEY,
  uid TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  "motherPhone" TEXT,
  "childUid" TEXT,
  "childName" TEXT,
  "childAdmissionNo" TEXT,
  "childClassName" TEXT,
  deleted BOOLEAN DEFAULT false,
  disabled BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.5 staff (mirrors /staff/{uid})
CREATE TABLE IF NOT EXISTS public.staff (
  id TEXT PRIMARY KEY,
  uid TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  username TEXT,
  role TEXT DEFAULT 'staff',
  "majorSubject" TEXT,
  type TEXT,
  qualification TEXT,
  "assignedClasses" JSONB DEFAULT '[]',
  deleted BOOLEAN DEFAULT false,
  disabled BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.6 classes (mirrors /classes/{classId})
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  name TEXT,
  code TEXT,
  section TEXT,
  "classTeacherUid" TEXT,
  "classTeacherName" TEXT,
  subjects JSONB DEFAULT '[]',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.7 attendance (mirrors /attendance/{docId})
CREATE TABLE IF NOT EXISTS public.attendance (
  id TEXT PRIMARY KEY,
  "classId" TEXT,
  "className" TEXT,
  date TEXT,
  records JSONB DEFAULT '{}',
  "studentUid" TEXT,
  status TEXT,
  remarks TEXT,
  "markedBy" TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.8 marks (mirrors /marks/{docId})
CREATE TABLE IF NOT EXISTS public.marks (
  id TEXT PRIMARY KEY,
  "classId" TEXT,
  "className" TEXT,
  "examId" TEXT,
  "examName" TEXT,
  subject TEXT,
  "studentUid" TEXT,
  "studentName" TEXT,
  "admissionNo" TEXT,
  "marksObtained" NUMERIC,
  "maxMarks" NUMERIC,
  grade TEXT,
  "marksData" JSONB DEFAULT '{}',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.9 exams (mirrors /exams/{docId})
CREATE TABLE IF NOT EXISTS public.exams (
  id TEXT PRIMARY KEY,
  title TEXT,
  name TEXT,
  "classId" TEXT,
  "className" TEXT,
  subject TEXT,
  date TEXT,
  time TEXT,
  "totalMarks" NUMERIC,
  timetable JSONB DEFAULT '[]',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.10 notes (mirrors /notes/{docId})
CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  "classId" TEXT,
  "className" TEXT,
  subject TEXT,
  "fileUrl" TEXT,
  "fileName" TEXT,
  "uploadedBy" TEXT,
  "uploaderName" TEXT,
  data JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.11 homework (mirrors /homework/{docId})
CREATE TABLE IF NOT EXISTS public.homework (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  "classId" TEXT,
  "className" TEXT,
  subject TEXT,
  "dueDate" TEXT,
  "fileUrl" TEXT,
  "fileName" TEXT,
  "assignedBy" TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.12 announcements (mirrors /announcements/{docId})
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT,
  message TEXT,
  "targetAudience" TEXT,
  "createdBy" TEXT,
  "creatorName" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Also create synonym / view for camelCase 'loginLookup' with security_invoker to satisfy Supabase security linter
CREATE OR REPLACE VIEW public."loginLookup" WITH (security_invoker = true) AS SELECT * FROM public.login_lookup;

-- ============================================================
-- 2. HELPFUL INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students("classId");
CREATE INDEX IF NOT EXISTS idx_students_parent ON public.students("parentUid");
CREATE INDEX IF NOT EXISTS idx_students_admission ON public.students("admissionNo");
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance("classId", date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance("studentUid");
CREATE INDEX IF NOT EXISTS idx_marks_class ON public.marks("classId");
CREATE INDEX IF NOT EXISTS idx_marks_student ON public.marks("studentUid");
CREATE INDEX IF NOT EXISTS idx_notes_class ON public.notes("classId");
CREATE INDEX IF NOT EXISTS idx_homework_class ON public.homework("classId");
CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements(created_at DESC);

-- ============================================================
-- 3. HELPER FUNCTIONS (After tables exist so no 42P01 error)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT (
    COALESCE(auth.jwt()->>'email', '') IN (
      'amala@123.gmail.com',
      'admin@kishore.gmail.com',
      'amala123@gmail.com'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()::text AND role = 'admin' AND deleted IS NOT TRUE AND disabled IS NOT TRUE
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text AND role = 'staff' AND deleted IS NOT TRUE AND disabled IS NOT TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_admin() OR public.is_staff();
$$;

-- ============================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.login_lookup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES (Mirrors firestore.rules exactly)
-- ============================================================

-- 5.1 login_lookup: public read (single lookup during login), admin write
DROP POLICY IF EXISTS "login_lookup_read" ON public.login_lookup;
CREATE POLICY "login_lookup_read" ON public.login_lookup FOR SELECT USING (true);

DROP POLICY IF EXISTS "login_lookup_admin_all" ON public.login_lookup;
CREATE POLICY "login_lookup_admin_all" ON public.login_lookup FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5.2 users: user can read/write their own doc; admin can read/write all
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT USING (
  auth.uid()::text = id OR public.is_admin()
);

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (
  auth.uid()::text = id OR public.is_admin()
);

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (
  auth.uid()::text = id OR public.is_admin()
);

DROP POLICY IF EXISTS "users_delete" ON public.users;
CREATE POLICY "users_delete" ON public.users FOR DELETE USING (public.is_admin());

-- 5.3 classes: signed-in users can read, admin can write
DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select" ON public.classes FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "classes_admin_all" ON public.classes;
CREATE POLICY "classes_admin_all" ON public.classes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5.4 students: own-record get for students, admin/staff can list & manage
DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select" ON public.students FOR SELECT USING (
  auth.uid()::text = id OR public.is_admin_or_staff()
);

DROP POLICY IF EXISTS "students_insert" ON public.students;
CREATE POLICY "students_insert" ON public.students FOR INSERT WITH CHECK (
  auth.uid()::text = id OR public.is_admin()
);

DROP POLICY IF EXISTS "students_update" ON public.students;
CREATE POLICY "students_update" ON public.students FOR UPDATE USING (
  auth.uid()::text = id OR public.is_admin_or_staff()
);

DROP POLICY IF EXISTS "students_delete" ON public.students;
CREATE POLICY "students_delete" ON public.students FOR DELETE USING (public.is_admin());

-- 5.5 staff: own-record get for staff, admin can list & write
DROP POLICY IF EXISTS "staff_select" ON public.staff;
CREATE POLICY "staff_select" ON public.staff FOR SELECT USING (
  auth.uid()::text = id OR public.is_admin()
);

DROP POLICY IF EXISTS "staff_admin_all" ON public.staff;
CREATE POLICY "staff_admin_all" ON public.staff FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5.6 parents: own-record get for parent, admin can list & write
DROP POLICY IF EXISTS "parents_select" ON public.parents;
CREATE POLICY "parents_select" ON public.parents FOR SELECT USING (
  auth.uid()::text = id OR public.is_admin()
);

DROP POLICY IF EXISTS "parents_insert" ON public.parents;
CREATE POLICY "parents_insert" ON public.parents FOR INSERT WITH CHECK (
  auth.uid()::text = id OR public.is_admin()
);

DROP POLICY IF EXISTS "parents_update" ON public.parents;
CREATE POLICY "parents_update" ON public.parents FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "parents_delete" ON public.parents;
CREATE POLICY "parents_delete" ON public.parents FOR DELETE USING (public.is_admin());

-- 5.7 attendance, marks, exams, notes, homework: signed-in read, admin/staff write
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select" ON public.attendance FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "attendance_staff_all" ON public.attendance;
CREATE POLICY "attendance_staff_all" ON public.attendance FOR ALL USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "marks_select" ON public.marks;
CREATE POLICY "marks_select" ON public.marks FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "marks_staff_all" ON public.marks;
CREATE POLICY "marks_staff_all" ON public.marks FOR ALL USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "exams_select" ON public.exams;
CREATE POLICY "exams_select" ON public.exams FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "exams_staff_all" ON public.exams;
CREATE POLICY "exams_staff_all" ON public.exams FOR ALL USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "notes_select" ON public.notes;
CREATE POLICY "notes_select" ON public.notes FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "notes_staff_all" ON public.notes;
CREATE POLICY "notes_staff_all" ON public.notes FOR ALL USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "homework_select" ON public.homework;
CREATE POLICY "homework_select" ON public.homework FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "homework_staff_all" ON public.homework;
CREATE POLICY "homework_staff_all" ON public.homework FOR ALL USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

-- 5.8 announcements: signed-in read, admin write
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
CREATE POLICY "announcements_select" ON public.announcements FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "announcements_admin_all" ON public.announcements;
CREATE POLICY "announcements_admin_all" ON public.announcements FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 6. REALTIME PUBLICATION
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
END $$;

-- ============================================================
-- 7. STORAGE BUCKET & POLICIES
-- ============================================================
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('school-files', 'school-files', true)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  -- In case storage schema permissions differ, proceed safely
  NULL;
END $$;

DROP POLICY IF EXISTS "storage_school_files_select" ON storage.objects;
CREATE POLICY "storage_school_files_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'school-files'
);

DROP POLICY IF EXISTS "storage_school_files_insert" ON storage.objects;
CREATE POLICY "storage_school_files_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'school-files' AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "storage_school_files_update" ON storage.objects;
CREATE POLICY "storage_school_files_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'school-files' AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "storage_school_files_delete" ON storage.objects;
CREATE POLICY "storage_school_files_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'school-files' AND auth.uid() IS NOT NULL
);
