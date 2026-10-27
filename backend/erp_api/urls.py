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

    # Generic Collection REST Endpoints
    path('records/<str:collection>/', views.CollectionListView.as_view(), name='collection_list'),
    path('records/<str:collection>/<str:pk>/', views.CollectionDetailView.as_view(), name='collection_detail'),
    path('<str:collection>/', views.CollectionListView.as_view(), name='direct_collection_list'),
    path('<str:collection>/<str:pk>/', views.CollectionDetailView.as_view(), name='direct_collection_detail'),
]
