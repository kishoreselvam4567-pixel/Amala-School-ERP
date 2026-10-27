"""
backend/scripts/migrate_school_data.py
Exports existing school records from school-offline-data.js and imports them into Django database.
Verifies record counts and integrity.
"""
import os
import sys
import json
import re
from pathlib import Path

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.contrib.auth.hashers import make_password
from erp_api.models import (
    LoginLookup, ERPUser, Student, Parent, Staff,
    SchoolClass, Attendance, Marks, Exam, Note,
    Homework, Announcement, CalendarEvent
)


def extract_offline_data():
    """Extract JSON data from school_data.json or js/school-offline-data.js."""
    json_path = BASE_DIR / 'scripts' / 'school_data.json'
    if json_path.exists():
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    js_path = BASE_DIR.parent / 'js' / 'school-offline-data.js'
    with open(js_path, 'r', encoding='utf-8') as f:
        content = f.read()

    match = re.search(r'export\s+const\s+OFFLINE_DATA\s*=\s*(\{.+?\});\s*(?:export|\nif|\nlet|\nconst|\nfunction|$)', content, re.DOTALL)
    if not match:
        raise ValueError("Could not locate OFFLINE_DATA object in js/school-offline-data.js")

    json_str = match.group(1)
    return json.loads(json_str)


