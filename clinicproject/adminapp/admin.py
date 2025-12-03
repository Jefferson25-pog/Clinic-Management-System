from django.contrib import admin
from django.contrib.auth.models import Group
from .models import StaffDetail, Department
from authentication.models import SystemLog, ActivityMonitor, UserProfile

# Unregister default Group admin
admin.site.unregister(Group)

@admin.register(Group)
class CustomGroupAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

@admin.register(StaffDetail)
class StaffDetailsAdmin(admin.ModelAdmin):
    list_display = ['STAFF_ID', 'Name', 'Role', 'Department', 'Consultation_fees', 'Status', 'has_user_account']
    list_filter = ['Role', 'Department', 'Status']
    search_fields = ['Name', 'STAFF_ID', 'Email']
    actions = ['create_user_accounts', 'reset_passwords']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['Name', 'Age', 'Address', 'Phone_Number', 'Email', 'Role']
        }),
        ('Doctor Information', {
            'fields': ['Department', 'Consultation_fees', 'Status'],
            'classes': ['collapse']
        }),
        ('User Account', {
            'fields': ['user'],
            'classes': ['collapse']
        })
    ]
    
    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        if obj and obj.Role != 'Doctor':
            fieldsets = [
                ('Basic Information', {
                    'fields': ['Name', 'Age', 'Address', 'Phone_Number', 'Email', 'Role']
                }),
                ('User Account', {
                    'fields': ['user'],
                    'classes': ['collapse']
                })
            ]
        return fieldsets
    
    def has_user_account(self, obj):
        return obj.user is not None
    has_user_account.boolean = True
    has_user_account.short_description = 'Has User Account'
    
    def create_user_accounts(self, request, queryset):
        for staff in queryset:
            if not staff.user:
                staff.create_user_account()
        self.message_user(request, f"User accounts created for {queryset.count()} staff members")
    create_user_accounts.short_description = "Create user accounts for selected staff"
    
    def reset_passwords(self, request, queryset):
        for staff in queryset:
            if staff.user:
                new_password = staff.reset_password()
                if new_password:
                    self.message_user(request, f"Password reset for {staff.Name}: {new_password}")
        self.message_user(request, f"Passwords reset for {queryset.count()} staff members")
    reset_passwords.short_description = "Reset passwords for selected staff"

@admin.register(Department)
class DepartmentsAdmin(admin.ModelAdmin):
    list_display = ['DEPT_ID', 'Department_Name', 'get_staff_count']
    search_fields = ['Department_Name']
    
    def get_staff_count(self, obj):
        return obj.staffdetail_set.count()
    get_staff_count.short_description = 'Staff Count'

@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'level', 'log_type', 'user', 'action']
    list_filter = ['level', 'log_type', 'timestamp']
    search_fields = ['action', 'user__username', 'ip_address']
    readonly_fields = ['timestamp', 'level', 'log_type', 'user', 'ip_address', 'action', 'details']
    date_hierarchy = 'timestamp'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False

@admin.register(ActivityMonitor)
class ActivityMonitorAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'user', 'action', 'endpoint', 'method', 'status_code']
    list_filter = ['method', 'status_code', 'timestamp']
    search_fields = ['action', 'endpoint', 'user__username']
    readonly_fields = ['timestamp', 'user', 'action', 'endpoint', 'method', 'status_code', 'duration', 'metadata']
    date_hierarchy = 'timestamp'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'staff_detail', 'is_admin_user', 'last_activity']
    list_filter = ['is_admin_user']
    search_fields = ['user__username', 'staff_detail__Name']
    raw_id_fields = ['user', 'staff_detail']