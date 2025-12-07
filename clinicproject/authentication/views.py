# authentication/views.py - COMPLETE FIXED VERSION
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User, Group
from django.contrib.auth import update_session_auth_hash
from django.db import transaction
from django.utils import timezone
from django.db.models import Avg, Q
from django.shortcuts import get_object_or_404
import datetime
import logging

from .serializers import (
    AdminLoginSerializer, 
    StaffLoginSerializer, 
    UserSerializer,
    UserCreateSerializer,
    GroupSerializer,
    PasswordChangeSerializer,
    CustomTokenObtainPairSerializer
)
from .models import LoginHistory, UserProfile, SystemLog, ActivityMonitor
from rest_framework_simplejwt.views import TokenObtainPairView

# authentication/views.py - ADD THIS FUNCTION AT THE TOP OF THE FILE (after imports)
def sync_user_role_to_staff(user):
    """Sync user's groups to match their staff role"""
    if hasattr(user, 'profile') and user.profile.staff_detail:
        staff = user.profile.staff_detail
        staff_role = staff.Role
        
        # Clear existing groups
        user.groups.clear()
        
        # Add group matching staff role
        group, created = Group.objects.get_or_create(name=staff_role)
        user.groups.add(group)
        
        # Update staff flags if needed
        if staff_role in ['Admin', 'Super Admin']:
            user.is_staff = True
            if staff_role == 'Super Admin':
                user.is_superuser = True
        else:
            user.is_staff = False
            user.is_superuser = False
        
        user.save()
        return True
    return False

logger = logging.getLogger(__name__)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class AdminLoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            user_serializer = UserSerializer(user)
            
            # Update last activity
            if hasattr(user, 'profile'):
                user.profile.last_activity = timezone.now()
                user.profile.save()
            
            # Log successful login
            LoginHistory.objects.create(
                user=user,
                username=user.username,
                login_type='ADMIN',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True,
                details={
                    'user_id': user.id,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser
                }
            )
            
            return Response({
                'success': True,
                'message': 'Admin login successful',
                'user': user_serializer.data,
                'redirect_path': '/admin',  # ADD THIS
                'tokens': {
                    'refresh': serializer.validated_data['refresh'],
                    'access': serializer.validated_data['access']
                }
            })
        
        # Log failed login attempt
        username = request.data.get('username', 'unknown')
        LoginHistory.objects.create(
            username=username,
            login_type='ADMIN',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            success=False,
            details={'error': 'Invalid credentials'}
        )
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

