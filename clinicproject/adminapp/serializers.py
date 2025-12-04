from rest_framework import serializers
from .models import StaffDetail, Department
from django.contrib.auth.models import Group
import re

class DepartmentsSerializer(serializers.ModelSerializer):
    doctor_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = ['DEPT_ID', 'Department_Name', 'created_at', 'doctor_count']
        read_only_fields = ['DEPT_ID', 'created_at', 'doctor_count']
    
    def validate_Department_Name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Department name must be at least 2 characters long")
        if not re.match(r'^[A-Za-z\s&]+$', value):
            raise serializers.ValidationError("Department name can only contain letters, spaces and ampersand")
        return value.strip()
    
    def get_doctor_count(self, obj):
        # Use the related_name 'staff_details'
        return obj.staff_details.filter(Role='Doctor').count()

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

class StaffDetailsSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='Department.Department_Name', read_only=True)
    groups = GroupSerializer(source='user.groups', many=True, read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    status_display = serializers.CharField(source='get_Status_display', read_only=True)
    has_user_account = serializers.SerializerMethodField()
    
    class Meta:
        model = StaffDetail
        fields = '__all__'
        read_only_fields = ['user', 'has_user_account', 'status_display', 'STAFF_ID', 'created_at']
    
    def validate_Name(self, value):
        if not re.match(r'^[A-Za-z\s\.\-]+$', value):
            raise serializers.ValidationError("Name can only contain letters, spaces, dots and hyphens")
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters long")
        return value.strip()
    
    def validate_Email(self, value):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            raise serializers.ValidationError("Enter a valid email address")
        if not value.endswith(('.com', '.in', '.org', '.net')):
            raise serializers.ValidationError("Email must have a valid domain (e.g., @gmail.com, @yahoo.in)")
        return value
    
    def validate_Phone_Number(self, value):
        if not re.match(r'^\d{10}$', value):
            raise serializers.ValidationError("Phone number must be exactly 10 digits (no symbols or spaces)")
        return value
    
    def validate(self, data):
        age = data.get('Age')
        if age is not None:
            if age < 18:
                raise serializers.ValidationError({"Age": "Staff must be at least 18 years old"})
            
            if data.get('Role') == 'Doctor':
                if age < 25:
                    raise serializers.ValidationError({"Age": "Doctors must be at least 25 years old"})
                if not data.get('Department'):
                    raise serializers.ValidationError({"Department": "Doctors must be assigned to a department"})
                consultation_fees = data.get('Consultation_fees', 0)
                if consultation_fees is not None and consultation_fees <= 0:
                    raise serializers.ValidationError({"Consultation_fees": "Doctors must have consultation fees greater than 0"})
        return data
    
    def get_has_user_account(self, obj):
        return hasattr(obj, 'user') and obj.user is not None