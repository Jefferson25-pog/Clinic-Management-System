from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError

class ConsultationDetails(models.Model):
    CONSULT_ID = models.AutoField(primary_key=True)
    TOKEN_NO = models.ForeignKey('receptionistapp.AppointmentDetails', on_delete=models.CASCADE)
    DOC_ID = models.ForeignKey('adminapp.StaffDetails', on_delete=models.CASCADE, limit_choices_to={'Role': 'Doctor'})
    Symptoms = models.TextField()  # Removed max_length
    Diagnosis = models.TextField()  # Removed max_length
    Description = models.TextField(blank=True)  # Removed max_length
    Consultation_Time = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Consultation {self.CONSULT_ID} - {self.TOKEN_NO.PAT_ID.Patient_Name} with Dr. {self.DOC_ID.Name}"
    
    def clean(self):
        if len(self.Symptoms.strip()) < 10:
            raise ValidationError({'Symptoms': 'Symptoms description must be at least 10 characters long'})
        
        if len(self.Diagnosis.strip()) < 5:
            raise ValidationError({'Diagnosis': 'Diagnosis must be at least 5 characters long'})
    
    class Meta:
        db_table = 'CONSULTATION_DETAILS'

class Prescription(models.Model):
    PRESCRIPTION_ID = models.AutoField(primary_key=True)
    CONSULT_ID = models.ForeignKey('ConsultationDetails', on_delete=models.CASCADE)
    MED_ID = models.ForeignKey('pharmacistapp.MedicineDetails', on_delete=models.CASCADE)
    Dosage = models.CharField(max_length=100)
    Frequency = models.CharField(max_length=100)
    Duration = models.CharField(max_length=50)
    
    def __str__(self):
        return f"Prescription {self.PRESCRIPTION_ID} - {self.MED_ID.Medicine_Name} for {self.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name}"
    
    def clean(self):
        if not any(char.isdigit() for char in self.Dosage):
            raise ValidationError({'Dosage': 'Dosage should include numeric values (e.g., 500mg, 10ml)'})
    
    class Meta:
        db_table = 'PRESCRIPTION'