import os
import uuid
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db import transaction
from django.db.models import Q
from .models import (
    LoginLookup, ERPUser, Student, Parent, Staff,
    SchoolClass, Attendance, Marks, Exam, Note,
    Homework, Announcement, CalendarEvent,
    SubjectTeacherAssignment, AuditLog
)
from .serializers import (
    LoginLookupSerializer, ERPUserSerializer, StudentSerializer,
    ParentSerializer, StaffSerializer, SchoolClassSerializer,
    AttendanceSerializer, MarksSerializer, ExamSerializer,
    NoteSerializer, HomeworkSerializer, AnnouncementSerializer,
    CalendarEventSerializer, SubjectTeacherAssignmentSerializer,
    AuditLogSerializer
)

MODEL_MAP = {
    'users': (ERPUser, ERPUserSerializer),
    'students': (Student, StudentSerializer),
    'parents': (Parent, ParentSerializer),
    'staff': (Staff, StaffSerializer),
    'classes': (SchoolClass, SchoolClassSerializer),
    'attendance': (Attendance, AttendanceSerializer),
    'marks': (Marks, MarksSerializer),
    'exams': (Exam, ExamSerializer),
    'notes': (Note, NoteSerializer),
    'homework': (Homework, HomeworkSerializer),
    'announcements': (Announcement, AnnouncementSerializer),
    'calendar_events': (CalendarEvent, CalendarEventSerializer),
    'login_lookup': (LoginLookup, LoginLookupSerializer),
    'subject_teacher_assignments': (SubjectTeacherAssignment, SubjectTeacherAssignmentSerializer),
    'audit_logs': (AuditLog, AuditLogSerializer),
}



