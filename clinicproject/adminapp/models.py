# adminapp/models.py - UPDATED VERSION WITH MULTIPLE QUALIFICATIONS
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
import re
from datetime import date, datetime
from django.contrib.auth.models import Group
from django.db import transaction
from django.utils import timezone
import logging
from dateutil.relativedelta import relativedelta
import json

logger = logging.getLogger(__name__)

# ==================== QUALIFICATION & LICENSE NUMBER FORMATS ====================

# Medical License Number Formats by State in India
MEDICAL_LICENSE_FORMATS = {
    'mci': r'^\d{5,10}$',  # MCI Registration Number
    'tn': r'^TN/\d{4,6}/\d{4}$',  # Tamil Nadu
    'mh': r'^MH/\d{4,6}/\d{4}$',  # Maharashtra
    'dl': r'^DL/\d{4,6}/\d{4}$',  # Delhi
    'ka': r'^KA/\d{4,6}/\d{4}$',  # Karnataka
    'ap': r'^AP/\d{4,6}/\d{4}$',  # Andhra Pradesh
    'tg': r'^TG/\d{4,6}/\d{4}$',  # Telangana
    'gj': r'^GJ/\d{4,6}/\d{4}$',  # Gujarat
    'up': r'^UP/\d{4,6}/\d{4}$',  # Uttar Pradesh
    'wb': r'^WB/\d{4,6}/\d{4}$',  # West Bengal
    'rj': r'^RJ/\d{4,6}/\d{4}$',  # Rajasthan
    'pb': r'^PB/\d{4,6}/\d{4}$',  # Punjab
    'hr': r'^HR/\d{4,6}/\d{4}$',  # Haryana
    'mp': r'^MP/\d{4,6}/\d{4}$',  # Madhya Pradesh
    'kl': r'^KL/\d{4,6}/\d{4}$',  # Kerala
}

# Pharmacy License Formats
PHARMACY_LICENSE_FORMATS = {
    'state': r'^[A-Z]{2}/\d{4,6}/\d{4}$',
    'pci': r'^PCI-\d{5,8}$',  # Pharmacy Council of India
}

# Lab Technician License Formats
LAB_TECH_LICENSE_FORMATS = {
    'dmlt': r'^DMLT-\d{4,6}$',
    'bmlt': r'^BMLT-\d{4,6}$',
    'state': r'^[A-Z]{2}/LT/\d{4,6}$',
}

# Qualification Duration Guide (in years)
QUALIFICATION_DURATIONS = {
    # DOCTOR QUALIFICATIONS
    'MBBS': 5.5,
    'MD': 3,
    'MS': 3,
    'DM': 3,
    'MCh': 3,
    'DNB': 3,
    'BAMS': 5.5,
    'BHMS': 5.5,
    'BUMS': 5.5,
    
    # POSTGRADUATE DIPLOMAS (DOCTORS)
    'DCH': 2,
    'DGO': 2,
    'DLO': 2,
    'D.Ortho': 2,
    'DMRD': 2,
    'DA': 2,
    'DDVL': 2,
    'DPM': 2,
    
    # PHARMACIST QUALIFICATIONS
    'D.Pharm': 2,
    'B.Pharm': 4,
    'Pharm.D': 6,
    'M.Pharm': 2,
    
    # LAB TECHNICIAN QUALIFICATIONS
    'DMLT': 2,
    'BMLT': 3,
    'B.Sc MLT': 3,
    'M.Sc MLT': 2,
    
    # NURSE QUALIFICATIONS
    'ANM': 2,
    'GNM': 3.5,
    'B.Sc Nursing': 4,
    'M.Sc Nursing': 2,
    
    # OTHER HEALTHCARE QUALIFICATIONS
    'BPT': 4.5,  # Bachelor of Physiotherapy
    'MPT': 2,    # Master of Physiotherapy
    'B.Sc Radiology': 3,
    'Diploma in Radiology': 2,
    
    # ADMIN/OTHER QUALIFICATIONS
    '10+2': 2,
    'High School': 2,
    'Bachelor\'s Degree': 3,
    'Master\'s Degree': 2,
    'MBA': 2,
    'MHA': 2,  # Master of Hospital Administration
    'Diploma': 1,
}

