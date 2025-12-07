# authentication/urls.py - UPDATED VERSION
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Authentication endpoints
    path('admin-login/', views.AdminLoginView.as_view(), name='admin-login'),
    path('staff-login/', views.StaffLoginView.as_view(), name='staff-login'),
    path('check-auth/', views.AuthCheckView.as_view(), name='check-auth'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('force-logout/<int:login_id>/', views.ForceLogoutView.as_view(), name='force-logout'),
    
    # JWT Token management
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # User management
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/create/', views.UserCreateView.as_view(), name='user-create'),
    path('users/<int:user_id>/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<int:user_id>/reset-password/', views.UserPasswordResetView.as_view(), name='user-reset-password'),
    path('users/<int:user_id>/delete/', views.UserDeleteView.as_view(), name='user-delete'),
    path('users/bulk-delete/', views.UserBulkDeleteView.as_view(), name='user-bulk-delete'),
    
    # Staff password management
    path('staff/<int:staff_id>/reset-password/', views.StaffPasswordResetView.as_view(), name='staff-reset-password'),
    
    # Group management
    path('groups/', views.GroupListView.as_view(), name='group-list'),
    
    # Admin dashboard endpoints
    path('system-logs/', views.SystemLogView.as_view(), name='system-logs'),
    path('activity-monitor/', views.ActivityMonitorView.as_view(), name='activity-monitor'),
    path('dashboard-stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    
    # Password management
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    
    # Utility endpoints
    path('users/unlinked/', views.UnlinkedUsersView.as_view(), name='unlinked-users'),

    path('users/<int:user_id>/sync-role/', views.SyncUserRoleView.as_view(), name='sync-user-role'),

    
    # Login history and logout tracking
    path('track-logout/', views.TrackLogoutView.as_view(), name='track-logout'),
    path('login-history/', views.LoginHistoryView.as_view(), name='login-history'),
    
    # Session management
    path('end-session/', views.EndSessionView.as_view(), name='end-session'),
    path('list-urls/', views.ListAllAuthUrls.as_view(), name='list-all-urls'),

]