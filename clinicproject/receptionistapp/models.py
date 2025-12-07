# receptionistapp/models.py - COMPLETE UPDATED VERSION
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from datetime import date, datetime, timedelta
import re
from django.db.models import Max
from django.utils import timezone

class PatientDetail(models.Model):
    PAT_ID = models.CharField(max_length=20, primary_key=True, verbose_name="Patient ID")
    Patient_Name = models.CharField(
        max_length=100,
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z\s\.\-]+$',
                message='Patient name can only contain letters, spaces, dots and hyphens'
            )
        ]
    )
    DOB = models.DateField()
    Address = models.TextField()
    Phone_Number = models.CharField(
        max_length=10,
        validators=[
            RegexValidator(
                regex=r'^\d{10}$',
                message='Phone number must be exactly 10 digits (no symbols or spaces)'
            )
        ]
    )
    Email = models.EmailField(
        max_length=100, 
        blank=True, 
        null=True,
        validators=[
            RegexValidator(
                regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
                message='Enter a valid email address with proper domain'
            )
        ]
    )
    Gender = models.CharField(max_length=10, choices=[
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other')
    ], blank=True, null=True)
    Blood_Group = models.CharField(max_length=5, choices=[
        ('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'),
        ('O+', 'O+'), ('O-', 'O-'), ('AB+', 'AB+'), ('AB-', 'AB-')
    ], blank=True, null=True)
    Emergency_Contact = models.CharField(max_length=10, blank=True, null=True)
    Occupation = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.Patient_Name} ({self.PAT_ID})"
    
    @property
    def age(self):
        """Calculate age from DOB"""
        if self.DOB:
            today = date.today()
            return today.year - self.DOB.year - ((today.month, today.day) < (self.DOB.month, self.DOB.day))
        return None
    
    def clean(self):
        # DOB validation
        if self.DOB:
            if self.DOB > date.today():
                raise ValidationError({'DOB': 'Date of birth cannot be in the future'})
            
            age = self.age
            if age < 0:
                raise ValidationError({'DOB': 'Date of birth cannot be in the future'})
            if age > 120:
                raise ValidationError({'DOB': 'Patient age cannot exceed 120 years'})
        
        # Email domain validation
        if self.Email and not self.Email.endswith(('.com', '.in', '.org', '.net')):
            raise ValidationError({'Email': 'Email must have a valid domain (e.g., @gmail.com, @yahoo.in)'})
    
    def save(self, *args, **kwargs):
        # Auto-generate PAT_ID if not provided
        if not self.PAT_ID:
            last_patient = PatientDetail.objects.all().order_by('PAT_ID').last()
            if last_patient and last_patient.PAT_ID.startswith('PAT-'):
                try:
                    last_num = int(last_patient.PAT_ID.split('-')[1])
                    new_num = last_num + 1
                except:
                    new_num = 1
            else:
                new_num = 1
            
            self.PAT_ID = f"PAT-{new_num:06d}"
        
        super().save(*args, **kwargs)
    
    class Meta:
        db_table = 'PATIENT_DETAILS'
        ordering = ['-created_at']

