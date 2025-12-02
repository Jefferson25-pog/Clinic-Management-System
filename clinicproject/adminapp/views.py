from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import StaffDetail, Department
from .serializers import StaffDetailsSerializer, DepartmentsSerializer

class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                (request.user.is_superuser or  
                 (hasattr(request.user, 'staff_detail') and 
                  request.user.staff_detail.Role == 'Admin')))

class StaffDetailsViewSet(viewsets.ModelViewSet):
    queryset = StaffDetail.objects.all()
    serializer_class = StaffDetailsSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

class DepartmentsViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentsSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]