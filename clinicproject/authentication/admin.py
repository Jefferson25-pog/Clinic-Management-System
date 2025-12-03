from django.contrib import admin
from .models import LoginHistory

# Register your models here.
@admin.register(LoginHistory)
class LoginHistoryAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'username', 'login_type', 'ip_address', 'success', 'get_user_role']
    list_filter = ['login_type', 'success', 'timestamp']
    search_fields = ['username', 'ip_address', 'user__username']
    readonly_fields = ['timestamp', 'user', 'username', 'login_type', 'ip_address', 
                      'user_agent', 'success', 'details']
    date_hierarchy = 'timestamp'
    list_per_page = 50
    
    def get_user_role(self, obj):
        if obj.user and hasattr(obj.user, 'staff_detail'):
            return obj.user.staff_detail.Role
        elif obj.user and obj.user.is_superuser:
            return 'Super Admin'
        elif obj.user and obj.user.is_staff:
            return 'Admin'
        return 'N/A'
    get_user_role.short_description = 'User Role'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False