# Minimum Starting Age for Qualifications
QUALIFICATION_STARTING_AGES = {
    'MBBS': 17,
    'BAMS': 17,
    'BHMS': 17,
    'D.Pharm': 17,
    'B.Pharm': 17,
    'DMLT': 17,
    'BMLT': 17,
    'ANM': 17,
    'GNM': 17,
    '10+2': 15,
    'High School': 15,
}

# ==================== QUALIFICATION MODEL ====================

class Qualification(models.Model):
    """
    Model to store multiple qualifications for staff
    """
    staff = models.ForeignKey(
        'StaffDetail',
        on_delete=models.CASCADE,
        related_name='qualifications',
        verbose_name="Staff Member"
    )
    qualification_name = models.CharField(
        max_length=200,
        verbose_name="Qualification Name",
        help_text="e.g., MBBS, MD, B.Pharm, DMLT, etc."
    )
    institution = models.CharField(
        max_length=300,
        null=True,
        blank=True,
        verbose_name="Institution/University"
    )
    year_completed = models.IntegerField(
        verbose_name="Year Completed",
        validators=[
            MinValueValidator(1950, message='Year must be after 1950'),
            MaxValueValidator(2030, message='Year cannot be in the distant future')
        ]
    )
    specialization = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        verbose_name="Specialization"
    )
    registration_number = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name="Registration/License Number"
    )
    is_primary = models.BooleanField(
        default=False,
        verbose_name="Primary Qualification",
        help_text="Mark as primary qualification for this role"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.qualification_name} - {self.staff.Name}"
    
    def clean(self):
        """Validate qualification data"""
        # Validate year
        current_year = date.today().year
        if self.year_completed > current_year + 2:  # Allow up to 2 years in future
            raise ValidationError({
                'year_completed': f'Year cannot be more than 2 years in the future (Current year: {current_year})'
            })
        
        # Validate qualification name is not empty
        if not self.qualification_name or len(self.qualification_name.strip()) < 2:
            raise ValidationError({
                'qualification_name': 'Qualification name must be at least 2 characters'
            })
        
        # Check if this is a valid qualification
        qual_name_upper = self.qualification_name.upper()
        known_qualifications = [q.upper() for q in QUALIFICATION_DURATIONS.keys()]
        
        # Check for partial matches (e.g., "MD (Cardiology)" should match "MD")
        is_valid = any(qual in qual_name_upper for qual in known_qualifications)
        
        if not is_valid:
            # Still allow unknown qualifications with a warning
            logger.warning(f"Unknown qualification: {self.qualification_name}")
    
    def get_duration(self):
        """Get duration of this qualification in years"""
        qual_name_upper = self.qualification_name.upper()
        for qual, duration in QUALIFICATION_DURATIONS.items():
            if qual.upper() in qual_name_upper:
                return duration
        return 0  # Unknown qualification
    
    class Meta:
        db_table = 'STAFF_QUALIFICATIONS'
        verbose_name = 'Qualification'
        verbose_name_plural = 'Qualifications'
        ordering = ['-is_primary', '-year_completed']

# ==================== DEPARTMENT MODEL ====================

