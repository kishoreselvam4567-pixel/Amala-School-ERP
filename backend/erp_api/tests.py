from django.test import TestCase
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from erp_api.models import ERPUser, Student, Staff, SchoolClass, Attendance, Marks, Announcement

class ERPFullStackTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Admin
        self.admin = ERPUser.objects.create(
            id='admin_test_root',
            role='admin',
            email='admin@amalatesthss.edu',
            name='Test Administrator',
            password_hash='amala@123'
        )

        # Create Staff
        self.staff = ERPUser.objects.create(
            id='stf_test_01',
            role='staff',
            email='staff01@amalatesthss.edu',
            name='Test Teacher 1',
            password_hash='Teacher@123'
        )
        self.staff_doc = Staff.objects.create(
            id='stf_test_01',
            name='Test Teacher 1',
            qualification='M.Sc., B.Ed.',
            majorSubject='Mathematics'
        )

        # Create Class
        self.school_class = SchoolClass.objects.create(
            id='cls_test_10a',
            name='Class 10-A',
            section='A',
            classTeacherUid='stf_test_01',
            classTeacherName='Test Teacher 1',
            subjects=['English', 'Mathematics', 'Science']
        )

        # Create Student
        self.student = ERPUser.objects.create(
            id='stu_test_101',
            role='student',
            email='student101@amalatesthss.edu',
            name='Test Student 1',
            password_hash='Student@123'
        )
        self.student_doc = Student.objects.create(
            id='stu_test_101',
            name='Test Student 1',
            admissionNo='ADM-TEST-101',
            classId='cls_test_10a',
            className='Class 10-A',
            section='A'
        )

    # 1. LOGIN TESTS
    def test_admin_login(self):
        res = self.client.post('/api/auth/login/', {'identifier': 'admin@amalatesthss.edu', 'password': 'amala@123'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data.get('role'), 'admin')

    def test_staff_login(self):
        res = self.client.post('/api/auth/login/', {'identifier': 'staff01@amalatesthss.edu', 'password': 'Teacher@123'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data.get('role'), 'staff')

    def test_invalid_login(self):
        res = self.client.post('/api/auth/login/', {'identifier': 'staff01@amalatesthss.edu', 'password': 'wrong'}, format='json')
        self.assertEqual(res.status_code, 401)
        self.assertIn('Incorrect Password', res.data.get('error'))

    # 2. RBAC TESTS
    def test_guest_cannot_delete_student(self):
        res = self.client.delete(f'/api/students/{self.student_doc.id}/')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_delete_student(self):
        res = self.client.delete(f'/api/students/{self.student_doc.id}/', HTTP_X_USER_UID='admin_test_root')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(Student.objects.filter(id=self.student_doc.id).exists())

    def test_spoofed_admin_role_rejected(self):
        res = self.client.post('/api/classes/', {'id': 'cls_spoofed', 'name': 'Spoofed Class'}, format='json', HTTP_X_USER_ROLE='admin')
        self.assertEqual(res.status_code, 403)

    # 3. STRUCTURED LOGGING HEADER TEST
    def test_request_id_attached(self):
        res = self.client.get('/api/classes/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.has_header('X-Request-Id'))

    # 4. STORAGE FILE UPLOAD VALIDATION
    def test_blocked_file_upload(self):
        bad_file = SimpleUploadedFile('test.exe', b'binary', content_type='application/octet-stream')
        res = self.client.post('/api/storage/upload/', {'file': bad_file}, format='multipart')
        self.assertEqual(res.status_code, 400)

    def test_allowed_file_upload(self):
        good_file = SimpleUploadedFile('notes.pdf', b'%PDF-1.4 sample', content_type='application/pdf')
        res = self.client.post('/api/storage/upload/', {'file': good_file}, format='multipart')
        self.assertEqual(res.status_code, 200)
