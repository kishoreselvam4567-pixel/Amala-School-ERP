from django.db import models

class LoginLookup(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    email = models.EmailField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'login_lookup'
        ordering = ['id']

    def __str__(self):
        return f"{self.id} -> {self.email}"


class ERPUser(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    role = models.CharField(max_length=50, default='student', db_index=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True, db_index=True)
    phone = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    username = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    password_hash = models.CharField(max_length=255, null=True, blank=True)
    deleted = models.BooleanField(default=False, db_index=True)
    disabled = models.BooleanField(default=False)
    hasSeenFirstLoginGuide = models.BooleanField(default=False)
    firstLoginDone = models.BooleanField(default=False)
    firstLoginGuideShownAt = models.DateTimeField(null=True, blank=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        ordering = ['id']

    def __str__(self):
        return f"{self.name or self.id} ({self.role})"


class Student(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    uid = models.CharField(max_length=255, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    admissionNo = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    rollNo = models.CharField(max_length=50, null=True, blank=True)
    dob = models.CharField(max_length=50, null=True, blank=True)
    gender = models.CharField(max_length=20, null=True, blank=True)
    bloodGroup = models.CharField(max_length=20, null=True, blank=True)
    classId = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    className = models.CharField(max_length=100, null=True, blank=True)
    section = models.CharField(max_length=20, null=True, blank=True)
    parentUid = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    parentName = models.CharField(max_length=255, null=True, blank=True)
    parentEmail = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    assignedSubjects = models.JSONField(default=list, blank=True)
    stream = models.CharField(max_length=100, null=True, blank=True)
    deleted = models.BooleanField(default=False, db_index=True)
    disabled = models.BooleanField(default=False)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'students'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.admissionNo})"


class Parent(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    uid = models.CharField(max_length=255, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    motherPhone = models.CharField(max_length=50, null=True, blank=True)
    childUid = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    childName = models.CharField(max_length=255, null=True, blank=True)
    childAdmissionNo = models.CharField(max_length=100, null=True, blank=True)
    childClassName = models.CharField(max_length=100, null=True, blank=True)
    deleted = models.BooleanField(default=False, db_index=True)
    disabled = models.BooleanField(default=False)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'parents'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} (Parent of {self.childName})"


class Staff(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    uid = models.CharField(max_length=255, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    username = models.CharField(max_length=100, null=True, blank=True)
    role = models.CharField(max_length=50, default='staff', db_index=True)
    majorSubject = models.CharField(max_length=100, null=True, blank=True)
    type = models.CharField(max_length=50, null=True, blank=True)
    qualification = models.CharField(max_length=100, null=True, blank=True)
    assignedClasses = models.JSONField(default=list, blank=True)
    classTeacherOf = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    deleted = models.BooleanField(default=False, db_index=True)
    disabled = models.BooleanField(default=False)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'staff'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.majorSubject})"


class SchoolClass(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    name = models.CharField(max_length=100, null=True, blank=True)
    code = models.CharField(max_length=50, null=True, blank=True)
    section = models.CharField(max_length=20, null=True, blank=True)
    classTeacherUid = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    classTeacherName = models.CharField(max_length=255, null=True, blank=True)
    subjects = models.JSONField(default=list, blank=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'classes'
        ordering = ['name']

    def __str__(self):
        return self.name or self.id


class Attendance(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    classId = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    className = models.CharField(max_length=100, null=True, blank=True)
    date = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    records = models.JSONField(default=dict, blank=True)
    studentUid = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    status = models.CharField(max_length=50, null=True, blank=True)
    remarks = models.TextField(null=True, blank=True)
    markedBy = models.CharField(max_length=255, null=True, blank=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'attendance'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['classId', 'date'], name='att_cls_date_idx'),
        ]

    def __str__(self):
        return f"{self.className} on {self.date}"


class Marks(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    classId = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    className = models.CharField(max_length=100, null=True, blank=True)
    examId = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    examName = models.CharField(max_length=100, null=True, blank=True)
    subject = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    studentUid = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    studentName = models.CharField(max_length=255, null=True, blank=True)
    admissionNo = models.CharField(max_length=100, null=True, blank=True)
    marksObtained = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    maxMarks = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    grade = models.CharField(max_length=20, null=True, blank=True)
    marksData = models.JSONField(default=dict, blank=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'marks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['classId', 'subject'], name='marks_cls_subj_idx'),
            models.Index(fields=['studentUid', 'examId'], name='marks_stu_exam_idx'),
        ]

    def __str__(self):
        return f"{self.studentName} - {self.subject} ({self.marksObtained}/{self.maxMarks})"


class Exam(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    title = models.CharField(max_length=255, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    classId = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    className = models.CharField(max_length=100, null=True, blank=True)
    subject = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    date = models.CharField(max_length=50, null=True, blank=True)
    time = models.CharField(max_length=50, null=True, blank=True)
    totalMarks = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    timetable = models.JSONField(default=list, blank=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'exams'
        ordering = ['-created_at']

    def __str__(self):
        return self.title or self.name or self.id


class Note(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    title = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    classId = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    className = models.CharField(max_length=100, null=True, blank=True)
    subject = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    fileUrl = models.TextField(null=True, blank=True)
    fileName = models.CharField(max_length=255, null=True, blank=True)
    uploadedBy = models.CharField(max_length=255, null=True, blank=True)
    uploaderName = models.CharField(max_length=255, null=True, blank=True)
    data = models.JSONField(default=dict, blank=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notes'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.subject})"


class Homework(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    title = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    classId = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    className = models.CharField(max_length=100, null=True, blank=True)
    subject = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    dueDate = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    fileUrl = models.TextField(null=True, blank=True)
    fileName = models.CharField(max_length=255, null=True, blank=True)
    assignedBy = models.CharField(max_length=255, null=True, blank=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'homework'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} (Due: {self.dueDate})"


class Announcement(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    title = models.CharField(max_length=255, null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    targetAudience = models.CharField(max_length=100, default='all', db_index=True)
    createdBy = models.CharField(max_length=255, null=True, blank=True)
    creatorName = models.CharField(max_length=255, null=True, blank=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-created_at']

    def __str__(self):
        return self.title or self.id


class CalendarEvent(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    category = models.CharField(max_length=100, default='academic')
    startDate = models.CharField(max_length=50, db_index=True)
    endDate = models.CharField(max_length=50, null=True, blank=True)
    startTime = models.CharField(max_length=50, null=True, blank=True)
    endTime = models.CharField(max_length=50, null=True, blank=True)
    isAllDay = models.BooleanField(default=False)
    location = models.CharField(max_length=255, null=True, blank=True)
    targetAudience = models.CharField(max_length=100, default='all', db_index=True)
    createdBy = models.CharField(max_length=255, null=True, blank=True)
    creatorName = models.CharField(max_length=255, null=True, blank=True)
    data = models.JSONField(default=dict, blank=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'calendar_events'
        ordering = ['startDate']

    def __str__(self):
        return f"{self.title} ({self.startDate})"


class SubjectTeacherAssignment(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    classId = models.CharField(max_length=100, db_index=True)
    className = models.CharField(max_length=100, null=True, blank=True)
    section = models.CharField(max_length=20, null=True, blank=True)
    subject = models.CharField(max_length=100, db_index=True)
    teacherUid = models.CharField(max_length=255, db_index=True)
    teacherName = models.CharField(max_length=255, null=True, blank=True)
    teacherEmail = models.EmailField(null=True, blank=True)
    academicYear = models.CharField(max_length=50, default='2025-2026')
    status = models.CharField(max_length=20, default='active', db_index=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subject_teacher_assignments'
        unique_together = ['classId', 'subject', 'teacherUid']
        ordering = ['className', 'subject']

    def __str__(self):
        return f"{self.teacherName} -> {self.className} ({self.subject})"

    def save(self, *args, **kwargs):
        if not self.id:
            import uuid
            self.id = f"sta_{uuid.uuid4().hex[:10]}"
        super().save(*args, **kwargs)


class AuditLog(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    actorUid = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    actorName = models.CharField(max_length=255, null=True, blank=True)
    actorRole = models.CharField(max_length=50, null=True, blank=True)
    action = models.CharField(max_length=100, db_index=True)
    resource = models.CharField(max_length=100, db_index=True)
    resourceId = models.CharField(max_length=255, null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ipAddress = models.CharField(max_length=100, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp}] {self.actorName} ({self.actorRole}): {self.action} on {self.resource}"