# authentication/views.py - UPDATE StaffLoginView with better error handling
class StaffLoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            serializer = StaffLoginSerializer(data=request.data, context={'request': request})
            
            if not serializer.is_valid():
                # Log failed login attempt
                username = request.data.get('username', 'unknown')
                LoginHistory.objects.create(
                    username=username,
                    login_type='STAFF',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    success=False,
                    details={'error': 'Validation failed', 'errors': serializer.errors}
                )
                
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Extract data from serializer
            user = serializer.validated_data['user']
            staff = serializer.validated_data['staff_detail']
            
            # CRITICAL: Add validation for staff role
            if not hasattr(staff, 'Role') or not staff.Role:
                raise ValidationError('Staff role is not defined')
            
            # Try to sync groups with better error handling
            try:
                from django.contrib.auth.models import Group
                
                # Clear existing groups
                user.groups.clear()
                
                # Add group matching staff role
                if staff.Role:
                    group, created = Group.objects.get_or_create(name=staff.Role)
                    user.groups.add(group)
                
                # Update staff/admin flags
                if staff.Role in ['Admin', 'Super Admin']:
                    user.is_staff = True
                    if staff.Role == 'Super Admin':
                        user.is_superuser = True
                else:
                    # Staff users should not have admin flags
                    user.is_staff = False
                    user.is_superuser = False
                
                user.save()
                
            except Exception as e:
                # Log group sync error but continue
                logger.warning(f"Group sync failed for {user.username}: {str(e)}")
                # Don't raise error - allow login to proceed
            
            user_serializer = UserSerializer(user)
            
            # Update last activity
            if hasattr(user, 'profile'):
                user.profile.last_activity = timezone.now()
                user.profile.save()
            
            # Log successful login
            LoginHistory.objects.create(
                user=user,
                username=user.username,
                login_type='STAFF',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True,
                details={
                    'user_id': user.id,
                    'staff_id': staff.STAFF_ID,
                    'staff_role': staff.Role,
                    'staff_name': staff.Name
                }
            )
            
            # Determine redirect path based on role
            redirect_path = self._get_redirect_path(staff.Role)
            
            return Response({
                'success': True,
                'message': f'{staff.Role} login successful',
                'user': user_serializer.data,
                'staff': {
                    'id': staff.STAFF_ID,
                    'name': staff.Name,
                    'role': staff.Role
                },
                'redirect_path': redirect_path,
                'tokens': {
                    'refresh': serializer.validated_data['refresh'],
                    'access': serializer.validated_data['access']
                }
            })
            
        except Exception as e:
            # Log the actual error for debugging
            logger.error(f"Staff login error: {str(e)}", exc_info=True)
            
            # Return a proper JSON error response
            return Response({
                'success': False,
                'error': 'Login failed due to server error',
                'detail': str(e) if settings.DEBUG else 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_redirect_path(self, role):
        """Get the appropriate redirect path based on role"""
        role_paths = {
            'Doctor': '/doctor',
            'Receptionist': '/reception',
            'Pharmacist': '/pharmacy',
            'Lab Technician': '/lab'
        }
        return role_paths.get(role, '/')

class AuthCheckView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_serializer = UserSerializer(request.user)
        data = {
            'authenticated': True,
            'user': user_serializer.data
        }
        
        return Response(data)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        # Find and mark logout in login history
        try:
            recent_login = LoginHistory.objects.filter(
                user=user,
                success=True,
                logout_timestamp__isnull=True
            ).order_by('-timestamp').first()
            
            if recent_login:
                recent_login.mark_logout()
        except Exception as e:
            logger.error(f"Error marking logout: {str(e)}")
        
        # Log system log
        SystemLog.objects.create(
            level='INFO',
            log_type='AUTH',
            user=user,
            ip_address=request.META.get('REMOTE_ADDR'),
            action='User logout',
            details={'username': request.user.username}
        )
        
        return Response({
            'success': True,
            'message': 'Logout successful'
        })

class GroupListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        groups = Group.objects.all()
        serializer = GroupSerializer(groups, many=True)
        return Response({
            'success': True,
            'groups': serializer.data
        })

class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        # Filter by role
        role = self.request.query_params.get('role', None)
        if role:
            if role == 'Admin':
                queryset = queryset.filter(is_staff=True, is_superuser=False)
            elif role == 'Super Admin':
                queryset = queryset.filter(is_superuser=True)
        
        return queryset

class UserCreateView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                user = serializer.save()
                
                # The signal should have already created a UserProfile
                if not hasattr(user, 'profile'):
                    try:
                        UserProfile.objects.get_or_create(user=user)
                    except Exception as e:
                        logger.error(f"Error creating profile: {e}")
                
                # Add user to group based on role
                role = request.data.get('role', 'User')
                if role:
                    try:
                        group, created = Group.objects.get_or_create(name=role)
                        user.groups.add(group)
                        
                        # If role is Admin, set staff flag
                        if role in ['Admin', 'Super Admin']:
                            user.is_staff = True
                            if role == 'Super Admin':
                                user.is_superuser = True
                            user.save()
                    except Group.DoesNotExist:
                        # Create group if it doesn't exist
                        group = Group.objects.create(name=role)
                        user.groups.add(group)
                
                SystemLog.objects.create(
                    level='INFO',
                    log_type='USER',
                    user=request.user,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    action='User created via API',
                    details={
                        'created_user': user.username,
                        'role': role
                    }
                )
                
                return Response({
                    'success': True,
                    'message': 'User created successfully',
                    'user': UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class UserDetailView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            serializer = UserSerializer(user)
            return Response({
                'success': True,
                'user': serializer.data
            })
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({
                    'success': False,
                    'error': 'Old password is incorrect'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            update_session_auth_hash(request, user)
            
            SystemLog.objects.create(
                level='SECURITY',
                log_type='SECURITY',
                user=user,
                ip_address=request.META.get('REMOTE_ADDR'),
                action='Password changed',
                details={'username': user.username}
            )
            
            return Response({
                'success': True,
                'message': 'Password changed successfully'
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class UnlinkedUsersView(APIView):
    """Get users not linked to any staff"""
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        all_users = User.objects.all()
        unlinked_users = []
        
        for user in all_users:
            if hasattr(user, 'profile'):
                if user.profile.staff_detail is None:
                    unlinked_users.append(user)
            else:
                unlinked_users.append(user)
        
        serializer = UserSerializer(unlinked_users, many=True)
        return Response({
            'success': True,
            'count': len(unlinked_users),
            'users': serializer.data
        })

class UserPasswordResetView(APIView):
    """Admin resets any user's password"""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        new_password = request.data.get('new_password')
        if not new_password:
            return Response({
                'success': False,
                'error': 'New password is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(new_password) < 8:
            return Response({
                'success': False,
                'error': 'Password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        
        SystemLog.objects.create(
            level='SECURITY',
            log_type='SECURITY',
            user=request.user,
            ip_address=request.META.get('REMOTE_ADDR'),
            action=f'Password reset for user {user.username}',
            details={'target_user_id': user_id}
        )
        
        return Response({
            'success': True,
            'message': f'Password reset successfully for {user.username}'
        })

class UserDeleteView(APIView):
    """Delete a user"""
    permission_classes = [permissions.IsAdminUser]
    
    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if user.is_superuser and not request.user.is_superuser:
            return Response({
                'success': False,
                'error': 'Cannot delete superuser account'
            }, status=status.HTTP_403_FORBIDDEN)
        
        username = user.username
        
        try:
            if hasattr(user, 'profile') and user.profile.staff_detail:
                staff = user.profile.staff_detail
                staff.user = None
                staff.account_active = False
                staff.save()
        except:
            pass
        
        user.delete()
        
        SystemLog.objects.create(
            level='WARNING',
            log_type='USER',
            user=request.user,
            ip_address=request.META.get('REMOTE_ADDR'),
            action=f'User deleted: {username}',
            details={'deleted_user_id': user_id}
        )
        
        return Response({
            'success': True,
            'message': f'User {username} deleted successfully'
        })

class SystemLogView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        level = request.query_params.get('level')
        log_type = request.query_params.get('type')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 50)), 100)
        
        logs = SystemLog.objects.all()
        
        if level:
            logs = logs.filter(level=level)
        if log_type:
            logs = logs.filter(log_type=log_type)
        if start_date:
            try:
                start = datetime.datetime.strptime(start_date, '%Y-%m-%d')
                logs = logs.filter(timestamp__gte=start)
            except:
                pass
        if end_date:
            try:
                end = datetime.datetime.strptime(end_date, '%Y-%m-%d')
                logs = logs.filter(timestamp__lte=end)
            except:
                pass
        
        total = logs.count()
        offset = (page - 1) * page_size
        logs = logs.order_by('-timestamp')[offset:offset + page_size]
        
        logs_data = []
        for log in logs:
            logs_data.append({
                'id': log.id,
                'timestamp': log.timestamp,
                'level': log.level,
                'log_type': log.log_type,
                'user': log.user.username if log.user else None,
                'ip_address': log.ip_address,
                'action': log.action,
                'details': log.details
            })
        
        return Response({
            'success': True,
            'logs': logs_data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'pages': (total + page_size - 1) // page_size
            }
        })

class ActivityMonitorView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        activities = ActivityMonitor.objects.all().order_by('-timestamp')[:50]
        
        activities_data = []
        for activity in activities:
            activities_data.append({
                'id': activity.id,
                'timestamp': activity.timestamp,
                'user': activity.user.username if activity.user else 'System',
                'action': activity.action,
                'endpoint': activity.endpoint,
                'method': activity.method,
                'status_code': activity.status_code,
                'duration': activity.duration,
                'metadata': activity.metadata
            })
        
        last_activity = ActivityMonitor.objects.last()
        last_activity_data = None
        if last_activity:
            last_activity_data = {
                'timestamp': last_activity.timestamp,
                'user': last_activity.user.username if last_activity.user else 'System',
                'action': last_activity.action,
                'endpoint': last_activity.endpoint
            }
        
        return Response({
            'success': True,
            'recent_activities': activities_data,
            'last_activity': last_activity_data,
            'total_activities': ActivityMonitor.objects.count()
        })

# authentication/views.py - UPDATE DashboardStatsView class
class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from django.contrib.auth.models import User, Group
        
        stats = {}
        user_role = 'User'
        
        if request.user.is_superuser:
            user_role = 'Super Admin'
        elif request.user.is_staff:
            user_role = 'Admin'
        elif hasattr(request.user, 'profile') and request.user.profile.staff_detail:
            user_role = request.user.profile.staff_detail.Role
        
        if request.user.is_staff or request.user.is_superuser:
            # Use string imports to avoid circular imports
            try:
                # Import Department using string path
                from adminapp.models import Department
                
                stats.update({
                    'total_users': User.objects.count(),
                    'total_groups': Group.objects.count(),
                    'today_logins': LoginHistory.objects.filter(
                        success=True,
                        timestamp__date=timezone.now().date()
                    ).count(),
                    'total_departments': Department.objects.count(),  # ADD THIS
                    'departments_with_staff': Department.objects.filter(
                        staff_details__isnull=False
                    ).distinct().count() if hasattr(Department, 'staff_details') else 0,
                })
                
                # Try to get staff stats if models exist
                try:
                    from adminapp.models import StaffDetail
                    stats.update({
                        'total_staff': StaffDetail.objects.count(),
                        'active_staff': StaffDetail.objects.filter(Status='Available').count(),
                        'doctors_count': StaffDetail.objects.filter(Role='Doctor').count(),
                        'admins_count': StaffDetail.objects.filter(Role='Admin').count(),
                    })
                except Exception as e:
                    logger.warning(f"Could not load staff stats: {e}")
                    stats.update({
                        'total_staff': 0,
                        'active_staff': 0,
                        'doctors_count': 0,
                        'admins_count': 0,
                    })
                    
            except ImportError as e:
                logger.error(f"DashboardStatsView import error: {e}")
                stats.update({
                    'total_users': User.objects.count(),
                    'total_groups': Group.objects.count(),
                    'today_logins': 0,
                    'total_departments': 0,
                    'departments_with_staff': 0,
                    'total_staff': 0,
                    'active_staff': 0,
                    'doctors_count': 0,
                    'admins_count': 0,
                })
        
        if hasattr(request.user, 'profile') and request.user.profile.staff_detail:
            staff = request.user.profile.staff_detail
            if staff.Role == 'Doctor':
                stats.update({
                    'doctor_name': staff.Name,
                    'department': staff.Department.Department_Name if staff.Department else 'N/A',
                    'consultation_fees': float(staff.Consultation_fees),
                    'status': staff.Status,
                })
            elif staff.Role == 'Receptionist':
                stats.update({
                    'staff_name': staff.Name,
                    'phone': staff.Phone_Number,
                    'email': staff.Email,
                })
        
        return Response({
            'success': True,
            'stats': stats,
            'user_role': user_role,
            'timestamp': timezone.now()
        })

class TrackLogoutView(APIView):
    """API endpoint to manually track user logout"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        try:
            recent_login = LoginHistory.objects.filter(
                user=user,
                success=True,
                logout_timestamp__isnull=True
            ).order_by('-timestamp').first()
            
            if recent_login:
                recent_login.mark_logout()
                
                SystemLog.objects.create(
                    level='INFO',
                    log_type='AUTH',
                    user=user,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    action='User manual logout recorded',
                    details={'username': user.username}
                )
                
                return Response({
                    'success': True,
                    'message': 'Logout recorded successfully',
                    'login_id': recent_login.id,
                    'login_time': recent_login.timestamp,
                    'logout_time': recent_login.logout_timestamp
                })
            else:
                return Response({
                    'success': False,
                    'error': 'No active login session found'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            logger.error(f"Error tracking logout for user {user.username}: {str(e)}")
            return Response({
                'success': False,
                'error': str(e) if settings.DEBUG else 'Failed to record logout'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LoginHistoryView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        try:
            login_type = request.query_params.get('login_type', '')
            success = request.query_params.get('success', '')
            username = request.query_params.get('username', '')
            ip_address = request.query_params.get('ip_address', '')
            start_date = request.query_params.get('start_date', '')
            end_date = request.query_params.get('end_date', '')
            show_active = request.query_params.get('show_active', 'false') == 'true'
            sort_by = request.query_params.get('sort_by', '-timestamp')
            page = int(request.query_params.get('page', 1))
            page_size = min(int(request.query_params.get('page_size', 50)), 200)
            
            logs = LoginHistory.objects.all()
            
            if login_type:
                logs = logs.filter(login_type=login_type)
            if success:
                try:
                    success_bool = success.lower() == 'true'
                    logs = logs.filter(success=success_bool)
                except:
                    pass
            if username:
                logs = logs.filter(username__icontains=username)
            if ip_address:
                logs = logs.filter(ip_address__icontains=ip_address)
            if start_date:
                try:
                    start = datetime.datetime.strptime(start_date, '%Y-%m-%d')
                    logs = logs.filter(timestamp__gte=start)
                except:
                    pass
            if end_date:
                try:
                    end = datetime.datetime.strptime(end_date, '%Y-%m-%d')
                    end = end + datetime.timedelta(days=1)
                    logs = logs.filter(timestamp__lte=end)
                except:
                    pass
            if show_active:
                logs = logs.filter(success=True, logout_timestamp__isnull=True)
            
            valid_sort_fields = ['id', 'username', 'login_type', 'success', 'timestamp', 
                               'logout_timestamp', 'session_duration']
            if sort_by.lstrip('-') in valid_sort_fields:
                logs = logs.order_by(sort_by)
            else:
                logs = logs.order_by('-timestamp')
            
            total = logs.count()
            offset = (page - 1) * page_size
            paginated_logs = logs[offset:offset + page_size]
            
            logs_data = []
            for log in paginated_logs:
                # Handle logout timestamp for failed logins
                logout_time = None
                logout_display = "N/A"
                if log.success and log.logout_timestamp:
                    logout_time = log.logout_timestamp.isoformat()
                    logout_display = log.logout_timestamp.strftime('%Y-%m-%d %H:%M:%S')
                elif not log.success:
                    logout_display = "N/A"
                elif log.success and not log.logout_timestamp:
                    logout_display = "Still active"
                
                logs_data.append({
                    'id': log.id,
                    'username': log.username or '',
                    'login_type': log.login_type or '',
                    'login_type_display': log.get_login_type_display(),
                    'ip_address': log.ip_address or '',
                    'user_agent': log.user_agent or '',
                    'success': log.success,
                    'timestamp': log.timestamp.isoformat() if log.timestamp else '',
                    'logout_timestamp': logout_time,
                    'logout_timestamp_display': logout_display,
                    'session_duration': log.session_duration,
                    'session_duration_display': log.get_session_duration_display(),
                    'user': log.user.username if log.user and hasattr(log.user, 'username') else None,
                    'user_id': log.user.id if log.user else None,
                    'details': log.details or {},
                    'is_active': log.success and not log.logout_timestamp
                })
            
            today = timezone.now().date()
            today_logs = LoginHistory.objects.filter(timestamp__date=today)
            
            active_sessions = LoginHistory.objects.filter(
                success=True, 
                logout_timestamp__isnull=True
            ).count()
            
            # Calculate average duration only for successful logins with logout
            successful_logins_with_logout = LoginHistory.objects.filter(
                success=True, 
                logout_timestamp__isnull=False
            )
            avg_duration_result = successful_logins_with_logout.aggregate(Avg('session_duration'))
            
            stats = {
                'total_logins': total,
                'successful_logins': logs.filter(success=True).count(),
                'failed_logins': logs.filter(success=False).count(),
                'today_logins': today_logs.count(),
                'today_successful': today_logs.filter(success=True).count(),
                'today_failed': today_logs.filter(success=False).count(),
                'active_sessions': active_sessions,
                'avg_session_duration': avg_duration_result['session_duration__avg'] or 0
            }
            
            return Response({
                'success': True,
                'logs': logs_data,
                'stats': stats,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total': total,
                    'pages': (total + page_size - 1) // page_size if page_size > 0 else 0
                }
            })
            
        except Exception as e:
            logger.error(f"Error in LoginHistoryView: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'Failed to fetch login history',
                'detail': str(e) if settings.DEBUG else 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# authentication/views.py - Fix the ForceLogoutView
class ForceLogoutView(APIView):
    """API endpoint to force logout a user"""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, login_id):
        try:
            login_record = LoginHistory.objects.get(id=login_id)
            
            if not login_record.success:
                return Response({
                    'success': False,
                    'error': 'Cannot force logout a failed login attempt'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if login_record.logout_timestamp:
                return Response({
                    'success': False,
                    'error': 'User already logged out'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            login_record.mark_logout()
            
            # FIXED: Convert datetime objects to strings
            SystemLog.objects.create(
                level='WARNING',
                log_type='SECURITY',
                user=request.user,
                ip_address=request.META.get('REMOTE_ADDR'),
                action=f'Force logout for user {login_record.username}',
                details={
                    'target_username': login_record.username,
                    'login_id': login_record.id,
                    'login_time': login_record.timestamp.isoformat() if login_record.timestamp else None,
                    'forced_by': request.user.username
                }
            )
            
            # FIXED: Convert datetime objects to strings for response
            return Response({
                'success': True,
                'message': f'Force logged out {login_record.username}',
                'login_id': login_record.id,
                'username': login_record.username,
                'login_time': login_record.timestamp.isoformat() if login_record.timestamp else None,
                'logout_time': login_record.logout_timestamp.isoformat() if login_record.logout_timestamp else None,
                'session_duration': login_record.session_duration
            })
            
        except LoginHistory.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Login record not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error forcing logout: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e) if settings.DEBUG else 'Failed to force logout'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

# authentication/views.py - ADD THIS VIEW
class StaffPasswordResetView(APIView):
    """Reset password for a staff member's user account"""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, staff_id=None):
        try:
            from adminapp.models import StaffDetail
            staff = StaffDetail.objects.get(STAFF_ID=staff_id)
        except StaffDetail.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Staff not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if staff has a linked user account
        if not staff.user:
            return Response({
                'success': False,
                'error': 'Staff does not have a linked user account'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = staff.user
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response({
                'success': False,
                'error': 'New password is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(new_password) < 8:
            return Response({
                'success': False,
                'error': 'Password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update user password
        user.set_password(new_password)
        user.save()
        
        # Update staff record
        staff.last_password_reset = timezone.now()
        staff.save()
        
        # Log the action
        SystemLog.objects.create(
            level='SECURITY',
            log_type='SECURITY',
            user=request.user,
            ip_address=request.META.get('REMOTE_ADDR'),
            action=f'Reset password for staff {staff.Name} (username: {user.username})',
            details={
                'staff_id': staff.STAFF_ID,
                'user_id': user.id,
                'staff_name': staff.Name,
                'username': user.username
            }
        )
        
        return Response({
            'success': True,
            'message': f'Password reset successfully for {staff.Name}',
            'staff': {
                'id': staff.STAFF_ID,
                'name': staff.Name,
                'username': user.username,
                'email': staff.Email
            }
        })
    

# authentication/views.py - ADD THESE NEW VIEWS

class UserBulkDeleteView(APIView):
    """Bulk delete users"""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        user_ids = request.data.get('user_ids', [])
        
        if not user_ids:
            return Response({
                'success': False,
                'error': 'No user IDs provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        deleted_users = []
        failed_deletions = []
        
        for user_id in user_ids:
            try:
                user = User.objects.get(id=user_id)
                
                # Prevent deleting superuser unless by superuser
                if user.is_superuser and not request.user.is_superuser:
                    failed_deletions.append({
                        'id': user_id,
                        'username': user.username,
                        'error': 'Cannot delete superuser account'
                    })
                    continue
                
                username = user.username
                
                # Unlink staff if exists
                try:
                    if hasattr(user, 'profile') and user.profile.staff_detail:
                        staff = user.profile.staff_detail
                        staff.user = None
                        staff.account_active = False
                        staff.save()
                except:
                    pass
                
                user.delete()
                deleted_users.append({'id': user_id, 'username': username})
                
                # Log the action
                SystemLog.objects.create(
                    level='WARNING',
                    log_type='USER',
                    user=request.user,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    action=f'User deleted: {username}',
                    details={'deleted_user_id': user_id}
                )
                
            except User.DoesNotExist:
                failed_deletions.append({
                    'id': user_id,
                    'error': 'User not found'
                })
            except Exception as e:
                failed_deletions.append({
                    'id': user_id,
                    'error': str(e)
                })
        
        return Response({
            'success': True,
            'message': f'Deleted {len(deleted_users)} users',
            'deleted': deleted_users,
            'failed': failed_deletions
        })

class EndSessionView(APIView):
    """Manually end session when user goes back to login page"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        try:
            # Find and mark logout for all active sessions
            active_logins = LoginHistory.objects.filter(
                user=user,
                success=True,
                logout_timestamp__isnull=True
            )
            
            ended_sessions = []
            for login in active_logins:
                login.mark_logout()
                ended_sessions.append({
                    'login_id': login.id,
                    'login_time': login.timestamp,
                    'logout_time': login.logout_timestamp
                })
            
            # Log system log
            SystemLog.objects.create(
                level='INFO',
                log_type='AUTH',
                user=user,
                ip_address=request.META.get('REMOTE_ADDR'),
                action='User ended session manually',
                details={
                    'username': user.username,
                    'ended_sessions': len(ended_sessions)
                }
            )
            
            return Response({
                'success': True,
                'message': f'Ended {len(ended_sessions)} active sessions',
                'ended_sessions': ended_sessions
            })
                
        except Exception as e:
            logger.error(f"Error ending session for user {user.username}: {str(e)}")
            return Response({
                'success': False,
                'error': str(e) if settings.DEBUG else 'Failed to end session'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class ListAllAuthUrls(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        from django.urls import get_resolver, reverse
        
        resolver = get_resolver()
        url_patterns = []
        
        def extract_urls(patterns, prefix=''):
            for pattern in patterns:
                if hasattr(pattern, 'url_patterns'):
                    # This is an include
                    extract_urls(pattern.url_patterns, prefix + str(pattern.pattern))
                else:
                    # This is a regular pattern
                    try:
                        full_pattern = prefix + str(pattern.pattern)
                        url_patterns.append({
                            'pattern': full_pattern,
                            'name': pattern.name if hasattr(pattern, 'name') else None
                        })
                    except:
                        pass
        
        extract_urls(resolver.url_patterns)
        
        return Response({
            'all_urls': url_patterns,
            'test_urls': [
                '/api/auth/check-auth/',
                '/api/auth/admin-login/',
                '/api/auth/staff-login/',
            ]
        })
    
# authentication/views.py - ADD THIS VIEW (add to the bottom of the file)
class SyncUserRoleView(APIView):
    """Sync user's group role to match their staff role"""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            synced = sync_user_role_to_staff(user)
            
            if synced:
                return Response({
                    'success': True,
                    'message': f'User {user.username} role synced to staff role',
                    'user': UserSerializer(user).data
                })
            else:
                return Response({
                    'success': False,
                    'error': 'User does not have a staff profile'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)