from rest_framework import serializers
from .models import ConsultationDetail, Prescription, LabTestRequestDetail
from labtechapp.models import LabTest
from labtechapp.serializers import LabTestsSerializer
import re

# doctorapp/serializers.py - FIX THE SERIALIZER

class ConsultationDetailsSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='TOKEN_NO.PAT_ID.Patient_Name', read_only=True)
    doctor_name = serializers.CharField(source='DOC_ID.Name', read_only=True)
    
    class Meta:
        model = ConsultationDetail
        fields = [
            'CONSULT_ID', 'TOKEN_NO', 'DOC_ID', 
            'Symptoms', 'Diagnosis', 'Description',
            'Consultation_Status', 'Consultation_Time',
            'patient_name', 'doctor_name'  # ADD THESE
        ]
        read_only_fields = ['patient_name', 'doctor_name', 'Consultation_Time', 'CONSULT_ID']
    
    def validate_Symptoms(self, value):
        cleaned_value = value.strip()
        
        if len(cleaned_value) < 10:
            raise serializers.ValidationError("Symptoms description must be at least 10 characters long")
        
        if not self._contains_meaningful_text(cleaned_value):
            raise serializers.ValidationError("Symptoms must contain descriptive text with proper words, not just numbers or symbols")
        
        if self._excessive_numbers(cleaned_value, threshold=0.3):
            raise serializers.ValidationError("Symptoms should be descriptive text, not predominantly numbers")
        
        return cleaned_value
    
    def validate_Diagnosis(self, value):
        cleaned_value = value.strip()
        
        if len(cleaned_value) < 5:
            raise serializers.ValidationError("Diagnosis must be at least 5 characters long")
        
        if not self._contains_meaningful_text(cleaned_value):
            raise serializers.ValidationError("Diagnosis must contain descriptive medical terms, not just numbers or symbols")
        
        if self._excessive_numbers(cleaned_value, threshold=0.2):
            raise serializers.ValidationError("Diagnosis should be medical terminology, not predominantly numbers")
        
        return cleaned_value
    
    def validate_Description(self, value):
        if value:
            cleaned_value = value.strip()
            if len(cleaned_value) > 0 and not self._contains_meaningful_text(cleaned_value):
                raise serializers.ValidationError("Description should contain meaningful text if provided")
        return value
    
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
            return (num_count / alphanumeric_count) > threshold
        
        return False
    
    def validate(self, data):
        # If updating, don't check appointment status
        if self.instance:
            return data
            
        # Only check for new consultations
        if 'TOKEN_NO' in data and data['TOKEN_NO'].Status != 'Completed':
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
        model = LabTest
        fields = ['LAB_TEST_ID', 'Lab_Test_Name', 'Lab_Test_Cost', 'Description']

class LabTestRequestDetailsSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name', read_only=True)
    doctor_name = serializers.CharField(source='CONSULT_ID.DOC_ID.Name', read_only=True)
    test_name = serializers.CharField(source='LAB_TEST_ID.Lab_Test_Name', read_only=True)
    test_cost = serializers.DecimalField(
        source='LAB_TEST_ID.Lab_Test_Cost', 
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )
    priority_display = serializers.CharField(source='get_Priority_display', read_only=True)
    assigned_technician_name = serializers.CharField(source='Assigned_Technician.Name', read_only=True, allow_null=True)
    
    class Meta:
        model = LabTestRequestDetail
        fields = [
            'LAB_REQUEST_ID', 'CONSULT_ID', 'LAB_TEST_ID', 'Requested_Date', 
            'Status', 'Notes', 'Priority', 'Assigned_Technician',
            'patient_name', 'doctor_name', 'test_name', 'test_cost',
            'priority_display', 'assigned_technician_name'
        ]
        read_only_fields = [
            'LAB_REQUEST_ID', 'Requested_Date', 'patient_name', 'doctor_name', 
            'test_name', 'test_cost', 'priority_display', 'assigned_technician_name'
        ]
    
    def validate(self, data):
        if self.instance and hasattr(self.context['request'].user, 'staff_detail'):
            user_role = self.context['request'].user.staff_detail.Role
            
            if user_role == 'Doctor':
                if 'Assigned_Technician' in data and data['Assigned_Technician'] != self.instance.Assigned_Technician:
                    raise serializers.ValidationError({
                        "Assigned_Technician": "Doctors cannot assign lab technicians. This is done automatically by the system."
                    })
                
                if 'Status' in data and data['Status'] != self.instance.Status:
                    if self.instance.Status != 'Requested':
                        raise serializers.ValidationError({
                            "Status": "Doctors can only cancel requests that are still in 'Requested' status."
                        })
        
        return data