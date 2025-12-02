from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
import re
from datetime import date

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
    
    # Doctor-specific fields
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
        verbose_name="Department"
    )
    Status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='Available',
        verbose_name="Status"
    )
    
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='staff_detail',
        verbose_name="User Account"
    )
    
    def __str__(self):
        if self.Role == 'Doctor':
            return f"Dr. {self.Name} - {self.Department.Department_Name if self.Department else 'No Department'}"
        return f"{self.Name} ({self.Role})"
    
    def create_user_account(self):
        """Create a Django User account for this staff member"""
        if not self.user:
            username = f"{self.Name.lower().replace(' ', '.')}{self.STAFF_ID}"
            user = User.objects.create_user(
                username=username,
                email=self.Email,
                password='temp123'
            )
            self.user = user
            self.save()
            
            from django.contrib.auth.models import Group
            group, created = Group.objects.get_or_create(name=self.Role)
            user.groups.add(group)
    
    def clean(self):
        # Age validation
        if self.Age is not None:
            if self.Age < 18:
                raise ValidationError({'Age': 'Staff must be at least 18 years old'})
            
            # Doctor-specific validations
            if self.Role == 'Doctor':
                if self.Age < 25:
                    raise ValidationError({'Age': 'Doctors must be at least 25 years old'})
                if not self.Department:
                    raise ValidationError({'Department': 'Doctors must be assigned to a department'})
                if self.Consultation_fees is not None and self.Consultation_fees <= 0:
                    raise ValidationError({'Consultation_fees': 'Doctors must have consultation fees greater than 0'})
        
        # Email domain validation
        if self.Email and not self.Email.endswith(('.com', '.in', '.org', '.net')):
            raise ValidationError({'Email': 'Email must have a valid domain (e.g., @gmail.com, @yahoo.in)'})
    
    class Meta:
        db_table = 'STAFF_DETAILS'
        verbose_name = 'Staff Detail'
        verbose_name_plural = 'Staff Details'