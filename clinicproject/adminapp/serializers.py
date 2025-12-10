# adminapp/serializers.py - COMPLETE UPDATED VERSION WITH AGE/EXPERIENCE VALIDATION
from rest_framework import serializers
from django.contrib.auth.models import User, Group
from .models import StaffDetail, Department, Qualification
from datetime import date
import re

class QualificationSerializer(serializers.ModelSerializer):
    """Serializer for staff qualifications"""
    class Meta:
        model = Qualification
        fields = [
            'id',
            'qualification_name',
            'institution',
            'year_completed',
            'specialization',
            'registration_number',
            'is_primary',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate(self, data):
        # Validate year
        current_year = date.today().year
        year_completed = data.get('year_completed')
        
        if year_completed:
            if year_completed < 1950:
                raise serializers.ValidationError({
                    'year_completed': 'Year must be after 1950'
                })
            if year_completed > current_year + 2:
                raise serializers.ValidationError({
                    'year_completed': f'Year cannot be more than 2 years in the future (Current year: {current_year})'
                })
        
        # Validate qualification name
        qual_name = data.get('qualification_name')
        if qual_name and len(qual_name.strip()) < 2:
            raise serializers.ValidationError({
                'qualification_name': 'Qualification name must be at least 2 characters'
            })
        
        return data
    
# Department Serializer - FIXED
class DepartmentSerializer(serializers.ModelSerializer):
    staff_count = serializers.SerializerMethodField()
    doctor_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = '__all__'
        extra_kwargs = {
            'DEPT_ID': {'read_only': True},
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


# Custom validation functions
def calculate_age_from_dob(date_of_birth):
    """Calculate age from date of birth"""
    if not date_of_birth:
        return None
    today = date.today()
    age = today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
    return age


def validate_doctor_age_experience(date_of_birth, experience):
    """
    Validate that doctor's age and experience are realistic
    
    Minimum doctor requirements:
    - Age: At least 25 years
    - Experience: At least 0 years
    - Age at start of career: Should be at least 25 - experience years
      (e.g., 30 years old with 10 years experience means they started at 20 - NOT realistic)
    - Realistic starting age for doctors: Minimum 24-25 years after MBBS
    """
    if not date_of_birth or experience is None:
        return None
    
    age = calculate_age_from_dob(date_of_birth)
    
    if age < 25:
        return f"Doctors must be at least 25 years old. Current age: {age} years."
    
    # Calculate age when they started their career
    age_started = age - experience
    
    # Minimum realistic starting age for doctors:
    # MBBS: 5.5 years (usually starts at 17-18, completes at 22-23)
    # Internship: 1 year (23-24)
    # Junior residency/start practice: 24-25 years
    if age_started < 24:
        return f"Invalid experience: A {age}-year-old doctor with {experience} years experience would have started at age {age_started}, which is unrealistic for a medical career. Minimum realistic starting age for doctors is 24-25 years after completing MBBS and internship."
    
    # Maximum experience validation (can't have more experience than years since medical qualification)
    if experience > (age - 24):  # Assuming minimum qualification age is 24
        return f"Experience of {experience} years is unrealistic for a {age}-year-old doctor. Maximum realistic experience would be {max(0, age - 24)} years."
    
    return None


def validate_general_staff_age_experience(date_of_birth, experience, role):
    """
    Validate age and experience for non-doctor staff
    """
    if not date_of_birth or experience is None:
        return None
    
    age = calculate_age_from_dob(date_of_birth)
    
    # General staff minimum age
    if age < 18:
        return f"Staff must be at least 18 years old. Current age: {age} years."
    
    # Validate experience is not more than possible working years
    working_years_possible = age - 18  # Assuming work starts at 18
    if experience > working_years_possible:
        return f"Experience of {experience} years is unrealistic for a {age}-year-old {role.lower()}. Maximum possible experience would be {working_years_possible} years."
    
    return None


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
    
    # Add qualifications field
    qualifications = QualificationSerializer(many=True, read_only=True, source='qualifications.all')
    
    # Add fields for creating/updating qualifications (write-only)
    qualifications_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )
    
    # Add calculated fields
    has_user_account = serializers.SerializerMethodField()
    account_status = serializers.SerializerMethodField()
    can_have_user_account = serializers.SerializerMethodField()
    all_qualifications = serializers.SerializerMethodField()
    license_numbers = serializers.SerializerMethodField()
    primary_qualification = serializers.SerializerMethodField()
    
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
            
            # Qualifications
            'qualifications', 'qualifications_data',
            
            # Calculated fields
            'has_user_account', 'account_status', 'can_have_user_account',
            'all_qualifications', 'license_numbers', 'primary_qualification',
            
            # Timestamps
            'created_at'
        ]
        read_only_fields = ['STAFF_ID', 'created_at', 'account_created_at', 
                          'account_deactivated_at', 'last_password_reset', 'department_name']
        
        extra_kwargs = {
            'Status': {'required': False},
            'Age': {'read_only': True}  # Age should be calculated, not input
        }

    def get_all_qualifications(self, obj):
        return obj.all_qualifications
    
    def get_license_numbers(self, obj):
        return obj.license_numbers
    
    def get_primary_qualification(self, obj):
        return obj.primary_qualification
    
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
    
    def create(self, validated_data):
        """
        Override create to handle qualifications_data separately
        """
        # Extract qualifications_data BEFORE creating the StaffDetail instance
        qualifications_data = validated_data.pop('qualifications_data', [])

        # Calculate age if date of birth is provided
        if 'Date_of_Birth' in validated_data:
            dob = validated_data['Date_of_Birth']
            age = calculate_age_from_dob(dob)
            validated_data['Age'] = age

        # Handle role-specific default fees
        if validated_data.get('Role') == 'Doctor' and 'Consultation_fees' not in validated_data:
            validated_data['Consultation_fees'] = 500  # Default fee for doctors

        # Create the staff instance WITHOUT qualifications_data
        staff = StaffDetail.objects.create(**validated_data)

        # Create qualifications if provided
        if qualifications_data:
            for qual_data in qualifications_data:
                Qualification.objects.create(staff=staff, **qual_data)

            return staff
        
        qualifications_data = data.get('qualifications_data', [])
        has_qualification_in_array = any(
        qual_data.get('qualification_name') 
        for qual_data in qualifications_data 
        if qual_data and isinstance(qual_data, dict)
        )

        if not data.get('Qualification') and not has_qualification_in_array:
            raise serializers.ValidationError({
            'Qualification': 'Doctors must have qualifications. Please provide either the Qualification field or qualifications_data array.'
        })
    
        # Create qualifications if provided
        if qualifications_data:
            for qual_data in qualifications_data:
                Qualification.objects.create(staff=staff, **qual_data)
    
        return staff

    def update(self, instance, validated_data):
        """
        Override update to handle qualifications_data separately
        """
        # Extract qualifications_data BEFORE updating
        qualifications_data = validated_data.pop('qualifications_data', None)
    
        # Update staff fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
    
        # Recalculate age if DOB was updated
        if 'Date_of_Birth' in validated_data:
            instance.Age = calculate_age_from_dob(instance.Date_of_Birth)
    
        instance.save()
    
        # Update qualifications if provided
        if qualifications_data is not None:
            # Delete existing qualifications and create new ones
            instance.qualifications.all().delete()
            if qualifications_data:
                for qual_data in qualifications_data:
                    # Remove ID from qual_data if it exists (for create)
                    qual_data.pop('id', None)
                    Qualification.objects.create(staff=instance, **qual_data)
    
        return instance
    
    def create_qualifications(self, staff, qualifications_data):
        """Helper method to create qualifications"""
        for qual_data in qualifications_data:
            Qualification.objects.create(staff=staff, **qual_data)

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
    
    def validate(self, data):
        """
        Comprehensive validation for staff data
        """
        # Extract data
        date_of_birth = data.get('Date_of_Birth')
        experience = data.get('Experience')
        role = data.get('Role')
        
        # Validate phone numbers for Indian standards
        phone_fields = {
            'Phone_Number': data.get('Phone_Number'),
            'Alternate_Phone': data.get('Alternate_Phone'),
            'Emergency_Contact': data.get('Emergency_Contact')
        }
        
        for field_name, value in phone_fields.items():
            if value:
                if not re.match(r'^[6-9]\d{9}$', str(value)):
                    raise serializers.ValidationError({
                        field_name: f'{field_name.replace("_", " ")} must start with 6-9 and be exactly 10 digits (Indian standard)'
                    })
        
        # Validate email
        email = data.get('Email')
        if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise serializers.ValidationError({
                'Email': 'Enter a valid email address with proper domain'
            })
        
        # Validate pincode
        pincode = data.get('Pincode')
        if pincode and not re.match(r'^\d{6}$', pincode):
            raise serializers.ValidationError({
                'Pincode': 'Pincode must be exactly 6 digits'
            })
        
        # Validate IFSC code
        ifsc = data.get('IFSC_Code')
        if ifsc and not re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', ifsc):
            raise serializers.ValidationError({
                'IFSC_Code': 'IFSC code must be in format: ABCD0123456'
            })
        
        # Validate account number
        account_number = data.get('Account_Number')
        if account_number and not re.match(r'^\d{9,18}$', account_number):
            raise serializers.ValidationError({
                'Account_Number': 'Account number must be 9-18 digits'
            })
        
        # Validate Joining Date - can be today or in the future
        joining_date = data.get('Joining_Date')
        if joining_date:
            today = date.today()
            if joining_date < today:
                raise serializers.ValidationError({
                    'Joining_Date': 'Joining date cannot be in the past. It must be today or in the future.'
                })
        
        # VALIDATE AGE AND EXPERIENCE BASED ON ROLE
        if date_of_birth:
            # Calculate age
            age = calculate_age_from_dob(date_of_birth)
            
            # Basic age validation
            if age and age < 18:
                raise serializers.ValidationError({
                    'Date_of_Birth': 'Staff must be at least 18 years old'
                })
            
            if age and age > 70:
                raise serializers.ValidationError({
                    'Date_of_Birth': 'Staff age cannot exceed 70 years'
                })
            
            # Role-specific validation
            if role == 'Doctor':
                # Doctor-specific validation
                if age and age < 25:
                    raise serializers.ValidationError({
                        'Date_of_Birth': 'Doctors must be at least 25 years old'
                    })
                
                # Doctor experience validation
                if experience is not None:
                    # Calculate realistic maximum experience
                    max_realistic_exp = max(0, age - 24)  # Assuming qualification at 24
                    
                    if experience > max_realistic_exp:
                        raise serializers.ValidationError({
                            'Experience': f'A {age}-year-old doctor cannot have {experience} years of experience. Maximum realistic experience would be {max_realistic_exp} years (assuming medical qualification at age 24).'
                        })
                    
                    # Calculate starting age
                    starting_age = age - experience
                    if starting_age < 24:
                        raise serializers.ValidationError({
                            'Experience': f'With {experience} years experience, a {age}-year-old doctor would have started at age {starting_age}, which is unrealistic. Doctors typically start practice at age 24-25 after MBBS and internship.'
                        })
                
                # Doctor-specific field requirements
                if not data.get('Qualification'):
                    raise serializers.ValidationError({
                        'Qualification': 'Doctors must have qualifications'
                    })
                
                if not data.get('License_Number'):
                    raise serializers.ValidationError({
                        'License_Number': 'Doctors must have a license number'
                    })
                
                consultation_fees = data.get('Consultation_fees')
                if consultation_fees is not None and consultation_fees <= 0:
                    raise serializers.ValidationError({
                        'Consultation_fees': 'Doctors must have consultation fees greater than 0'
                    })
                
                if not data.get('Department'):
                    raise serializers.ValidationError({
                        'Department': 'Doctors must be assigned to a department'
                    })
            
            else:
                # Non-doctor staff validation
                if experience is not None:
                    # Calculate maximum possible experience
                    max_possible_exp = max(0, age - 18)  # Assuming work starts at 18
                    
                    if experience > max_possible_exp:
                        raise serializers.ValidationError({
                            'Experience': f'A {age}-year-old {role.lower()} cannot have {experience} years of experience. Maximum possible experience would be {max_possible_exp} years.'
                        })
        
        # Validate Experience range
        if experience is not None:
            if experience < 0:
                raise serializers.ValidationError({
                    'Experience': 'Experience cannot be negative'
                })
            if experience > 50:
                raise serializers.ValidationError({
                    'Experience': 'Experience cannot exceed 50 years'
                })
        
        # Validate Consultation fees range
        consultation_fees = data.get('Consultation_fees')
        if consultation_fees is not None:
            if consultation_fees < 0:
                raise serializers.ValidationError({
                    'Consultation_fees': 'Consultation fees cannot be negative'
                })
            if consultation_fees > 50000:
                raise serializers.ValidationError({
                    'Consultation_fees': 'Consultation fees cannot exceed ₹50,000'
                })
        
        # Validate Salary range
        salary = data.get('Salary')
        if salary is not None:
            if salary < 0:
                raise serializers.ValidationError({
                    'Salary': 'Salary cannot be negative'
                })
            if salary > 1000000:  # 10 lakhs per month max
                raise serializers.ValidationError({
                    'Salary': 'Salary cannot exceed ₹10,00,000 per month'
                })
        
        return data
    
    def update(self, instance, validated_data):
        """
        Override update to handle special cases
        """
        # Handle Status field separately
        status = validated_data.pop('Status', None)
        if status is not None:
            # Validate status
            valid_statuses = ['Available', 'Busy', 'UnAvailable']
            if status not in valid_statuses:
                raise serializers.ValidationError({
                    'Status': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
                })
            instance.Status = status
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Recalculate age if DOB was updated
        if 'Date_of_Birth' in validated_data:
            instance.Age = calculate_age_from_dob(instance.Date_of_Birth)
        
        instance.save()
        return instance


