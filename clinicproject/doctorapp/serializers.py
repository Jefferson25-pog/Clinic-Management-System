from rest_framework import serializers
from .models import ConsultationDetails, Prescription

class ConsultationDetailsSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='TOKEN_NO.PAT_ID.Patient_Name', read_only=True)
    doctor_name = serializers.CharField(source='DOC_ID.Name', read_only=True)
    
    class Meta:
        model = ConsultationDetails
        fields = '__all__'
        read_only_fields = ['patient_name', 'doctor_name', 'Consultation_Time']
    
    def validate_Symptoms(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Symptoms description must be at least 10 characters long")
        return value.strip()
    
    def validate_Diagnosis(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Diagnosis must be at least 5 characters long")
        return value.strip()
    
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
        return value
    
    