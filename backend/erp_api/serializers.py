from rest_framework import serializers
from .models import (
    LoginLookup, ERPUser, Student, Parent, Staff,
    SchoolClass, Attendance, Marks, Exam, Note,
    Homework, Announcement, CalendarEvent,
    SubjectTeacherAssignment, AuditLog
)

class LoginLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginLookup
        fields = '__all__'


class ERPUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = ERPUser
        fields = [
            'id', 'role', 'name', 'email', 'phone', 'username',
            'deleted', 'disabled', 'hasSeenFirstLoginGuide',
            'firstLoginDone', 'firstLoginGuideShownAt',
            'data', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'password_hash': {'write_only': True}
        }


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'


class ParentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parent
        fields = '__all__'


class StaffSerializer(serializers.ModelSerializer):
    subjects = serializers.SerializerMethodField()

    class Meta:
        model = Staff
        fields = '__all__'

    def get_subjects(self, obj):
        res = []
        seen = set()
        # High-performance pre-fetched context to prevent N+1 queries
        if self.context and 'assignments_by_teacher' in self.context:
            active_assignments = self.context['assignments_by_teacher'].get(obj.id, [])
        else:
            active_assignments = SubjectTeacherAssignment.objects.filter(teacherUid=obj.id, status='active')

        for a in active_assignments:
            key = ((a.classId or '').lower(), (a.subject or '').lower())
            seen.add(key)
            if a.className:
                seen.add((a.className.lower(), (a.subject or '').lower()))
            res.append({
                'id': a.id,
                'classId': a.classId,
                'className': a.className,
                'subject': a.subject
            })
        raw_subs = (obj.data or {}).get('subjects') or []
        for s in raw_subs:
            if isinstance(s, dict):
                c_id = (s.get('classId') or '').lower()
                c_name = (s.get('className') or s.get('class') or '').lower()
                s_name = (s.get('subject') or s.get('name') or '').lower()
                if (c_id, s_name) not in seen and (c_name, s_name) not in seen:
                    seen.add((c_id, s_name))
                    res.append(s)
            elif isinstance(s, str):
                if ('', s.lower()) not in seen:
                    seen.add(('', s.lower()))
                    res.append({'subject': s, 'className': '', 'classId': ''})
        return res

    def update(self, instance, validated_data):
        if hasattr(self, 'initial_data') and isinstance(self.initial_data, dict) and 'subjects' in self.initial_data:
            s_data = instance.data or {}
            new_subjects = self.initial_data['subjects']
            if isinstance(new_subjects, list):
                s_data['subjects'] = new_subjects
                instance.data = s_data
                # Keep SubjectTeacherAssignment synchronized: remove assignments no longer in new_subjects
                current_assignments = SubjectTeacherAssignment.objects.filter(teacherUid=instance.id)
                for a in current_assignments:
                    still_present = any(
                        (isinstance(s, dict) and 
                         (s.get('subject') or s.get('name', '')).strip().lower() == (a.subject or '').strip().lower() and 
                         (not a.classId or s.get('classId') == a.classId or (a.className and (s.get('className') or '').strip().lower() == a.className.strip().lower())))
                        for s in new_subjects
                    )
                    if not still_present:
                        a.delete()
        return super().update(instance, validated_data)


class SchoolClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolClass
        fields = '__all__'


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = '__all__'


class MarksSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marks
        fields = '__all__'


class ExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = '__all__'


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = '__all__'


class HomeworkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Homework
        fields = '__all__'


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = '__all__'


class CalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = '__all__'


class SubjectTeacherAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectTeacherAssignment
        fields = '__all__'


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'
