from django.contrib import admin
from .models import ConsultationDetails, Prescription

@admin.register(ConsultationDetails)
class ConsultationDetailsAdmin(admin.ModelAdmin):
    list_display = ['CONSULT_ID', 'patient_name', 'doctor_name', 'Consultation_Time']
    list_filter = ['Consultation_Time', 'DOC_ID']
    search_fields = ['CONSULT_ID', 'TOKEN_NO__PAT_ID__Patient_Name', 'DOC_ID__Name']
    readonly_fields = ['Consultation_Time']
    
    def patient_name(self, obj):
        return obj.TOKEN_NO.PAT_ID.Patient_Name
    patient_name.short_description = 'Patient Name'
    
    def doctor_name(self, obj):
        return f"Dr. {obj.DOC_ID.Name}"
    doctor_name.short_description = 'Doctor'

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ['PRESCRIPTION_ID', 'patient_name', 'medicine_name', 'Dosage', 'Frequency']
    list_filter = ['CONSULT_ID__DOC_ID']
    search_fields = ['PRESCRIPTION_ID', 'CONSULT_ID__TOKEN_NO__PAT_ID__Patient_Name', 'MED_ID__Medicine_Name']
    
    def patient_name(self, obj):
        return obj.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name
    patient_name.short_description = 'Patient'
    
    def medicine_name(self, obj):
        return obj.MED_ID.Medicine_Name
    medicine_name.short_description = 'Medicine'