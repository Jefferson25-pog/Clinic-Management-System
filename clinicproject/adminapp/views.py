# adminapp/views.py - CLEANED UP VERSION
from rest_framework import viewsets, status, filters
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import StaffDetail, Department
from .serializers import StaffDetailSerializer, DepartmentSerializer, GroupSerializer
from django.contrib.auth.models import User, Group
from authentication.models import SystemLog
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, CharFilter, ChoiceFilter
from django.utils import timezone
from django.db import transaction
import logging
from datetime import datetime
from rest_framework.exceptions import PermissionDenied, NotFound


logger = logging.getLogger(__name__)

# ==================== PERMISSION CLASSES ====================

class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                (request.user.is_superuser or  
                 (hasattr(request.user, 'staff_detail') and 
                  request.user.staff_detail.Role == 'Admin') or
                 request.user.is_staff))
    
class IsDoctor(BasePermission):
    """Permission to allow only doctors to access certain endpoints"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if hasattr(request.user, 'staff_detail'):
            return request.user.staff_detail.Role == 'Doctor'
        return False

class IsDoctorOrAdmin(BasePermission):
    """Permission to allow doctors to update their own status and admins to update any"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin can update any staff
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Admin':
            return True
        
        # Doctor can only update their own status
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            return request.user.staff_detail == obj
        
        return False

# ==================== FILTER CLASSES ====================

class StaffDetailFilter(FilterSet):
    staff_id = CharFilter(field_name='STAFF_ID', lookup_expr='icontains')
    name = CharFilter(field_name='Name', lookup_expr='icontains')
    role = ChoiceFilter(field_name='Role', choices=StaffDetail.ROLE_CHOICES)
    status = ChoiceFilter(field_name='Status', choices=StaffDetail.STATUS_CHOICES)
    account_status = ChoiceFilter(method='filter_account_status', choices=[
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('no_account', 'No Account')
    ])
    department = CharFilter(field_name='Department__DEPT_ID', lookup_expr='exact')
    
    class Meta:
        model = StaffDetail
        fields = ['staff_id', 'name', 'role', 'status', 'department', 'account_status']
    
    def filter_account_status(self, queryset, name, value):
        if value == 'active':
            return queryset.filter(account_active=True, user__isnull=False)
        elif value == 'inactive':
            return queryset.filter(account_active=False, user__isnull=False)
        elif value == 'no_account':
            return queryset.filter(user__isnull=True)
        return queryset

class DepartmentFilter(FilterSet):
    dept_id = CharFilter(field_name='DEPT_ID', lookup_expr='icontains')
    department_name = CharFilter(field_name='Department_Name', lookup_expr='icontains')
    
    class Meta:
        model = Department
        fields = ['dept_id', 'department_name']

# ==================== VIEWSETS ====================

