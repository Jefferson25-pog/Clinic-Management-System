# models.py - UPDATED WITH ACCOUNT MANAGEMENT
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
import re
from datetime import date
from django.contrib.auth.models import Group
from django.db import transaction
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class Department(models.Model):
    DEPT_ID = models.AutoField(primary_key=True, verbose_name="Department ID")
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
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    
    def __str__(self):
        return self.Department_Name
    
    def clean(self):
        if len(self.Department_Name.strip()) < 2:
            raise ValidationError({'Department_Name': 'Department name must be at least 2 characters long'})
    
    class Meta:
        db_table = 'DEPARTMENTS'
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'

class StaffDetail(models.Model):
    ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Doctor', 'Doctor'),
        ('Receptionist', 'Receptionist'),
        ('Lab Technician', 'Lab Technician'),
        ('Pharmacist', 'Pharmacist'),
    ]
    
    STATUS_CHOICES = [
        ('Available', 'Available'),
        ('Busy', 'Busy'),
        ('On Leave', 'On Leave'),
    ]
    
    STAFF_ID = models.AutoField(primary_key=True, verbose_name="Staff ID")
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
    Age = models.IntegerField(
        verbose_name="Age",
        validators=[
            MinValueValidator(18, message='Staff must be at least 18 years old'),
            MaxValueValidator(70, message='Staff age cannot exceed 70 years')
        ]
    )
    Address = models.CharField(max_length=255, verbose_name="Address")
    Phone_Number = models.CharField(
        max_length=10,
        verbose_name="Phone Number",
        validators=[
            RegexValidator(
                regex=r'^\d{10}$',
                message='Phone number must be exactly 10 digits (no symbols or spaces)'
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
    Role = models.CharField(max_length=20, choices=ROLE_CHOICES, verbose_name="Role")
    
    Consultation_fees = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        verbose_name="Consultation Fees",
        validators=[
            MinValueValidator(0, message='Consultation fees cannot be negative'),
            MaxValueValidator(10000, message='Consultation fees cannot exceed 10000')
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
            return f"Dr. {self.Name} - {self.Department.Department_Name if self.Department else 'No Department'}"
        return f"{self.Name} ({self.Role})"
    
    def create_user_account(self, password=None, custom_username=None):
        if not self.user:
            with transaction.atomic():
                # Use custom username if provided, otherwise generate
                if custom_username:
                    username = custom_username
                else:
                    username = f"{self.Name.lower().replace(' ', '.')}.{self.STAFF_ID}"
                
                    if User.objects.filter(username=username).exists():
                        username = f"{username}.{self.STAFF_ID}"
            
                if password is None:
                    # Generate a random password
                    import secrets
                    import string
                    alphabet = string.ascii_letters + string.digits
                    password = ''.join(secrets.choice(alphabet) for _ in range(12))
            
                # Check if user already exists with this email
                existing_user = User.objects.filter(email=self.Email).first()
                if existing_user:
                    # Link to existing user
                    user = existing_user
                    print(f"Linking to existing user: {user.username}")
                else:
                    # Create new user
                    user = User.objects.create_user(
                        username=username,
                        email=self.Email,
                        password=password
                    )
                    print(f"Created new user: {user.username}")
            
                try:
                    group = Group.objects.get(name=self.Role)
                except Group.DoesNotExist:
                    group = Group.objects.create(name=self.Role)
            
                user.groups.add(group)
            
                if self.Role == 'Admin':
                    user.is_staff = True
                    user.save()
            
                # Link staff to user
                self.user = user
                self.account_active = True
                self.account_created_at = timezone.now()
                self.save()
            
                # Link user profile to staff - USE get_or_create to avoid duplicate
                from authentication.models import UserProfile
                profile, created = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={'staff_detail': self}
                )
            
                if not created:
                    # Profile already exists, update it
                    profile.staff_detail = self
                    profile.save()
            
                self._log_account_creation(user, password)
    
        return self.user
    
    def _log_account_creation(self, user, password=None):
        from authentication.models import SystemLog
        SystemLog.objects.create(
            level='INFO',
            log_type='USER',
            user=user,
            action=f'User account created for {self.Name} ({self.Role})',
            details={
                'staff_id': self.STAFF_ID,
                'role': self.Role,
                'username': user.username,
                'auto_generated': password is not None
            }
        )
    
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
    
    def clean(self):
        if self.Age is not None:
            if self.Age < 18:
                raise ValidationError({'Age': 'Staff must be at least 18 years old'})
            
            if self.Role == 'Doctor':
                if self.Age < 25:
                    raise ValidationError({'Age': 'Doctors must be at least 25 years old'})
                if not self.Department:
                    raise ValidationError({'Department': 'Doctors must be assigned to a department'})
                if self.Consultation_fees is not None and self.Consultation_fees <= 0:
                    raise ValidationError({'Consultation_fees': 'Doctors must have consultation fees greater than 0'})
        
        if self.Email and not self.Email.endswith(('.com', '.in', '.org', '.net')):
            raise ValidationError({'Email': 'Email must have a valid domain (e.g., @gmail.com, @yahoo.in)'})
    
    class Meta:
        db_table = 'STAFF_DETAILS'
        verbose_name = 'Staff Detail'
        verbose_name_plural = 'Staff Details'