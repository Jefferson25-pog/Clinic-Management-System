from rest_framework import serializers
from .models import StaffDetails, Departments
import re

class StaffDetailsSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='Department.Department_Name', read_only=True)
    
    class Meta:
        model = StaffDetails
        fields = '__all__'
    
    def validate_Name(self, value):
        if not re.match(r'^[A-Za-z\s\.\-]+$', value):
            raise serializers.ValidationError("Name can only contain letters, spaces, dots and hyphens")
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Name must be at least 2 characters long")
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
        if data['Age'] < 18:
            raise serializers.ValidationError({"Age": "Staff must be at least 18 years old"})
        
        # Doctor-specific validations
        if data['Role'] == 'Doctor':
            if data['Age'] < 25:
                raise serializers.ValidationError({"Age": "Doctors must be at least 25 years old"})
            if not data.get('Department'):
                raise serializers.ValidationError({"Department": "Doctors must be assigned to a department"})
            if data.get('Consultation_fees', 0) <= 0:
                raise serializers.ValidationError({"Consultation_fees": "Doctors must have consultation fees greater than 0"})
        return data

class DepartmentsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Departments
        fields = '__all__'
    
    def validate_Department_Name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Department name must be at least 2 characters long")
        if not re.match(r'^[A-Za-z\s&]+$', value):
            raise serializers.ValidationError("Department name can only contain letters, spaces and ampersand")
        return value.strip()