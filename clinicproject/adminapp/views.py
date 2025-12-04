from rest_framework import viewsets, status, filters
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import StaffDetail, Department
from .serializers import StaffDetailsSerializer, DepartmentsSerializer, GroupSerializer
from django.contrib.auth.models import Group
from authentication.models import SystemLog
from django_filters.rest_framework import DjangoFilterBackend


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
    filterset_fields = ['Role', 'Status', 'Department']
    search_fields = ['Name', 'Email', 'STAFF_ID', 'Phone_Number']
    ordering_fields = ['STAFF_ID', 'Name', 'Role', 'Status', 'created_at']
    ordering = ['STAFF_ID']
    
    @action(detail=True, methods=['post'])
    def create_account(self, request, pk=None):
        staff = self.get_object()
        if staff.user:
            return Response({
                'error': 'User account already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = staff.create_user_account()
        return Response({
            'success': True,
            'message': 'User account created successfully',
            'username': user.username
        })
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        staff = self.get_object()
        if not staff.user:
            return Response({
                'error': 'No user account exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        new_password = staff.reset_password()
        return Response({
            'success': True,
            'message': 'Password reset successfully',
            'new_password': new_password if new_password else 'Custom password set'
        })

class DepartmentsViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentsSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['Department_Name']
    ordering_fields = ['DEPT_ID', 'Department_Name', 'created_at']
    ordering = ['DEPT_ID']

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]