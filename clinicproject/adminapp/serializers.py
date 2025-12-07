# adminapp/serializers.py - FIXED VERSION
from rest_framework import serializers
from django.contrib.auth.models import User, Group
from .models import StaffDetail, Department

# Department Serializer - FIXED
class DepartmentSerializer(serializers.ModelSerializer):
    staff_count = serializers.SerializerMethodField()
    doctor_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = '__all__'
        extra_kwargs = {
            'DEPT_ID': {'read_only': True},  # ADD THIS LINE
            'Description': {'required': False, 'allow_blank': True}
        }
    
    def get_staff_count(self, obj):
        return obj.staff_details.count()
    
    def get_doctor_count(self, obj):
        return obj.staff_details.filter(Role='Doctor').count()
    
    def validate(self, data):
        # Clean the data
        if 'Department_Name' in data:
            data['Department_Name'] = data['Department_Name'].strip()
        
        if 'Description' in data and data['Description'] is not None:
            data['Description'] = data['Description'].strip()
            if data['Description'] == '':
                data['Description'] = None
        
        return data

# Simple User Serializer
class SimpleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active']

# Staff Detail Serializer
class StaffDetailSerializer(serializers.ModelSerializer):
    # Department field
    Department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=False,
        allow_null=True
    )
    
    # For displaying department name
    department_name = serializers.CharField(source='Department.Department_Name', read_only=True)
    
    user = SimpleUserSerializer(read_only=True)
    
    # Add calculated fields
    has_user_account = serializers.SerializerMethodField()
    account_status = serializers.SerializerMethodField()
    can_have_user_account = serializers.SerializerMethodField()
    
    class Meta:
        model = StaffDetail
        fields = [
            # Core fields
            'STAFF_ID', 'Name', 'Gender', 'Date_of_Birth', 'Age', 'Blood_Group',
            
            # Contact Information
            'Address', 'City', 'State', 'Pincode', 'Phone_Number', 
            'Alternate_Phone', 'Emergency_Contact', 'Email',
            
            # Professional Information
            'Role', 'Qualification', 'Specialization', 'Experience', 
            'License_Number', 'Consultation_fees',
            
            # Department
            'Department', 'department_name',
            
            # Status
            'Status',
            
            # Employment Details
            'Joining_Date', 'Shift_Timing', 'Salary',
            
            # Bank Details
            'Bank_Name', 'Account_Number', 'IFSC_Code',
            
            # User Account
            'user', 'account_active', 'account_created_at',
            'account_deactivated_at', 'last_password_reset',
            
            # Calculated fields
            'has_user_account', 'account_status', 'can_have_user_account',
            
            # Timestamps
            'created_at'
        ]
        read_only_fields = ['STAFF_ID', 'created_at', 'account_created_at', 
                          'account_deactivated_at', 'last_password_reset', 'department_name']

    def get_has_user_account(self, obj):
        return obj.user is not None
    
    def get_account_status(self, obj):
        if not obj.user:
            return 'no_account'
        elif obj.account_active:
            return 'active'
        else:
            return 'inactive'
    
    def get_can_have_user_account(self, obj):
        return obj.can_have_user_account

# Group Serializer
class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

# For backward compatibility
DepartmentsSerializer = DepartmentSerializer
StaffDetailsSerializer = StaffDetailSerializer