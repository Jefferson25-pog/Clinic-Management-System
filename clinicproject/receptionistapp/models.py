from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from datetime import date
import re

class PatientDetails(models.Model):
    PAT_ID = models.AutoField(primary_key=True)
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
    Address = models.CharField(max_length=255)
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
    
    def __str__(self):
        return f"{self.Patient_Name} (ID: {self.PAT_ID})"
    
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
    
    class Meta:
        db_table = 'PATIENT_DETAILS'

class AppointmentDetails(models.Model):
    STATUS_CHOICES = [
        ('Scheduled', 'Scheduled'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]
    
    TOKEN_NO = models.AutoField(primary_key=True)
    PAT_ID = models.ForeignKey('PatientDetails', on_delete=models.CASCADE)
    DOC_ID = models.ForeignKey('adminapp.StaffDetails', on_delete=models.CASCADE, limit_choices_to={'Role': 'Doctor'})
    Status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Scheduled')
    Date = models.DateField()
    
    def __str__(self):
        return f"Token {self.TOKEN_NO} - {self.PAT_ID.Patient_Name} with Dr. {self.DOC_ID.Name}"
    
    def clean(self):
        if self.Date:
            if self.Date < date.today():
                raise ValidationError({'Date': 'Appointment date cannot be in the past'})
    
    class Meta:
        db_table = 'APPOINTMENT_DETAILS'

class ReceptionistLog(models.Model):
    LOG_ID = models.AutoField(primary_key=True)
    Action = models.CharField(max_length=255)
    Timestamp = models.DateTimeField(auto_now_add=True)
    Details = models.TextField()
    
    def __str__(self):
        return f"Log {self.LOG_ID} - {self.Action} at {self.Timestamp.strftime('%Y-%m-%d %H:%M')}"
    
    class Meta:
        db_table = 'RECEPTIONIST_LOG'

class BillDetails(models.Model):
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
    
    BILL_ID = models.AutoField(primary_key=True)
    CONSULT_ID = models.ForeignKey('doctorapp.ConsultationDetails', on_delete=models.CASCADE)
    
    # Auto-calculated fields
    Consultation_Cost = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    Medicine_Cost = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    LabTest_Cost = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    Total_Amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    
    Pay_Status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='Pending')
    Payment_Mode = models.CharField(max_length=20, choices=PAYMENT_MODES, blank=True, null=True)
    Created_Date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Bill {self.BILL_ID} - {self.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name} - ${self.Total_Amount}"
    
    def calculate_costs(self):
        from pharmacistapp.models import DispensingMedicines
        from labtechapp.models import LabTestRequestDetails
        
        # Auto-calculate consultation cost from doctor's fees
        if hasattr(self.CONSULT_ID.DOC_ID, 'Consultation_fees'):
            self.Consultation_Cost = self.CONSULT_ID.DOC_ID.Consultation_fees
        
        # Auto-calculate medicine costs
        medicine_dispenses = DispensingMedicines.objects.filter(CONSULT_ID=self.CONSULT_ID)
        self.Medicine_Cost = sum(dispense.Qty * dispense.Price for dispense in medicine_dispenses)
        
        # Auto-calculate lab test costs
        lab_requests = LabTestRequestDetails.objects.filter(CONSULT_ID=self.CONSULT_ID)
        self.LabTest_Cost = sum(request.LAB_TEST_ID.Lab_Test_Cost for request in lab_requests)
        
        self.Total_Amount = self.Consultation_Cost + self.Medicine_Cost + self.LabTest_Cost
    
    def save(self, *args, **kwargs):
        # Always auto-calculate costs before saving
        self.calculate_costs()
        super().save(*args, **kwargs)
    
    class Meta:
        db_table = 'BILL_DETAILS'