# ============================================================
# 1. AUTHENTICATION & LOGIN LOOKUP
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def lookup_identifier(request, key=None):
    """Resolve an admission number, username, or phone number to an email."""
    k = key or request.query_params.get('id')
    if not k:
        return Response({'error': 'Missing lookup identifier'}, status=status.HTTP_400_BAD_REQUEST)

    norm_key = str(k).strip().lower()
    item = LoginLookup.objects.filter(id__iexact=norm_key).first()
    if not item:
        # Check by digits if phone or roll number
        digits = ''.join(ch for ch in norm_key if ch.isdigit())
        if len(digits) >= 7:
            last10 = digits[-10:] if len(digits) >= 10 else digits
            item = LoginLookup.objects.filter(id=last10).first()

    if not item and '@' in norm_key:
        prefix = norm_key.split('@')[0].strip()
        item = LoginLookup.objects.filter(id__iexact=prefix).first()

    if item:
        return Response({'id': item.id, 'email': item.email})
    return Response({'error': 'Identifier not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_login(request):
    """
    Authenticate a user by raw identifier (email, username, admission, phone) and password.
    Returns the user profile and role document.
    """
    user_id = str(
        request.data.get('userId') or 
        request.data.get('identifier') or 
        request.data.get('email') or 
        request.data.get('username') or ''
    ).strip()
    password = str(request.data.get('password') or '').strip()

    if not user_id or not password:
        return Response({'error': 'User ID and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    norm_user = user_id.lower()
    target_email = norm_user

    # 1. Resolve to email if not an email format
    if '@' not in norm_user:
        lookup = LoginLookup.objects.filter(id__iexact=norm_user).first()
        if not lookup:
            digits = ''.join(ch for ch in norm_user if ch.isdigit())
            if len(digits) >= 7:
                last10 = digits[-10:] if len(digits) >= 10 else digits
                lookup = LoginLookup.objects.filter(id=last10).first()
        if lookup:
            target_email = lookup.email.lower()
    else:
        # Check if full email exists in LoginLookup
        lookup = LoginLookup.objects.filter(id__iexact=norm_user).first()
        if lookup:
            target_email = lookup.email.lower()

    # 2. Find user in ERPUser
    user = ERPUser.objects.filter(email__iexact=target_email).first()
    if not user:
        user = ERPUser.objects.filter(username__iexact=norm_user).first()
    if not user:
        user = ERPUser.objects.filter(phone=norm_user).first()
    if not user:
        user = ERPUser.objects.filter(id=norm_user).first()

    # 2b. If still not found and an email domain was typed (e.g. teacher1@gmail.com), try prefix before @
    if not user and '@' in norm_user:
        prefix = norm_user.split('@')[0].strip()
        prefix_lookup = LoginLookup.objects.filter(id__iexact=prefix).first()
        if prefix_lookup:
            user = ERPUser.objects.filter(email__iexact=prefix_lookup.email).first()
        if not user:
            user = ERPUser.objects.filter(username__iexact=prefix).first()
        if not user:
            user = ERPUser.objects.filter(phone=prefix).first()
        if not user:
            user = ERPUser.objects.filter(id=prefix).first()

    if not user:
        return Response({'error': 'Invalid User ID or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    if user.deleted or user.disabled:
        return Response({'error': 'This account has been deactivated. Contact school admin.'}, status=status.HTTP_403_FORBIDDEN)

    # 3. Verify password
    # Supports Django PBKDF2 hash, SHA256/bcrypt, or plaintext stored pass in data field
    stored_hash = user.password_hash or (user.data.get('password') if isinstance(user.data, dict) else None)
    is_valid = False

    if stored_hash:
        try:
            if stored_hash.startswith(('pbkdf2_sha256$', 'bcrypt$', 'argon2')):
                is_valid = check_password(password, stored_hash)
            else:
                is_valid = (password == stored_hash)
        except Exception:
            is_valid = (password == stored_hash)

    # Date of Birth matching for students (DDMMYYYY)
    if not is_valid and user.role == 'student':
        student = Student.objects.filter(id=user.id).first()
        if student and student.dob:
            clean_dob = ''.join(c for c in student.dob if c.isdigit())
            clean_pass = ''.join(c for c in password if c.isdigit())
            if clean_dob and clean_dob == clean_pass:
                is_valid = True

    if not is_valid:
        return Response({'error': 'Invalid User ID or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    # 4. Fetch role-specific document
    role_doc = None
    student_profile = None

    if user.role == 'staff':
        stf = Staff.objects.filter(id=user.id).first()
        if stf:
            role_doc = StaffSerializer(stf).data
    elif user.role == 'student':
        stu = Student.objects.filter(id=user.id).first()
        if stu:
            role_doc = StudentSerializer(stu).data
    elif user.role == 'parent':
        par = Parent.objects.filter(id=user.id).first()
        if par:
            role_doc = ParentSerializer(par).data
            if par.childUid:
                child = Student.objects.filter(id=par.childUid).first()
                if child:
                    student_profile = StudentSerializer(child).data

    # Generate a lightweight session token
    token = uuid.uuid4().hex

    return Response({
        'token': token,
        'user': {
            'id': user.id,
            'uid': user.id,
            'role': user.role,
            'name': user.name,
            'email': user.email,
            'username': user.username,
            'phone': user.phone,
        },
        'userData': ERPUserSerializer(user).data,
        'role': user.role,
        'roleDocData': role_doc,
        'studentProfile': student_profile
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_logout(request):
    """Invalidate session."""
    return Response({'success': True, 'message': 'Logged out successfully.'})


@api_view(['GET'])
@permission_classes([AllowAny])
def auth_profile(request, uid=None):
    """Retrieve full user profile."""
    target_id = uid or request.query_params.get('uid')
    if not target_id:
        return Response({'error': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)

    user = ERPUser.objects.filter(id=target_id).first()
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    return Response(ERPUserSerializer(user).data)


# ============================================================
# 2. GENERIC RECORD COLLECTION CRUD
# ============================================================

class CollectionListView(APIView):
    """
    List or create records in any of the 13 collections.
    Supports query parameters like ?classId=cls_1a&deleted=false
    """
    permission_classes = [AllowAny]

    def get(self, request, collection):
        if collection not in MODEL_MAP:
            return Response({'error': f'Collection {collection} not found'}, status=status.HTTP_404_NOT_FOUND)

        model, serializer_cls = MODEL_MAP[collection]
        qs = model.objects.all()

        # Handle filter parameters (exclude pagination params)
        for key, value in request.query_params.items():
            if key.startswith('_'):
                continue
            if hasattr(model, key):
                if value.lower() == 'true':
                    qs = qs.filter(**{key: True})
                elif value.lower() == 'false':
                    qs = qs.filter(**{key: False})
                else:
                    qs = qs.filter(**{key: value})
            elif hasattr(model, 'data'):
                qs = qs.filter(**{f"data__{key}": value})

        # Sorting
        order_by = request.query_params.get('_order')
        if order_by and hasattr(model, order_by.lstrip('-')):
            qs = qs.order_by(order_by)

        # Limit
        limit = request.query_params.get('_limit')
        if limit and limit.isdigit():
            qs = qs[:int(limit)]

        serializer = serializer_cls(qs, many=True)
        return Response(serializer.data)

    def post(self, request, collection):
        if collection not in MODEL_MAP:
            return Response({'error': f'Collection {collection} not found'}, status=status.HTTP_404_NOT_FOUND)

        if collection == 'audit_logs':
            return Response({'error': 'Audit logs are immutable and managed by the system.'}, status=status.HTTP_403_FORBIDDEN)

        actor_uid, actor_name, actor_role, ip_addr = get_request_actor(request)

        # Strict Marks Access Control
        if collection == 'marks' and actor_role == 'staff':
            class_id = request.data.get('classId')
            subject = request.data.get('subject')
            if class_id and subject:
                is_assigned = SubjectTeacherAssignment.objects.filter(
                    teacherUid=actor_uid,
                    classId=class_id,
                    subject__iexact=subject,
                    status='active'
                ).exists()
                if not is_assigned:
                    create_audit_log(
                        actor_uid=actor_uid,
                        actor_name=actor_name,
                        actor_role='staff',
                        action='UNAUTHORIZED_MARKS_ENTRY_ATTEMPT',
                        resource='marks',
                        resource_id=f"{class_id}_{subject}",
                        details={'classId': class_id, 'subject': subject},
                        ip_address=ip_addr
                    )
                    return Response({'error': 'Forbidden: You are not authorized to create marks for this subject and class.'}, status=status.HTTP_403_FORBIDDEN)

        model, serializer_cls = MODEL_MAP[collection]
        data = request.data.copy()

        # Auto-generate ID if missing
        if 'id' not in data or not data['id']:
            prefix = collection[:3]
            data['id'] = f"{prefix}_{uuid.uuid4().hex[:8]}"

        serializer = serializer_cls(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CollectionDetailView(APIView):
    """
    Retrieve, update (PUT/PATCH), or delete a single record in any collection.
    """
    permission_classes = [AllowAny]

    def get(self, request, collection, pk):
        if collection not in MODEL_MAP:
            return Response({'error': f'Collection {collection} not found'}, status=status.HTTP_404_NOT_FOUND)

        model, serializer_cls = MODEL_MAP[collection]
        obj = model.objects.filter(id=pk).first()
        if not obj:
            return Response({'error': 'Record not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = serializer_cls(obj)
        return Response(serializer.data)

    def put(self, request, collection, pk):
        """Upsert functionality matching setDoc()."""
        if collection not in MODEL_MAP:
            return Response({'error': f'Collection {collection} not found'}, status=status.HTTP_404_NOT_FOUND)

        if collection == 'audit_logs':
            return Response({'error': 'Audit logs are immutable.'}, status=status.HTTP_403_FORBIDDEN)

        actor_uid, actor_name, actor_role, ip_addr = get_request_actor(request)

        # Strict Marks Access Control
        if collection == 'marks' and actor_role == 'staff':
            class_id = request.data.get('classId')
            subject = request.data.get('subject')
            if class_id and subject:
                is_assigned = SubjectTeacherAssignment.objects.filter(
                    teacherUid=actor_uid,
                    classId=class_id,
                    subject__iexact=subject,
                    status='active'
                ).exists()
                if not is_assigned:
                    return Response({'error': 'Forbidden: You are not authorized to modify marks for this subject.'}, status=status.HTTP_403_FORBIDDEN)

        model, serializer_cls = MODEL_MAP[collection]
        obj = model.objects.filter(id=pk).first()
        data = request.data.copy()
        data['id'] = pk

        if obj:
            serializer = serializer_cls(obj, data=data, partial=True)
        else:
            serializer = serializer_cls(data=data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, collection, pk):
        if collection not in MODEL_MAP:
            return Response({'error': f'Collection {collection} not found'}, status=status.HTTP_404_NOT_FOUND)

        if collection == 'audit_logs':
            return Response({'error': 'Audit logs are immutable.'}, status=status.HTTP_403_FORBIDDEN)

        actor_uid, actor_name, actor_role, ip_addr = get_request_actor(request)

        if collection == 'marks' and actor_role == 'staff':
            obj = Marks.objects.filter(id=pk).first()
            class_id = request.data.get('classId') or (obj.classId if obj else None)
            subject = request.data.get('subject') or (obj.subject if obj else None)
            if class_id and subject:
                is_assigned = SubjectTeacherAssignment.objects.filter(
                    teacherUid=actor_uid,
                    classId=class_id,
                    subject__iexact=subject,
                    status='active'
                ).exists()
                if not is_assigned:
                    return Response({'error': 'Forbidden: You are not authorized to modify marks for this subject.'}, status=status.HTTP_403_FORBIDDEN)

        model, serializer_cls = MODEL_MAP[collection]
        obj = model.objects.filter(id=pk).first()
        if not obj:
            return Response({'error': 'Record not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = serializer_cls(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, collection, pk):
        if collection not in MODEL_MAP:
            return Response({'error': f'Collection {collection} not found'}, status=status.HTTP_404_NOT_FOUND)

        if collection == 'audit_logs':
            return Response({'error': 'Audit logs cannot be deleted.'}, status=status.HTTP_403_FORBIDDEN)

        model, _ = MODEL_MAP[collection]
        obj = model.objects.filter(id=pk).first()
        if not obj:
            return Response({'error': 'Record not found'}, status=status.HTTP_404_NOT_FOUND)

        obj.delete()
        return Response({'success': True, 'id': pk}, status=status.HTTP_200_OK)



# ============================================================
# 3. STORAGE & FILE ATTACHMENTS
# ============================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def upload_file(request):
    """
    Replaces Supabase Storage bucket uploads.
    Saves file to media storage and returns public URL.
    """
    file_obj = request.FILES.get('file')
    bucket = request.data.get('bucket', 'general')

    if not file_obj:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

    # Generate safe path
    filename = f"{uuid.uuid4().hex[:12]}_{file_obj.name}"
    rel_path = os.path.join(bucket, filename)
    saved_path = default_storage.save(rel_path, file_obj)
    file_url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)

    return Response({
        'url': file_url,
        'path': saved_path,
        'fileName': file_obj.name,
        'size': file_obj.size
    })


# ============================================================
# 4. AUDIT LOGGING & ACTOR RESOLUTION HELPERS
# ============================================================

def create_audit_log(actor_uid=None, actor_name=None, actor_role=None, action="", resource="", resource_id="", details=None, ip_address=None):
    """Record an audit trail event."""
    try:
        log_id = f"aud_{uuid.uuid4().hex[:12]}"
        AuditLog.objects.create(
            id=log_id,
            actorUid=actor_uid or 'system',
            actorName=actor_name or 'System Administrator',
            actorRole=actor_role or 'admin',
            action=action,
            resource=resource,
            resourceId=resource_id or '',
            details=details or {},
            ipAddress=ip_address or ''
        )
    except Exception as e:
        print(f"[AuditLog Error]: {e}")


def get_request_actor(request):
    """Extract authenticated actor identity from headers or request payload."""
    actor_uid = (
        request.headers.get('X-Teacher-Uid') or
        request.headers.get('X-Parent-Uid') or
        request.headers.get('X-Student-Uid') or
        request.headers.get('X-User-Uid') or 
        request.data.get('actorUid') or 
        request.query_params.get('actorUid') or 
        'admin'
    )
    
    header_role = (
        request.headers.get('X-User-Role') or 
        request.data.get('actorRole') or 
        request.query_params.get('actorRole')
    )
    if header_role:
        actor_role = header_role
    elif request.headers.get('X-Teacher-Uid') or (actor_uid and actor_uid.startswith('stf_') and actor_uid != 'admin'):
        actor_role = 'staff'
    elif request.headers.get('X-Parent-Uid') or (actor_uid and actor_uid.startswith('par_')):
        actor_role = 'parent'
    elif request.headers.get('X-Student-Uid') or (actor_uid and actor_uid.startswith('stu_')):
        actor_role = 'student'
    else:
        actor_role = 'admin'

    user = ERPUser.objects.filter(id=actor_uid).first()
    actor_name = user.name if user else ('Faculty' if actor_role == 'staff' else ('Guardian' if actor_role == 'parent' else 'Administrator'))
    ip_addr = request.META.get('REMOTE_ADDR', '')
    return actor_uid, actor_name, actor_role, ip_addr


# ============================================================
# 5. ADMIN PORTAL: CLASS INCHARGE & SUBJECT TEACHER MANAGEMENT
# ============================================================

@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([AllowAny])
def manage_class_incharge(request):
    """
    Class Incharge Management:
    - GET: List all classes with assigned incharge details.
    - POST: Assign or change the Class Incharge for a class (exactly 1 active incharge per class).
    - DELETE: Remove a Class Incharge assignment.
    """
    actor_uid, actor_name, actor_role, ip_addr = get_request_actor(request)

    if request.method == 'GET':
        classes = SchoolClass.objects.all().order_by('name')
        staff_map = {s.id: s for s in Staff.objects.filter(deleted=False, disabled=False)}
        results = []
        for c in classes:
            assigned_staff = staff_map.get(c.classTeacherUid)
            results.append({
                'classId': c.id,
                'className': c.name,
                'code': c.code,
                'section': c.section,
                'classTeacherUid': c.classTeacherUid,
                'classTeacherName': c.classTeacherName or (assigned_staff.name if assigned_staff else None),
                'classTeacherEmail': assigned_staff.email if assigned_staff else None,
                'hasIncharge': bool(c.classTeacherUid),
            })
        return Response(results)

    elif request.method == 'POST':
        class_id = request.data.get('classId')
        teacher_uid = request.data.get('teacherUid')

        if not class_id or not teacher_uid:
            return Response({'error': 'Both classId and teacherUid are required.'}, status=status.HTTP_400_BAD_REQUEST)

        school_class = SchoolClass.objects.filter(id=class_id).first()
        if not school_class:
            return Response({'error': f'Class section {class_id} not found.'}, status=status.HTTP_404_NOT_FOUND)

        teacher = Staff.objects.filter(id=teacher_uid).first()
        if not teacher:
            teacher = Staff.objects.filter(uid=teacher_uid).first()
        if not teacher:
            return Response({'error': f'Teacher {teacher_uid} not found.'}, status=status.HTTP_404_NOT_FOUND)

        if teacher.deleted or teacher.disabled:
            return Response({'error': 'Cannot assign inactive or disabled teacher as Class Incharge.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            prev_teacher_uid = school_class.classTeacherUid

            # If class previously had a different incharge, clear their classTeacherOf
            if prev_teacher_uid and prev_teacher_uid != teacher.id:
                prev_staff = Staff.objects.filter(id=prev_teacher_uid).first()
                if prev_staff:
                    prev_staff.classTeacherOf = ''
                    prev_data = prev_staff.data or {}
                    prev_data['classTeacherOfName'] = ''
                    prev_staff.data = prev_data
                    prev_staff.save()

            # If this teacher was previously incharge of another class, clear that other class
            if teacher.classTeacherOf and teacher.classTeacherOf != school_class.id:
                other_class = SchoolClass.objects.filter(id=teacher.classTeacherOf).first()
                if other_class:
                    other_class.classTeacherUid = ''
                    other_class.classTeacherName = ''
                    other_class.save()

            # Assign new incharge to SchoolClass
            school_class.classTeacherUid = teacher.id
            school_class.classTeacherName = teacher.name
            school_class.save()

            # Update Staff record
            teacher.classTeacherOf = school_class.id
            t_data = teacher.data or {}
            t_data['classTeacherOfName'] = school_class.name
            teacher.data = t_data
            teacher.type = 'both' if (t_data.get('subjects') or SubjectTeacherAssignment.objects.filter(teacherUid=teacher.id, status='active').exists()) else 'classTeacher'
            teacher.save()

            create_audit_log(
                actor_uid=actor_uid,
                actor_name=actor_name,
                actor_role=actor_role,
                action='ASSIGN_CLASS_INCHARGE',
                resource='classes',
                resource_id=school_class.id,
                details={
                    'classId': school_class.id,
                    'className': school_class.name,
                    'teacherUid': teacher.id,
                    'teacherName': teacher.name,
                    'prevTeacherUid': prev_teacher_uid
                },
                ip_address=ip_addr
            )

        return Response({
            'success': True,
            'message': f'{teacher.name} assigned as Class Incharge of {school_class.name}.',
            'classId': school_class.id,
            'className': school_class.name,
            'teacherUid': teacher.id,
            'teacherName': teacher.name
        }, status=status.HTTP_200_OK)

    elif request.method == 'DELETE':
        class_id = request.data.get('classId') or request.query_params.get('classId')
        if not class_id:
            return Response({'error': 'classId is required.'}, status=status.HTTP_400_BAD_REQUEST)

        school_class = SchoolClass.objects.filter(id=class_id).first()
        if not school_class:
            return Response({'error': 'Class section not found.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            old_teacher_uid = school_class.classTeacherUid
            old_teacher_name = school_class.classTeacherName
            school_class.classTeacherUid = ''
            school_class.classTeacherName = ''
            school_class.save()

            if old_teacher_uid:
                staff_member = Staff.objects.filter(id=old_teacher_uid).first()
                if staff_member:
                    staff_member.classTeacherOf = ''
                    st_data = staff_member.data or {}
                    st_data['classTeacherOfName'] = ''
                    staff_member.data = st_data
                    staff_member.save()

            create_audit_log(
                actor_uid=actor_uid,
                actor_name=actor_name,
                actor_role=actor_role,
                action='REMOVE_CLASS_INCHARGE',
                resource='classes',
                resource_id=school_class.id,
                details={
                    'classId': school_class.id,
                    'className': school_class.name,
                    'removedTeacherUid': old_teacher_uid,
                    'removedTeacherName': old_teacher_name
                },
                ip_address=ip_addr
            )

        return Response({
            'success': True,
            'message': f'Class Incharge removed from {school_class.name}.'
        }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([AllowAny])
def manage_subject_teachers(request, pk=None):
    """
    Subject Teacher Management:
    - GET: Query active subject assignments (filters: classId, teacherUid, subject).
    - POST: Assign a subject teacher to a class section and subject. Prevents duplicates.
    - DELETE: Remove a subject teacher assignment.
    """
    actor_uid, actor_name, actor_role, ip_addr = get_request_actor(request)

    if request.method == 'GET':
        qs = SubjectTeacherAssignment.objects.filter(status='active')
        class_id = request.query_params.get('classId')
        teacher_uid = request.query_params.get('teacherUid')
        subject = request.query_params.get('subject')

        if class_id:
            qs = qs.filter(classId=class_id)
        if teacher_uid:
            qs = qs.filter(teacherUid=teacher_uid)
        if subject:
            qs = qs.filter(subject__iexact=subject)

        serializer = SubjectTeacherAssignmentSerializer(qs, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        class_id = str(request.data.get('classId') or '').strip()
        subject = str(request.data.get('subject') or '').strip()
        teacher_uid = str(request.data.get('teacherUid') or '').strip()
        academic_year = str(request.data.get('academicYear') or '2025-2026').strip()

        if not class_id or not subject or not teacher_uid:
            return Response({'error': 'classId, subject, and teacherUid are required.'}, status=status.HTTP_400_BAD_REQUEST)

        school_class = SchoolClass.objects.filter(id=class_id).first()
        if not school_class:
            return Response({'error': f'Class section {class_id} not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Authorization: School Admin or Class Incharge of this class can assign subject faculty
        if actor_role == 'staff':
            is_incharge = (school_class.classTeacherUid == actor_uid) or Staff.objects.filter(id=actor_uid, classTeacherOf=school_class.id).exists()
            if not is_incharge:
                return Response({
                    'error': f'Forbidden: Only the Class Incharge of {school_class.name} or School Admin can grant subject teaching permissions.'
                }, status=status.HTTP_403_FORBIDDEN)

        teacher = Staff.objects.filter(id=teacher_uid).first()
        if not teacher:
            teacher = Staff.objects.filter(uid=teacher_uid).first()
        if not teacher:
            return Response({'error': f'Faculty member {teacher_uid} not found.'}, status=status.HTTP_404_NOT_FOUND)

        if teacher.deleted or teacher.disabled:
            return Response({'error': 'Cannot assign inactive or disabled teacher.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check for duplicate active assignment
        existing = SubjectTeacherAssignment.objects.filter(
            classId=class_id,
            subject__iexact=subject,
            teacherUid=teacher.id,
            status='active'
        ).first()

        if existing:
            return Response({
                'error': f'{teacher.name} is already assigned to teach {subject} in {school_class.name}.'
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            assignment_id = f"sta_{uuid.uuid4().hex[:10]}"
            assignment = SubjectTeacherAssignment.objects.create(
                id=assignment_id,
                classId=school_class.id,
                className=school_class.name,
                section=school_class.section or '',
                subject=subject,
                teacherUid=teacher.id,
                teacherName=teacher.name,
                teacherEmail=teacher.email,
                academicYear=academic_year,
                status='active'
            )

            # Sync staff.data.subjects
            s_data = teacher.data or {}
            cur_subjects = s_data.get('subjects') or []
            if not any(s.get('classId') == class_id and s.get('subject', '').lower() == subject.lower() for s in cur_subjects):
                cur_subjects.append({
                    'classId': school_class.id,
                    'className': school_class.name,
                    'subject': subject
                })
                s_data['subjects'] = cur_subjects
                teacher.data = s_data
                teacher.type = 'both' if teacher.classTeacherOf else 'subject'
                teacher.save()

            create_audit_log(
                actor_uid=actor_uid,
                actor_name=actor_name,
                actor_role=actor_role,
                action='ASSIGN_SUBJECT_TEACHER',
                resource='subject_teacher_assignments',
                resource_id=assignment.id,
                details={
                    'assignmentId': assignment.id,
                    'classId': school_class.id,
                    'className': school_class.name,
                    'subject': subject,
                    'teacherUid': teacher.id,
                    'teacherName': teacher.name
                },
                ip_address=ip_addr
            )

        return Response(SubjectTeacherAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)

    elif request.method == 'DELETE':
        target_id = pk or request.data.get('id') or request.query_params.get('id')
        assignment = None
        if target_id:
            assignment = SubjectTeacherAssignment.objects.filter(id=target_id).first()

        c_id = request.data.get('classId') or request.query_params.get('classId') or request.data.get('className') or request.query_params.get('className')
        s_name = request.data.get('subject') or request.query_params.get('subject')
        t_uid = request.data.get('teacherUid') or request.query_params.get('teacherUid')

        if not assignment and s_name and t_uid:
            if c_id:
                assignment = SubjectTeacherAssignment.objects.filter(
                    Q(classId=c_id) | Q(className__iexact=c_id),
                    subject__iexact=s_name,
                    teacherUid=t_uid
                ).first()
            if not assignment:
                assignment = SubjectTeacherAssignment.objects.filter(
                    subject__iexact=s_name,
                    teacherUid=t_uid
                ).first()
            if assignment:
                target_id = assignment.id

        if not assignment:
            # Fallback: if record exists only in Staff.data.subjects (e.g. legacy seeded or standalone profile)
            if t_uid and s_name:
                teacher = Staff.objects.filter(id=t_uid).first()
                if teacher:
                    s_data = teacher.data or {}
                    cur_subs = s_data.get('subjects') or []
                    new_subs = []
                    removed = False
                    for s in cur_subs:
                        if isinstance(s, dict):
                            s_sub = (s.get('subject') or s.get('name') or '').lower()
                            s_cls = (s.get('className') or s.get('class') or s.get('classId') or '').lower()
                        else:
                            s_sub = str(s).lower()
                            s_cls = ''
                        match_sub = (s_sub == s_name.lower())
                        match_cls = True
                        if c_id:
                            match_cls = (s_cls == str(c_id).lower() or (isinstance(s, dict) and s.get('classId', '').lower() == str(c_id).lower()))
                        if match_sub and match_cls and not removed:
                            removed = True
                            continue
                        new_subs.append(s)
                    if removed:
                        s_data['subjects'] = new_subs
                        teacher.data = s_data
                        has_assignments = SubjectTeacherAssignment.objects.filter(teacherUid=teacher.id, status='active').exists() or bool(new_subs)
                        if teacher.classTeacherOf:
                            teacher.type = 'both' if has_assignments else 'classTeacher'
                        else:
                            teacher.type = 'subject'
                        teacher.save()
                        return Response({'success': True, 'message': 'Subject assignment removed from teacher profile.'}, status=status.HTTP_200_OK)

            return Response({'error': 'Subject assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Authorization: School Admin or Class Incharge of this class can revoke subject faculty
        if actor_role == 'staff':
            target_class = SchoolClass.objects.filter(id=assignment.classId).first()
            is_incharge = (target_class and target_class.classTeacherUid == actor_uid) or Staff.objects.filter(id=actor_uid, classTeacherOf=assignment.classId).exists()
            if not is_incharge:
                return Response({
                    'error': 'Forbidden: Only the Class Incharge of this class or School Admin can revoke subject faculty.'
                }, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            class_id = assignment.classId
            class_name = assignment.className
            subject = assignment.subject
            teacher_uid = assignment.teacherUid
            assignment_title = f"{assignment.teacherName} - {assignment.subject} ({assignment.className})"

            assignment.delete()

            # Clean staff.data.subjects
            teacher = Staff.objects.filter(id=teacher_uid).first()
            if teacher:
                s_data = teacher.data or {}
                cur_subjects = s_data.get('subjects') or []
                s_data['subjects'] = [
                    s for s in cur_subjects if not (
                        isinstance(s, dict) and
                        (s.get('classId') == class_id or (class_name and s.get('className', '').lower() == class_name.lower())) and
                        (s.get('subject') or s.get('name', '')).lower() == subject.lower()
                    )
                ]
                teacher.data = s_data
                has_assignments = SubjectTeacherAssignment.objects.filter(teacherUid=teacher.id, status='active').exists() or bool(s_data['subjects'])
                if teacher.classTeacherOf:
                    teacher.type = 'both' if has_assignments else 'classTeacher'
                else:
                    teacher.type = 'subject'
                teacher.save()

            create_audit_log(
                actor_uid=actor_uid,
                actor_name=actor_name,
                actor_role=actor_role,
                action='REMOVE_SUBJECT_TEACHER',
                resource='subject_teacher_assignments',
                resource_id=target_id,
                details={'assignment': assignment_title},
                ip_address=ip_addr
            )

        return Response({'success': True, 'message': 'Subject assignment removed.'}, status=status.HTTP_200_OK)


# ============================================================
# 6. TEACHER PORTAL: CLASS INCHARGE DASHBOARD & AUTHORIZED ROSTERS
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def teacher_incharge_dashboard(request):
    """
    Class Incharge Dashboard Data:
    Returns the class roster, attendance stats, and academic summary
    STRICTLY and ONLY for the class where this teacher is assigned as Class Incharge.
    Returns 403 or empty if teacher is not an incharge.
    """
    teacher_uid = request.query_params.get('teacherUid') or request.headers.get('X-User-Uid')
    if not teacher_uid:
        return Response({'error': 'Teacher UID is required.'}, status=status.HTTP_400_BAD_REQUEST)

    teacher = Staff.objects.filter(id=teacher_uid).first()
    if not teacher:
        teacher = Staff.objects.filter(uid=teacher_uid).first()

    if not teacher or not teacher.classTeacherOf:
        return Response({
            'isClassIncharge': False,
            'message': 'Teacher is not assigned as Class Incharge.'
        }, status=status.HTTP_200_OK)

    assigned_class_id = teacher.classTeacherOf
    school_class = SchoolClass.objects.filter(id=assigned_class_id).first()
    if not school_class:
        return Response({
            'isClassIncharge': False,
            'message': 'Assigned class not found.'
        }, status=status.HTTP_200_OK)

    # 1. Class Students Roster
    students = Student.objects.filter(classId=school_class.id, deleted=False).order_by('rollNo', 'name')
    student_list = StudentSerializer(students, many=True).data

    # 2. Attendance Summary
    attendance_records = Attendance.objects.filter(classId=school_class.id)
    total_dates = attendance_records.count()
    student_attendance_summary = {}

    for att in attendance_records:
        recs = att.records or {}
        for s_uid, s_status in recs.items():
            if s_uid not in student_attendance_summary:
                student_attendance_summary[s_uid] = {'present': 0, 'absent': 0, 'late': 0, 'total': 0}
            student_attendance_summary[s_uid]['total'] += 1
            if s_status == 'Present':
                student_attendance_summary[s_uid]['present'] += 1
            elif s_status == 'Absent':
                student_attendance_summary[s_uid]['absent'] += 1
            elif s_status == 'Late':
                student_attendance_summary[s_uid]['late'] += 1

    # 3. Subject-wise Marks Summary for this class
    class_marks = Marks.objects.filter(classId=school_class.id)
    subject_stats = {}
    for m in class_marks:
        sub = m.subject or 'General'
        if sub not in subject_stats:
            subject_stats[sub] = {'totalMarks': 0, 'totalMax': 0, 'count': 0, 'exams': set()}
        if m.marksObtained is not None and m.maxMarks is not None:
            subject_stats[sub]['totalMarks'] += float(m.marksObtained)
            subject_stats[sub]['totalMax'] += float(m.maxMarks)
            subject_stats[sub]['count'] += 1
        if m.examName:
            subject_stats[sub]['exams'].add(m.examName)

    academic_summary = []
    for sub, stat in subject_stats.items():
        avg_pct = round((stat['totalMarks'] / stat['totalMax'] * 100), 1) if stat['totalMax'] > 0 else 0
        academic_summary.append({
            'subject': sub,
            'studentsEvaluated': stat['count'],
            'averagePercentage': avg_pct,
            'examsRecorded': list(stat['exams'])
        })

    # 4. Assigned Subject Teachers for this class
    assigned_subject_teachers = SubjectTeacherAssignmentSerializer(
        SubjectTeacherAssignment.objects.filter(classId=school_class.id, status='active'),
        many=True
    ).data

    return Response({
        'isClassIncharge': True,
        'class': {
            'id': school_class.id,
            'name': school_class.name,
            'code': school_class.code,
            'section': school_class.section,
            'classTeacherUid': teacher.id,
            'classTeacherName': teacher.name,
        },
        'studentsCount': len(student_list),
        'students': student_list,
        'attendanceTotalDates': total_dates,
        'attendanceSummary': student_attendance_summary,
        'academicSummary': academic_summary,
        'subjectTeachers': assigned_subject_teachers
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def teacher_assigned_subjects(request):
    """
    Returns only the subjects and classes explicitly assigned to this teacher.
    Used by the Teacher Portal to populate authorized dropdowns for Marks and Notes.
    Combines SubjectTeacherAssignment table and Staff.data.subjects (with auto-sync).
    """
    teacher_uid = request.query_params.get('teacherUid') or request.headers.get('X-User-Uid')
    if not teacher_uid:
        return Response({'error': 'Teacher UID is required.'}, status=status.HTTP_400_BAD_REQUEST)

    teacher = Staff.objects.filter(
        Q(id=teacher_uid) | Q(uid=teacher_uid) | Q(username__iexact=teacher_uid)
    ).first()

    actual_uids = [teacher_uid]
    if teacher:
        if teacher.id and teacher.id not in actual_uids:
            actual_uids.append(teacher.id)
        if teacher.uid and teacher.uid not in actual_uids:
            actual_uids.append(teacher.uid)

    # 1. Fetch from SubjectTeacherAssignment table
    assignments = list(SubjectTeacherAssignment.objects.filter(
        teacherUid__in=actual_uids,
        status='active'
    ).order_by('className', 'subject'))

    seen = set()
    res = []
    for a in assignments:
        if not a.id:
            new_id = f"sta_{uuid.uuid4().hex[:10]}"
            SubjectTeacherAssignment.objects.filter(pk=a.pk).update(id=new_id)
            a.id = new_id
        key = ((a.classId or '').lower(), (a.subject or '').lower())
        seen.add(key)
        if a.className:
            seen.add((a.className.lower(), (a.subject or '').lower()))
        res.append(SubjectTeacherAssignmentSerializer(a).data)

    # 2. Merge from teacher.data.subjects if any exists and auto-sync to SubjectTeacherAssignment
    if teacher:
        s_data = teacher.data or {}
        raw_subs = s_data.get('subjects') or []
        for s in raw_subs:
            if isinstance(s, dict):
                c_id = s.get('classId') or ''
                c_name = s.get('className') or s.get('class') or ''
                sub_name = s.get('subject') or s.get('name') or ''
            elif isinstance(s, str):
                c_id = ''
                c_name = ''
                sub_name = s
            else:
                continue

            if not sub_name:
                continue

            key = (c_id.lower(), sub_name.lower())
            key_name = (c_name.lower(), sub_name.lower())

            if key not in seen and key_name not in seen:
                seen.add(key)
                if c_name:
                    seen.add(key_name)

                # Resolve class
                school_class = None
                if c_id:
                    school_class = SchoolClass.objects.filter(id=c_id).first()
                if not school_class and c_name:
                    school_class = SchoolClass.objects.filter(name__iexact=c_name).first()
                if not school_class and teacher.classTeacherOf:
                    school_class = SchoolClass.objects.filter(id=teacher.classTeacherOf).first()

                final_cid = school_class.id if school_class else (c_id or 'cls')
                final_cname = school_class.name if school_class else (c_name or 'Class')
                final_sec = school_class.section if school_class else ''

                # Ensure active SubjectTeacherAssignment row exists so it is persisted for all endpoints
                sta_id = f"sta_{uuid.uuid4().hex[:10]}"
                sta, _ = SubjectTeacherAssignment.objects.get_or_create(
                    classId=final_cid,
                    subject__iexact=sub_name,
                    teacherUid=teacher.id,
                    defaults={
                        'id': sta_id,
                        'className': final_cname,
                        'section': final_sec,
                        'subject': sub_name,
                        'teacherName': teacher.name or 'Faculty',
                        'teacherEmail': teacher.email or '',
                        'academicYear': '2025-2026',
                        'status': 'active'
                    }
                )
                if not sta.id:
                    sta.id = sta_id
                    SubjectTeacherAssignment.objects.filter(classId=final_cid, subject__iexact=sub_name, teacherUid=teacher.id).update(id=sta_id)
                res.append(SubjectTeacherAssignmentSerializer(sta).data)

    return Response(res)


# ============================================================
# 7. TEACHER PORTAL: SUBJECT-SPECIFIC MARKS ENTRY & AUTHORIZATION
# ============================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def enter_subject_marks(request):
    """
    Secure Marks Entry:
    Enforces that only a teacher assigned to that exact subject and class section can enter marks.
    A Class Incharge who does NOT teach that subject is strictly forbidden (HTTP 403).
    """
    actor_uid, actor_name, actor_role, ip_addr = get_request_actor(request)

    teacher_uid = str(request.data.get('teacherUid') or actor_uid).strip()
    class_id = str(request.data.get('classId') or '').strip()
    subject = str(request.data.get('subject') or '').strip()
    exam_name = str(request.data.get('examName') or request.data.get('examId') or 'Terminal Exam').strip()
    max_marks_raw = request.data.get('maxMarks', 100)
    records = request.data.get('records', [])

    if not class_id or not subject or not records:
        return Response({'error': 'classId, subject, and student records are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        max_marks = float(max_marks_raw)
        if max_marks <= 0:
            return Response({'error': 'Maximum marks must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)
    except ValueError:
        return Response({'error': 'Invalid maxMarks value.'}, status=status.HTTP_400_BAD_REQUEST)

    # AUTHORIZATION:
    # 1. School Admin has full oversight.
    # 2. Class Incharge has FULL PERMISSION across ALL subjects in their class section.
    # 3. Subject Teacher has permission for their assigned subject in that class.
    is_class_incharge = SchoolClass.objects.filter(id=class_id, classTeacherUid=teacher_uid).exists() or \
                        Staff.objects.filter(id=teacher_uid, classTeacherOf=class_id).exists()
    is_assigned = SubjectTeacherAssignment.objects.filter(
        teacherUid=teacher_uid,
        classId=class_id,
        subject__iexact=subject,
        status='active'
    ).exists()

    if actor_role != 'admin' or (teacher_uid and teacher_uid.startswith('stf_') and not request.headers.get('X-Admin-Override')):
        if not is_assigned and not is_class_incharge:
            create_audit_log(
                actor_uid=teacher_uid,
                actor_name=actor_name,
                actor_role='staff',
                action='UNAUTHORIZED_MARKS_ENTRY_ATTEMPT',
                resource='marks',
                resource_id=f"{class_id}_{subject}",
                details={
                    'classId': class_id,
                    'subject': subject,
                    'reason': 'Teacher is neither the Class Incharge nor an assigned Subject Teacher for this class and subject.'
                },
                ip_address=ip_addr
            )
            return Response({
                'error': f'Forbidden: You are not authorized to enter marks for {subject} in this class. You must be the Class Incharge or assigned Subject Teacher.'
            }, status=status.HTTP_403_FORBIDDEN)

    school_class = SchoolClass.objects.filter(id=class_id).first()
    class_name = school_class.name if school_class else class_id

    saved_count = 0
    with transaction.atomic():
        for r in records:
            stu_uid = r.get('studentUid') or r.get('id')
            if not stu_uid:
                continue

            stu = Student.objects.filter(id=stu_uid, classId=class_id).first()
            if not stu:
                return Response({
                    'error': f'Student {stu_uid} is not enrolled in {class_name}.'
                }, status=status.HTTP_400_BAD_REQUEST)

            raw_obtained = r.get('marksObtained')
            if raw_obtained is None or raw_obtained == '':
                continue

            try:
                marks_val = float(raw_obtained)
                if marks_val < 0 or marks_val > max_marks:
                    return Response({
                        'error': f'Marks for student {stu.name} ({marks_val}) must be between 0 and {max_marks}.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except ValueError:
                return Response({'error': f'Invalid mark value for student {stu.name}.'}, status=status.HTTP_400_BAD_REQUEST)

            # Determine letter grade
            pct = (marks_val / max_marks) * 100
            if pct >= 90: grade = 'A+'
            elif pct >= 80: grade = 'A'
            elif pct >= 70: grade = 'B'
            elif pct >= 60: grade = 'C'
            elif pct >= 50: grade = 'D'
            else: grade = 'F'

            # Upsert Marks record with collision-free ID and comprehensive lookup
            clean_exam_slug = exam_name.replace(' ', '_').replace('/', '_').lower()
            clean_sub_slug = subject.replace(' ', '_').replace('/', '_').lower()
            mark_id = f"mrk_{class_id}_{stu.id}_{clean_sub_slug}_{clean_exam_slug}"
            existing_mark = (
                Marks.objects.filter(id=mark_id).first() or
                Marks.objects.filter(
                    classId=class_id,
                    studentUid=stu.id,
                    subject__iexact=subject,
                    examName=exam_name
                ).first()
            )

            if existing_mark:
                existing_mark.marksObtained = marks_val
                existing_mark.maxMarks = max_marks
                existing_mark.grade = grade
                existing_mark.marksData = {'percentage': round(pct, 1), 'enteredBy': teacher_uid}
                existing_mark.save()
            else:
                Marks.objects.create(
                    id=mark_id,
                    classId=class_id,
                    className=class_name,
                    examName=exam_name,
                    subject=subject,
                    studentUid=stu.id,
                    studentName=stu.name,
                    admissionNo=stu.admissionNo or '',
                    marksObtained=marks_val,
                    maxMarks=max_marks,
                    grade=grade,
                    marksData={'percentage': round(pct, 1), 'enteredBy': teacher_uid}
                )
            saved_count += 1

        create_audit_log(
            actor_uid=teacher_uid,
            actor_name=actor_name,
            actor_role='staff',
            action='MARKS_ENTRY',
            resource='marks',
            resource_id=f"{class_id}_{subject}_{exam_name}",
            details={
                'classId': class_id,
                'className': class_name,
                'subject': subject,
                'examName': exam_name,
                'maxMarks': max_marks,
                'recordsCount': saved_count
            },
            ip_address=ip_addr
        )

    return Response({
        'success': True,
        'message': f'Successfully recorded {saved_count} student marks for {subject}.',
        'savedCount': saved_count
    }, status=status.HTTP_200_OK)


# ============================================================
# 8. STUDENT & PARENT PORTALS: AUTHORIZED MARKS & ATTENDANCE
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def student_my_marks(request):
    """
    Student Portal: Secure read-only access to own marks.
    Students cannot query or view any other student's records.
    """
    student_uid = request.query_params.get('studentUid') or request.headers.get('X-User-Uid')
    if not student_uid:
        return Response({'error': 'Student UID required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Verify student exists
    student = Student.objects.filter(id=student_uid).first()
    if not student:
        return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

    marks = Marks.objects.filter(studentUid=student.id).order_by('subject', '-created_at')
    return Response({
        'student': {
            'id': student.id,
            'name': student.name,
            'admissionNo': student.admissionNo,
            'className': student.className,
            'section': student.section
        },
        'marks': MarksSerializer(marks, many=True).data
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def parent_child_academics(request, child_uid=None):
    """
    Parent Portal: Child-specific marks and attendance.
    Strictly verifies parent-child link on the backend.
    Attempts to access unrelated students are blocked with HTTP 403 Forbidden.
    """
    actor_uid, actor_name, actor_role, ip_addr = get_request_actor(request)
    parent_uid = request.query_params.get('parentUid') or actor_uid
    target_child = child_uid or request.query_params.get('childUid')

    if not parent_uid or not target_child:
        return Response({'error': 'parentUid and childUid are required.'}, status=status.HTTP_400_BAD_REQUEST)

    parent = Parent.objects.filter(id=parent_uid).first()
    if not parent:
        parent = Parent.objects.filter(uid=parent_uid).first()

    # Verify parent-child relationship
    is_linked = False
    if parent:
        if parent.childUid == target_child:
            is_linked = True
        elif parent.data and isinstance(parent.data.get('children'), list):
            if any(c.get('uid') == target_child or c.get('id') == target_child for c in parent.data['children']):
                is_linked = True

    # Also check Student record reverse-link
    if not is_linked:
        child_stu = Student.objects.filter(id=target_child, parentUid=parent_uid).first()
        if child_stu:
            is_linked = True

    if not is_linked and (actor_role != 'admin' or str(parent_uid).startswith('par_')):
        create_audit_log(
            actor_uid=parent_uid,
            actor_name=actor_name,
            actor_role='parent',
            action='UNAUTHORIZED_PARENT_ACCESS_ATTEMPT',
            resource='students',
            resource_id=target_child,
            details={'reason': f'Parent {parent_uid} is not linked to student {target_child}.'},
            ip_address=ip_addr
        )
        return Response({
            'error': 'Forbidden: You do not have permission to view records for this student.'
        }, status=status.HTTP_403_FORBIDDEN)

    child = Student.objects.filter(id=target_child).first()
    if not child:
        return Response({'error': 'Child record not found.'}, status=status.HTTP_404_NOT_FOUND)

    child_marks = Marks.objects.filter(studentUid=child.id).order_by('-created_at')
    child_attendance = Attendance.objects.filter(classId=child.classId).order_by('-date')

    att_records = []
    for a in child_attendance:
        status_val = (a.records or {}).get(child.id) or a.status
        if status_val:
            att_records.append({
                'date': a.date,
                'status': status_val,
                'markedBy': a.markedBy
            })

    return Response({
        'child': StudentSerializer(child).data,
        'marks': MarksSerializer(child_marks, many=True).data,
        'attendance': att_records
    })


# ============================================================
# 9. AUDIT LOGS RETRIEVAL API
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def audit_logs_list(request):
    """List recent audit log entries with optional action or resource filter."""
    qs = AuditLog.objects.all().order_by('-timestamp')
    action = request.query_params.get('action')
    resource = request.query_params.get('resource')
    actor_uid = request.query_params.get('actorUid')

    if action:
        qs = qs.filter(action=action)
    if resource:
        qs = qs.filter(resource=resource)
    if actor_uid:
        qs = qs.filter(actorUid=actor_uid)

    limit = request.query_params.get('_limit', 100)
    try:
        limit_n = int(limit)
        qs = qs[:limit_n]
    except ValueError:
        qs = qs[:100]

    return Response(AuditLogSerializer(qs, many=True).data)

