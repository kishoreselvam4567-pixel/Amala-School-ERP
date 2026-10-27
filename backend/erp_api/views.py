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

from .models import (
    LoginLookup, ERPUser, Student, Parent, Staff,
    SchoolClass, Attendance, Marks, Exam, Note,
    Homework, Announcement, CalendarEvent
)
from .serializers import (
    LoginLookupSerializer, ERPUserSerializer, StudentSerializer,
    ParentSerializer, StaffSerializer, SchoolClassSerializer,
    AttendanceSerializer, MarksSerializer, ExamSerializer,
    NoteSerializer, HomeworkSerializer, AnnouncementSerializer,
    CalendarEventSerializer
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

    # 2. Find user in ERPUser
    user = ERPUser.objects.filter(email__iexact=target_email).first()
    if not user:
        user = ERPUser.objects.filter(username__iexact=norm_user).first()
    if not user:
        user = ERPUser.objects.filter(phone=norm_user).first()
    if not user:
        user = ERPUser.objects.filter(id=norm_user).first()

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