class Department(models.Model):
    DEPT_ID = models.CharField(max_length=20, unique=True, primary_key=True, verbose_name="Department ID")
    Department_Name = models.CharField(
        max_length=100, 
        unique=True,
        verbose_name="Department Name",
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z\s&]+$',
                message='Department name can only contain letters, spaces and ampersand'
            )
        ]
    )
    Description = models.TextField(null=True, blank=True, verbose_name="Description")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    
    def __str__(self):
        return f"{self.DEPT_ID} - {self.Department_Name}"
    
    def clean(self):
        if len(self.Department_Name.strip()) < 2:
            raise ValidationError({'Department_Name': 'Department name must be at least 2 characters long'})
    
    def save(self, *args, **kwargs):
        # Auto-generate Department ID if not provided
        if not self.DEPT_ID:
            last_dept = Department.objects.all().order_by('DEPT_ID').last()
            if last_dept and last_dept.DEPT_ID.startswith('DEPT-'):
                try:
                    last_num = int(last_dept.DEPT_ID.split('-')[1])
                    new_num = last_num + 1
                except:
                    new_num = 1
            else:
                new_num = 1
            
            self.DEPT_ID = f"DEPT-{new_num:04d}"
        
        super().save(*args, **kwargs)
    
    class Meta:
        db_table = 'DEPARTMENTS'
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'
        ordering = ['DEPT_ID']

# ==================== STAFF DETAIL MODEL ====================

