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
        # Auto-generate PAT_ID if not provided (for new patients only)
        if not self.PAT_ID:
            # Get the highest numeric part from existing PAT_IDs
            patients = PatientDetail.objects.all()
            max_num = 0
        
            for patient in patients:
                if patient.PAT_ID.startswith('PAT-'):
                    try:
                        # Extract number from PAT-000001 format
                        num_part = patient.PAT_ID.split('-')[1]
                        num = int(num_part)
                        max_num = max(max_num, num)
                    except (ValueError, IndexError):
                        continue
        
            new_num = max_num + 1
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
    
        # Generate APPOINTMENT_ID if not provided (for new appointments only)
        if is_new and not self.APPOINTMENT_ID:
            today = date.today()
            # Get appointments created today (based on created_at, not Date)
            appointments_today = AppointmentDetail.objects.filter(created_at__date=today)
        
            if appointments_today.exists():
                try:
                    # Get max number from APPOINTMENT_ID
                    max_num = 0
                    for appointment in appointments_today:
                        if appointment.APPOINTMENT_ID.startswith('APID-'):
                            try:
                                num = int(appointment.APPOINTMENT_ID.split('-')[1])
                                max_num = max(max_num, num)
                            except:
                                pass
                    new_num = max_num + 1
                except:
                    new_num = 1
            else:
                new_num = 1
        
            self.APPOINTMENT_ID = f"APID-{new_num:04d}"
    
        # Generate TOKEN_NO if not provided (for new appointments only)
        if is_new and not self.TOKEN_NO:
            today = self.Date  # Use appointment date, not today's date
            # Count appointments for the same date (excluding current appointment)
            existing_tokens = AppointmentDetail.objects.filter(Date=today).exclude(pk=self.pk)
            token_count = existing_tokens.count()
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

# In receptionistapp/models.py - Update BillDetail model

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
    CONSULT_ID = models.ForeignKey('doctorapp.ConsultationDetail', on_delete=models.CASCADE, related_name='bills')
    
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
    auto_generated = models.BooleanField(default=False, verbose_name="Auto-generated")
    
    def save(self, *args, **kwargs):
        is_new = not self.pk
    
        # Generate BILL_ID if not provided (for new bills only)
        if is_new and not self.BILL_ID:
            # Get the highest numeric part from existing BILL_IDs
            bills = BillDetail.objects.all()
            max_num = 0
        
            for bill in bills:
                if bill.BILL_ID.startswith('BILL-'):
                    try:
                        num_part = bill.BILL_ID.split('-')[1]
                        num = int(num_part)
                        max_num = max(max_num, num)
                    except (ValueError, IndexError):
                        continue
        
            new_num = max_num + 1
            self.BILL_ID = f"BILL-{new_num:06d}"
    
        # Always auto-calculate costs before saving
        self.calculate_costs()
    
        # Set Payment_Date if marked as Paid
        if self.Pay_Status == 'Paid' and not self.Payment_Date:
            self.Payment_Date = timezone.now()
    
        super().save(*args, **kwargs)
    
    def calculate_costs(self):
        # Import here to avoid circular imports
        from pharmacistapp.models import DispensingMedicine, Prescription
        from doctorapp.models import LabTestRequestDetail
        
        # Auto-calculate consultation cost from doctor's fees
        if hasattr(self.CONSULT_ID.DOC_ID, 'Consultation_fees'):
            self.Consultation_Cost = self.CONSULT_ID.DOC_ID.Consultation_fees or 0
        else:
            # Default consultation fee if not set
            self.Consultation_Cost = 500.00
        
        # Calculate medicine costs from prescriptions
        medicine_total = 0
        
        # Option 1: Get from DispensingMedicine (if pharmacy has dispensed)
        try:
            medicine_dispenses = DispensingMedicine.objects.filter(CONSULT_ID=self.CONSULT_ID)
            if medicine_dispenses.exists():
                medicine_total = sum((dispense.Qty * dispense.Price) for dispense in medicine_dispenses)
        except:
            pass
        
        # Option 2: Get from Prescription (doctor's prescription - estimated cost)
        if medicine_total == 0:
            try:
                prescriptions = Prescription.objects.filter(CONSULT_ID=self.CONSULT_ID)
                if prescriptions.exists():
                    # Estimate cost based on medicine price
                    for prescription in prescriptions:
                        medicine_total += float(prescription.MED_ID.Price_per_Unit or 0) * self._estimate_duration(prescription.Duration)
            except:
                pass
        
        self.Medicine_Cost = medicine_total
        
        # Auto-calculate lab test costs
        try:
            lab_requests = LabTestRequestDetail.objects.filter(CONSULT_ID=self.CONSULT_ID, Status='Completed')
            self.LabTest_Cost = sum((request.LAB_TEST_ID.Lab_Test_Cost or 0) for request in lab_requests)
        except:
            self.LabTest_Cost = 0
        
        # Calculate total
        subtotal = self.Consultation_Cost + self.Medicine_Cost + self.LabTest_Cost + self.Additional_Charges
        self.Total_Amount = max(0, subtotal - self.Discount)
    
    def _estimate_duration(self, duration_str):
        """Estimate number of days from duration string"""
        try:
            duration_str = str(duration_str).lower()
            if 'day' in duration_str:
                # Extract numbers from string like "7 days"
                import re
                numbers = re.findall(r'\d+', duration_str)
                return int(numbers[0]) if numbers else 7
            elif 'week' in duration_str:
                numbers = re.findall(r'\d+', duration_str)
                return (int(numbers[0]) if numbers else 1) * 7
            elif 'month' in duration_str:
                numbers = re.findall(r'\d+', duration_str)
                return (int(numbers[0]) if numbers else 1) * 30
            else:
                return 7  # Default 7 days
        except:
            return 7
    
    def __str__(self):
        return f"{self.BILL_ID} - {self.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name} - ₹{self.Total_Amount}"
    
    class Meta:
        db_table = 'BILL_DETAILS'
        ordering = ['-Created_Date']

