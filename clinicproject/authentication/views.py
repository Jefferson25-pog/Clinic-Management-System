from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User, Group
from django.contrib.auth import update_session_auth_hash
from django.db import transaction
from django.utils import timezone
from .serializers import (
    AdminLoginSerializer, 
    StaffLoginSerializer, 
    UserSerializer,
    UserCreateSerializer,
    GroupSerializer,
    PasswordChangeSerializer
)
from .models import SystemLog, ActivityMonitor, UserProfile
from adminapp.models import StaffDetail
from adminapp.serializers import StaffDetailsSerializer
import datetime
import logging

logger = logging.getLogger(__name__)

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

class StaffLoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = StaffLoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            staff_detail = serializer.validated_data['staff_detail']
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
                    'staff_id': staff_detail.STAFF_ID,
                    'staff_name': staff_detail.Name,
                    'role': staff_detail.Role
                }
            )
            
            return Response({
                'success': True,
                'message': 'Staff login successful',
                'user': user_serializer.data,
                'staff_detail': StaffDetailsSerializer(staff_detail).data,
                'tokens': {
                    'refresh': serializer.validated_data['refresh'],
                    'access': serializer.validated_data['access']
                }
            })
        
        # Log failed login attempt
        username = request.data.get('username', 'unknown')
        LoginHistory.objects.create(
            username=username,
            login_type='STAFF',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            success=False,
            details={'error': 'Invalid credentials'}
        )
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class AuthCheckView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_serializer = UserSerializer(request.user)
        data = {
            'authenticated': True,
            'user': user_serializer.data
        }
        
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail:
            data['staff_detail'] = StaffDetailsSerializer(request.user.staff_detail).data
        
        return Response(data)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        SystemLog.objects.create(
            level='INFO',
            log_type='AUTH',
            user=request.user,
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
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

class UserCreateView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                user = serializer.save()
                
                SystemLog.objects.create(
                    level='INFO',
                    log_type='USER',
                    user=request.user,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    action='User created via API',
                    details={
                        'created_user': user.username,
                        'role': request.data.get('role', 'User')
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

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from django.contrib.auth.models import User
        from adminapp.models import StaffDetail
        
        stats = {}
        user_role = 'User'
        
        if request.user.is_superuser:
            user_role = 'Super Admin'
        elif request.user.is_staff:
            user_role = 'Admin'
        elif hasattr(request.user, 'staff_detail'):
            user_role = request.user.staff_detail.Role
        
        if request.user.is_staff or request.user.is_superuser:
            stats.update({
                'total_users': User.objects.count(),
                'total_staff': StaffDetail.objects.count(),
                'active_staff': StaffDetail.objects.filter(Status='Available').count(),
                'doctors_count': StaffDetail.objects.filter(Role='Doctor').count(),
                'admins_count': StaffDetail.objects.filter(Role='Admin').count(),
                'total_groups': Group.objects.count(),
                'today_logins': SystemLog.objects.filter(
                    log_type='AUTH', 
                    action__contains='login',
                    timestamp__date=timezone.now().date()
                ).count(),
            })
        
        if hasattr(request.user, 'staff_detail'):
            staff = request.user.staff_detail
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