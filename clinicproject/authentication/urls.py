from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('admin-login/', views.AdminLoginView.as_view(), name='admin-login'),
    path('staff-login/', views.StaffLoginView.as_view(), name='staff-login'),
    path('check-auth/', views.AuthCheckView.as_view(), name='check-auth'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    
    # User management
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/create/', views.UserCreateView.as_view(), name='user-create'),
    
    # Group management
    path('groups/', views.GroupListView.as_view(), name='group-list'),
    
    # Admin dashboard endpoints
    path('system-logs/', views.SystemLogView.as_view(), name='system-logs'),
    path('activity-monitor/', views.ActivityMonitorView.as_view(), name='activity-monitor'),
    path('dashboard-stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    
    # Password management
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
]