class AppointmentDetail(models.Model):
    STATUS_CHOICES = [
        ('Scheduled', 'Scheduled'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]
    
    APPOINTMENT_ID = models.CharField(max_length=20, primary_key=True, verbose_name="Appointment ID")
    TOKEN_NO = models.CharField(max_length=20, verbose_name="Token Number")
    PAT_ID = models.ForeignKey('PatientDetail', on_delete=models.CASCADE, related_name='appointments')
    DOC_ID = models.ForeignKey('adminapp.StaffDetail', on_delete=models.CASCADE, limit_choices_to={'Role': 'Doctor'})
    Status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Scheduled')
    Date = models.DateField()
    Time = models.TimeField(default='09:00:00')
    Priority = models.CharField(
        max_length=20, 
        choices=[
            ('normal', 'Normal'),
            ('urgent', 'Urgent'),
            ('critical', 'Critical')
        ], 
        default='normal'
    )
    Reason = models.TextField(blank=True, null=True)
    Notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    cancelled_at = models.DateTimeField(blank=True, null=True)
    cancelled_by = models.CharField(max_length=50, blank=True, null=True)
    
    def save(self, *args, **kwargs):
        is_new = not self.pk
        
        # Generate APPOINTMENT_ID if not provided
        if not self.APPOINTMENT_ID:
            today = date.today()
            appointments_today = AppointmentDetail.objects.filter(Date=today)
            if appointments_today.exists():
                try:
                    max_num = max([int(a.APPOINTMENT_ID.split('-')[1]) for a in appointments_today if '-' in a.APPOINTMENT_ID])
                    new_num = max_num + 1
                except:
                    new_num = 1
            else:
                new_num = 1
            
            self.APPOINTMENT_ID = f"APID-{new_num:04d}"
        
        # Generate TOKEN_NO if not provided
        if not self.TOKEN_NO:
            today = date.today()
            appointments_today = AppointmentDetail.objects.filter(Date=today)
            token_count = appointments_today.count()
            self.TOKEN_NO = f"TOK-{(token_count + 1):04d}"
        
        # Set completed_at or cancelled_at timestamps
        if self.Status == 'Completed' and not self.completed_at:
            self.completed_at = timezone.now()
        elif self.Status == 'Cancelled' and not self.cancelled_at:
            self.cancelled_at = timezone.now()
            if not self.cancelled_by:
                self.cancelled_by = 'System'
        
        super().save(*args, **kwargs)
    
    def clean(self):
        if self.Date:
            if self.Date < date.today():
                raise ValidationError({'Date': 'Appointment date cannot be in the past'})
            
            # Optional: Restrict to next 30 days
            max_date = date.today() + timedelta(days=30)
            if self.Date > max_date:
                raise ValidationError({'Date': 'Appointments can only be scheduled up to 30 days in advance'})
        
        # Check if doctor is available
        if self.DOC_ID and hasattr(self.DOC_ID, 'Status'):
            if self.DOC_ID.Status != 'Available':
                raise ValidationError(
                    {"DOC_ID": f"Doctor is currently {self.DOC_ID.Status}. Please choose another doctor."}
                )
    
    def __str__(self):
        return f"{self.APPOINTMENT_ID} - {self.PAT_ID.Patient_Name} with Dr. {self.DOC_ID.Name}"
    
    class Meta:
        db_table = 'APPOINTMENT_DETAILS'
        ordering = ['-Priority', 'Date', 'Time']

class BillDetail(models.Model):
    PAYMENT_STATUS = [
        ('Pending', 'Pending'),
        ('Paid', 'Paid'),
        ('Partial', 'Partial'),
        ('Insurance Pending', 'Insurance Pending'),
        ('Rejected', 'Rejected'),
    ]
    
    PAYMENT_MODES = [
        ('Cash', 'Cash'),
        ('Card', 'Card'),
        ('Online', 'Online'),
        ('Insurance', 'Insurance'),
        ('Mixed', 'Mixed'),
    ]
    
    BILL_ID = models.CharField(max_length=20, primary_key=True, verbose_name="Bill ID")
    CONSULT_ID = models.ForeignKey('doctorapp.ConsultationDetail', on_delete=models.CASCADE)
    
    # Auto-calculated fields
    Consultation_Cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    Medicine_Cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    LabTest_Cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    Additional_Charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    Discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    Total_Amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    Pay_Status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='Pending')
    Payment_Mode = models.CharField(max_length=20, choices=PAYMENT_MODES, blank=True, null=True)
    Payment_Date = models.DateTimeField(blank=True, null=True)
    Transaction_ID = models.CharField(max_length=100, blank=True, null=True)
    Notes = models.TextField(blank=True, null=True)
    Created_Date = models.DateTimeField(auto_now_add=True)
    Updated_Date = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Generate BILL_ID if not provided
        if not self.BILL_ID:
            last_bill = BillDetail.objects.all().order_by('BILL_ID').last()
            if last_bill and last_bill.BILL_ID.startswith('BILL-'):
                try:
                    last_num = int(last_bill.BILL_ID.split('-')[1])
                    new_num = last_num + 1
                except:
                    new_num = 1
            else:
                new_num = 1
            
            self.BILL_ID = f"BILL-{new_num:06d}"
        
        # Always auto-calculate costs before saving
        self.calculate_costs()
        
        # Set Payment_Date if marked as Paid
        if self.Pay_Status == 'Paid' and not self.Payment_Date:
            self.Payment_Date = timezone.now()
        
        super().save(*args, **kwargs)
    
    def calculate_costs(self):
        from pharmacistapp.models import DispensingMedicine
        from doctorapp.models import LabTestRequestDetail
        
        # Auto-calculate consultation cost from doctor's fees
        if hasattr(self.CONSULT_ID.DOC_ID, 'Consultation_fees'):
            self.Consultation_Cost = self.CONSULT_ID.DOC_ID.Consultation_fees or 0
        
        # Auto-calculate medicine costs
        medicine_dispenses = DispensingMedicine.objects.filter(CONSULT_ID=self.CONSULT_ID)
        self.Medicine_Cost = sum((dispense.Qty * dispense.Price) for dispense in medicine_dispenses)
        
        # Auto-calculate lab test costs
        lab_requests = LabTestRequestDetail.objects.filter(CONSULT_ID=self.CONSULT_ID)
        self.LabTest_Cost = sum((request.LAB_TEST_ID.Lab_Test_Cost or 0) for request in lab_requests)
        
        # Calculate total
        subtotal = self.Consultation_Cost + self.Medicine_Cost + self.LabTest_Cost + self.Additional_Charges
        self.Total_Amount = max(0, subtotal - self.Discount)
    
    def __str__(self):
        return f"{self.BILL_ID} - {self.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name} - ₹{self.Total_Amount}"
    
    class Meta:
        db_table = 'BILL_DETAILS'
        ordering = ['-Created_Date']