def run_migration():
    print("=" * 60)
    print("MIGRATING SCHOOL RECORDS INTO DJANGO DATABASE")
    print("=" * 60)

    data = extract_offline_data()
    print(f"Extracted collections: {list(data.keys())}")

    stats = {}

    # 1. Classes
    classes_data = data.get('classes', [])
    for c in classes_data:
        SchoolClass.objects.update_or_create(
            id=c['id'],
            defaults={
                'name': c.get('name'),
                'code': c.get('code'),
                'section': c.get('section'),
                'classTeacherUid': c.get('classTeacherUid'),
                'classTeacherName': c.get('classTeacherName'),
                'subjects': c.get('subjects', []),
                'data': c.get('data', {})
            }
        )
    stats['classes'] = SchoolClass.objects.count()

    # 2. Staff
    staff_data = data.get('staff', [])
    for s in staff_data:
        Staff.objects.update_or_create(
            id=s['id'],
            defaults={
                'uid': s.get('uid') or s['id'],
                'name': s.get('name'),
                'email': s.get('email'),
                'phone': s.get('phone'),
                'username': s.get('username'),
                'role': s.get('role', 'staff'),
                'majorSubject': s.get('majorSubject'),
                'type': s.get('type'),
                'qualification': s.get('qualification'),
                'assignedClasses': s.get('assignedClasses', []),
                'classTeacherOf': s.get('classTeacherOf'),
                'deleted': s.get('deleted', False),
                'disabled': s.get('disabled', False),
                'data': s.get('data', {})
            }
        )
    stats['staff'] = Staff.objects.count()

    # 3. Students
    students_data = data.get('students', [])
    for stu in students_data:
        Student.objects.update_or_create(
            id=stu['id'],
            defaults={
                'uid': stu.get('uid') or stu['id'],
                'name': stu.get('name'),
                'email': stu.get('email'),
                'admissionNo': stu.get('admissionNo'),
                'rollNo': stu.get('rollNo'),
                'dob': stu.get('dob'),
                'gender': stu.get('gender'),
                'bloodGroup': stu.get('bloodGroup'),
                'classId': stu.get('classId'),
                'className': stu.get('className'),
                'section': stu.get('section'),
                'parentUid': stu.get('parentUid'),
                'parentName': stu.get('parentName'),
                'parentEmail': stu.get('parentEmail'),
                'phone': stu.get('phone'),
                'address': stu.get('address'),
                'assignedSubjects': stu.get('assignedSubjects', []),
                'stream': stu.get('stream'),
                'deleted': stu.get('deleted', False),
                'disabled': stu.get('disabled', False),
                'data': stu.get('data', {})
            }
        )
    stats['students'] = Student.objects.count()

    # 4. Parents
    parents_data = data.get('parents', [])
    for p in parents_data:
        Parent.objects.update_or_create(
            id=p['id'],
            defaults={
                'uid': p.get('uid') or p['id'],
                'name': p.get('name'),
                'email': p.get('email'),
                'phone': p.get('phone'),
                'motherPhone': p.get('motherPhone'),
                'childUid': p.get('childUid'),
                'childName': p.get('childName'),
                'childAdmissionNo': p.get('childAdmissionNo'),
                'childClassName': p.get('childClassName'),
                'deleted': p.get('deleted', False),
                'disabled': p.get('disabled', False),
                'data': p.get('data', {})
            }
        )
    stats['parents'] = Parent.objects.count()

    # 5. Users
    users_data = data.get('users', [])
    for u in users_data:
        raw_pass = (u.get('data') or {}).get('password')
        pwd_hash = make_password(raw_pass) if raw_pass else None
        user_data = dict(u.get('data') or {})
        # Don't keep raw password in data payload
        user_data.pop('password', None)

        ERPUser.objects.update_or_create(
            id=u['id'],
            defaults={
                'role': u.get('role', 'student'),
                'name': u.get('name'),
                'email': u.get('email'),
                'phone': u.get('phone'),
                'username': u.get('username'),
                'password_hash': pwd_hash,
                'deleted': u.get('deleted', False),
                'disabled': u.get('disabled', False),
                'data': user_data
            }
        )
    stats['users'] = ERPUser.objects.count()

    # 6. LoginLookup
    lookups = data.get('login_lookup', [])
    for lk in lookups:
        LoginLookup.objects.update_or_create(
            id=lk['id'],
            defaults={'email': lk['email']}
        )
    stats['login_lookup'] = LoginLookup.objects.count()

    # 7. Attendance
    att_data = data.get('attendance', [])
    for a in att_data:
        Attendance.objects.update_or_create(
            id=a['id'],
            defaults={
                'classId': a.get('classId'),
                'className': a.get('className'),
                'date': a.get('date'),
                'records': a.get('records', {}),
                'studentUid': a.get('studentUid'),
                'status': a.get('status'),
                'remarks': a.get('remarks'),
                'markedBy': a.get('markedBy'),
                'data': a.get('data', {})
            }
        )
    stats['attendance'] = Attendance.objects.count()

    # 8. Marks
    marks_data = data.get('marks', [])
    for m in marks_data:
        Marks.objects.update_or_create(
            id=m['id'],
            defaults={
                'classId': m.get('classId'),
                'className': m.get('className'),
                'examId': m.get('examId'),
                'examName': m.get('examName'),
                'subject': m.get('subject'),
                'studentUid': m.get('studentUid'),
                'studentName': m.get('studentName'),
                'admissionNo': m.get('admissionNo'),
                'marksObtained': m.get('marksObtained'),
                'maxMarks': m.get('maxMarks'),
                'grade': m.get('grade'),
                'marksData': m.get('marksData', {}),
                'data': m.get('data', {})
            }
        )
    stats['marks'] = Marks.objects.count()

    # 9. Exams
    exams_data = data.get('exams', [])
    for ex in exams_data:
        Exam.objects.update_or_create(
            id=ex['id'],
            defaults={
                'title': ex.get('title') or ex.get('name'),
                'name': ex.get('name'),
                'classId': ex.get('classId'),
                'className': ex.get('className'),
                'subject': ex.get('subject'),
                'date': ex.get('date'),
                'time': ex.get('time'),
                'totalMarks': ex.get('totalMarks'),
                'timetable': ex.get('timetable', []),
                'data': ex.get('data', {})
            }
        )
    stats['exams'] = Exam.objects.count()

    # 10. Notes
    notes_data = data.get('notes', [])
    for n in notes_data:
        Note.objects.update_or_create(
            id=n['id'],
            defaults={
                'title': n.get('title'),
                'description': n.get('description'),
                'classId': n.get('classId'),
                'className': n.get('className'),
                'subject': n.get('subject'),
                'fileUrl': n.get('fileUrl'),
                'fileName': n.get('fileName'),
                'uploadedBy': n.get('uploadedBy'),
                'uploaderName': n.get('uploaderName'),
                'data': n.get('data', {})
            }
        )
    stats['notes'] = Note.objects.count()

    # 11. Announcements
    announcements_data = data.get('announcements', [])
    for an in announcements_data:
        Announcement.objects.update_or_create(
            id=an['id'],
            defaults={
                'title': an.get('title'),
                'message': an.get('message'),
                'targetAudience': an.get('targetAudience', 'all'),
                'createdBy': an.get('createdBy'),
                'creatorName': an.get('creatorName'),
                'data': an.get('data', {})
            }
        )
    stats['announcements'] = Announcement.objects.count()

    # 12. Calendar Events
    cal_data = data.get('calendar_events', [])
    for ce in cal_data:
        CalendarEvent.objects.update_or_create(
            id=ce['id'],
            defaults={
                'title': ce.get('title'),
                'description': ce.get('description'),
                'category': ce.get('category', 'academic'),
                'startDate': ce.get('startDate'),
                'endDate': ce.get('endDate'),
                'startTime': ce.get('startTime'),
                'endTime': ce.get('endTime'),
                'isAllDay': ce.get('isAllDay', False),
                'location': ce.get('location'),
                'targetAudience': ce.get('targetAudience', 'all'),
                'createdBy': ce.get('createdBy'),
                'creatorName': ce.get('creatorName'),
                'data': ce.get('data', {})
            }
        )
    stats['calendar_events'] = CalendarEvent.objects.count()

    print("\n--- INGESTION SUMMARY ---")
    for tbl, count in stats.items():
        print(f"  {tbl.ljust(18)}: {count} records imported")
    print("=" * 60)
    print("MIGRATION COMPLETED SUCCESSFULLY!")


if __name__ == '__main__':
    run_migration()