class StaffDetailsViewSet(viewsets.ModelViewSet):
    queryset = StaffDetail.objects.all().select_related('Department')
    serializer_class = StaffDetailSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = StaffDetailFilter
    
    search_fields = [
        'STAFF_ID', 'Name', 'Email', 'Phone_Number', 'Qualification',
        'Specialization', 'License_Number'
    ]
    
    ordering_fields = [
        'STAFF_ID', 'Name', 'Role', 'Status', 'Age', 'Consultation_fees',
        'Joining_Date', 'created_at', 'account_active'
    ]
    
    ordering = ['STAFF_ID']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by account status if provided in query params
        account_status = self.request.query_params.get('account_status')
        if account_status:
            if account_status == 'active':
                queryset = queryset.filter(account_active=True, user__isnull=False)
            elif account_status == 'inactive':
                queryset = queryset.filter(account_active=False, user__isnull=False)
            elif account_status == 'no_account':
                queryset = queryset.filter(user__isnull=True)
        
        # Filter by department name if provided
        dept_name = self.request.query_params.get('dept_name')
        if dept_name:
            queryset = queryset.filter(Department__Department_Name__icontains=dept_name)
        
        # Filter by experience range
        min_exp = self.request.query_params.get('min_exp')
        max_exp = self.request.query_params.get('max_exp')
        if min_exp:
            queryset = queryset.filter(Experience__gte=int(min_exp))
        if max_exp:
            queryset = queryset.filter(Experience__lte=int(max_exp))
        
        # Filter by joining date range
        join_from = self.request.query_params.get('join_from')
        join_to = self.request.query_params.get('join_to')
        if join_from:
            try:
                join_from_date = datetime.strptime(join_from, '%Y-%m-%d').date()
                queryset = queryset.filter(Joining_Date__gte=join_from_date)
            except:
                pass
        if join_to:
            try:
                join_to_date = datetime.strptime(join_to, '%Y-%m-%d').date()
                queryset = queryset.filter(Joining_Date__lte=join_to_date)
            except:
                pass
        
        # Filter by age range
        min_age = self.request.query_params.get('min_age')
        max_age = self.request.query_params.get('max_age')
        if min_age:
            queryset = queryset.filter(Age__gte=int(min_age))
        if max_age:
            queryset = queryset.filter(Age__lte=int(max_age))
        
        # Filter by consultation fees range
        min_fees = self.request.query_params.get('min_fees')
        max_fees = self.request.query_params.get('max_fees')
        if min_fees:
            queryset = queryset.filter(Consultation_fees__gte=float(min_fees))
        if max_fees:
            queryset = queryset.filter(Consultation_fees__lte=float(max_fees))
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
    
        if isinstance(response.data, dict):
            response.data['filter_options'] = {
                'roles': [{'value': r[0], 'label': r[1]} for r in StaffDetail.ROLE_CHOICES],
                'statuses': [{'value': s[0], 'label': s[1]} for s in StaffDetail.STATUS_CHOICES],
                'genders': [{'value': g[0], 'label': g[1]} for g in StaffDetail.GENDER_CHOICES],
                'blood_groups': [{'value': b[0], 'label': b[1]} for b in StaffDetail.BLOOD_GROUP_CHOICES],
                'account_statuses': [
                    {'value': 'active', 'label': 'Active'},
                    {'value': 'inactive', 'label': 'Inactive'},
                    {'value': 'no_account', 'label': 'No Account'}
                ]
            }
        
            queryset = self.filter_queryset(self.get_queryset())
            response.data['statistics'] = {
                'total_staff': queryset.count(),
                'active_accounts': queryset.filter(account_active=True, user__isnull=False).count(),
                'inactive_accounts': queryset.filter(account_active=False, user__isnull=False).count(),
                'no_accounts': queryset.filter(user__isnull=True).count(),
                'doctors_count': queryset.filter(Role='Doctor').count(),
                'receptionists_count': queryset.filter(Role='Receptionist').count(),
                'pharmacists_count': queryset.filter(Role='Pharmacist').count(),
                'lab_tech_count': queryset.filter(Role='Lab Technician').count(),
            }
        else:
            response.data = {
                'results': response.data,
                'filter_options': {
                    'roles': [{'value': r[0], 'label': r[1]} for r in StaffDetail.ROLE_CHOICES],
                    'statuses': [{'value': s[0], 'label': s[1]} for s in StaffDetail.STATUS_CHOICES],
                    'genders': [{'value': g[0], 'label': g[1]} for g in StaffDetail.GENDER_CHOICES],
                    'blood_groups': [{'value': b[0], 'label': b[1]} for b in StaffDetail.BLOOD_GROUP_CHOICES],
                    'account_statuses': [
                        {'value': 'active', 'label': 'Active'},
                        {'value': 'inactive', 'label': 'Inactive'},
                        {'value': 'no_account', 'label': 'No Account'}
                    ]
                },
                'statistics': {
                    'total_staff': len(response.data),
                    'active_accounts': len([s for s in response.data if getattr(s, 'account_active', False) and getattr(s, 'user', None)]),
                    'inactive_accounts': len([s for s in response.data if not getattr(s, 'account_active', True) and getattr(s, 'user', None)]),
                    'no_accounts': len([s for s in response.data if not getattr(s, 'user', None)]),
                    'doctors_count': len([s for s in response.data if getattr(s, 'Role', '') == 'Doctor']),
                    'receptionists_count': len([s for s in response.data if getattr(s, 'Role', '') == 'Receptionist']),
                    'pharmacists_count': len([s for s in response.data if getattr(s, 'Role', '') == 'Pharmacist']),
                    'lab_tech_count': len([s for s in response.data if getattr(s, 'Role', '') == 'Lab Technician']),
                }
            }
    
        return response
    
    # ========== STAFF ACCOUNT MANAGEMENT ACTIONS ==========
    
    @action(detail=True, methods=['post'])
    def create_user_account(self, request, pk=None):
        """Create a new user account for staff using model method"""
        staff = self.get_object()
        
        if staff.user:
            return Response({
                'success': False,
                'error': 'Staff already has a user account'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        password = request.data.get('password')
        if password and len(password) < 8:
            return Response({
                'success': False,
                'error': 'Password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = staff.create_user_account(password=password)
            
            return Response({
                'success': True,
                'message': 'User account created successfully',
                'username': user.username,
                'email': staff.Email,
                'auto_generated': password is None,
                'staff': StaffDetailSerializer(staff).data
            })
            
        except Exception as e:
            logger.error(f"Error creating staff account: {e}")
            return Response({
                'success': False,
                'error': f'Failed to create account: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['patch'], permission_classes=[IsDoctorOrAdmin])
    def update_status(self, request, pk=None):
        """
        Update staff status (Availability)
        Allowed statuses: 'Available', 'Busy', 'UnAvailable'
        """
        staff = self.get_object()
        
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            if request.user.staff_detail != staff:
                return Response({
                    'success': False,
                    'error': 'You can only update your own status'
                }, status=status.HTTP_403_FORBIDDEN)
        
        new_status = request.data.get('status')
        
        if not new_status:
            return Response({
                'success': False,
                'error': 'Status is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        valid_statuses = dict(StaffDetail.STATUS_CHOICES).keys()
        if new_status not in valid_statuses:
            return Response({
                'success': False,
                'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            staff.Status = new_status
            staff.save()
            
            SystemLog.objects.create(
                level='INFO',
                log_type='STAFF_STATUS',
                user=request.user,
                action=f'Staff {staff.Name} status updated to {new_status}',
                details={
                    'staff_id': staff.STAFF_ID,
                    'old_status': staff.Status,
                    'new_status': new_status,
                    'updated_by': request.user.username
                }
            )
            
            return Response({
                'success': True,
                'message': f'Status updated to {new_status}',
                'staff': StaffDetailSerializer(staff).data
            })
            
        except Exception as e:
            logger.error(f"Error updating staff status: {e}")
            return Response({
                'success': False,
                'error': f'Failed to update status: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get comprehensive staff statistics"""
        total_staff = StaffDetail.objects.count()
        active_staff = StaffDetail.objects.filter(Status='Available').count()
        doctors = StaffDetail.objects.filter(Role='Doctor').count()
        receptionists = StaffDetail.objects.filter(Role='Receptionist').count()
        pharmacists = StaffDetail.objects.filter(Role='Pharmacist').count()
        lab_techs = StaffDetail.objects.filter(Role='Lab Technician').count()
        
        with_account = StaffDetail.objects.filter(user__isnull=False).count()
        without_account = StaffDetail.objects.filter(user__isnull=True).count()
        active_accounts = StaffDetail.objects.filter(account_active=True, user__isnull=False).count()
        inactive_accounts = StaffDetail.objects.filter(account_active=False, user__isnull=False).count()
        
        departments = Department.objects.annotate(
            staff_count=Count('staff_details'),
            doctor_count=Count('staff_details', filter=Q(staff_details__Role='Doctor'))
        ).values('DEPT_ID', 'Department_Name', 'staff_count', 'doctor_count')
        
        return Response({
            'success': True,
            'statistics': {
                'total_staff': total_staff,
                'active_staff': active_staff,
                'doctors': doctors,
                'receptionists': receptionists,
                'pharmacists': pharmacists,
                'lab_technicians': lab_techs,
                'with_account': with_account,
                'without_account': without_account,
                'active_accounts': active_accounts,
                'inactive_accounts': inactive_accounts,
                'departments': list(departments)
            }
        })
    
    @action(detail=True, methods=['post'])
    def link_to_user(self, request, pk=None):
        """Link an existing user account to staff"""
        staff = self.get_object()
    
        if staff.user:
            return Response({
                'success': False,
                'error': 'Staff already has a linked user account'
            }, status=status.HTTP_400_BAD_REQUEST)
    
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
            }, status=status.HTTP_404_NOT_FOUND)
    
        if hasattr(user, 'profile') and user.profile.staff_detail:
            return Response({
                'success': False,
                'error': 'User is already linked to another staff member'
            }, status=status.HTTP_400_BAD_REQUEST)
    
        try:
            with transaction.atomic():
                staff.user = user
                staff.account_active = True
                staff.account_created_at = timezone.now()
                staff.save()
            
                user.profile.staff_detail = staff
                user.profile.save()
            
                group_name = staff.Role.replace(' ', '_')
                group, created = Group.objects.get_or_create(name=group_name)
                user.groups.clear()
                user.groups.add(group)
            
                if staff.Role == 'Admin':
                    user.is_staff = True
                    user.save()
            
                SystemLog.objects.create(
                    level='INFO',
                    log_type='USER',
                    user=request.user,
                    action=f'Staff {staff.Name} linked to user {user.username}',
                    details={
                        'staff_id': staff.STAFF_ID,
                        'user_id': user.id,
                        'username': user.username,
                        'custom_user_id': user.profile.custom_user_id,
                        'staff_role': staff.Role
                    }
                )
            
                return Response({
                    'success': True,
                    'message': f'Staff {staff.Name} successfully linked to user {user.username}',
                    'staff': StaffDetailSerializer(staff).data,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'custom_user_id': user.profile.custom_user_id,
                        'email': user.email
                    }
                })
            
        except Exception as e:
            logger.error(f"Error linking staff to user: {e}")
            return Response({
                'success': False,
                'error': f'Failed to link staff to user: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def unlink_account(self, request, pk=None):
        """Unlink staff from user account"""
        staff = self.get_object()
    
        if not staff.user:
            return Response({
                'success': False,
                'error': 'Staff does not have a linked user account'
            }, status=status.HTTP_400_BAD_REQUEST)
    
        user = staff.user
    
        try:
            with transaction.atomic():
                staff.user = None
                staff.account_active = False
                staff.account_deactivated_at = timezone.now()
                staff.save()
            
                user.profile.staff_detail = None
                user.profile.save()
            
                group_name = staff.Role.replace(' ', '_')
                try:
                    group = Group.objects.get(name=group_name)
                    user.groups.remove(group)
                except Group.DoesNotExist:
                    pass
            
                SystemLog.objects.create(
                    level='WARNING',
                    log_type='USER',
                    user=request.user,
                    action=f'Staff {staff.Name} unlinked from user {user.username}',
                    details={
                        'staff_id': staff.STAFF_ID,
                        'user_id': user.id,
                        'username': user.username
                    }
                )
            
                return Response({
                    'success': True,
                    'message': f'Staff {staff.Name} unlinked from user account',
                    'staff': StaffDetailSerializer(staff).data
                })
            
        except Exception as e:
            logger.error(f"Error unlinking staff account: {e}")
            return Response({
                'success': False,
                'error': f'Failed to unlink account: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset password for staff user account"""
        staff = self.get_object()
    
        if not staff.user:
            return Response({
                'success': False,
                'error': 'Staff does not have a user account'
            }, status=status.HTTP_400_BAD_REQUEST)
    
        new_password = request.data.get('new_password')
        if new_password and len(new_password) < 8:
            return Response({
                'success': False,
                'error': 'Password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
    
        try:
            # If no password provided, generate one
            if not new_password:
                new_password = staff.reset_password()
                auto_generated = True
            else:
                success = staff.set_custom_password(new_password)
                if not success:
                    return Response({
                        'success': False,
                        'error': 'Failed to update password'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                auto_generated = False
            
            SystemLog.objects.create(
                level='SECURITY',
                log_type='SECURITY',
                user=request.user,
                action=f'Password reset for staff {staff.Name}',
                details={
                    'staff_id': staff.STAFF_ID,
                    'auto_generated': auto_generated
                }
            )
            
            return Response({
                'success': True,
                'message': 'Password reset successfully',
                'auto_generated': auto_generated,
                'new_password': new_password if auto_generated else None
            })
                
        except Exception as e:
            logger.error(f"Error resetting password: {e}")
            return Response({
                'success': False,
                'error': f'Failed to reset password: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def activate_account(self, request, pk=None):
        """Activate staff user account"""
        staff = self.get_object()
        
        if not staff.user:
            return Response({
                'success': False,
                'error': 'Staff does not have a user account'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            success = staff.activate_account()
            if success:
                return Response({
                    'success': True,
                    'message': 'Account activated successfully'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Account is already active'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error activating account: {e}")
            return Response({
                'success': False,
                'error': f'Failed to activate account: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def deactivate_account(self, request, pk=None):
        """Deactivate staff user account"""
        staff = self.get_object()
        
        if not staff.user:
            return Response({
                'success': False,
                'error': 'Staff does not have a user account'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            success = staff.deactivate_account()
            if success:
                return Response({
                    'success': True,
                    'message': 'Account deactivated successfully'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Account is already inactive'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error deactivating account: {e}")
            return Response({
                'success': False,
                'error': f'Failed to deactivate account: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def check_account(self, request, pk=None):
        """Check staff account status"""
        staff = self.get_object()
        
        return Response({
            'success': True,
            'has_account': staff.user is not None,
            'account_active': staff.account_active if staff.user else False,
            'account_status': staff.account_status,
            'can_have_account': staff.can_have_user_account,
            'user': {
                'id': staff.user.id if staff.user else None,
                'username': staff.user.username if staff.user else None,
                'email': staff.user.email if staff.user else None,
                'is_active': staff.user.is_active if staff.user else False
            } if staff.user else None
        })
    
    @action(detail=True, methods=['get'])
    def get_qualifications(self, request, pk=None):
        """Get all qualifications for a staff member"""
        staff = self.get_object()
        qualifications = staff.qualifications.all()
        serializer = QualificationSerializer(qualifications, many=True)
        return Response({
            'success': True,
            'qualifications': serializer.data,
            'total': qualifications.count()
        })
    
    @action(detail=True, methods=['post'])
    def add_qualification(self, request, pk=None):
        """Add a new qualification for staff"""
        staff = self.get_object()
        
        serializer = QualificationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(staff=staff)
            return Response({
                'success': True,
                'message': 'Qualification added successfully',
                'qualification': serializer.data
            })
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['put'])
    def update_qualification(self, request, pk=None):
        """Update a specific qualification"""
        staff = self.get_object()
        qual_id = request.data.get('id')
        
        if not qual_id:
            return Response({
                'success': False,
                'error': 'Qualification ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            qualification = Qualification.objects.get(id=qual_id, staff=staff)
        except Qualification.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Qualification not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = QualificationSerializer(qualification, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Qualification updated successfully',
                'qualification': serializer.data
            })
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['delete'])
    def delete_qualification(self, request, pk=None):
        """Delete a qualification"""
        staff = self.get_object()
        qual_id = request.query_params.get('id')
        
        if not qual_id:
            return Response({
                'success': False,
                'error': 'Qualification ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            qualification = Qualification.objects.get(id=qual_id, staff=staff)
            qualification.delete()
            return Response({
                'success': True,
                'message': 'Qualification deleted successfully'
            })
        except Qualification.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Qualification not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def set_primary_qualification(self, request, pk=None):
        """Set a qualification as primary"""
        staff = self.get_object()
        qual_id = request.data.get('id')
        
        if not qual_id:
            return Response({
                'success': False,
                'error': 'Qualification ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            qualification = Qualification.objects.get(id=qual_id, staff=staff)
            
            # Reset all other qualifications to non-primary
            staff.qualifications.filter(is_primary=True).update(is_primary=False)
            
            # Set this one as primary
            qualification.is_primary = True
            qualification.save()
            
            # Update the staff's primary qualification field
            staff.Qualification = qualification.qualification_name
            staff.save()
            
            return Response({
                'success': True,
                'message': 'Primary qualification set successfully',
                'qualification': QualificationSerializer(qualification).data
            })
        except Qualification.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Qualification not found'
            }, status=status.HTTP_404_NOT_FOUND)
    

class DepartmentsViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = DepartmentFilter
    search_fields = ['DEPT_ID', 'Department_Name', 'Description']
    ordering_fields = ['DEPT_ID', 'Department_Name', 'created_at']
    ordering = ['DEPT_ID']
    
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        
        queryset = self.filter_queryset(self.get_queryset())
        
        departments_with_counts = queryset.annotate(
            staff_count=Count('staff_details'),
            doctor_count=Count('staff_details', filter=Q(staff_details__Role='Doctor'))
        )
        
        total_departments = len(departments_with_counts)
        departments_with_staff_count = sum(1 for dept in departments_with_counts if dept.staff_count > 0)
        total_staff = sum(dept.staff_count for dept in departments_with_counts)
        avg_staff = total_staff / total_departments if total_departments > 0 else 0
        
        if isinstance(response.data, dict):
            response.data['statistics'] = {
                'total_departments': total_departments,
                'departments_with_staff': departments_with_staff_count,
                'average_staff_per_dept': round(avg_staff, 2)
            }
        else:
            response.data = {
                'results': response.data,
                'statistics': {
                    'total_departments': total_departments,
                    'departments_with_staff': departments_with_staff_count,
                    'average_staff_per_dept': round(avg_staff, 2)
                }
            }
        
        return response
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get department statistics"""
        total_departments = Department.objects.count()
        
        departments_with_counts = Department.objects.annotate(
            staff_count=Count('staff_details'),
            doctor_count=Count('staff_details', filter=Q(staff_details__Role='Doctor'))
        )
        
        departments_with_staff = sum(1 for dept in departments_with_counts if dept.staff_count > 0)
        
        top_departments = departments_with_counts.order_by('-staff_count')[:5].values(
            'DEPT_ID', 'Department_Name', 'staff_count', 'doctor_count'
        )
        
        return Response({
            'success': True,
            'statistics': {
                'total_departments': total_departments,
                'departments_with_staff': departments_with_staff,
                'departments_without_staff': total_departments - departments_with_staff,
                'top_departments': list(top_departments)
            }
        })
    
    def perform_create(self, serializer):
        serializer.save()
    
    def perform_update(self, serializer):
        data = serializer.validated_data.copy()
        data.pop('DEPT_ID', None)
        serializer.save()

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

# ==================== DOCTOR SELF-MANAGEMENT VIEWS ====================

class DoctorSelfView(viewsets.GenericViewSet):
    """
    Viewset for doctors to manage their own status
    Doctors can ONLY update their own status
    """
    permission_classes = [IsAuthenticated]
    serializer_class = StaffDetailSerializer
    
    def get_queryset(self):
        if hasattr(self.request.user, 'staff_detail'):
            return StaffDetail.objects.filter(pk=self.request.user.staff_detail.pk)
        return StaffDetail.objects.none()
    
    def get_object(self):
        if hasattr(self.request.user, 'staff_detail'):
            staff = self.request.user.staff_detail
            if staff.Role != 'Doctor':
                raise PermissionDenied('Only doctors can access this endpoint')
            return staff
        raise NotFound("No staff profile found")
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current doctor's info"""
        doctor = self.get_object()
        serializer = self.get_serializer(doctor)
        return Response({
            'success': True,
            'doctor': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def availability(self, request):
        """Get current doctor's availability"""
        doctor = self.get_object()
        return Response({
            'success': True,
            'status': doctor.Status,
            'doctor': {
                'id': doctor.STAFF_ID,
                'name': doctor.Name,
                'role': doctor.Role,
                'status': doctor.Status,
                'last_updated': doctor.updated_at if hasattr(doctor, 'updated_at') else None
            }
        })
    
    @action(detail=False, methods=['post'])
    def set_availability(self, request):
        """Set doctor's availability status"""
        doctor = self.get_object()
        
        new_status = request.data.get('status')
        
        if not new_status:
            return Response({
                'success': False,
                'error': 'Status is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        valid_statuses = ['Available', 'Busy', 'UnAvailable']
        if new_status not in valid_statuses:
            return Response({
                'success': False,
                'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            old_status = doctor.Status
            doctor.Status = new_status
            doctor.save()
            
            SystemLog.objects.create(
                level='INFO',
                log_type='DOCTOR_AVAILABILITY',
                user=request.user,
                action=f'Doctor {doctor.Name} availability changed',
                details={
                    'doctor_id': doctor.STAFF_ID,
                    'old_status': old_status,
                    'new_status': new_status,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            return Response({
                'success': True,
                'message': f'Availability status updated to {new_status}',
                'status': doctor.Status,
                'doctor': {
                    'id': doctor.STAFF_ID,
                    'name': doctor.Name,
                    'status': doctor.Status
                }
            })
            
        except Exception as e:
            logger.error(f"Error updating doctor availability: {e}")
            return Response({
                'success': False,
                'error': 'Failed to update availability status'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def toggle_availability(self, request):
        """Toggle between Available and UnAvailable (for quick toggle)"""
        doctor = self.get_object()
        
        try:
            old_status = doctor.Status
            
            if old_status == 'Available':
                new_status = 'UnAvailable'
            elif old_status == 'UnAvailable':
                new_status = 'Available'
            else:
                new_status = 'Available'
            
            doctor.Status = new_status
            doctor.save()
            
            SystemLog.objects.create(
                level='INFO',
                log_type='DOCTOR_AVAILABILITY',
                user=request.user,
                action=f'Doctor {doctor.Name} availability toggled',
                details={
                    'doctor_id': doctor.STAFF_ID,
                    'old_status': old_status,
                    'new_status': new_status,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            return Response({
                'success': True,
                'message': f'Status changed from {old_status} to {new_status}',
                'status': doctor.Status,
                'old_status': old_status,
                'new_status': new_status,
                'doctor': {
                    'id': doctor.STAFF_ID,
                    'name': doctor.Name,
                    'status': doctor.Status
                }
            })
            
        except Exception as e:
            logger.error(f"Error toggling doctor availability: {e}")
            return Response({
                'success': False,
                'error': 'Failed to toggle availability'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== DASHBOARD STATS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def dashboard_stats(request):
    """
    Get dashboard statistics for admin panel
    """
    try:
        # Import LoginHistory
        from authentication.models import LoginHistory
        
        total_staff = StaffDetail.objects.count()
        active_staff = StaffDetail.objects.filter(Status='Available').count()
        doctors_count = StaffDetail.objects.filter(Role='Doctor').count()
        admins_count = StaffDetail.objects.filter(Role='Admin').count()
        
        total_departments = Department.objects.count()
        
        total_users = User.objects.count()
        
        today = timezone.now().date()
        
        # FIXED: Use LoginHistory for all login stats
        today_logins = LoginHistory.objects.filter(
            timestamp__date=today
        ).count()
        
        active_sessions = LoginHistory.objects.filter(
            success=True,
            logout_timestamp__isnull=True
        ).count()
        
        successful_logins = LoginHistory.objects.filter(
            success=True,
            timestamp__date=today
        ).count()
        
        failed_logins = LoginHistory.objects.filter(
            success=False,
            timestamp__date=today
        ).count()
        
        stats = {
            'total_staff': total_staff,
            'active_staff': active_staff,
            'doctors_count': doctors_count,
            'admins_count': admins_count,
            'total_departments': total_departments,
            'total_users': total_users,
            'today_logins': today_logins,
            'active_sessions': active_sessions,
            'successful_logins': successful_logins,
            'failed_logins': failed_logins,
            'staff_count': total_staff,
            'departments_count': total_departments,
            'user_count': total_users,
        }
        
        return Response({
            'success': True,
            'stats': stats,
            'user_role': 'Super Admin' if request.user.is_superuser else 'Admin',
            'timestamp': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        import traceback
        traceback.print_exc()  # Print full traceback to console
        return Response({
            'success': False,
            'error': 'Internal server error'
        }, status=500)