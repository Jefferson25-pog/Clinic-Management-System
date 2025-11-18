from rest_framework import viewsets, permissions
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import StaffDetails, Departments
from .serializers import StaffDetailsSerializer, DepartmentsSerializer

class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        # Allow both Django superusers AND staff with Admin role
        return (request.user and 
                request.user.is_authenticated and 
                (request.user.is_superuser or  # ✅ Allow superusers
                 (hasattr(request.user, 'staff_details') and 
                  request.user.staff_details.Role == 'Admin')))

class StaffDetailsViewSet(viewsets.ModelViewSet):
    queryset = StaffDetails.objects.all()
    serializer_class = StaffDetailsSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

class DepartmentsViewSet(viewsets.ModelViewSet):
    queryset = Departments.objects.all()
    serializer_class = DepartmentsSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]