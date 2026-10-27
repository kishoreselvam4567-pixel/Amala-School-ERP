from rest_framework import serializers
from .models import (
    LoginLookup, ERPUser, Student, Parent, Staff,
    SchoolClass, Attendance, Marks, Exam, Note,
    Homework, Announcement, CalendarEvent
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
            'firstLoginDone', 'firstLoginGuideShownAt', 'data',
            'created_at', 'updated_at'
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
    class Meta:
        model = Staff
        fields = '__all__'


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
