# adminapp/views.py - COMPLETE FIXED VERSION
from rest_framework import viewsets, status, filters
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q, Avg
from .models import StaffDetail, Department
from .serializers import StaffDetailSerializer, DepartmentSerializer, GroupSerializer
from django.contrib.auth.models import User, Group
from authentication.models import SystemLog
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, CharFilter, ChoiceFilter
from django.utils import timezone
from django.db import transaction
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                (request.user.is_superuser or  
                 (hasattr(request.user, 'staff_detail') and 
                  request.user.staff_detail.Role == 'Admin') or
                 request.user.is_staff))

# Custom Filter for Staff Details
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

# Custom Filter for Departments
class DepartmentFilter(FilterSet):
    dept_id = CharFilter(field_name='DEPT_ID', lookup_expr='icontains')
    department_name = CharFilter(field_name='Department_Name', lookup_expr='icontains')
    
    class Meta:
        model = Department
        fields = ['dept_id', 'department_name']

class StaffDetailsViewSet(viewsets.ModelViewSet):
    queryset = StaffDetail.objects.all().select_related('Department')
    serializer_class = StaffDetailSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = StaffDetailFilter
    
    # Enhanced search fields
    search_fields = [
        'STAFF_ID', 'Name', 'Email', 'Phone_Number', 'Qualification',
        'Specialization', 'License_Number'
    ]
    
    # Enhanced ordering fields
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
    
        # Check if response.data is a dict (paginated) or list
        if isinstance(response.data, dict):
            # It's a dict with pagination info (like 'results', 'count', etc.)
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
        
            # Add statistics
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
            # It's a list, wrap it in a dict
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
                'staff': StaffDetailSerializer(staff).data
            })
            
        except Exception as e:
            logger.error(f"Error creating staff account: {e}")
            return Response({
                'success': False,
                'error': f'Failed to create account: {str(e)}'
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
        
        # Account statistics
        with_account = StaffDetail.objects.filter(user__isnull=False).count()
        without_account = StaffDetail.objects.filter(user__isnull=True).count()
        active_accounts = StaffDetail.objects.filter(account_active=True, user__isnull=False).count()
        inactive_accounts = StaffDetail.objects.filter(account_active=False, user__isnull=False).count()
        
        # Department statistics
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
    
        # Check if staff already has a user
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
    
        # Check if user is already linked to staff
        if hasattr(user, 'profile') and user.profile.staff_detail:
            return Response({
                'success': False,
                'error': 'User is already linked to another staff member'
            }, status=status.HTTP_400_BAD_REQUEST)
    
        try:
            with transaction.atomic():
                # Link staff to user
                staff.user = user
                staff.account_active = True
                staff.account_created_at = timezone.now()
                staff.save()
            
                # Update user profile
                user.profile.staff_detail = staff
                user.profile.save()
            
                # Add user to appropriate group based on staff role
                group_name = staff.Role.replace(' ', '_')
                group, created = Group.objects.get_or_create(name=group_name)
                user.groups.clear()  # Remove existing groups
                user.groups.add(group)
            
                # Update user flags if needed
                if staff.Role == 'Admin':
                    user.is_staff = True
                    user.save()
            
                # Log the action
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
                # Unlink staff from user
                staff.user = None
                staff.account_active = False
                staff.account_deactivated_at = timezone.now()
                staff.save()
            
                # Update user profile
                user.profile.staff_detail = None
                user.profile.save()
            
                # Remove user from staff role group
                group_name = staff.Role.replace(' ', '_')
                try:
                    group = Group.objects.get(name=group_name)
                    user.groups.remove(group)
                except Group.DoesNotExist:
                    pass
            
                # Log the action
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
    def set_custom_password(self, request, pk=None):
        """Set a custom password for staff user account"""
        staff = self.get_object()
        
        if not staff.user:
            return Response({
                'success': False,
                'error': 'Staff does not have a user account'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        new_password = request.data.get('new_password')
        if not new_password or len(new_password) < 8:
            return Response({
                'success': False,
                'error': 'Password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            success = staff.set_custom_password(new_password)
            if success:
                return Response({
                    'success': True,
                    'message': 'Password updated successfully'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Failed to update password'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error setting custom password: {e}")
            return Response({
                'success': False,
                'error': f'Failed to set password: {str(e)}'
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
        
        # Get the queryset
        queryset = self.filter_queryset(self.get_queryset())
        
        # Calculate statistics
        departments_with_counts = queryset.annotate(
            staff_count=Count('staff_details'),
            doctor_count=Count('staff_details', filter=Q(staff_details__Role='Doctor'))
        )
        
        # Calculate statistics values
        total_departments = len(departments_with_counts)
        departments_with_staff_count = sum(1 for dept in departments_with_counts if dept.staff_count > 0)
        total_staff = sum(dept.staff_count for dept in departments_with_counts)
        avg_staff = total_staff / total_departments if total_departments > 0 else 0
        
        # Add statistics to response
        if isinstance(response.data, dict):
            # Paginated response
            response.data['statistics'] = {
                'total_departments': total_departments,
                'departments_with_staff': departments_with_staff_count,
                'average_staff_per_dept': round(avg_staff, 2)
            }
        else:
            # Non-paginated response, wrap in dict
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
        
        # Get departments with counts
        departments_with_counts = Department.objects.annotate(
            staff_count=Count('staff_details'),
            doctor_count=Count('staff_details', filter=Q(staff_details__Role='Doctor'))
        )
        
        departments_with_staff = sum(1 for dept in departments_with_counts if dept.staff_count > 0)
        
        # Get top departments by staff count
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
        """Override create to handle auto-generated DEPT_ID"""
        # The DEPT_ID will be auto-generated in the model's save() method
        # We just need to save the serializer
        serializer.save()
    
    def perform_update(self, serializer):
        """Override update to ensure DEPT_ID cannot be changed"""
        # DEPT_ID is the primary key, so it shouldn't be changed
        # Remove DEPT_ID from data if present
        data = serializer.validated_data.copy()
        data.pop('DEPT_ID', None)
        serializer.save()

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]