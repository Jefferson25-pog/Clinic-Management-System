from rest_framework import serializers
from .models import ConsultationDetails, Prescription, LabTestRequestDetails
from labtechapp.models import LabTests
import re

class ConsultationDetailsSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='TOKEN_NO.PAT_ID.Patient_Name', read_only=True)
    doctor_name = serializers.CharField(source='DOC_ID.Name', read_only=True)
    
    class Meta:
        model = ConsultationDetails
        fields = '__all__'
        read_only_fields = ['patient_name', 'doctor_name', 'Consultation_Time']
    
    def _contains_meaningful_text(self, text):
        """Check if text contains meaningful words"""
        words = re.findall(r'[a-zA-Z]+', text)
        meaningful_words = [word for word in words if len(word) >= 3]
        return len(meaningful_words) >= 2
    
    def _excessive_numbers(self, text, threshold=0.3):
        """Check if text has too many numbers"""
        total_chars = len(text)
        if total_chars == 0:
            return False
        
        num_count = len(re.findall(r'\d', text))
        letter_count = len(re.findall(r'[a-zA-Z]', text))
        
        if letter_count < 5:
            return True
        
        alphanumeric_count = num_count + letter_count
        if alphanumeric_count > 0:
            return (num_count / alphanumeric_count) > threshold
        
        return False
    
    def validate_Symptoms(self, value):
        cleaned_value = value.strip()
        
        # Length check
        if len(cleaned_value) < 10:
            raise serializers.ValidationError("Symptoms description must be at least 10 characters long")
        
        # Meaningful text check
        if not self._contains_meaningful_text(cleaned_value):
            raise serializers.ValidationError("Symptoms must contain descriptive text with proper words, not just numbers or symbols")
        
        # Excessive numbers check
        if self._excessive_numbers(cleaned_value, threshold=0.3):
            raise serializers.ValidationError("Symptoms should be descriptive text, not predominantly numbers")
        
        return cleaned_value
    
    def validate_Diagnosis(self, value):
        cleaned_value = value.strip()
        
        # Length check
        if len(cleaned_value) < 5:
            raise serializers.ValidationError("Diagnosis must be at least 5 characters long")
        
        # Meaningful text check
        if not self._contains_meaningful_text(cleaned_value):
            raise serializers.ValidationError("Diagnosis must contain descriptive medical terms, not just numbers or symbols")
        
        # Excessive numbers check (stricter for diagnosis)
        if self._excessive_numbers(cleaned_value, threshold=0.2):
            raise serializers.ValidationError("Diagnosis should be medical terminology, not predominantly numbers")
        
        return cleaned_value
    
    def validate_Description(self, value):
        if value:
            cleaned_value = value.strip()
            # Optional field, but if provided, should have meaningful content
            if len(cleaned_value) > 0 and not self._contains_meaningful_text(cleaned_value):
                raise serializers.ValidationError("Description should contain meaningful text if provided")
        return value
    
    def validate(self, data):
        if data['TOKEN_NO'].Status != 'Completed':
            raise serializers.ValidationError(
                {"TOKEN_NO": "Consultation can only be created for completed appointments"}
            )
        return data

class PrescriptionSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='MED_ID.Medicine_Name', read_only=True)
    patient_name = serializers.CharField(source='CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name', read_only=True)
    
    class Meta:
        model = Prescription
        fields = '__all__'
        read_only_fields = ['medicine_name', 'patient_name']
    
    def validate_Dosage(self, value):
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Dosage should include numeric values (e.g., 500mg, 10ml)")
        return value
    
    def validate_Duration(self, value):
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Duration should include numeric values (e.g., 7 days, 2 weeks)")
        if not any(unit in value.lower() for unit in ['day', 'week', 'month', 'hour']):
            raise serializers.ValidationError("Duration should include time unit (e.g., days, weeks, months)")
        return value

class LabTestsSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTests
        fields = ['LAB_TEST_ID', 'Lab_Test_Name', 'Lab_Test_Cost', 'Description']

class LabTestRequestDetailsSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name', read_only=True)
    doctor_name = serializers.CharField(source='CONSULT_ID.DOC_ID.Name', read_only=True)
    test_name = serializers.CharField(source='LAB_TEST_ID.Lab_Test_Name', read_only=True)
    test_cost = serializers.DecimalField(source='LAB_TEST_ID.Lab_Test_Cost', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = LabTestRequestDetails
        fields = [
            'LAB_REQUEST_ID', 'CONSULT_ID', 'LAB_TEST_ID', 'Requested_Date', 
            'Status', 'Notes', 'patient_name', 'doctor_name', 'test_name', 'test_cost'
        ]
        read_only_fields = ['Requested_Date', 'patient_name', 'doctor_name', 'test_name', 'test_cost']