class StaffDetail(models.Model):
    # ROLE_CHOICES with only roles that can have user accounts
    ROLE_CHOICES_WITH_ACCOUNTS = [
        ('Admin', 'Admin'),
        ('Doctor', 'Doctor'),
        ('Receptionist', 'Receptionist'),
        ('Lab Technician', 'Lab Technician'),
        ('Pharmacist', 'Pharmacist'),
    ]
    
    # Other roles (cannot have user accounts)
    OTHER_ROLE_CHOICES = [
        ('Nurse', 'Nurse'),
        ('Physiotherapist', 'Physiotherapist'),
        ('Radiologist', 'Radiologist'),
        ('Accountant', 'Accountant'),
        ('Ward Boy', 'Ward Boy'),
        ('Cleaner', 'Cleaner'),
        ('Security Guard', 'Security Guard'),
    ]
    
    # Combined roles
    ROLE_CHOICES = ROLE_CHOICES_WITH_ACCOUNTS + OTHER_ROLE_CHOICES
    
    STATUS_CHOICES = [
        ('Available', 'Available'),
        ('UnAvailable', 'UnAvailable'),
    ]
    
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]
    
    BLOOD_GROUP_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
    ]
    
    STAFF_ID = models.CharField(max_length=20, unique=True, primary_key=True, verbose_name="Staff ID")
    Name = models.CharField(
        max_length=100,
        verbose_name="Full Name",
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z\s\.\-]+$',
                message='Name can only contain letters, spaces, dots and hyphens'
            )
        ]
    )
    Gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True, verbose_name="Gender")
    Date_of_Birth = models.DateField(verbose_name="Date of Birth")
    Age = models.IntegerField(
        verbose_name="Age",
        null=True, blank=True,
        validators=[
            MinValueValidator(18, message='Staff must be at least 18 years old'),
            MaxValueValidator(70, message='Staff age cannot exceed 70 years')
        ]
    )
    Blood_Group = models.CharField(max_length=3, choices=BLOOD_GROUP_CHOICES, null=True, blank=True, verbose_name="Blood Group")
    
    # Contact Information
    Address = models.TextField(verbose_name="Address")
    City = models.CharField(max_length=50, null=True, blank=True, verbose_name="City")
    State = models.CharField(max_length=50, null=True, blank=True, verbose_name="State")
    Pincode = models.CharField(max_length=6, null=True, blank=True, verbose_name="Pincode")
    
    Phone_Number = models.CharField(
        max_length=10,
        verbose_name="Phone Number",
        validators=[
            RegexValidator(
                regex=r'^[6-9]\d{9}$',
                message='Phone number must start with 6-9 and be exactly 10 digits (Indian standard)'
            )
        ]
    )
    Alternate_Phone = models.CharField(
        max_length=10,
        null=True, blank=True,
        verbose_name="Alternate Phone",
        validators=[
            RegexValidator(
                regex=r'^[6-9]\d{9}$',
                message='Alternate phone must start with 6-9 and be exactly 10 digits (Indian standard)'
            )
        ]
    )
    Emergency_Contact = models.CharField(
        max_length=10,
        null=True, blank=True,
        verbose_name="Emergency Contact",
        validators=[
            RegexValidator(
                regex=r'^[6-9]\d{9}$',
                message='Emergency contact must start with 6-9 and be exactly 10 digits (Indian standard)'
            )
        ]
    )
    
    Email = models.EmailField(
        max_length=100,
        verbose_name="Email Address",
        validators=[
            RegexValidator(
                regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
                message='Enter a valid email address with proper domain'
            )
        ]
    )
    
    # Professional Information
    Role = models.CharField(max_length=20, choices=ROLE_CHOICES, verbose_name="Role")
    
    # Primary qualification fields (kept for backward compatibility)
    Qualification = models.CharField(max_length=200, null=True, blank=True, verbose_name="Primary Qualification")
    Specialization = models.CharField(max_length=100, null=True, blank=True, verbose_name="Specialization")
    Experience = models.IntegerField(null=True, blank=True, verbose_name="Experience (Years)")
    License_Number = models.CharField(max_length=50, null=True, blank=True, verbose_name="Primary License Number")
    
    Consultation_fees = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        verbose_name="Consultation Fees",
        validators=[
            MinValueValidator(0, message='Consultation fees cannot be negative'),
            MaxValueValidator(50000, message='Consultation fees cannot exceed ₹50,000')
        ]
    )
    
    Department = models.ForeignKey(
        Department, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Department",
        related_name='staff_details'
    )
    Status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='Available',
        verbose_name="Status"
    )
    
    # Employment Details
    Joining_Date = models.DateField(null=True, blank=True, verbose_name="Joining Date")
    Shift_Timing = models.CharField(max_length=50, null=True, blank=True, verbose_name="Shift Timing")
    Salary = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Salary")
    
    # Bank Details
    Bank_Name = models.CharField(max_length=100, null=True, blank=True, verbose_name="Bank Name")
    Account_Number = models.CharField(max_length=20, null=True, blank=True, verbose_name="Account Number")
    IFSC_Code = models.CharField(max_length=11, null=True, blank=True, verbose_name="IFSC Code")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    
    # User account fields
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='staff_detail',
        verbose_name="User Account"
    )
    account_active = models.BooleanField(default=True, verbose_name="Account Active")
    account_created_at = models.DateTimeField(null=True, blank=True, verbose_name="Account Created")
    account_deactivated_at = models.DateTimeField(null=True, blank=True, verbose_name="Account Deactivated")
    last_password_reset = models.DateTimeField(null=True, blank=True, verbose_name="Last Password Reset")
    
    def __str__(self):
        if self.Role == 'Doctor':
            return f"Dr. {self.Name} - {self.STAFF_ID}"
        return f"{self.Name} ({self.Role}) - {self.STAFF_ID}"
    
    def calculate_age(self):
        """Calculate age from Date of Birth"""
        if self.Date_of_Birth:
            today = date.today()
            age = today.year - self.Date_of_Birth.year - (
                (today.month, today.day) < (self.Date_of_Birth.month, self.Date_of_Birth.day)
            )
            return age
        return None
    
    def save(self, *args, **kwargs):
        # Auto-generate Staff ID if not provided
        if not self.STAFF_ID:
            role_prefixes = {
                'Doctor': 'DOC',
                'Receptionist': 'REC',
                'Pharmacist': 'PHRM',
                'Lab Technician': 'LBTCH',
                'Admin': 'ADM',
            }
            prefix = role_prefixes.get(self.Role, 'STAFF')
            
            last_staff = StaffDetail.objects.filter(STAFF_ID__startswith=prefix).order_by('STAFF_ID').last()
            if last_staff:
                try:
                    last_num = int(last_staff.STAFF_ID.replace(prefix, '').replace('-', ''))
                    new_num = last_num + 1
                except:
                    new_num = 1
            else:
                new_num = 1
            
            self.STAFF_ID = f"{prefix}-{new_num:04d}"
        
        # Calculate age from DOB
        if self.Date_of_Birth:
            self.Age = self.calculate_age()
        
        # Set joining date to today if not provided
        if not self.Joining_Date:
            self.Joining_Date = date.today()
        
        # Check if role can have user account
        if self.Role in [choice[0] for choice in self.OTHER_ROLE_CHOICES]:
            self.account_active = False
        
        super().save(*args, **kwargs)
    
    def clean(self):
        # Validate Date of Birth
        if self.Date_of_Birth:
            age = self.calculate_age()
            
            if age and age < 18:
                raise ValidationError({'Date_of_Birth': 'Staff must be at least 18 years old'})
            
            if self.Role == 'Doctor' and age and age < 25:
                raise ValidationError({'Date_of_Birth': 'Doctors must be at least 25 years old'})
            
            if age and age > 70:
                raise ValidationError({'Date_of_Birth': 'Staff age cannot exceed 70 years'})
        
        # Validate phone numbers for Indian standards
        phone_fields = ['Phone_Number', 'Alternate_Phone', 'Emergency_Contact']
        for field_name in phone_fields:
            value = getattr(self, field_name)
            if value:
                if not re.match(r'^[6-9]\d{9}$', str(value)):
                    raise ValidationError({
                        field_name: f'{field_name.replace("_", " ")} must start with 6-9 and be exactly 10 digits (Indian standard)'
                    })
        
        # Validate email
        if self.Email and not self.Email.endswith(('.com', '.in', '.org', '.net', '.co.in', '.gov.in')):
            raise ValidationError({'Email': 'Email must have a valid domain (e.g., @gmail.com, @yahoo.in)'})
        
        # Validate pincode
        if self.Pincode and not re.match(r'^\d{6}$', self.Pincode):
            raise ValidationError({'Pincode': 'Pincode must be exactly 6 digits'})
        
        # Validate role-specific requirements
        if self.Role == 'Doctor':
            if not self.Department:
                raise ValidationError({'Department': 'Doctors must be assigned to a department'})
            
            # Check if doctor has at least one qualification
            if not self.qualifications.exists() and not self.Qualification:
                raise ValidationError({'Qualification': 'Doctors must have at least one qualification'})
            
            if not self.License_Number and not self.qualifications.filter(registration_number__isnull=False).exists():
                raise ValidationError({'License_Number': 'Doctors must have at least one license/registration number'})
            
            if self.Consultation_fees is not None and self.Consultation_fees <= 0:
                raise ValidationError({'Consultation_fees': 'Doctors must have consultation fees greater than 0'})
        
        # Validate IFSC code
        if self.IFSC_Code and not re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', self.IFSC_Code):
            raise ValidationError({'IFSC_Code': 'IFSC code must be in format: ABCD0123456'})
        
        # Validate account number
        if self.Account_Number and not re.match(r'^\d{9,18}$', self.Account_Number):
            raise ValidationError({'Account_Number': 'Account number must be 9-18 digits'})
        
        # Validate Joining Date - can be today or in the future
        if self.Joining_Date:
            today = date.today()
            if self.Joining_Date < today:
                raise ValidationError({
                    'Joining_Date': 'Joining date cannot be in the past. It must be today or in the future.'
                })
        
        # Validate experience against age and qualifications
        if self.Date_of_Birth and self.Experience is not None:
            self.validate_experience_realistic()
    
    def validate_experience_realistic(self):
        """Validate that experience is realistic based on age and qualifications"""
        age = self.calculate_age()
        if not age or self.Experience is None:
            return
        
        # Get all qualifications
        qualifications = self.qualifications.all()
        
        if qualifications.exists():
            # Find the earliest qualification completion year
            earliest_year = min([q.year_completed for q in qualifications])
            
            # Calculate maximum possible experience
            current_year = date.today().year
            max_possible_experience = current_year - earliest_year
            
            if self.Experience > max_possible_experience:
                raise ValidationError({
                    'Experience': f'Experience ({self.Experience} years) exceeds maximum possible based on qualifications. Earliest qualification completed in {earliest_year}. Maximum possible experience: {max_possible_experience} years.'
                })
        
        # General validation based on age
        min_starting_age = 18
        max_possible_from_age = age - min_starting_age
        
        if self.Experience > max_possible_from_age:
            raise ValidationError({
                'Experience': f'Experience ({self.Experience} years) is unrealistic for a {age}-year-old staff member. Maximum possible experience would be {max_possible_from_age} years.'
            })
    
    def validate_license_format(self, license_number, role):
        """Validate license number format based on role"""
        if not license_number:
            return True
        
        if role == 'Doctor':
            # Check against all medical license formats
            for format_name, pattern in MEDICAL_LICENSE_FORMATS.items():
                if re.match(pattern, license_number):
                    return True
            
            # Generic check for MCI numbers
            if re.match(r'^\d{5,10}$', license_number):
                return True
            
            raise ValidationError({
                'License_Number': 'Invalid medical license format. Should be like: 123456 (MCI) or TN/12345/2010 (State Medical Council)'
            })
        
        elif role == 'Pharmacist':
            if not (re.match(PHARMACY_LICENSE_FORMATS['state'], license_number) or 
                   re.match(PHARMACY_LICENSE_FORMATS['pci'], license_number)):
                raise ValidationError({
                    'License_Number': 'Invalid pharmacy license format. Should be like: PCI-12345 or KA/1234/2015'
                })
        
        elif role == 'Lab Technician':
            if not (re.match(LAB_TECH_LICENSE_FORMATS['dmlt'], license_number) or 
                   re.match(LAB_TECH_LICENSE_FORMATS['bmlt'], license_number) or
                   re.match(LAB_TECH_LICENSE_FORMATS['state'], license_number)):
                raise ValidationError({
                    'License_Number': 'Invalid lab technician license format. Should be like: DMLT-1234 or KA/LT/1234'
                })
        
        return True
    
    @property
    def all_qualifications(self):
        """Get all qualifications as a list"""
        quals = list(self.qualifications.all().values_list('qualification_name', flat=True))
        if self.Qualification and self.Qualification not in quals:
            quals.append(self.Qualification)
        return quals
    
    @property
    def primary_qualification(self):
        """Get primary qualification"""
        primary = self.qualifications.filter(is_primary=True).first()
        if primary:
            return primary.qualification_name
        return self.Qualification
    
    @property
    def license_numbers(self):
        """Get all license numbers"""
        licenses = list(self.qualifications.exclude(registration_number__isnull=True)
                       .values_list('registration_number', flat=True))
        if self.License_Number and self.License_Number not in licenses:
            licenses.append(self.License_Number)
        return licenses
    
    @property
    def can_have_user_account(self):
        """Check if this role can have a user account"""
        return self.Role in [choice[0] for choice in self.ROLE_CHOICES_WITH_ACCOUNTS]
    
    @property
    def has_user_account(self):
        return self.user is not None
    
    @property
    def account_status(self):
        if not self.user:
            return 'no_account'
        elif self.account_active:
            return 'active'
        else:
            return 'inactive'
    
    @property
    def years_of_experience(self):
        """Calculate years of experience"""
        if self.Joining_Date:
            today = date.today()
            if self.Joining_Date > today:
                return 0  # Future joining date
            experience = relativedelta(today, self.Joining_Date)
            return experience.years
        return self.Experience or 0
    
    def get_qualifications_summary(self):
        """Get formatted summary of all qualifications"""
        quals = self.qualifications.all()
        if not quals.exists() and self.Qualification:
            return self.Qualification
        
        summary = []
        for qual in quals.order_by('-is_primary', '-year_completed'):
            qual_str = qual.qualification_name
            if qual.specialization:
                qual_str += f" ({qual.specialization})"
            if qual.institution:
                qual_str += f", {qual.institution}"
            if qual.year_completed:
                qual_str += f" ({qual.year_completed})"
            
            if qual.is_primary:
                qual_str = f"⭐ {qual_str}"
            
            summary.append(qual_str)
        
        return "; ".join(summary)
    
    def create_user_account(self, password=None):
        """Create a user account for staff member (manual creation only)"""
        if self.user:
            raise ValidationError('User account already exists')
        
        if not self.can_have_user_account:
            raise ValidationError(f'{self.Role} role cannot have a user account')
        
        if not self.Email:
            raise ValidationError('Email is required to create user account')
        
        try:
            with transaction.atomic():
                # Generate username from email or staff ID
                username = self.Email.split('@')[0] if '@' in self.Email else self.STAFF_ID.lower()
                
                # Ensure username is unique
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                
                # Create user
                if password:
                    user = User.objects.create_user(
                        username=username,
                        email=self.Email,
                        password=password,
                        is_active=self.account_active
                    )
                else:
                    # Generate random password
                    import secrets
                    import string
                    alphabet = string.ascii_letters + string.digits
                    password = ''.join(secrets.choice(alphabet) for _ in range(12))
                    
                    user = User.objects.create_user(
                        username=username,
                        email=self.Email,
                        password=password,
                        is_active=self.account_active
                    )
                
                # Link user to staff
                self.user = user
                self.account_created_at = timezone.now()
                self.save()
                
                # Add to appropriate group based on role
                group_name = self.Role.replace(' ', '_')
                group, created = Group.objects.get_or_create(name=group_name)
                user.groups.add(group)
                
                # Log the creation
                from authentication.models import SystemLog
                SystemLog.objects.create(
                    level='INFO',
                    log_type='USER_MANAGEMENT',
                    user=user,
                    action=f'User account created for {self.Name} ({self.Role})',
                    details={
                        'staff_id': self.STAFF_ID,
                        'role': self.Role,
                        'auto_generated': password is None
                    }
                )
                
                return user
                
        except Exception as e:
            logger.error(f"Error creating user account for staff {self.STAFF_ID}: {e}")
            raise
    
    def deactivate_account(self):
        if self.user and self.account_active:
            self.account_active = False
            self.account_deactivated_at = timezone.now()
            self.user.is_active = False
            self.user.save()
            self.save()
            
            # Log the deactivation
            from authentication.models import SystemLog
            SystemLog.objects.create(
                level='WARNING',
                log_type='SECURITY',
                user=self.user,
                action=f'User account deactivated for {self.Name}',
                details={'staff_id': self.STAFF_ID, 'reason': 'admin_deactivated'}
            )
            return True
        return False
    
    def activate_account(self):
        if self.user and not self.account_active:
            self.account_active = True
            self.account_deactivated_at = None
            self.user.is_active = True
            self.user.save()
            self.save()
            
            # Log the activation
            from authentication.models import SystemLog
            SystemLog.objects.create(
                level='INFO',
                log_type='SECURITY',
                user=self.user,
                action=f'User account activated for {self.Name}',
                details={'staff_id': self.STAFF_ID}
            )
            return True
        return False
    
    def reset_password(self, new_password=None):
        if self.user:
            if new_password:
                password_to_set = new_password
            else:
                import secrets
                import string
                alphabet = string.ascii_letters + string.digits
                password_to_set = ''.join(secrets.choice(alphabet) for _ in range(12))
            
            self.user.set_password(password_to_set)
            self.user.save()
            self.last_password_reset = timezone.now()
            self.save()
            
            from authentication.models import SystemLog
            SystemLog.objects.create(
                level='SECURITY',
                log_type='SECURITY',
                user=self.user,
                action='Password reset',
                details={'staff_id': self.STAFF_ID, 'auto_generated': new_password is None}
            )
            
            return password_to_set if not new_password else None
        return None
    
    def set_custom_password(self, new_password):
        """Set a custom password (for admin setting passwords)"""
        if self.user and new_password:
            self.user.set_password(new_password)
            self.user.save()
            self.last_password_reset = timezone.now()
            self.save()
            return True
        return False
    
    class Meta:
        db_table = 'STAFF_DETAILS'
        verbose_name = 'Staff Detail'
        verbose_name_plural = 'Staff Details'
        ordering = ['STAFF_ID']
