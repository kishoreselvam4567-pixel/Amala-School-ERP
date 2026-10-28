from django.urls import path
from . import views

urlpatterns = [
    # Auth & Identity Lookups
    path('auth/login/', views.auth_login, name='auth_login'),
    path('auth/logout/', views.auth_logout, name='auth_logout'),
    path('auth/profile/', views.auth_profile, name='auth_profile'),
    path('auth/profile/<str:uid>/', views.auth_profile, name='auth_profile_detail'),
    path('lookup/', views.lookup_identifier, name='lookup_identifier'),
    path('lookup/<str:key>/', views.lookup_identifier, name='lookup_identifier_key'),

    # File Uploads (replaces Supabase Storage)
    path('storage/upload/', views.upload_file, name='storage_upload'),

    # Class Incharge & Subject Teacher Management (Admin & Portal APIs)
    path('assignments/incharge/', views.manage_class_incharge, name='manage_class_incharge'),
    path('assignments/subjects/', views.manage_subject_teachers, name='manage_subject_teachers'),
    path('assignments/subjects/<str:pk>/', views.manage_subject_teachers, name='manage_subject_teacher_detail'),

    # Teacher Portal Assignment-Based Endpoints
    path('teacher/incharge-dashboard/', views.teacher_incharge_dashboard, name='teacher_incharge_dashboard'),
    path('teacher/assigned-subjects/', views.teacher_assigned_subjects, name='teacher_assigned_subjects'),
    path('teacher/marks/', views.enter_subject_marks, name='enter_subject_marks'),

    # Student & Parent Academic Access Endpoints
    path('student/my-marks/', views.student_my_marks, name='student_my_marks'),
    path('parent/child-academics/', views.parent_child_academics, name='parent_child_academics'),
    path('parent/child-academics/<str:child_uid>/', views.parent_child_academics, name='parent_child_academics_detail'),

    # Audit Logging
    path('audit-logs/', views.audit_logs_list, name='audit_logs_list'),

    # Generic Collection REST Endpoints
    path('records/<str:collection>/', views.CollectionListView.as_view(), name='collection_list'),
    path('records/<str:collection>/<str:pk>/', views.CollectionDetailView.as_view(), name='collection_detail'),
    path('<str:collection>/', views.CollectionListView.as_view(), name='direct_collection_list'),
    path('<str:collection>/<str:pk>/', views.CollectionDetailView.as_view(), name='direct_collection_detail'),
]
