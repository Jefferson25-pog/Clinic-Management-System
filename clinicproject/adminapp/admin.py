from django.contrib import admin
from .models import StaffDetails, Departments

@admin.register(StaffDetails)
class StaffDetailsAdmin(admin.ModelAdmin):
    list_display = ['STAFF_ID', 'Name', 'Role', 'Department', 'Consultation_fees', 'Status', 'has_user_account']
    list_filter = ['Role', 'Department', 'Status']
    search_fields = ['Name', 'STAFF_ID']
    actions = ['create_user_accounts']
    
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

@admin.register(Departments)
class DepartmentsAdmin(admin.ModelAdmin):
    list_display = ['DEPT_ID', 'Department_Name']
    search_fields = ['Department_Name']