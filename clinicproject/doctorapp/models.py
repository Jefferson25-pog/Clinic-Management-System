from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
import re

class ConsultationDetail(models.Model):
    CONSULTATION_STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ]
    
    CONSULT_ID = models.AutoField(primary_key=True, verbose_name="Consultation ID")
    TOKEN_NO = models.ForeignKey('receptionistapp.AppointmentDetail', on_delete=models.CASCADE, verbose_name="Token Number")
    DOC_ID = models.ForeignKey('adminapp.StaffDetail', on_delete=models.CASCADE, limit_choices_to={'Role': 'Doctor'}, verbose_name="Doctor")
    Symptoms = models.TextField(verbose_name="Symptoms")
    Diagnosis = models.TextField(verbose_name="Diagnosis")
    Description = models.TextField(blank=True, verbose_name="Description")
    Consultation_Status = models.CharField(
        max_length=20,
        choices=CONSULTATION_STATUS_CHOICES,
        default='not_started',
        verbose_name="Consultation Status"
    )
    Consultation_Time = models.DateTimeField(auto_now_add=True, verbose_name="Consultation Time")
    
    def __str__(self):
        return f"Consultation {self.CONSULT_ID} - {self.TOKEN_NO.PAT_ID.Patient_Name} with Dr. {self.DOC_ID.Name}"
    
    def clean(self):
        # Symptoms validation
        symptoms_cleaned = self.Symptoms.strip()
        if len(symptoms_cleaned) < 10:
            raise ValidationError({'Symptoms': 'Symptoms description must be at least 10 characters long'})
        
        if not self._contains_meaningful_text(symptoms_cleaned):
            raise ValidationError({'Symptoms': 'Symptoms must contain descriptive text, not just numbers or symbols'})
        
        if self._excessive_numbers(symptoms_cleaned, threshold=0.3):
            raise ValidationError({'Symptoms': 'Symptoms should be descriptive text, not predominantly numbers'})
        
        # Diagnosis validation
        diagnosis_cleaned = self.Diagnosis.strip()
        if len(diagnosis_cleaned) < 5:
            raise ValidationError({'Diagnosis': 'Diagnosis must be at least 5 characters long'})
        
        if not self._contains_meaningful_text(diagnosis_cleaned):
            raise ValidationError({'Diagnosis': 'Diagnosis must contain descriptive medical terms, not just numbers or symbols'})
        
        if self._excessive_numbers(diagnosis_cleaned, threshold=0.2):
            raise ValidationError({'Diagnosis': 'Diagnosis should be medical terminology, not predominantly numbers'})
    
    def _contains_meaningful_text(self, text):
        words = re.findall(r'[a-zA-Z]+', text)
        meaningful_words = [word for word in words if len(word) >= 3]
        return len(meaningful_words) >= 2
    
    def _excessive_numbers(self, text, threshold=0.3):
        total_chars = len(text)
        if total_chars == 0:
            return False
        
        num_count = len(re.findall(r'\d', text))
        letter_count = len(re.findall(r'[a-zA-Z]', text))
        
        if letter_count < 5:
            return True
        
        alphanumeric_count = num_count + letter_count
        if alphanumeric_count > 0:
            number_ratio = num_count / alphanumeric_count
            return number_ratio > threshold
        
        return False
    
    class Meta:
        db_table = 'CONSULTATION_DETAILS'
        verbose_name = 'Consultation Detail'
        verbose_name_plural = 'Consultation Details'

class Prescription(models.Model):
    FREQUENCY_CHOICES = [
        ('1-0-1', '1-0-1 (Morning-Night)'),
        ('0-1-1', '0-1-1 (Afternoon-Night)'),
        ('1-0-0', '1-0-0 (Morning only)'),
        ('0-1-0', '0-1-0 (Afternoon only)'),
        ('0-0-1', '0-0-1 (Night only)'),
        ('1-1-0', '1-1-0 (Morning-Afternoon)'),
        ('1-1-1', '1-1-1 (Morning-Afternoon-Night)'),
    ]
    
    PRESCRIPTION_ID = models.AutoField(primary_key=True, verbose_name="Prescription ID")
    CONSULT_ID = models.ForeignKey('ConsultationDetail', on_delete=models.CASCADE, verbose_name="Consultation")
    MED_ID = models.ForeignKey('pharmacistapp.MedicineDetail', on_delete=models.CASCADE, verbose_name="Medicine")
    Dosage = models.CharField(max_length=100, verbose_name="Dosage")
    Frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, default='1-0-1', verbose_name="Frequency")
    Duration = models.CharField(max_length=50, verbose_name="Duration")
    
    def __str__(self):
        return f"Prescription {self.PRESCRIPTION_ID} - {self.MED_ID.Medicine_Name} for {self.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name}"
    
    def clean(self):
        # Dosage validation
        if not any(char.isdigit() for char in self.Dosage):
            raise ValidationError({'Dosage': 'Dosage should include numeric values (e.g., 500mg, 10ml)'})
        
        # Duration validation
        if not any(char.isdigit() for char in self.Duration):
            raise ValidationError({'Duration': 'Duration should include numeric values (e.g., 7 days, 2 weeks)'})
        if not any(unit in self.Duration.lower() for unit in ['day', 'week', 'month', 'hour']):
            raise ValidationError({'Duration': 'Duration should include time unit (e.g., days, weeks, months)'})
    
    class Meta:
        db_table = 'PRESCRIPTIONS'
        verbose_name = 'Prescription'
        verbose_name_plural = 'Prescriptions'

class LabTestRequestDetail(models.Model):
    STATUS_CHOICES = [
        ('Requested', 'Requested'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('routine', 'Routine'),
        ('priority', 'Priority'), 
        ('stat', 'Stat (Immediate)')
    ]
    
    LAB_REQUEST_ID = models.AutoField(primary_key=True, verbose_name="Lab Request ID")
    CONSULT_ID = models.ForeignKey('ConsultationDetail', on_delete=models.CASCADE, related_name='doctor_lab_requests', verbose_name="Consultation")
    LAB_TEST_ID = models.ForeignKey('labtechapp.LabTest', on_delete=models.CASCADE, related_name='doctor_test_requests', verbose_name="Lab Test")
    Priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='routine',
        verbose_name="Priority"
    )
    Assigned_Technician = models.ForeignKey(
        'adminapp.StaffDetail', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        limit_choices_to={'Role': 'Lab Technician'},
        verbose_name="Assigned Technician"
    )
    Requested_Date = models.DateTimeField(auto_now_add=True, verbose_name="Requested Date")
    Status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Requested', verbose_name="Status")
    Notes = models.TextField(blank=True, verbose_name="Notes")

    def __str__(self):
        return f"Lab Request {self.LAB_REQUEST_ID} - {self.LAB_TEST_ID.Lab_Test_Name}"
    
    class Meta:
        db_table = 'DOCTOR_LAB_REQUESTS'
        verbose_name = 'Lab Test Request'
        verbose_name_plural = 'Lab Test Requests'