# Add this to receptionistapp/models.py after PatientDetail model
class PatientMedicalInfo(models.Model):
    """
    Model for storing patient medical information that only doctors can edit
    """
    patient = models.OneToOneField(
        PatientDetail, 
        on_delete=models.CASCADE, 
        related_name='medical_info',
        primary_key=True,
        verbose_name="Patient"
    )
    
    # Medical History
    past_medical_history = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Past Medical History",
        help_text="Previous illnesses, surgeries, hospitalizations"
    )
    
    # Allergies
    allergies = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Allergies",
        help_text="Drug allergies, food allergies, environmental allergies"
    )
    
    # Chronic Conditions
    chronic_conditions = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Chronic Conditions",
        help_text="Diabetes, Hypertension, Asthma, etc."
    )
    
    # Current Medications
    current_medications = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Current Medications",
        help_text="Regular medications being taken"
    )
    
    # Family History
    family_history = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Family History",
        help_text="Family medical history"
    )
    
    # Social History
    social_history = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Social History",
        help_text="Smoking, alcohol, occupation, lifestyle"
    )
    
    # Surgical History
    surgical_history = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Surgical History",
        help_text="Previous surgeries with dates"
    )
    
    # Vital Signs (can be updated per visit)
    height = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        blank=True, 
        null=True,
        verbose_name="Height (cm)"
    )
    weight = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        blank=True, 
        null=True,
        verbose_name="Weight (kg)"
    )
    blood_pressure = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        verbose_name="Blood Pressure"
    )
    pulse = models.IntegerField(
        blank=True, 
        null=True,
        verbose_name="Pulse (BPM)",
        validators=[MinValueValidator(30), MaxValueValidator(200)]
    )
    temperature = models.DecimalField(
        max_digits=4, 
        decimal_places=1, 
        blank=True, 
        null=True,
        verbose_name="Temperature (°C)",
        validators=[MinValueValidator(35.0), MaxValueValidator(42.0)]
    )
    respiratory_rate = models.IntegerField(
        blank=True, 
        null=True,
        verbose_name="Respiratory Rate",
        validators=[MinValueValidator(8), MaxValueValidator(60)]
    )
    oxygen_saturation = models.DecimalField(
        max_digits=4, 
        decimal_places=1, 
        blank=True, 
        null=True,
        verbose_name="O2 Saturation (%)",
        validators=[MinValueValidator(70), MaxValueValidator(100)]
    )
    
    # Additional Notes
    additional_notes = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Additional Notes"
    )
    
    # Audit fields
    last_updated_by = models.ForeignKey(
        'adminapp.StaffDetail',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Last Updated By",
        limit_choices_to={'Role': 'Doctor'}  # Only doctors can update
    )
    last_updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Medical Info - {self.patient.Patient_Name}"
    
    def calculate_bmi(self):
        """Calculate BMI if height and weight are available"""
        if self.height and self.weight:
            height_m = float(self.height) / 100  # Convert cm to meters
            bmi = float(self.weight) / (height_m * height_m)
            return round(bmi, 1)
        return None
    
    def get_bmi_category(self):
        """Get BMI category"""
        bmi = self.calculate_bmi()
        if not bmi:
            return None
        
        if bmi < 18.5:
            return "Underweight"
        elif 18.5 <= bmi < 25:
            return "Normal"
        elif 25 <= bmi < 30:
            return "Overweight"
        else:
            return "Obese"
    
    class Meta:
        db_table = 'PATIENT_MEDICAL_INFO'
        verbose_name = 'Patient Medical Information'
        verbose_name_plural = 'Patients Medical Information'