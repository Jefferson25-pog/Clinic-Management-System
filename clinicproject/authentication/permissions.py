from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser

class IsStaffMember(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'staff_detail') and request.user.staff_detail is not None

class IsDoctor(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (hasattr(request.user, 'staff_detail') and 
                request.user.staff_detail and 
                request.user.staff_detail.Role == 'Doctor')

class IsReceptionist(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (hasattr(request.user, 'staff_detail') and 
                request.user.staff_detail and 
                request.user.staff_detail.Role == 'Receptionist')

class IsLabTechnician(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (hasattr(request.user, 'staff_detail') and 
                request.user.staff_detail and 
                request.user.staff_detail.Role == 'Lab Technician')

class IsPharmacist(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (hasattr(request.user, 'staff_detail') and 
                request.user.staff_detail and 
                request.user.staff_detail.Role == 'Pharmacist')