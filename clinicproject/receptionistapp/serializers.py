# receptionistapp/serializers.py - COMPLETE UPDATED VERSION
from rest_framework import serializers
from .models import PatientDetail, AppointmentDetail, BillDetail
from django.utils import timezone
import re
from datetime import date, timedelta
from adminapp.serializers import StaffDetailsSerializer

class PatientDetailsSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()
    id = serializers.CharField(source='PAT_ID', read_only=True)  # Add this line
    
    class Meta:
        model = PatientDetail
        fields = [
            'id', 'PAT_ID', 'Patient_Name', 'DOB', 'age', 'Address',  # Add 'id' here
            'Phone_Number', 'Email', 'Gender', 'Blood_Group',
            'Emergency_Contact', 'Occupation', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'PAT_ID', 'age', 'created_at', 'updated_at']
    
    def validate_Patient_Name(self, value):
        if not re.match(r'^[A-Za-z\s\.\-]+$', value):
            raise serializers.ValidationError("Patient name can only contain letters, spaces, dots and hyphens")
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
        if not re.match(r'^\d{10}$', value):
            raise serializers.ValidationError("Phone number must be exactly 10 digits (no symbols or spaces)")
        return value
    
    def validate_Email(self, value):
        if value:
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
                raise serializers.ValidationError("Enter a valid email address")
            if not value.endswith(('.com', '.in', '.org', '.net')):
                raise serializers.ValidationError("Email must have a valid domain (e.g., @gmail.com, @yahoo.in)")
        return value

class AppointmentDetailsSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='PAT_ID.Patient_Name', read_only=True)
    patient_phone = serializers.CharField(source='PAT_ID.Phone_Number', read_only=True)
    doctor_name = serializers.CharField(source='DOC_ID.Name', read_only=True)
    doctor_department = serializers.CharField(source='DOC_ID.Department.Department_Name', read_only=True, allow_null=True)
    doctor_fees = serializers.DecimalField(source='DOC_ID.Consultation_fees', read_only=True, max_digits=10, decimal_places=2)
    priority_display = serializers.CharField(source='get_Priority_display', read_only=True)
    
    class Meta:
        model = AppointmentDetail
        fields = [
            'APPOINTMENT_ID', 'TOKEN_NO', 'PAT_ID', 'DOC_ID', 
            'patient_name', 'patient_phone', 'doctor_name', 'doctor_department', 'doctor_fees',
            'Status', 'Date', 'Time', 'Priority', 'priority_display',
            'Reason', 'Notes', 'created_at', 'updated_at',
            'completed_at', 'cancelled_at', 'cancelled_by'
        ]
        read_only_fields = ['APPOINTMENT_ID', 'TOKEN_NO', 'created_at', 'updated_at']
    
    def validate_Date(self, value):
        if value < date.today():
            raise serializers.ValidationError("Appointment date cannot be in the past")
        
        # Optional: Restrict to next 30 days
        max_date = date.today() + timedelta(days=30)
        if value > max_date:
            raise serializers.ValidationError("Appointments can only be scheduled up to 30 days in advance")
        
        return value
    
    def validate(self, data):
        # Check if doctor is available
        doc_id = data.get('DOC_ID')
        if doc_id and hasattr(doc_id, 'Status'):
            if doc_id.Status != 'Available':
                raise serializers.ValidationError(
                    {"DOC_ID": f"Doctor is currently {doc_id.Status}. Please choose another doctor."}
                )
        
        # Check for duplicate appointments (same patient, same doctor, same date)
        appointment_date = data.get('Date')
        patient = data.get('PAT_ID')
        doctor = data.get('DOC_ID')
        
        if appointment_date and patient and doctor:
            existing_appointment = AppointmentDetail.objects.filter(
                PAT_ID=patient,
                DOC_ID=doctor,
                Date=appointment_date,
                Status='Scheduled'
            ).exclude(APPOINTMENT_ID=getattr(self.instance, 'APPOINTMENT_ID', None))
            
            if existing_appointment.exists():
                raise serializers.ValidationError(
                    "An appointment already exists for this patient with the same doctor on this date"
                )
        
        return data

class BillDetailsSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name', read_only=True)
    patient_id = serializers.CharField(source='CONSULT_ID.TOKEN_NO.PAT_ID.PAT_ID', read_only=True)
    doctor_name = serializers.CharField(source='CONSULT_ID.DOC_ID.Name', read_only=True)
    appointment_id = serializers.CharField(source='CONSULT_ID.TOKEN_NO.APPOINTMENT_ID', read_only=True)
    consultation_date = serializers.DateTimeField(source='CONSULT_ID.Consultation_Time', read_only=True)
    
    class Meta:
        model = BillDetail
        fields = [
            'BILL_ID', 'CONSULT_ID', 
            'Consultation_Cost', 'Medicine_Cost', 'LabTest_Cost', 
            'Additional_Charges', 'Discount', 'Total_Amount',
            'Pay_Status', 'Payment_Mode', 'Payment_Date', 'Transaction_ID',
            'Notes', 'Created_Date', 'Updated_Date',
            'patient_name', 'patient_id', 'doctor_name', 'appointment_id', 'consultation_date'
        ]
        read_only_fields = [
            'BILL_ID', 'Consultation_Cost', 'Medicine_Cost', 'LabTest_Cost', 
            'Total_Amount', 'Created_Date', 'Updated_Date',
            'patient_name', 'patient_id', 'doctor_name', 'appointment_id', 'consultation_date'
        ]
    
    def validate(self, data):
        # Ensure bill is not already paid
        if self.instance and self.instance.Pay_Status == 'Paid':
            raise serializers.ValidationError("Cannot modify a bill that has already been paid")
        
        return data
    
# receptionistapp/serializers.py
from rest_framework import serializers
from .models import PatientMedicalInfo, PatientDetail

class PatientMedicalInfoSerializer(serializers.ModelSerializer):
    bmi = serializers.SerializerMethodField(read_only=True)
    bmi_category = serializers.SerializerMethodField(read_only=True)
    patient_name = serializers.CharField(source='patient.Patient_Name', read_only=True)
    patient_age = serializers.IntegerField(source='patient.age', read_only=True)
    
    class Meta:
        model = PatientMedicalInfo
        fields = [
            'patient', 'patient_name', 'patient_age',
            'past_medical_history', 'allergies', 'chronic_conditions',
            'current_medications', 'family_history', 'social_history',
            'surgical_history', 'height', 'weight', 'blood_pressure',
            'pulse', 'temperature', 'respiratory_rate', 'oxygen_saturation',
            'additional_notes', 'bmi', 'bmi_category',
            'last_updated_at', 'last_updated_by'
        ]
        read_only_fields = ['bmi', 'bmi_category', 'patient_name', 'patient_age', 'last_updated_at']
    
    def get_bmi(self, obj):
        return obj.calculate_bmi()
    
    def get_bmi_category(self, obj):
        return obj.get_bmi_category()
    
    def validate_height(self, value):
        if value and (value < 50 or value > 250):  # 50cm to 250cm
            raise serializers.ValidationError("Height must be between 50cm and 250cm")
        return value
    
    def validate_weight(self, value):
        if value and (value < 2 or value > 300):  # 2kg to 300kg
            raise serializers.ValidationError("Weight must be between 2kg and 300kg")
        return value