# Group Serializer
class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']


# For backward compatibility
DepartmentsSerializer = DepartmentSerializer
StaffDetailsSerializer = StaffDetailSerializer


# Additional Serializer for Doctor Availability
class DoctorAvailabilitySerializer(serializers.Serializer):
    """
    Serializer for doctor to update their own availability
    Doctors can only update their own status
    """
    status = serializers.ChoiceField(
        choices=['Available', 'Busy', 'UnAvailable'],
        required=True
    )
    
    def validate(self, data):
        # Additional validation can be added here if needed
        return data


# Doctor Self Update Serializer (limited fields)
class DoctorSelfUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for doctors to update limited fields about themselves
    """
    class Meta:
        model = StaffDetail
        fields = [
            'Status',  # Only status can be updated by doctor themselves
            'Phone_Number',  # Contact info
            'Alternate_Phone',
            'Emergency_Contact',
            'Email',
            'Address',
            'City',
            'State',
            'Pincode'
            'qualifications',  # read-only for display
            'qualifications_data'
        ]
        read_only_fields = ['STAFF_ID', 'Name', 'Role', 'Department', 
                          'Qualification', 'Experience', 'Consultation_fees','qualifications']
        
        extra_kwargs = {
            'Phone_Number': {
                'required': False,
                'validators': []
            },
            'Email': {
                'required': False
            }
        }
    
    def validate_Phone_Number(self, value):
        if value and not re.match(r'^[6-9]\d{9}$', str(value)):
            raise serializers.ValidationError(
                'Phone number must start with 6-9 and be exactly 10 digits (Indian standard)'
            )
        return value
    
    def validate_Email(self, value):
        if value and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            raise serializers.ValidationError(
                'Enter a valid email address with proper domain'
            )
        return value


# Staff Quick Update Serializer (for admin quick edits)
class StaffQuickUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for admin to quickly update staff status and basic info
    """
    class Meta:
        model = StaffDetail
        fields = [
            'Status',
            'Department',
            'Consultation_fees',
            'Salary',
            'account_active'
        ]