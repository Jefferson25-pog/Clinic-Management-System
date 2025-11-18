from rest_framework import serializers
from .models import PatientDetails, AppointmentDetails, ReceptionistLog, BillDetails
from django.utils import timezone
import re
from datetime import date

class PatientDetailsSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientDetails
        fields = '__all__'
        read_only_fields = ['age']
    
    def get_age(self, obj):
        if obj.DOB:
            return (date.today() - obj.DOB).days // 365
        return None
    
    def validate_Patient_Name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Patient name must be at least 2 characters long")
        return value.strip()
    
    def validate_DOB(self, value):
        if value > date.today():
            raise serializers.ValidationError("Date of birth cannot be in the future")
        
        age = (date.today() - value).days // 365
        if age > 120:
            raise serializers.ValidationError("Patient age cannot exceed 120 years")
        
        return value
    
    def validate_Phone_Number(self, value):
        if not re.match(r'^\+?1?\d{9,15}$', value):
            raise serializers.ValidationError("Enter a valid phone number")
        return value
    
    def validate_Email(self, value):
        if value and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            raise serializers.ValidationError("Enter a valid email address")
        return value

class AppointmentDetailsSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='PAT_ID.Patient_Name', read_only=True)
    doctor_name = serializers.CharField(source='DOC_ID.Name', read_only=True)  # FIXED: DOC_ID directly has Name
    
    class Meta:
        model = AppointmentDetails
        fields = '__all__'
        read_only_fields = ['patient_name', 'doctor_name']
    
    def validate_Date(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Appointment date cannot be in the past")
        return value
    
    def validate(self, data):
        # Check if doctor is available
        if data['DOC_ID'].Status != 'Available':
            raise serializers.ValidationError(
                {"DOC_ID": f"Doctor is currently {data['DOC_ID'].Status}. Please choose another doctor."}
            )
        
        # Check for duplicate appointments (same patient, same doctor, same time)
        existing_appointment = AppointmentDetails.objects.filter(
            PAT_ID=data['PAT_ID'],
            DOC_ID=data['DOC_ID'],
            Date=data['Date'],
            Status='Scheduled'
        ).exclude(TOKEN_NO=getattr(self.instance, 'TOKEN_NO', None))
        
        if existing_appointment.exists():
            raise serializers.ValidationError(
                "An appointment already exists for this patient with the same doctor at this time"
            )
        
        return data

class ReceptionistLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReceptionistLog
        fields = '__all__'
    
    def validate_Action(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Action description must be at least 5 characters long")
        return value.strip()
    
class BillDetailsSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name', read_only=True)
    doctor_name = serializers.CharField(source='CONSULT_ID.DOC_ID.Name', read_only=True)
    consultation_date = serializers.DateTimeField(source='CONSULT_ID.Consultation_Time', read_only=True)
    
    # Add calculated cost fields as read-only
    consultation_cost = serializers.DecimalField(source='Consultation_Cost', max_digits=10, decimal_places=2, read_only=True)
    medicine_cost = serializers.DecimalField(source='Medicine_Cost', max_digits=10, decimal_places=2, read_only=True)
    labtest_cost = serializers.DecimalField(source='LabTest_Cost', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = BillDetails
        fields = [
            'BILL_ID', 'CONSULT_ID', 'Total_Amount', 'Pay_Status', 'Payment_Mode', 
            'Created_Date', 'patient_name', 'doctor_name', 'consultation_date',
            'consultation_cost', 'medicine_cost', 'labtest_cost'  # These are now read-only
        ]
        read_only_fields = [
            'Total_Amount', 'Created_Date', 'patient_name', 'doctor_name', 
            'consultation_date', 'consultation_cost', 'medicine_cost', 'labtest_cost'
        ]