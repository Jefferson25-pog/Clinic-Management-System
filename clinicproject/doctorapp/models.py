from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
import re

class ConsultationDetails(models.Model):
    CONSULT_ID = models.AutoField(primary_key=True)
    TOKEN_NO = models.ForeignKey('receptionistapp.AppointmentDetails', on_delete=models.CASCADE)
    DOC_ID = models.ForeignKey('adminapp.StaffDetails', on_delete=models.CASCADE, limit_choices_to={'Role': 'Doctor'})
    Symptoms = models.TextField()
    Diagnosis = models.TextField()
    Description = models.TextField(blank=True)
    Consultation_Time = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Consultation {self.CONSULT_ID} - {self.TOKEN_NO.PAT_ID.Patient_Name} with Dr. {self.DOC_ID.Name}"
    
    def clean(self):
        # Symptoms validation - must contain letters/words
        symptoms_cleaned = self.Symptoms.strip()
        if len(symptoms_cleaned) < 10:
            raise ValidationError({'Symptoms': 'Symptoms description must be at least 10 characters long'})
        
        # Check if symptoms contain meaningful text (not just numbers/symbols)
        if not self._contains_meaningful_text(symptoms_cleaned):
            raise ValidationError({'Symptoms': 'Symptoms must contain descriptive text, not just numbers or symbols'})
        
        # Check for excessive numbers (more than 30% numbers)
        if self._excessive_numbers(symptoms_cleaned, threshold=0.3):
            raise ValidationError({'Symptoms': 'Symptoms should be descriptive text, not predominantly numbers'})
        
        # Diagnosis validation (mandatory) - must contain letters/words
        diagnosis_cleaned = self.Diagnosis.strip()
        if len(diagnosis_cleaned) < 5:
            raise ValidationError({'Diagnosis': 'Diagnosis must be at least 5 characters long'})
        
        # Check if diagnosis contains meaningful text
        if not self._contains_meaningful_text(diagnosis_cleaned):
            raise ValidationError({'Diagnosis': 'Diagnosis must contain descriptive medical terms, not just numbers or symbols'})
        
        # Check for excessive numbers in diagnosis
        if self._excessive_numbers(diagnosis_cleaned, threshold=0.2):
            raise ValidationError({'Diagnosis': 'Diagnosis should be medical terminology, not predominantly numbers'})
    
    def _contains_meaningful_text(self, text):
        """Check if text contains meaningful words (not just numbers/symbols)"""
        # Remove all non-alphanumeric characters except spaces
        words = re.findall(r'[a-zA-Z]+', text)
        
        # Check if we have at least 2 meaningful words
        meaningful_words = [word for word in words if len(word) >= 3]
        return len(meaningful_words) >= 2
    
    def _excessive_numbers(self, text, threshold=0.3):
        """Check if text has too many numbers compared to letters"""
        total_chars = len(text)
        if total_chars == 0:
            return False
        
        # Count numeric characters
        num_count = len(re.findall(r'\d', text))
        
        # Count letter characters
        letter_count = len(re.findall(r'[a-zA-Z]', text))
        
        # If very few letters, it's problematic
        if letter_count < 5:
            return True
        
        # Calculate ratio of numbers to total alphanumeric characters
        alphanumeric_count = num_count + letter_count
        if alphanumeric_count > 0:
            number_ratio = num_count / alphanumeric_count
            return number_ratio > threshold
        
        return False
    
    class Meta:
        db_table = 'CONSULTATION_DETAILS'

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
    
    PRESCRIPTION_ID = models.AutoField(primary_key=True)
    CONSULT_ID = models.ForeignKey('ConsultationDetails', on_delete=models.CASCADE)
    MED_ID = models.ForeignKey('pharmacistapp.MedicineDetails', on_delete=models.CASCADE)
    Dosage = models.CharField(max_length=100)
    Frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, default='1-0-1')
    Duration = models.CharField(max_length=50)
    
    def __str__(self):
        return f"Prescription {self.PRESCRIPTION_ID} - {self.MED_ID.Medicine_Name} for {self.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name}"
    
    def clean(self):
        # Dosage validation - should contain numbers
        if not any(char.isdigit() for char in self.Dosage):
            raise ValidationError({'Dosage': 'Dosage should include numeric values (e.g., 500mg, 10ml)'})
        
        # Duration validation - should contain numbers and end with time unit
        if not any(char.isdigit() for char in self.Duration):
            raise ValidationError({'Duration': 'Duration should include numeric values (e.g., 7 days, 2 weeks)'})
        if not any(unit in self.Duration.lower() for unit in ['day', 'week', 'month', 'hour']):
            raise ValidationError({'Duration': 'Duration should include time unit (e.g., days, weeks, months)'})
    
    class Meta:
        db_table = 'PRESCRIPTION'