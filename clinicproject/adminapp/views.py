# adminapp/views.py - COMPLETE FIXED VERSION
from rest_framework import viewsets, status, filters
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import StaffDetail, Department
from .serializers import StaffDetailsSerializer, DepartmentsSerializer, GroupSerializer
from django.contrib.auth.models import User, Group
from authentication.models import SystemLog, UserProfile
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction
import secrets
import string
from django.core.mail import send_mail
from django.conf import settings
import logging
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                (request.user.is_superuser or  
                 (hasattr(request.user, 'staff_detail') and 
                  request.user.staff_detail.Role == 'Admin') or
                 request.user.is_staff))

class StaffDetailsViewSet(viewsets.ModelViewSet):
    queryset = StaffDetail.objects.all().select_related('Department')
    serializer_class = StaffDetailsSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # DEFINE FILTER FIELDS
    filterset_fields = ['Role', 'Status', 'Department', 'account_active']
    search_fields = ['Name', 'Email', 'STAFF_ID', 'Phone_Number']
    ordering_fields = ['STAFF_ID', 'Name', 'Role', 'Status', 'created_at', 'account_active']
    ordering = ['STAFF_ID']
    
    @action(detail=True, methods=['post'])
    def create_user_account(self, request, pk=None):
        """Create a new user account for staff using model method"""
        staff = self.get_object()
        
        if staff.user:
            return Response({
                'success': False,
                'error': 'Staff already has a user account'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get password from request or generate one
        password = request.data.get('password')
        if password and len(password) < 8:
            return Response({
                'success': False,
                'error': 'Password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Use the model's create_user_account method
            user = staff.create_user_account(password=password)
            
            return Response({
                'success': True,
                'message': 'User account created successfully',
                'username': user.username,
                'email': staff.Email,
                'auto_generated': password is None,
                'staff': StaffDetailsSerializer(staff).data
            })
            
        except Exception as e:
            logger.error(f"Error creating staff account: {e}")
            return Response({
                'success': False,
                'error': f'Failed to create account: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def link_to_user(self, request, pk=None):
        """Link staff to existing user account"""
        staff = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response({
                'success': False,
                'error': 'User ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is already linked to another staff
        try:
            if hasattr(user, 'staff_detail') and user.staff_detail is not None:
                return Response({
                    'success': False,
                    'error': f'User is already linked to {user.staff_detail.Name}'
                }, status=status.HTTP_400_BAD_REQUEST)
        except:
            pass
        
        try:
            with transaction.atomic():
                # Link the staff to user
                staff.user = user
                staff.account_active = user.is_active
                staff.account_created_at = user.date_joined
                staff.save()
                
                # Update user profile
                profile, created = UserProfile.objects.get_or_create(user=user)
                profile.staff_detail = staff
                profile.save()
                
                # Add user to appropriate group based on staff role
                group, created = Group.objects.get_or_create(name=staff.Role)
                user.groups.add(group)
                
                if staff.Role == 'Admin':
                    user.is_staff = True
                    user.save()
                
                # Log the action
                SystemLog.objects.create(
                    level='INFO',
                    log_type='USER',
                    user=request.user,
                    action=f'Linked staff {staff.Name} to user {user.username}',
                    details={
                        'staff_id': staff.STAFF_ID,
                        'user_id': user.id,
                        'role': staff.Role
                    }
                )
                
                return Response({
                    'success': True,
                    'message': 'Staff linked to user account successfully',
                    'username': user.username,
                    'email': user.email,
                    'staff': StaffDetailsSerializer(staff).data
                })
                
        except Exception as e:
            logger.error(f"Error linking staff to user: {e}")
            return Response({
                'success': False,
                'error': f'Failed to link account: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def unlink_account(self, request, pk=None):
        """Unlink staff from user account"""
        staff = self.get_object()
        
        if not staff.user:
            return Response({
                'success': False,
                'error': 'No user account linked'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = staff.user
        username = user.username
        
        try:
            with transaction.atomic():
                # Remove staff link
                staff.user = None
                staff.account_active = False
                staff.save()
                
                # Remove staff from user profile
                try:
                    profile = user.profile
                    profile.staff_detail = None
                    profile.save()
                except:
                    pass
                
                # Log the action
                SystemLog.objects.create(
                    level='WARNING',
                    log_type='USER',
                    user=request.user,
                    action=f'Unlinked staff {staff.Name} from user {username}',
                    details={
                        'staff_id': staff.STAFF_ID,
                        'user_id': user.id,
                        'role': staff.Role
                    }
                )
                
                return Response({
                    'success': True,
                    'message': 'Account unlinked successfully',
                    'staff': StaffDetailsSerializer(staff).data
                })
                
        except Exception as e:
            logger.error(f"Error unlinking account: {e}")
            return Response({
                'success': False,
                'error': f'Failed to unlink account: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def reset_password_auto(self, request, pk=None):
        """Auto-generate and email password to staff using model method"""
        staff = self.get_object()
        
        if not staff.user:
            return Response({
                'success': False,
                'error': 'No user account linked'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Use the model's reset_password method
            generated_password = staff.reset_password()
            
            # Send email (in production)
            email_sent = False
            try:
                send_mail(
                    subject='Your Password Has Been Reset',
                    message=f'Dear {staff.Name},\n\nYour password has been reset.\n\nNew Password: {generated_password}\n\nPlease login and change your password immediately.\n\nBest regards,\nHospital Management System',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[staff.Email],
                    fail_silently=True,
                )
                email_sent = True
            except Exception as e:
                logger.error(f"Error sending email: {e}")
            
            message = f'Password reset successfully for {staff.Name}. '
            message += 'New password has been emailed.' if email_sent else 'New password generated.'
            
            return Response({
                'success': True,
                'message': message,
                'email_sent': email_sent,
                'auto_generated_password': generated_password if not email_sent else None
            })
            
        except Exception as e:
            logger.error(f"Error resetting password: {e}")
            return Response({
                'success': False,
                'error': f'Failed to reset password: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def set_custom_password(self, request, pk=None):
        """Set custom password for staff using model method"""
        staff = self.get_object()
        new_password = request.data.get('new_password')
        
        if not staff.user:
            return Response({
                'success': False,
                'error': 'No user account linked'
            }, status=status.HTTP_400_BAD_REQUEST)
        
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
        
        try:
            # Use the model's set_custom_password method
            success = staff.set_custom_password(new_password)
            
            if success:
                return Response({
                    'success': True,
                    'message': f'Password set successfully for {staff.Name}'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Failed to set password'
                })
            
        except Exception as e:
            logger.error(f"Error setting password: {e}")
            return Response({
                'success': False,
                'error': f'Failed to set password: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def activate_account(self, request, pk=None):
        """Activate staff account using model method"""
        staff = self.get_object()
        
        if not staff.user:
            return Response({
                'success': False,
                'error': 'No user account linked'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Use the model's activate_account method
            success = staff.activate_account()
            
            if success:
                return Response({
                    'success': True,
                    'message': f'Account activated for {staff.Name}'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Account is already active'
                })
            
        except Exception as e:
            logger.error(f"Error activating account: {e}")
            return Response({
                'success': False,
                'error': f'Failed to activate account: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def deactivate_account(self, request, pk=None):
        """Deactivate staff account using model method"""
        staff = self.get_object()
        
        if not staff.user:
            return Response({
                'success': False,
                'error': 'No user account linked'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Use the model's deactivate_account method
            success = staff.deactivate_account()
            
            if success:
                return Response({
                    'success': True,
                    'message': f'Account deactivated for {staff.Name}'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Account is already inactive'
                })
            
        except Exception as e:
            logger.error(f"Error deactivating account: {e}")
            return Response({
                'success': False,
                'error': f'Failed to deactivate account: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def check_account(self, request, pk=None):
        """Check if staff has user account"""
        staff = self.get_object()
        
        return Response({
            'success': True,
            'has_account': staff.has_user_account,
            'account_active': staff.account_active if staff.has_user_account else False,
            'username': staff.user.username if staff.has_user_account else None,
            'account_status': staff.account_status
        })
    
    @action(detail=True, methods=['get'])
    def user_account(self, request, pk=None):
        """Get staff's user account details"""
        staff = self.get_object()
        
        if not staff.user:
            return Response({
                'success': False,
                'error': 'No user account linked'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = staff.user
        
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_active': user.is_active,
                'date_joined': user.date_joined,
                'last_login': user.last_login
            },
            'account_active': staff.account_active,
            'account_created_at': staff.account_created_at,
            'last_password_reset': staff.last_password_reset
        })

# ADD THIS VIEWSET - IT WAS MISSING
class DepartmentsViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentsSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['Department_Name']
    ordering_fields = ['DEPT_ID', 'Department_Name', 'created_at']
    ordering = ['DEPT_ID']

# ADD THIS VIEWSET - IT WAS MISSING
class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

